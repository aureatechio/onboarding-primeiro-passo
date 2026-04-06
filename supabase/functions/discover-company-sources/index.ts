import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import {
  buildDiscoverPayload,
  normalizeDiscoverResponse,
  type DiscoverInput,
  type DiscoverProviderConfig,
} from '../_shared/perplexity/discover.ts'
import {
  AppError,
  callProvider,
  loadDbConfig,
  getConfiguredModel,
  createServiceClient,
  mapError,
  json,
  asNonEmptyString,
  isValidHttpUrl,
} from '../_shared/perplexity/client.ts'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

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
    const mapped = mapError(error, 'discover-company-sources')
    return json(
      { success: false, code: mapped.code, message: mapped.message },
      mapped.httpStatus,
    )
  }
})
