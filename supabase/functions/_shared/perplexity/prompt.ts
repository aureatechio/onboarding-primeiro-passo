export type GoalHint = 'awareness' | 'conversao' | 'retencao'
export type BriefingMode = 'text' | 'audio' | 'both'

export interface PromptBriefingInput {
  compra_id: string
  company_name: string
  company_site: string
  celebrity_name: string
  context?: {
    segment?: string | null
    region?: string | null
    campaign_goal_hint?: GoalHint | null
  }
  briefing_input?: {
    mode?: BriefingMode | null
    text?: string | null
  }
}

export interface PromptConfig {
  model: string
  system_prompt?: string | null
  user_prompt_template?: string | null
  search_mode?: string | null
  search_recency_filter?: string | null
  temperature?: number | null
  top_p?: number | null
  insights_count?: number | null
}

export const DEFAULT_SYSTEM_PROMPT = [
  'Voce e estrategista de campanhas com celebridades para a AUREA.',
  'Pesquise fontes publicas confiaveis, mantenha objetividade e nao invente dados.',
  'Responda EXCLUSIVAMENTE em JSON valido UTF-8 sem markdown.',
  'A resposta deve ter dois blocos: briefing e insights_pecas.',
  'Use o schema exato solicitado; sem campos extras no nivel raiz.',
].join(' ')

export const DEFAULT_USER_PROMPT_TEMPLATE = [
  'Dados da campanha: empresa=${company_name}; site=${company_site}; celebridade=${celebrity_name}.',
  '${segment_line}',
  '${region_line}',
  '${goal_line}',
  '${mode_line}',
  '${brief_line}',
  'Formato JSON obrigatorio:',
  '{"briefing":{"sobre_empresa":"string","publico_alvo":"string","sobre_celebridade":"string","objetivo_campanha":"string","mensagem_central":"string","tom_voz":"string","pontos_prova":["string"],"cta_principal":"string","cta_secundario":"string"},"insights_pecas":[{"diferencial":"string","formato":"string","plataforma":"string","gancho":"string","chamada_principal":"string","texto_apoio":"string","cta":"string","direcao_criativa":"string"}]}',
  'Retorne exatamente ${insights_count} itens em insights_pecas.',
].join('\n')

function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function toSafeInsightsCount(value: number | null | undefined): number {
  const parsed = Number(value ?? 4)
  if (Number.isNaN(parsed)) return 4
  return Math.min(Math.max(Math.trunc(parsed), 1), 10)
}

function replaceTemplateVars(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_full, key) => {
    const nextValue = vars[key]
    if (nextValue === undefined || nextValue === null) return ''
    return String(nextValue)
  })
}

export function buildUserPrompt(
  input: PromptBriefingInput,
  userPromptTemplate?: string | null,
  insightsCount?: number | null
): string {
  const segment = asNonEmptyString(input.context?.segment)
  const region = asNonEmptyString(input.context?.region)
  const goal = asNonEmptyString(input.context?.campaign_goal_hint)
  const mode = asNonEmptyString(input.briefing_input?.mode)
  const brief = asNonEmptyString(input.briefing_input?.text)
  const safeInsightsCount = toSafeInsightsCount(insightsCount)
  const baseTemplate =
    asNonEmptyString(userPromptTemplate) || DEFAULT_USER_PROMPT_TEMPLATE

  const resolved = replaceTemplateVars(baseTemplate, {
    compra_id: input.compra_id,
    company_name: input.company_name,
    company_site: input.company_site,
    celebrity_name: input.celebrity_name,
    segment,
    region,
    goal,
    mode,
    brief,
    insights_count: safeInsightsCount,
    segment_line: segment ? `Segmento: ${segment}.` : '',
    region_line: region ? `Regiao: ${region}.` : '',
    goal_line: goal ? `Objetivo sugerido: ${goal}.` : '',
    mode_line: mode ? `Entrada do usuario no onboarding: modo=${mode}.` : '',
    brief_line: brief ? `Resumo do briefing informado pelo usuario: ${brief}` : '',
  })

  return resolved
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, allLines) => !(line.length === 0 && allLines[index - 1] === ''))
    .join('\n')
}

export function buildPerplexityPayload(
  input: PromptBriefingInput,
  config: PromptConfig
): Record<string, unknown> {
  const systemPrompt = asNonEmptyString(config.system_prompt) || DEFAULT_SYSTEM_PROMPT
  const userPrompt = buildUserPrompt(input, config.user_prompt_template, config.insights_count)

  return {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    search_mode: asNonEmptyString(config.search_mode) || 'web',
    search_recency_filter: asNonEmptyString(config.search_recency_filter) || 'month',
    temperature: Number(config.temperature ?? 0.2),
    top_p: Number(config.top_p ?? 0.9),
  }
}
