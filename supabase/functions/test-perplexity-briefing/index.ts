import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { buildPerplexityPayload } from '../_shared/perplexity/prompt.ts'
import {
  normalizeProviderResponse,
  type ProviderResponse,
  NormalizeError,
} from '../_shared/perplexity/normalize.ts'

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
type ErrorCode =
  | 'INVALID_INPUT'
  | 'PERPLEXITY_PROVIDER_ERROR'
  | 'PERPLEXITY_TIMEOUT'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INTERNAL_ERROR'

interface TestBriefingInput {
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

function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateInput(body: unknown): TestBriefingInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_INPUT', 'Payload JSON invalido.', 400)
  }

  const payload = body as TestBriefingInput
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

async function callProvider(
  payload: Record<string, unknown>,
  dbCfg: PerplexityDbConfig | null
): Promise<ProviderResponse> {
  const envApiKey = Deno.env.get('PERPLEXITY_API_KEY') ?? ''
  const dbApiKey = String(dbCfg?.api_key ?? '').trim()
  const effectiveApiKey = dbApiKey || envApiKey

  if (!effectiveApiKey) {
    throw new AppError(
      'INTERNAL_ERROR',
      'PERPLEXITY_API_KEY nao configurada (nem no banco, nem no runtime).',
      500
    )
  }

  const envBaseUrl = Deno.env.get('PERPLEXITY_API_BASE_URL') ?? ''
  const envTimeoutRaw = Deno.env.get('PERPLEXITY_TIMEOUT_MS')
  const envTimeout = envTimeoutRaw ? Number(envTimeoutRaw) : NaN
  const dbTimeout = Number(dbCfg?.timeout_ms ?? NaN)
  const effectiveTimeout = Number.isFinite(envTimeout)
    ? envTimeout
    : Number.isFinite(dbTimeout)
      ? dbTimeout
      : DEFAULT_TIMEOUT_MS
  const effectiveBaseUrl = envBaseUrl || dbCfg?.api_base_url || DEFAULT_API_BASE_URL

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), effectiveTimeout)
  try {
    const response = await fetch(`${effectiveBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new ProviderHttpError(response.status, body)
    }
    return (await response.json()) as ProviderResponse
  } catch (error) {
    if (error instanceof AppError || error instanceof ProviderHttpError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('PERPLEXITY_TIMEOUT', 'Timeout ao chamar provider Perplexity.', 504)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function mapError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof NormalizeError) {
    return new AppError('INVALID_PROVIDER_RESPONSE', error.message, 502)
  }
  if (error instanceof ProviderHttpError) {
    console.error('[test-perplexity-briefing] provider http error', {
      status: error.status,
      body_preview: error.body.slice(0, 240),
    })
    return new AppError(
      'PERPLEXITY_PROVIDER_ERROR',
      'Falha de provider Perplexity ao gerar briefing de teste.',
      502
    )
  }
  return new AppError('INTERNAL_ERROR', 'Erro interno inesperado.', 500)
}

async function persistTestRun(
  supabase: ReturnType<typeof createClient>,
  payload: {
    compra_id: string
    input_json: Record<string, unknown>
    output_json: Record<string, unknown> | null
    status: 'done' | 'error'
    error_code: string | null
    error_message: string | null
    provider_model: string
    prompt_version: string
    strategy_version: string
    contract_version: string
    duration_ms: number
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from('perplexity_test_runs')
    .insert({
      compra_id: payload.compra_id,
      input_json: payload.input_json,
      output_json: payload.output_json,
      status: payload.status,
      error_code: payload.error_code,
      error_message: payload.error_message,
      provider_model: payload.provider_model,
      prompt_version: payload.prompt_version,
      strategy_version: payload.strategy_version,
      contract_version: payload.contract_version,
      duration_ms: payload.duration_ms,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[test-perplexity-briefing] persist error', {
      compra_id: payload.compra_id,
      message: error.message,
      code: error.code,
    })
    return null
  }

  return (data?.id as string | undefined) ?? null
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const compraId = asNonEmptyString(url.searchParams.get('compra_id'))
    const limitRaw = Number(url.searchParams.get('limit') ?? '10')
    const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(Math.trunc(limitRaw), 1), 50)

    if (!compraId || !isValidUuid(compraId)) {
      return json(
        {
          success: false,
          code: 'INVALID_INPUT',
          message: 'compra_id deve ser UUID valido.',
        },
        400
      )
    }

    const { data, error } = await supabase
      .from('perplexity_test_runs')
      .select(
        'id, compra_id, status, error_code, provider_model, prompt_version, strategy_version, contract_version, duration_ms, created_at'
      )
      .eq('compra_id', compraId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return json(
        {
          success: false,
          code: 'INTERNAL_ERROR',
          message: 'Falha ao carregar historico de testes.',
        },
        500
      )
    }

    return json({
      success: true,
      runs: data ?? [],
    })
  }

  if (req.method !== 'POST') {
    return json(
      {
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Metodo invalido. Use GET ou POST.',
      },
      405
    )
  }

  const dbCfg = await loadDbConfig(supabase)
  const configuredModel = Deno.env.get('PERPLEXITY_MODEL') ?? dbCfg?.model ?? DEFAULT_MODEL
  const promptVersion = dbCfg?.prompt_version ?? PROMPT_VERSION
  const strategyVersion = dbCfg?.strategy_version ?? STRATEGY_VERSION
  const contractVersion = dbCfg?.contract_version ?? CONTRACT_VERSION

  const startedAt = Date.now()
  let input: TestBriefingInput | null = null

  try {
    input = validateInput(await req.json())
    const providerPayload = buildPerplexityPayload(input, {
      model: configuredModel,
      system_prompt: dbCfg?.system_prompt,
      user_prompt_template: dbCfg?.user_prompt_template,
      search_mode: dbCfg?.search_mode,
      search_recency_filter: dbCfg?.search_recency_filter,
      temperature: dbCfg?.temperature,
      top_p: dbCfg?.top_p,
      insights_count: dbCfg?.insights_count,
    })

    const providerResponse = await callProvider(providerPayload, dbCfg)
    const normalized = normalizeProviderResponse(
      input,
      providerResponse,
      configuredModel,
      {
        contractVersion,
        promptVersion,
        strategyVersion,
      }
    )
    const durationMs = Date.now() - startedAt
    const runId = await persistTestRun(supabase, {
      compra_id: input.compra_id,
      input_json: input as unknown as Record<string, unknown>,
      output_json: normalized as unknown as Record<string, unknown>,
      status: 'done',
      error_code: null,
      error_message: null,
      provider_model: normalized.model,
      prompt_version: normalized.prompt_version,
      strategy_version: normalized.strategy_version,
      contract_version: normalized.contract_version,
      duration_ms: durationMs,
    })

    return json({
      success: true,
      run_id: runId,
      duration_ms: durationMs,
      data: normalized,
    })
  } catch (error) {
    const mapped = mapError(error)
    const durationMs = Date.now() - startedAt

    if (input?.compra_id) {
      await persistTestRun(supabase, {
        compra_id: input.compra_id,
        input_json: input as unknown as Record<string, unknown>,
        output_json: null,
        status: 'error',
        error_code: mapped.code,
        error_message: mapped.message,
        provider_model: configuredModel,
        prompt_version: promptVersion,
        strategy_version: strategyVersion,
        contract_version: contractVersion,
        duration_ms: durationMs,
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
})
