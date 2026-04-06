import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { buildPerplexityPayload } from '../_shared/perplexity/prompt.ts'
import {
  normalizeProviderResponse,
  NormalizeError,
  type ProviderResponse,
} from '../_shared/perplexity/normalize.ts'
import {
  AppError,
  ProviderHttpError,
  callProvider,
  loadDbConfig,
  getConfiguredModel,
  createServiceClient,
  json,
  asNonEmptyString,
  isValidUuid,
  isValidHttpUrl,
} from '../_shared/perplexity/client.ts'

const CONTRACT_VERSION = 'v1.0.0'
const PROMPT_VERSION = 'v1.0.0'
const STRATEGY_VERSION = 'v1.0.0'

type GoalHint = 'awareness' | 'conversao' | 'retencao'
type BriefingMode = 'text' | 'audio' | 'both'

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

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function persistTestRun(
  supabase: ReturnType<typeof createServiceClient>,
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
  },
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

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

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

  const supabase = createServiceClient()

  // GET — list test run history
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const compraId = asNonEmptyString(url.searchParams.get('compra_id'))
    const limitRaw = Number(url.searchParams.get('limit') ?? '10')
    const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(Math.trunc(limitRaw), 1), 50)

    if (!compraId || !isValidUuid(compraId)) {
      return json(
        { success: false, code: 'INVALID_INPUT', message: 'compra_id deve ser UUID valido.' },
        400,
      )
    }

    const { data, error } = await supabase
      .from('perplexity_test_runs')
      .select(
        'id, compra_id, status, error_code, provider_model, prompt_version, strategy_version, contract_version, duration_ms, created_at',
      )
      .eq('compra_id', compraId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return json(
        { success: false, code: 'INTERNAL_ERROR', message: 'Falha ao carregar historico de testes.' },
        500,
      )
    }

    return json({ success: true, runs: data ?? [] })
  }

  if (req.method !== 'POST') {
    return json(
      { success: false, code: 'METHOD_NOT_ALLOWED', message: 'Metodo invalido. Use GET ou POST.' },
      405,
    )
  }

  // POST — execute test briefing
  const dbCfg = await loadDbConfig(supabase)
  const configuredModel = getConfiguredModel(dbCfg)
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

    const providerResponse: ProviderResponse = await callProvider(providerPayload, dbCfg)
    const normalized = normalizeProviderResponse(
      input,
      providerResponse,
      configuredModel,
      { contractVersion, promptVersion, strategyVersion },
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

    return json({ success: true, run_id: runId, duration_ms: durationMs, data: normalized })
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
      { success: false, code: mapped.code, message: mapped.message },
      mapped.httpStatus,
    )
  }
})
