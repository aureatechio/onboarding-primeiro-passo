export interface ProviderCitation {
  title?: string
  url?: string
  date?: string | null
}

export interface ProviderResponse {
  id?: string
  model?: string
  usage?: Record<string, unknown>
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  search_results?: ProviderCitation[]
}

export interface NormalizedInsight {
  variacao: number
  diferencial: string
  formato: string
  plataforma: string
  gancho: string
  chamada_principal: string
  texto_apoio: string
  cta: string
  direcao_criativa: string
}

export interface NormalizedBriefing {
  sobre_empresa: string
  publico_alvo: string
  sobre_celebridade: string
  objetivo_campanha: string
  mensagem_central: string
  tom_voz: string
  pontos_prova: string[]
  cta_principal: string
  cta_secundario: string
}

export interface NormalizedData {
  compra_id: string
  provider: 'perplexity'
  model: string
  contract_version: string
  prompt_version: string
  strategy_version: string
  briefing: NormalizedBriefing
  insights_pecas: NormalizedInsight[]
  citacoes: Array<{
    title: string
    url: string
    date: string | null
  }>
  raw: {
    provider_response_id: string | null
    usage: Record<string, unknown>
  }
}

export class NormalizeError extends Error {
  code: 'INVALID_PROVIDER_RESPONSE'
  constructor(message: string) {
    super(message)
    this.code = 'INVALID_PROVIDER_RESPONSE'
  }
}

function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function extractJsonObject(raw: string): Record<string, unknown> | null {
  const direct = raw.trim()
  try {
    return JSON.parse(direct)
  } catch {
    // keep trying best-effort extraction below
  }

  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

function normalizeInsight(item: Record<string, unknown>, index: number): NormalizedInsight {
  return {
    variacao: index + 1,
    diferencial: asNonEmptyString(item.diferencial),
    formato: asNonEmptyString(item.formato),
    plataforma: asNonEmptyString(item.plataforma),
    gancho: asNonEmptyString(item.gancho),
    chamada_principal: asNonEmptyString(item.chamada_principal),
    texto_apoio: asNonEmptyString(item.texto_apoio),
    cta: asNonEmptyString(item.cta),
    direcao_criativa: asNonEmptyString(item.direcao_criativa),
  }
}

function normalizeBriefingObject(input: Record<string, unknown>): NormalizedBriefing {
  const points = Array.isArray(input.pontos_prova)
    ? input.pontos_prova.map((point) => asNonEmptyString(point)).filter((point) => point.length > 0)
    : []

  return {
    sobre_empresa: asNonEmptyString(input.sobre_empresa),
    publico_alvo: asNonEmptyString(input.publico_alvo),
    sobre_celebridade: asNonEmptyString(input.sobre_celebridade),
    objetivo_campanha: asNonEmptyString(input.objetivo_campanha),
    mensagem_central: asNonEmptyString(input.mensagem_central),
    tom_voz: asNonEmptyString(input.tom_voz),
    pontos_prova: points,
    cta_principal: asNonEmptyString(input.cta_principal),
    cta_secundario: asNonEmptyString(input.cta_secundario),
  }
}

export function normalizeProviderResponse(
  input: { compra_id: string },
  providerResponse: ProviderResponse,
  fallbackModel: string,
  versions: {
    contractVersion: string
    promptVersion: string
    strategyVersion: string
  }
): NormalizedData {
  const content = providerResponse.choices?.[0]?.message?.content
  if (!content || !content.trim()) {
    throw new NormalizeError('Provider retornou resposta sem conteudo.')
  }

  const parsed = extractJsonObject(content)
  if (!parsed) {
    throw new NormalizeError('Nao foi possivel extrair JSON valido da resposta do provider.')
  }

  const briefingRaw = parsed.briefing
  const insightsRaw = parsed.insights_pecas
  if (
    !briefingRaw ||
    typeof briefingRaw !== 'object' ||
    !Array.isArray(insightsRaw) ||
    insightsRaw.length < 4
  ) {
    throw new NormalizeError('Resposta do provider nao atende estrutura minima de briefing.')
  }

  const normalizedBriefing = normalizeBriefingObject(briefingRaw as Record<string, unknown>)
  const normalizedInsights = insightsRaw.map((item, idx) =>
    normalizeInsight((item as Record<string, unknown>) ?? {}, idx)
  )

  const normalizedCitations = Array.isArray(providerResponse.search_results)
    ? providerResponse.search_results
      .map((item) => ({
        title: asNonEmptyString(item?.title),
        url: asNonEmptyString(item?.url),
        date: item?.date ? asNonEmptyString(item.date) || null : null,
      }))
      .filter((item) => item.url.length > 0)
    : []

  return {
    compra_id: input.compra_id,
    provider: 'perplexity',
    model: asNonEmptyString(providerResponse.model) || fallbackModel,
    contract_version: versions.contractVersion,
    prompt_version: versions.promptVersion,
    strategy_version: versions.strategyVersion,
    briefing: normalizedBriefing,
    insights_pecas: normalizedInsights,
    citacoes: normalizedCitations,
    raw: {
      provider_response_id: providerResponse.id ?? null,
      usage: providerResponse.usage ?? {},
    },
  }
}
