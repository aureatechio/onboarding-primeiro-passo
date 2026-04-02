import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { buildPerplexityPayload } from '../_shared/perplexity/prompt.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CONTRACT_VERSION = 'v1.0.0'
const PROMPT_VERSION = 'v1.0.0'
const STRATEGY_VERSION = 'v1.0.0'
const DEFAULT_MODEL = 'sonar'
const DEFAULT_API_BASE_URL = 'https://api.perplexity.ai'
const DEFAULT_TIMEOUT_MS = 15_000

type GoalHint = 'awareness' | 'conversao' | 'retencao'
type BriefingMode = 'text' | 'audio' | 'both'

interface BriefingInput {
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
    mode?: 'text' | 'audio' | 'both' | null
    text?: string | null
  }
}

interface ProviderCitation {
  title?: string
  url?: string
  date?: string | null
}

interface ProviderResponse {
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

interface NormalizedInsight {
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

interface NormalizedBriefing {
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

interface NormalizedData {
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

interface Dependencies {
  callProvider: (payload: Record<string, unknown>) => Promise<ProviderResponse>
  persistBriefing: (
    compraId: string,
    payload: {
      mode: BriefingMode
      briefing_json: Record<string, unknown> | null
      citations_json: Array<Record<string, unknown>> | null
      provider_model: string
      prompt_version: string
      strategy_version: string
      contract_version: string
      status: 'pending' | 'done' | 'error'
      error_code?: string | null
    }
  ) => Promise<void>
  resolvePersistMode: (
    compraId: string,
    fallbackMode: BriefingMode
  ) => Promise<BriefingMode>
  now: () => number
}

type ErrorCode =
  | 'INVALID_INPUT'
  | 'PERPLEXITY_PROVIDER_ERROR'
  | 'PERPLEXITY_TIMEOUT'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INTERNAL_ERROR'

class AppError extends Error {
  code: ErrorCode
  httpStatus: number

  constructor(code: ErrorCode, message: string, httpStatus: number) {
    super(message)
    this.code = code
    this.httpStatus = httpStatus
  }
}

class ProviderHttpError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(`Perplexity HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function sanitizeBriefingMode(value: unknown): BriefingMode | null {
  if (value === 'text' || value === 'audio' || value === 'both') return value
  return null
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
  input: BriefingInput,
  providerResponse: ProviderResponse,
  fallbackModel: string
): NormalizedData {
  const content = providerResponse.choices?.[0]?.message?.content
  if (!content || !content.trim()) {
    throw new AppError(
      'INVALID_PROVIDER_RESPONSE',
      'Provider retornou resposta sem conteudo.',
      502
    )
  }

  const parsed = extractJsonObject(content)
  if (!parsed) {
    throw new AppError(
      'INVALID_PROVIDER_RESPONSE',
      'Nao foi possivel extrair JSON valido da resposta do provider.',
      502
    )
  }

  const briefingRaw = parsed.briefing
  const insightsRaw = parsed.insights_pecas

  if (
    !briefingRaw ||
    typeof briefingRaw !== 'object' ||
    !Array.isArray(insightsRaw) ||
    insightsRaw.length < 4
  ) {
    throw new AppError(
      'INVALID_PROVIDER_RESPONSE',
      'Resposta do provider nao atende estrutura minima de briefing.',
      502
    )
  }

  const normalizedBriefing = normalizeBriefingObject(
    briefingRaw as Record<string, unknown>
  )
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
    contract_version: CONTRACT_VERSION,
    prompt_version: PROMPT_VERSION,
    strategy_version: STRATEGY_VERSION,
    briefing: normalizedBriefing,
    insights_pecas: normalizedInsights,
    citacoes: normalizedCitations,
    raw: {
      provider_response_id: providerResponse.id ?? null,
      usage: providerResponse.usage ?? {},
    },
  }
}

function validateInput(body: unknown): BriefingInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_INPUT', 'Payload JSON invalido.', 400)
  }

  const payload = body as BriefingInput
  const compraId = asNonEmptyString(payload.compra_id)
  const companyName = asNonEmptyString(payload.company_name)
  const companySite = asNonEmptyString(payload.company_site)
  const celebrityName = asNonEmptyString(payload.celebrity_name)

  if (!isValidUuid(compraId)) {
    throw new AppError('INVALID_INPUT', 'compra_id deve ser UUID valido.', 400)
  }
  if (companyName.length < 2 || companyName.length > 120) {
    throw new AppError('INVALID_INPUT', 'company_name fora do intervalo permitido.', 400)
  }
  if (!isValidHttpUrl(companySite)) {
    throw new AppError('INVALID_INPUT', 'company_site deve ser URL HTTP/HTTPS valida.', 400)
  }
  if (celebrityName.length < 2 || celebrityName.length > 120) {
    throw new AppError('INVALID_INPUT', 'celebrity_name fora do intervalo permitido.', 400)
  }

  return {
    compra_id: compraId,
    company_name: companyName,
    company_site: companySite,
    celebrity_name: celebrityName,
    context: payload.context ?? {},
    briefing_input: payload.briefing_input ?? {},
  }
}

function buildPromptPayload(
  input: BriefingInput,
  model: string,
  dbConfig: PerplexityDbConfig | null = null
): Record<string, unknown> {
  return buildPerplexityPayload(input, {
    model,
    system_prompt: dbConfig?.system_prompt,
    user_prompt_template: dbConfig?.user_prompt_template,
    search_mode: dbConfig?.search_mode,
    search_recency_filter: dbConfig?.search_recency_filter,
    temperature: dbConfig?.temperature,
    top_p: dbConfig?.top_p,
    insights_count: dbConfig?.insights_count,
  })
}

interface PerplexityDbConfig {
  model: string
  api_base_url: string
  api_key?: string | null
  timeout_ms: number
  temperature: number
  top_p: number
  search_mode: string
  search_recency_filter: string
  system_prompt: string
  user_prompt_template: string
  insights_count: number
  prompt_version: string
  strategy_version: string
  contract_version: string
}

let _cachedDbConfig: PerplexityDbConfig | null = null

async function loadDbConfig(
  supabase: ReturnType<typeof createClient>
): Promise<PerplexityDbConfig | null> {
  if (_cachedDbConfig) return _cachedDbConfig
  try {
    const { data, error } = await supabase
      .from('perplexity_config')
      .select('*')
      .limit(1)
      .single()
    if (error || !data) return null
    _cachedDbConfig = data as PerplexityDbConfig
    return _cachedDbConfig
  } catch {
    return null
  }
}

function createDependencies(): Dependencies & { supabase: ReturnType<typeof createClient> } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const envApiKey = Deno.env.get('PERPLEXITY_API_KEY') ?? ''
  const model = Deno.env.get('PERPLEXITY_MODEL') ?? DEFAULT_MODEL
  const apiBaseUrl = Deno.env.get('PERPLEXITY_API_BASE_URL') ?? DEFAULT_API_BASE_URL
  const timeoutMs = Number(Deno.env.get('PERPLEXITY_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS)

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  return {
    callProvider: async (payload: Record<string, unknown>) => {
      const dbCfg = await loadDbConfig(supabase)
      const dbApiKey = String(dbCfg?.api_key ?? '').trim()
      const effectiveApiKey = dbApiKey || envApiKey

      if (!effectiveApiKey) {
        throw new AppError(
          'INTERNAL_ERROR',
          'PERPLEXITY_API_KEY nao configurada (nem no banco, nem no runtime).',
          500
        )
      }

      const effectiveTimeout = timeoutMs || dbCfg?.timeout_ms || DEFAULT_TIMEOUT_MS
      const effectiveBaseUrl = apiBaseUrl || dbCfg?.api_base_url || DEFAULT_API_BASE_URL
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), effectiveTimeout)

      try {
        const response = await fetch(`${effectiveBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${effectiveApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            model,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const body = await response.text()
          throw new ProviderHttpError(response.status, body)
        }

        return (await response.json()) as ProviderResponse
      } catch (error) {
        if (error instanceof AppError || error instanceof ProviderHttpError) {
          throw error
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new AppError(
            'PERPLEXITY_TIMEOUT',
            'Timeout ao chamar provider Perplexity.',
            504
          )
        }
        throw error
      } finally {
        clearTimeout(timer)
      }
    },
    persistBriefing: async (compraId, payload) => {
      const { error } = await supabase.from('onboarding_briefings').upsert(
        {
          compra_id: compraId,
          mode: payload.mode,
          briefing_json: payload.briefing_json,
          citations_json: payload.citations_json,
          provider: 'perplexity',
          provider_model: payload.provider_model,
          prompt_version: payload.prompt_version,
          strategy_version: payload.strategy_version,
          contract_version: payload.contract_version,
          status: payload.status,
          error_code: payload.error_code ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'compra_id' }
      )

      if (error) {
        console.error('[generate-campaign-briefing] persist error', {
          compra_id: compraId,
          code: error.code,
          message: error.message,
        })
        throw new AppError(
          'INTERNAL_ERROR',
          'Falha ao persistir briefing gerado no banco.',
          500
        )
      }
    },
    resolvePersistMode: async (compraId, fallbackMode) => {
      const { data, error } = await supabase
        .from('onboarding_briefings')
        .select('mode')
        .eq('compra_id', compraId)
        .maybeSingle()

      if (error) {
        console.warn('[generate-campaign-briefing] resolve mode fallback (select error)', {
          compra_id: compraId,
          message: error.message,
        })
        return fallbackMode
      }

      const existingMode = sanitizeBriefingMode(data?.mode)
      if (existingMode) return existingMode
      return fallbackMode
    },
    now: () => Date.now(),
    supabase,
  }
}

function getConfiguredModel(dbConfig: PerplexityDbConfig | null): string {
  return Deno.env.get('PERPLEXITY_MODEL') ?? dbConfig?.model ?? DEFAULT_MODEL
}

function mapProviderError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof ProviderHttpError) {
    console.error('[generate-campaign-briefing] provider http error', {
      status: error.status,
      body_preview: error.body.slice(0, 240),
    })
    return new AppError(
      'PERPLEXITY_PROVIDER_ERROR',
      'Falha de provider Perplexity ao gerar briefing.',
      502
    )
  }
  return new AppError('INTERNAL_ERROR', 'Erro interno inesperado.', 500)
}

export async function handleRequest(
  req: Request,
  deps: (Dependencies & { supabase?: ReturnType<typeof createClient> }) = createDependencies()
): Promise<Response> {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metodo invalido. Use POST.',
      },
      405
    )
  }

  const dbConfig = deps.supabase ? await loadDbConfig(deps.supabase) : null
  const startedAt = deps.now()
  const configuredModel = getConfiguredModel(dbConfig)
  const promptVersion = dbConfig?.prompt_version ?? PROMPT_VERSION
  const strategyVersion = dbConfig?.strategy_version ?? STRATEGY_VERSION
  const contractVersion = dbConfig?.contract_version ?? CONTRACT_VERSION

  let input: BriefingInput | null = null
  let persistMode: BriefingMode = 'text'
  try {
    input = validateInput(await req.json())
    persistMode = await deps.resolvePersistMode(
      input.compra_id,
      sanitizeBriefingMode(input.briefing_input?.mode) ?? 'text'
    )

    console.log('[briefing.request.received]', {
      compra_id: input.compra_id,
      provider: 'perplexity',
      model: configuredModel,
      prompt_version: promptVersion,
      strategy_version: strategyVersion,
      contract_version: contractVersion,
      config_source: dbConfig ? 'database' : 'hardcoded',
    })

    await deps.persistBriefing(input.compra_id, {
      mode: persistMode,
      briefing_json: null,
      citations_json: null,
      provider_model: configuredModel,
      prompt_version: promptVersion,
      strategy_version: strategyVersion,
      contract_version: contractVersion,
      status: 'pending',
      error_code: null,
    })

    const providerPayload = buildPromptPayload(input, configuredModel, dbConfig)
    console.log('[briefing.provider.called]', {
      compra_id: input.compra_id,
      provider: 'perplexity',
      model: configuredModel,
    })

    const providerResponse = await deps.callProvider(providerPayload)
    const normalized = normalizeProviderResponse(
      input,
      providerResponse,
      configuredModel
    )

    await deps.persistBriefing(input.compra_id, {
      mode: persistMode,
      briefing_json: {
        briefing: normalized.briefing,
        insights_pecas: normalized.insights_pecas,
      },
      citations_json: normalized.citacoes,
      provider_model: normalized.model,
      prompt_version: normalized.prompt_version,
      strategy_version: normalized.strategy_version,
      contract_version: normalized.contract_version,
      status: 'done',
      error_code: null,
    })

    console.log('[briefing.provider.succeeded]', {
      compra_id: input.compra_id,
      provider: 'perplexity',
      model: normalized.model,
      duration_ms: deps.now() - startedAt,
    })
    console.log('[briefing.persist.succeeded]', {
      compra_id: input.compra_id,
      status: 'done',
    })

    return json({ success: true, data: normalized })
  } catch (error) {
    const mapped = mapProviderError(error)

    if (input?.compra_id) {
      try {
        await deps.persistBriefing(input.compra_id, {
          mode: persistMode,
          briefing_json: null,
          citations_json: null,
          provider_model: configuredModel,
          prompt_version: promptVersion,
          strategy_version: strategyVersion,
          contract_version: contractVersion,
          status: 'error',
          error_code: mapped.code,
        })
        console.log('[briefing.persist.failed]', {
          compra_id: input.compra_id,
          error_code: mapped.code,
          duration_ms: deps.now() - startedAt,
        })
      } catch (persistError) {
        console.error('[generate-campaign-briefing] failed to persist error state', {
          compra_id: input.compra_id,
          error: String(persistError),
        })
      }
    }

    if (mapped.code === 'PERPLEXITY_PROVIDER_ERROR') {
      console.error('[briefing.provider.failed]', {
        compra_id: input?.compra_id ?? null,
        error_code: mapped.code,
        duration_ms: deps.now() - startedAt,
      })
    }

    return json(
      {
        success: false,
        code: mapped.code,
        message: mapped.message,
      },
      mapped.httpStatus
    )
  }
}

Deno.serve((req) => handleRequest(req))
