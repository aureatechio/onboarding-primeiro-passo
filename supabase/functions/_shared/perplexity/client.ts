/**
 * Shared Perplexity provider client.
 *
 * Centralises API key resolution, HTTP calls with timeout,
 * config loading from `perplexity_config` (with TTL cache),
 * error classes and common helpers used by every Perplexity
 * Edge Function.
 */

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../cors.ts'
import type { ProviderResponse } from './normalize.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL = 'sonar'
export const DEFAULT_API_BASE_URL = 'https://api.perplexity.ai'
export const DEFAULT_TIMEOUT_MS = 15_000

const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'SUGGEST_GUARDRAIL_VIOLATION'
  | 'PERPLEXITY_PROVIDER_ERROR'
  | 'PERPLEXITY_TIMEOUT'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  code: ErrorCode
  httpStatus: number

  constructor(code: ErrorCode, message: string, httpStatus: number) {
    super(message)
    this.code = code
    this.httpStatus = httpStatus
  }
}

export class ProviderHttpError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(`Perplexity HTTP ${status}`)
    this.status = status
    this.body = body
  }
}

// ---------------------------------------------------------------------------
// Database config
// ---------------------------------------------------------------------------

export interface PerplexityDbConfig {
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
  suggest_system_prompt?: string | null
  suggest_user_prompt_template?: string | null
  suggest_prompt_version?: string | null
  suggest_strategy_version?: string | null
}

let _cachedDbConfig: PerplexityDbConfig | null = null
let _cachedAt = 0

export async function loadDbConfig(
  supabase: SupabaseClient,
): Promise<PerplexityDbConfig | null> {
  if (_cachedDbConfig && Date.now() - _cachedAt < CONFIG_CACHE_TTL_MS) {
    return _cachedDbConfig
  }
  try {
    const { data, error } = await supabase
      .from('perplexity_config')
      .select('*')
      .limit(1)
      .single()
    if (error || !data) return null
    _cachedDbConfig = data as PerplexityDbConfig
    _cachedAt = Date.now()
    return _cachedDbConfig
  } catch {
    return null
  }
}

/**
 * Reset the config cache. Useful for tests.
 */
export function resetConfigCache(): void {
  _cachedDbConfig = null
  _cachedAt = 0
}

// ---------------------------------------------------------------------------
// Provider HTTP call
// ---------------------------------------------------------------------------

export async function callProvider(
  payload: Record<string, unknown>,
  dbCfg: PerplexityDbConfig | null,
): Promise<ProviderResponse> {
  const envApiKey = Deno.env.get('PERPLEXITY_API_KEY') ?? ''
  const dbApiKey = String(dbCfg?.api_key ?? '').trim()
  const effectiveApiKey = dbApiKey || envApiKey

  if (!effectiveApiKey) {
    throw new AppError(
      'INTERNAL_ERROR',
      'PERPLEXITY_API_KEY nao configurada (nem no banco, nem no runtime).',
      500,
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
  const effectiveBaseUrl =
    envBaseUrl || dbCfg?.api_base_url || DEFAULT_API_BASE_URL

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
    if (error instanceof AppError || error instanceof ProviderHttpError) {
      throw error
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(
        'PERPLEXITY_TIMEOUT',
        'Timeout ao chamar provider Perplexity.',
        504,
      )
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

export function mapError(error: unknown, logPrefix: string): AppError {
  if (error instanceof AppError) return error
  if (error instanceof ProviderHttpError) {
    console.error(`[${logPrefix}] provider http error`, {
      status: error.status,
      body_preview: error.body.slice(0, 240),
    })
    return new AppError(
      'PERPLEXITY_PROVIDER_ERROR',
      'Falha de provider Perplexity.',
      502,
    )
  }
  return new AppError('INTERNAL_ERROR', 'Erro interno inesperado.', 500)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function json(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

export function getConfiguredModel(
  dbConfig: PerplexityDbConfig | null,
): string {
  return Deno.env.get('PERPLEXITY_MODEL') ?? dbConfig?.model ?? DEFAULT_MODEL
}

export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(supabaseUrl, serviceRoleKey)
}
