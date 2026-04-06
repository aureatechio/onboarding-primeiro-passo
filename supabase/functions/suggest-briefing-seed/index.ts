import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import {
  buildSuggestPayload,
  normalizeSuggestResponse,
  SuggestError,
  type SuggestInput,
  type SuggestProviderConfig,
} from '../_shared/perplexity/suggest.ts'
import {
  AppError,
  ProviderHttpError,
  callProvider,
  loadDbConfig,
  getConfiguredModel,
  createServiceClient,
  json,
  asNonEmptyString,
  isValidHttpUrl,
} from '../_shared/perplexity/client.ts'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateInput(body: unknown): SuggestInput {
  if (!body || typeof body !== 'object') {
    throw new AppError('INVALID_INPUT', 'Payload JSON invalido.', 400)
  }
  const payload = body as Record<string, unknown>

  const companyName = asNonEmptyString(payload.company_name)
  if (companyName.length < 2 || companyName.length > 120) {
    throw new AppError('INVALID_INPUT', 'company_name fora do intervalo permitido (2-120).', 400)
  }

  const companySite = asNonEmptyString(payload.company_site)
  if (!isValidHttpUrl(companySite)) {
    throw new AppError('INVALID_INPUT', 'company_site deve ser URL HTTP/HTTPS valida.', 400)
  }

  const celebrityName = asNonEmptyString(payload.celebrity_name)
  if (celebrityName.length < 2 || celebrityName.length > 120) {
    throw new AppError('INVALID_INPUT', 'celebrity_name fora do intervalo permitido (2-120).', 400)
  }

  const sourcesRaw = payload.sources
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw.filter((s) => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
    : undefined

  return {
    company_name: companyName,
    company_site: companySite,
    celebrity_name: celebrityName,
    sources,
    segment: asNonEmptyString(payload.segment) || null,
    region: asNonEmptyString(payload.region) || null,
    campaign_goal_hint: asNonEmptyString(payload.campaign_goal_hint) || null,
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof SuggestError) {
    return new AppError('SUGGEST_GUARDRAIL_VIOLATION', error.message, 422)
  }
  if (error instanceof ProviderHttpError) {
    console.error('[suggest-briefing-seed] provider http error', {
      status: error.status,
      body_preview: error.body.slice(0, 240),
    })
    return new AppError(
      'PERPLEXITY_PROVIDER_ERROR',
      'Falha de provider Perplexity ao sugerir briefing.',
      502,
    )
  }
  return new AppError('INTERNAL_ERROR', 'Erro interno inesperado.', 500)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(
      { success: false, code: 'METHOD_NOT_ALLOWED', message: 'Metodo invalido. Use POST.' },
      405,
    )
  }

  const supabase = createServiceClient()

  try {
    const body = await req.json()
    const input = validateInput(body)
    const dbCfg = await loadDbConfig(supabase)

    const configuredModel = getConfiguredModel(dbCfg)
    const providerConfig: SuggestProviderConfig = {
      model: configuredModel,
      api_base_url: dbCfg?.api_base_url,
      api_key: dbCfg?.api_key,
      timeout_ms: dbCfg?.timeout_ms,
      temperature: dbCfg?.temperature ?? 0.5,
      top_p: dbCfg?.top_p,
      search_mode: dbCfg?.search_mode,
      search_recency_filter: dbCfg?.search_recency_filter,
      suggest_system_prompt: dbCfg?.suggest_system_prompt ?? null,
      suggest_user_prompt_template: dbCfg?.suggest_user_prompt_template ?? null,
      suggest_prompt_version: dbCfg?.suggest_prompt_version ?? null,
      suggest_strategy_version: dbCfg?.suggest_strategy_version ?? null,
    }

    const providerPayload = buildSuggestPayload(input, providerConfig)
    const providerResponse = await callProvider(providerPayload, dbCfg)

    const rawContent = providerResponse.choices?.[0]?.message?.content ?? ''
    const result = normalizeSuggestResponse(rawContent, {
      prompt_version: providerConfig.suggest_prompt_version ?? null,
      strategy_version: providerConfig.suggest_strategy_version ?? null,
    })

    return json({ success: true, data: result })
  } catch (error) {
    const mapped = mapError(error)
    return json(
      { success: false, code: mapped.code, message: mapped.message },
      mapped.httpStatus,
    )
  }
})
