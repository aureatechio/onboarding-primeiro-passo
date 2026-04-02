export const SUGGEST_CONTRACT_VERSION = 'v1.0.0'
export const SUGGEST_PROMPT_VERSION = 'v1.0.0'
export const SUGGEST_STRATEGY_VERSION = 'v1.0.0'

export const SUGGEST_MIN_LENGTH = 120

export interface SuggestInput {
  company_name: string
  company_site: string
  celebrity_name: string
  sources?: string[]
  segment?: string | null
  region?: string | null
  campaign_goal_hint?: string | null
}

export interface SuggestResult {
  text: string
  contract_version: string
  prompt_version: string
  strategy_version: string
}

export interface SuggestProviderConfig {
  model: string
  api_base_url?: string | null
  api_key?: string | null
  timeout_ms?: number | null
  temperature?: number | null
  top_p?: number | null
  search_mode?: string | null
  search_recency_filter?: string | null
  suggest_system_prompt?: string | null
  suggest_user_prompt_template?: string | null
  suggest_prompt_version?: string | null
  suggest_strategy_version?: string | null
}

export class SuggestError extends Error {
  code: 'SUGGEST_GUARDRAIL_VIOLATION'
  constructor(message: string) {
    super(message)
    this.code = 'SUGGEST_GUARDRAIL_VIOLATION'
  }
}

export const DEFAULT_SUGGEST_SYSTEM_PROMPT = [
  'Voce e um redator especializado em campanhas de marketing com celebridades para marcas brasileiras.',
  'Escreva um texto de briefing de campanha direto, claro e especifico.',
  'Responda APENAS com o texto do briefing, sem introducao, sem JSON, sem markdown, sem placeholders.',
  'O texto deve ser em portugues brasileiro.',
].join(' ')

export const DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE = [
  'Escreva um briefing de campanha para a seguinte marca:',
  '- Empresa: ${company_name} (${company_site})',
  '- Celebridade: ${celebrity_name}',
  '${segment_line}',
  '${region_line}',
  '${goal_line}',
  '${sources_line}',
  '',
  'O briefing deve cobrir: contexto da marca, publico-alvo e angulo da campanha com a celebridade.',
  'Minimo de 2 paragrafos. Seja especifico, evite frases genericas.',
  'Responda SOMENTE com o texto do briefing.',
].join('\n')

function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_full, key) => vars[key] ?? '')
}

export function buildSuggestUserPrompt(
  input: SuggestInput,
  userPromptTemplate?: string | null
): string {
  const segment = asNonEmptyString(input.segment)
  const region = asNonEmptyString(input.region)
  const goal = asNonEmptyString(input.campaign_goal_hint)
  const sources = Array.isArray(input.sources)
    ? input.sources.map((source) => asNonEmptyString(source)).filter((source) => source.length > 0)
    : []
  const sourcesLine =
    sources.length > 0 ? `- Fontes de referencia: ${sources.slice(0, 5).join(', ')}` : ''

  const baseTemplate =
    asNonEmptyString(userPromptTemplate) || DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE

  const resolved = replaceTemplateVars(baseTemplate, {
    company_name: input.company_name,
    company_site: input.company_site,
    celebrity_name: input.celebrity_name,
    segment,
    region,
    campaign_goal_hint: goal,
    segment_line: segment ? `- Segmento: ${segment}` : '',
    region_line: region ? `- Regiao: ${region}` : '',
    goal_line: goal ? `- Objetivo: ${goal}` : '',
    sources_line: sourcesLine,
  })

  return resolved
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, allLines) => !(line.length === 0 && allLines[index - 1] === ''))
    .join('\n')
}

export function buildSuggestPayload(
  input: SuggestInput,
  config: SuggestProviderConfig
): Record<string, unknown> {
  const systemPrompt = asNonEmptyString(config.suggest_system_prompt) || DEFAULT_SUGGEST_SYSTEM_PROMPT
  const userPrompt = buildSuggestUserPrompt(input, config.suggest_user_prompt_template)

  return {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    search_mode: config.search_mode ?? 'web',
    search_recency_filter: config.search_recency_filter ?? 'month',
    temperature: Number(config.temperature ?? 0.5),
    top_p: Number(config.top_p ?? 0.9),
  }
}

const PLACEHOLDER_PATTERNS = [/\{\{[^}]*\}\}/, /\$\{[^}]*\}/]

export function normalizeSuggestResponse(
  raw: string,
  versions?: { prompt_version?: string | null; strategy_version?: string | null }
): SuggestResult {
  const content = typeof raw === 'string' ? raw.trim() : ''

  if (content.length < SUGGEST_MIN_LENGTH) {
    throw new SuggestError(
      `Sugestao muito curta: ${content.length} caracteres (minimo ${SUGGEST_MIN_LENGTH}).`
    )
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      throw new SuggestError('Sugestao contem placeholders nao resolvidos.')
    }
  }

  return {
    text: content,
    contract_version: SUGGEST_CONTRACT_VERSION,
    prompt_version: asNonEmptyString(versions?.prompt_version) || SUGGEST_PROMPT_VERSION,
    strategy_version: asNonEmptyString(versions?.strategy_version) || SUGGEST_STRATEGY_VERSION,
  }
}
