import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import {
  buildDiscoverPayload,
  normalizeDiscoverResponse,
  type DiscoverInput,
  type DiscoverProviderConfig,
} from '../_shared/perplexity/discover.ts'
import { type ProviderResponse } from '../_shared/perplexity/normalize.ts'

const DEFAULT_MODEL = 'sonar'
const DEFAULT_API_BASE_URL = 'https://api.perplexity.ai'
const DEFAULT_TIMEOUT_MS = 15_000

type ErrorCode =
  | 'INVALID_INPUT'
  | 'PERPLEXITY_PROVIDER_ERROR'
  | 'PERPLEXITY_TIMEOUT'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INTERNAL_ERROR'

interface PerplexityDbConfig {
  model: string
  api_base_url: string
  api_key?: string | null
  timeout_ms: number
  temperature: number
  top_p: number
  search_mode: string
  search_recency_filter: string
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

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateInput(body: unknown): DiscoverInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_INPUT', 'Payload JSON invalido.', 400)
  }
  const payload = body as Record<string, unknown>
  const companyName = asNonEmptyString(payload.company_name)

  if (companyName.length < 2 || companyName.length > 120) {
    throw new AppError('INVALID_INPUT', 'company_name fora do intervalo permitido (2-120).', 400)
  }

  const companySiteRaw = asNonEmptyString(payload.company_site)
  const companySite =
    companySiteRaw.length > 0
      ? isValidHttpUrl(companySiteRaw)
        ? companySiteRaw
        : null
      : null

  return { company_name: companyName, company_site: companySite }
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
  if (error instanceof ProviderHttpError) {
    console.error('[discover-company-sources] provider http error', {
      status: error.status,
      body_preview: error.body.slice(0, 240),
    })
    return new AppError(
      'PERPLEXITY_PROVIDER_ERROR',
      'Falha de provider Perplexity ao descobrir fontes.',
      502
    )
  }
  return new AppError('INTERNAL_ERROR', 'Erro interno inesperado.', 500)
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(
      { success: false, code: 'METHOD_NOT_ALLOWED', message: 'Metodo invalido. Use POST.' },
      405
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    const body = await req.json()
    const input = validateInput(body)
    const dbCfg = await loadDbConfig(supabase)

    const configuredModel = Deno.env.get('PERPLEXITY_MODEL') ?? dbCfg?.model ?? DEFAULT_MODEL
    const providerConfig: DiscoverProviderConfig = {
      model: configuredModel,
      api_base_url: dbCfg?.api_base_url,
      api_key: dbCfg?.api_key,
      timeout_ms: dbCfg?.timeout_ms,
      temperature: dbCfg?.temperature ?? 0.1,
      top_p: dbCfg?.top_p,
      search_mode: dbCfg?.search_mode,
      search_recency_filter: dbCfg?.search_recency_filter ?? 'year',
    }

    const providerPayload = buildDiscoverPayload(input, providerConfig)
    const providerResponse = await callProvider(providerPayload, dbCfg)

    const rawContent = providerResponse.choices?.[0]?.message?.content ?? ''
    const result = normalizeDiscoverResponse(rawContent)

    return json({ success: true, data: result })
  } catch (error) {
    const mapped = mapError(error)
    return json(
      { success: false, code: mapped.code, message: mapped.message },
      mapped.httpStatus
    )
  }
})
