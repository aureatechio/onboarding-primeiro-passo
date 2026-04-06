import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors } from '../_shared/cors.ts'
import { buildPerplexityPayload } from '../_shared/perplexity/prompt.ts'
import {
  normalizeProviderResponse,
  type NormalizedData,
  type ProviderResponse,
} from '../_shared/perplexity/normalize.ts'
import {
  AppError,
  ProviderHttpError,
  callProvider as sharedCallProvider,
  loadDbConfig,
  getConfiguredModel,
  createServiceClient,
  json,
  asNonEmptyString,
  isValidUuid,
  isValidHttpUrl,
  type PerplexityDbConfig,
} from '../_shared/perplexity/client.ts'

const CONTRACT_VERSION = 'v1.0.0'
const PROMPT_VERSION = 'v1.0.0'
const STRATEGY_VERSION = 'v1.0.0'

type BriefingMode = 'text' | 'audio' | 'both'

interface BriefingInput {
  compra_id: string
  company_name: string
  company_site: string
  celebrity_name: string
  context?: {
    segment?: string | null
    region?: string | null
    campaign_goal_hint?: 'awareness' | 'conversao' | 'retencao' | null
  }
  briefing_input?: {
    mode?: BriefingMode | null
    text?: string | null
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
    },
  ) => Promise<void>
  resolvePersistMode: (
    compraId: string,
    fallbackMode: BriefingMode,
  ) => Promise<BriefingMode>
  now: () => number
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function sanitizeBriefingMode(value: unknown): BriefingMode | null {
  if (value === 'text' || value === 'audio' || value === 'both') return value
  return null
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

// ---------------------------------------------------------------------------
// Prompt payload builder
// ---------------------------------------------------------------------------

function buildPromptPayload(
  input: BriefingInput,
  model: string,
  dbConfig: PerplexityDbConfig | null = null,
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

// ---------------------------------------------------------------------------
// Default dependency factory
// ---------------------------------------------------------------------------

function createDependencies(): Dependencies & { supabase: SupabaseClient } {
  const supabase = createServiceClient()

  return {
    callProvider: async (payload: Record<string, unknown>) => {
      const dbCfg = await loadDbConfig(supabase)
      return sharedCallProvider(payload, dbCfg)
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
        { onConflict: 'compra_id' },
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
          500,
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

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

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
      502,
    )
  }
  return new AppError('INTERNAL_ERROR', 'Erro interno inesperado.', 500)
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

export async function handleRequest(
  req: Request,
  deps: (Dependencies & { supabase?: SupabaseClient }) = createDependencies(),
): Promise<Response> {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(
      { success: false, code: 'METHOD_NOT_ALLOWED', message: 'Metodo invalido. Use POST.' },
      405,
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
      sanitizeBriefingMode(input.briefing_input?.mode) ?? 'text',
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
    const normalized: NormalizedData = normalizeProviderResponse(
      input,
      providerResponse,
      configuredModel,
      { contractVersion, promptVersion, strategyVersion },
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
      { success: false, code: mapped.code, message: mapped.message },
      mapped.httpStatus,
    )
  }
}

Deno.serve((req) => handleRequest(req))
