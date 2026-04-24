import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireServiceRole } from '../_shared/service-role-auth.ts'
import { checkAiCampaignEligibility } from '../_shared/ai-campaign/eligibility.ts'
import {
  loadEnrichmentConfig,
  type EnrichmentConfig,
} from '../_shared/enrichment/config.ts'
import { parseBackoffMs } from '../_shared/enrichment/gemini-client.ts'
import {
  extractColorsFromImage,
  extractColorsViaGemini,
  extractColorsFromCss,
  decodePngPixels,
} from '../_shared/enrichment/color-extractor.ts'
import { fetchAndParseCss, type ScrapeConfig } from '../_shared/enrichment/css-scraper.ts'
import { detectAndValidateFont, type AttemptLog } from '../_shared/enrichment/font-detector.ts'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG = '[onboarding-enrichment]'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_PHASES = ['colors', 'font', 'briefing', 'campaign'] as const
type PhaseName = (typeof VALID_PHASES)[number]

const PHASE_STATUS_COLS: Record<PhaseName, string> = {
  colors: 'phase_colors_status',
  font: 'phase_font_status',
  briefing: 'phase_briefing_status',
  campaign: 'phase_campaign_status',
}

const BUCKET = 'onboarding-identity'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'ttclid', 'twclid', 'li_fat_id', 'igshid',
  'mc_cid', 'mc_eid', '_ga', '_gl',
])

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key)) u.searchParams.delete(key)
    }
    // Remove fragment
    u.hash = ''
    // Remove trailing slash from pathname (keep root)
    const path = u.pathname.replace(/\/$/, '') || '/'
    return `${u.origin}${path === '/' ? '' : path}${u.search}`
  } catch {
    return raw
  }
}

function guessMimeType(path: string): string {
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  return 'image/png'
}

interface PhaseLogEntry {
  phase: PhaseName
  status: string
  source?: string
  started_at: string
  finished_at?: string
  duration_ms?: number
  attempts: Array<{
    method: string
    success: boolean
    duration_ms: number
    result_summary: string
    error?: string
    retry_count?: number
  }>
}

interface PipelineContext {
  supabase: SupabaseClient
  config: EnrichmentConfig
  geminiApiKey: string
  jobId: string
  compraId: string
  identity: Record<string, unknown>
  companyName: string
  celebrityName: string
  segment: string
  region: string
  siteUrl: string | null
  instagramHandle: string | null
  logoPath: string | null
}

// ---------------------------------------------------------------------------
// DB update helpers
// ---------------------------------------------------------------------------

async function updateJob(
  supabase: SupabaseClient,
  jobId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('onboarding_enrichment_jobs')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) console.error(`${LOG} updateJob error`, error)
}

async function appendPhaseLog(
  supabase: SupabaseClient,
  jobId: string,
  entry: PhaseLogEntry,
): Promise<void> {
  const { data: job } = await supabase
    .from('onboarding_enrichment_jobs')
    .select('phases_log')
    .eq('id', jobId)
    .single()

  const currentLog = Array.isArray(job?.phases_log) ? job.phases_log : []

  const existing = currentLog.findIndex(
    (e: PhaseLogEntry) => e.phase === entry.phase && !e.finished_at,
  )
  if (existing >= 0) {
    currentLog[existing] = { ...currentLog[existing], ...entry }
  } else {
    currentLog.push(entry)
  }

  await updateJob(supabase, jobId, { phases_log: currentLog })
}

// ---------------------------------------------------------------------------
// Phase 1: Colors
// ---------------------------------------------------------------------------

interface ColorResult {
  palette: string[]
  source: string
  attempts: PhaseLogEntry['attempts']
}

async function executeColorsPhase(ctx: PipelineContext): Promise<ColorResult> {
  const { supabase, config, geminiApiKey, identity } = ctx
  const attempts: PhaseLogEntry['attempts'] = []
  const logoPath = identity.logo_path as string | null

  // Attempt 1: Logo algorithm
  if (logoPath) {
    const start = Date.now()
    try {
      const { data: fileData, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(logoPath)

      if (!dlError && fileData) {
        const bytes = new Uint8Array(await fileData.arrayBuffer())
        const pixelData = await decodePngPixels(bytes)

        if (pixelData) {
          const colors = extractColorsFromImage(bytes, pixelData, config.color_extraction_max)
          if (colors.length > 0) {
            attempts.push({
              method: 'logo_algorithm',
              success: true,
              duration_ms: Date.now() - start,
              result_summary: `${colors.length} cores extraidas`,
            })
            return { palette: colors, source: 'logo_algorithm', attempts }
          }
        }

        // Attempt 2: Logo Gemini Vision
        const geminiStart = Date.now()
        const mimeType = guessMimeType(logoPath)
        const backoffMs = parseBackoffMs(config.retry_gemini_backoff_ms)
        const geminiColors = await extractColorsViaGemini(bytes, mimeType, config.color_gemini_prompt, {
          apiKey: geminiApiKey,
          modelName: config.gemini_model_name,
          baseUrl: config.gemini_api_base_url,
          temperature: config.gemini_temperature,
          timeoutMs: config.timeout_colors_ms,
          maxRetries: config.retry_gemini_max,
          backoffMs,
        })

        attempts.push({
          method: 'logo_gemini',
          success: geminiColors.length > 0,
          duration_ms: Date.now() - geminiStart,
          result_summary: geminiColors.length > 0
            ? `${geminiColors.length} cores via Gemini`
            : 'Gemini nao retornou cores',
        })

        if (geminiColors.length > 0) {
          return { palette: geminiColors, source: 'logo_gemini', attempts }
        }
      } else {
        attempts.push({
          method: 'logo_algorithm',
          success: false,
          duration_ms: Date.now() - start,
          result_summary: 'erro no download do logo',
          error: dlError?.message?.slice(0, 200),
        })
      }
    } catch (err) {
      attempts.push({
        method: 'logo_algorithm',
        success: false,
        duration_ms: Date.now() - start,
        result_summary: 'erro na extracao',
        error: String(err).slice(0, 200),
      })
    }
  }

  // Attempt 3: Site CSS
  if (ctx.siteUrl) {
    const start = Date.now()
    try {
      const scrapeConfig: ScrapeConfig = {
        timeoutMs: config.scrape_timeout_ms,
        userAgent: config.scrape_user_agent,
        maxRetries: config.retry_scrape_max,
        backoffMs: parseBackoffMs(config.retry_scrape_backoff_ms),
      }
      const analysis = await fetchAndParseCss(ctx.siteUrl, scrapeConfig)
      if (analysis.colors.length > 0) {
        const colors = analysis.colors.slice(0, config.color_extraction_max)
        attempts.push({
          method: 'site_css',
          success: true,
          duration_ms: Date.now() - start,
          result_summary: `${colors.length} cores via CSS`,
        })
        return { palette: colors, source: 'site_css', attempts }
      }
      attempts.push({
        method: 'site_css',
        success: false,
        duration_ms: Date.now() - start,
        result_summary: 'nenhuma cor encontrada no CSS',
      })
    } catch (err) {
      attempts.push({
        method: 'site_css',
        success: false,
        duration_ms: Date.now() - start,
        result_summary: 'erro no scraping',
        error: String(err).slice(0, 200),
      })
    }
  }

  // Nenhuma estrategia retornou cores — fase falha sem fallback
  return { palette: [], source: 'none', attempts }
}

// ---------------------------------------------------------------------------
// Phase 2: Font
// ---------------------------------------------------------------------------

interface FontResult {
  font: string
  source: string
  validated: boolean
  validationReason: string | null
  attempts: PhaseLogEntry['attempts']
}

async function executeFontPhase(ctx: PipelineContext): Promise<FontResult> {
  const result = await detectAndValidateFont({
    siteUrl: ctx.siteUrl,
    companyName: ctx.companyName,
    segment: ctx.segment,
    config: ctx.config,
    geminiApiKey: ctx.geminiApiKey,
  })

  const attempts: PhaseLogEntry['attempts'] = result.attempts.map((a: AttemptLog) => ({
    method: a.method,
    success: a.success,
    duration_ms: a.durationMs,
    result_summary: a.resultSummary,
    error: a.error,
    retry_count: a.retryCount,
  }))

  return {
    font: result.font,
    source: result.source,
    validated: result.validated,
    validationReason: result.validationReason,
    attempts,
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Briefing
// ---------------------------------------------------------------------------

interface BriefingResult {
  generated: boolean
  attempts: PhaseLogEntry['attempts']
}

async function executeBriefingPhase(ctx: PipelineContext): Promise<BriefingResult> {
  const attempts: PhaseLogEntry['attempts'] = []
  const start = Date.now()

  const companySite =
    ctx.siteUrl || (ctx.instagramHandle ? `https://www.instagram.com/${ctx.instagramHandle}` : '')

  if (!companySite) {
    attempts.push({
      method: 'generate-campaign-briefing',
      success: false,
      duration_ms: 0,
      result_summary: 'sem site ou instagram para gerar briefing',
    })
    return { generated: false, attempts }
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const endpoint = `${supabaseUrl}/functions/v1/generate-campaign-briefing`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ctx.config.timeout_briefing_ms)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          compra_id: ctx.compraId,
          company_name: ctx.companyName,
          company_site: companySite,
          celebrity_name: ctx.celebrityName,
          context: {
            segment: ctx.segment || null,
            region: ctx.region || null,
          },
          briefing_input: {
            mode: ctx.config.briefing_auto_mode || 'text',
          },
        }),
        signal: controller.signal,
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success) {
        attempts.push({
          method: 'generate-campaign-briefing',
          success: true,
          duration_ms: Date.now() - start,
          result_summary: 'briefing_json persistido',
        })
        return { generated: true, attempts }
      }

      attempts.push({
        method: 'generate-campaign-briefing',
        success: false,
        duration_ms: Date.now() - start,
        result_summary: `HTTP ${response.status}: ${data.message || data.code || 'erro'}`.slice(0, 200),
      })
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    attempts.push({
      method: 'generate-campaign-briefing',
      success: false,
      duration_ms: Date.now() - start,
      result_summary: 'erro na chamada',
      error: String(err).slice(0, 200),
    })
  }

  return { generated: false, attempts }
}

// ---------------------------------------------------------------------------
// Phase 4: Campaign
// ---------------------------------------------------------------------------

interface CampaignResult {
  jobId: string | null
  attempts: PhaseLogEntry['attempts']
}

async function executeCampaignPhase(ctx: PipelineContext): Promise<CampaignResult> {
  const attempts: PhaseLogEntry['attempts'] = []
  const start = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const endpoint = `${supabaseUrl}/functions/v1/create-ai-campaign-job`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ctx.config.timeout_campaign_ms)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ compra_id: ctx.compraId }),
        signal: controller.signal,
      })

      const data = await response.json().catch(() => ({}))

      if (response.ok && data.success) {
        attempts.push({
          method: 'create-ai-campaign-job',
          success: true,
          duration_ms: Date.now() - start,
          result_summary: `job_id=${data.job_id}, status=${data.status}`,
        })
        return { jobId: data.job_id ?? null, attempts }
      }

      attempts.push({
        method: 'create-ai-campaign-job',
        success: false,
        duration_ms: Date.now() - start,
        result_summary: `HTTP ${response.status}: ${data.message || data.code || 'erro'}`.slice(0, 200),
      })
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    attempts.push({
      method: 'create-ai-campaign-job',
      success: false,
      duration_ms: Date.now() - start,
      result_summary: 'erro na chamada',
      error: String(err).slice(0, 200),
    })
  }

  return { jobId: null, attempts }
}

// ---------------------------------------------------------------------------
// Pipeline orchestrator
// ---------------------------------------------------------------------------

function computeFinalStatus(statuses: Record<PhaseName, string>): string {
  const executed = Object.values(statuses).filter((s) => s !== 'pending')
  if (executed.length === 0) return 'failed'

  const allDone = executed.every((s) => s === 'completed' || s === 'skipped')
  if (allDone) return 'completed'

  const hasCompleted = executed.some((s) => s === 'completed')
  const hasFailed = executed.some((s) => s === 'failed')
  if (hasCompleted && hasFailed) return 'partial'

  if (executed.every((s) => s === 'failed')) return 'failed'

  return 'partial'
}

async function runPipeline(
  ctx: PipelineContext,
  startFromPhase: PhaseName | null,
): Promise<void> {
  const { supabase, jobId } = ctx
  const phases: PhaseName[] = ['colors', 'font', 'briefing', 'campaign']
  const startIdx = startFromPhase ? phases.indexOf(startFromPhase) : 0
  const phasesToRun = phases.slice(startIdx)

  const phaseStatuses: Record<PhaseName, string> = {
    colors: 'pending',
    font: 'pending',
    briefing: 'pending',
    campaign: 'pending',
  }

  // Load existing statuses for skipped phases
  if (startIdx > 0) {
    const { data: existingJob } = await supabase
      .from('onboarding_enrichment_jobs')
      .select('phase_colors_status, phase_font_status, phase_briefing_status, phase_campaign_status')
      .eq('id', jobId)
      .single()

    if (existingJob) {
      for (const phase of phases) {
        phaseStatuses[phase] = existingJob[PHASE_STATUS_COLS[phase]] ?? 'pending'
      }
    }
  }

  for (const phase of phasesToRun) {
    const phaseStart = new Date().toISOString()
    const startMs = Date.now()

    console.log(`${LOG} [enrichment.phase.${phase}.start]`, { jobId, compraId: ctx.compraId })

    await updateJob(supabase, jobId, { [PHASE_STATUS_COLS[phase]]: 'processing' })
    await appendPhaseLog(supabase, jobId, {
      phase,
      status: 'processing',
      started_at: phaseStart,
      attempts: [],
    })

    let phaseStatus = 'failed'
    let phaseSource = ''
    let phaseAttempts: PhaseLogEntry['attempts'] = []
    const jobUpdate: Record<string, unknown> = {}

    try {
      switch (phase) {
        case 'colors': {
          const result = await executeColorsPhase(ctx)
          phaseAttempts = result.attempts
          phaseSource = result.source

          if (result.palette.length > 0) {
            phaseStatus = 'completed'
            jobUpdate.extracted_palette = result.palette
            jobUpdate.extracted_palette_source = result.source

            await supabase
              .from('onboarding_identity')
              .update({ brand_palette: result.palette, updated_at: new Date().toISOString() })
              .eq('compra_id', ctx.compraId)
          } else {
            phaseStatus = 'failed'
          }
          break
        }

        case 'font': {
          const result = await executeFontPhase(ctx)
          phaseAttempts = result.attempts
          phaseSource = result.source

          phaseStatus = 'completed'
          jobUpdate.detected_font = result.font
          jobUpdate.detected_font_source = result.source
          jobUpdate.font_validated = result.validated
          jobUpdate.font_validation_reason = result.validationReason

          await supabase
            .from('onboarding_identity')
            .update({ font_choice: result.font, updated_at: new Date().toISOString() })
            .eq('compra_id', ctx.compraId)
          break
        }

        case 'briefing': {
          const result = await executeBriefingPhase(ctx)
          phaseAttempts = result.attempts
          phaseSource = 'perplexity'

          phaseStatus = result.generated ? 'completed' : 'failed'
          jobUpdate.briefing_generated = result.generated
          break
        }

        case 'campaign': {
          const result = await executeCampaignPhase(ctx)
          phaseAttempts = result.attempts
          phaseSource = 'create-ai-campaign-job'

          if (result.jobId) {
            phaseStatus = 'completed'
            jobUpdate.campaign_job_id = result.jobId
          } else {
            phaseStatus = 'failed'
          }
          break
        }
      }
    } catch (err) {
      console.error(`${LOG} [enrichment.phase.${phase}.error]`, {
        jobId,
        error: String(err).slice(0, 500),
      })
      phaseStatus = 'failed'
      jobUpdate.error_phase = phase
      jobUpdate.error_message = String(err).slice(0, 500)
    }

    const durationMs = Date.now() - startMs
    phaseStatuses[phase] = phaseStatus

    jobUpdate[PHASE_STATUS_COLS[phase]] = phaseStatus
    if (phaseStatus === 'failed') {
      jobUpdate.error_phase = phase
      if (!jobUpdate.error_message) {
        const lastFailed = phaseAttempts.findLast((a) => !a.success)
        jobUpdate.error_message = lastFailed?.error || lastFailed?.result_summary || 'fase falhou'
      }
    }
    await updateJob(supabase, jobId, jobUpdate)

    await appendPhaseLog(supabase, jobId, {
      phase,
      status: phaseStatus,
      source: phaseSource,
      started_at: phaseStart,
      finished_at: new Date().toISOString(),
      duration_ms: durationMs,
      attempts: phaseAttempts,
    })

    console.log(`${LOG} [enrichment.phase.${phase}.done]`, {
      jobId,
      status: phaseStatus,
      duration_ms: durationMs,
    })
  }

  // Compute final status
  const finalStatus = computeFinalStatus(phaseStatuses)
  await updateJob(supabase, jobId, { status: finalStatus })

  console.log(`${LOG} [enrichment.pipeline.done]`, {
    jobId,
    compraId: ctx.compraId,
    finalStatus,
    phaseStatuses,
  })
}

// ---------------------------------------------------------------------------
// Fetch pipeline context data (once, before phases)
// ---------------------------------------------------------------------------

async function loadPipelineContext(
  supabase: SupabaseClient,
  compraId: string,
  eligibilityCompra: Record<string, unknown>,
  identity: Record<string, unknown>,
  config: EnrichmentConfig,
  geminiApiKey: string,
  jobId: string,
): Promise<PipelineContext> {
  let companyName = 'Empresa'
  let celebrityName = 'Celebridade'
  let segment = ''
  let region = ''

  const clienteId = eligibilityCompra.cliente_id as string | null
  if (clienteId) {
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome, nome_fantasia')
      .eq('id', clienteId)
      .maybeSingle()
    if (cliente) {
      companyName = cliente.nome || cliente.nome_fantasia || 'Empresa'
    }
  }

  // brand_display_name (onboarding_identity) takes precedence over clientes.nome
  const { data: identityName } = await supabase
    .from('onboarding_identity')
    .select('brand_display_name')
    .eq('compra_id', compraId)
    .maybeSingle()
  if (identityName?.brand_display_name && identityName.brand_display_name.trim().length > 0) {
    companyName = identityName.brand_display_name.trim()
  }

  const celebridadeId = eligibilityCompra.celebridade as string | null
  if (celebridadeId) {
    const { data: celeb } = await supabase
      .from('celebridadesReferencia')
      .select('nome')
      .eq('id', celebridadeId)
      .maybeSingle()
    if (celeb?.nome) celebrityName = celeb.nome
  }

  const { data: compraFull } = await supabase
    .from('compras')
    .select('segmento, regiaocomprada')
    .eq('id', compraId)
    .single()

  if (compraFull?.segmento) {
    const { data: seg } = await supabase
      .from('segmentos')
      .select('nome')
      .eq('id', compraFull.segmento)
      .maybeSingle()
    if (seg?.nome) segment = seg.nome
  }
  region = (compraFull?.regiaocomprada as string) ?? ''

  return {
    supabase,
    config,
    geminiApiKey,
    jobId,
    compraId,
    identity,
    companyName,
    celebrityName,
    segment,
    region,
    siteUrl: identity.site_url ? normalizeUrl(identity.site_url as string) : null,
    instagramHandle: (identity.instagram_handle as string) || null,
    logoPath: (identity.logo_path as string) || null,
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = requireServiceRole(req)
  if (!authResult.authorized) {
    return (authResult as { authorized: false; response: Response }).response
  }

  try {
    const body = await req.json().catch(() => ({}))
    const compraId = (body.compra_id ?? '').trim()
    const retryFromPhase = body.retry_from_phase ?? null

    if (!compraId || !UUID_RE.test(compraId)) {
      return json({ success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id ausente ou invalido.' }, 400)
    }

    if (retryFromPhase !== null && !VALID_PHASES.includes(retryFromPhase)) {
      return json(
        { success: false, code: 'INVALID_RETRY_PHASE', message: `retry_from_phase invalido. Valores: ${VALID_PHASES.join(', ')}` },
        400,
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Load config
    const config = await loadEnrichmentConfig(supabase)
    if (!config) {
      return json({ success: false, code: 'CONFIG_ERROR', message: 'Configuracao de enriquecimento nao encontrada.' }, 500)
    }

    // Check eligibility
    const eligibility = await checkAiCampaignEligibility(supabase, compraId)
    if (!eligibility.eligible) {
      const msg =
        eligibility.reason === 'compra_not_found' ? 'Compra nao encontrada.'
        : eligibility.reason === 'compra_nao_paga' ? 'Compra nao paga.'
        : 'Contrato nao assinado.'
      const status = eligibility.reason === 'compra_not_found' ? 404 : 409
      return json({ success: false, code: eligibility.reason === 'compra_not_found' ? 'COMPRA_NOT_FOUND' : 'NOT_ELIGIBLE', message: msg }, status)
    }

    // Load identity
    const { data: identity, error: identityError } = await supabase
      .from('onboarding_identity')
      .select('*')
      .eq('compra_id', compraId)
      .maybeSingle()

    if (identityError || !identity) {
      return json({ success: false, code: 'IDENTITY_NOT_FOUND', message: 'Identidade visual nao encontrada.' }, 422)
    }

    const siteUrl = identity.site_url as string | null
    const instagramHandle = identity.instagram_handle as string | null

    if (!siteUrl && !instagramHandle) {
      return json({ success: false, code: 'INSUFFICIENT_DATA', message: 'Nem site_url nem instagram_handle preenchidos.' }, 422)
    }

    // Handle retry vs fresh
    let jobId: string

    if (retryFromPhase) {
      const { data: existingJob } = await supabase
        .from('onboarding_enrichment_jobs')
        .select('id')
        .eq('compra_id', compraId)
        .maybeSingle()

      if (!existingJob) {
        return json({ success: false, code: 'NO_EXISTING_JOB', message: 'Nenhum job anterior encontrado para retry.' }, 409)
      }

      jobId = existingJob.id

      const phaseIdx = VALID_PHASES.indexOf(retryFromPhase as PhaseName)
      const resetData: Record<string, unknown> = {
        status: 'processing',
        error_phase: null,
        error_message: null,
      }
      for (let i = phaseIdx; i < VALID_PHASES.length; i++) {
        resetData[PHASE_STATUS_COLS[VALID_PHASES[i]]] = 'pending'
      }

      await updateJob(supabase, jobId, resetData)
    } else {
      const { data: upserted, error: upsertError } = await supabase
        .from('onboarding_enrichment_jobs')
        .upsert(
          {
            compra_id: compraId,
            status: 'processing',
            phase_colors_status: 'pending',
            phase_font_status: 'pending',
            phase_briefing_status: 'pending',
            phase_campaign_status: 'pending',
            extracted_palette: null,
            extracted_palette_source: null,
            detected_font: null,
            detected_font_source: null,
            font_validated: false,
            font_validation_reason: null,
            briefing_generated: false,
            campaign_job_id: null,
            error_phase: null,
            error_message: null,
            phases_log: [],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'compra_id' },
        )
        .select('id')
        .single()

      if (upsertError || !upserted) {
        console.error(`${LOG} upsert error`, upsertError)
        return json({ success: false, code: 'DB_ERROR', message: 'Erro ao criar job.' }, 500)
      }
      jobId = upserted.id
    }

    console.log(`${LOG} pipeline started`, { jobId, compraId, retryFromPhase })

    // Build context for background pipeline
    const ctx = await loadPipelineContext(
      supabase,
      compraId,
      eligibility.compra!,
      identity,
      config,
      geminiApiKey,
      jobId,
    )

    // Dispatch background pipeline
    const pipelinePromise = runPipeline(ctx, retryFromPhase as PhaseName | null)

    // Use EdgeRuntime.waitUntil if available (Supabase Edge Runtime)
    try {
      // @ts-ignore — EdgeRuntime is a Supabase-specific global
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(pipelinePromise)
      } else {
        pipelinePromise.catch((err) =>
          console.error(`${LOG} background pipeline error`, String(err)),
        )
      }
    } catch {
      pipelinePromise.catch((err) =>
        console.error(`${LOG} background pipeline error`, String(err)),
      )
    }

    // Return immediate response
    const responseBody: Record<string, unknown> = {
      success: true,
      job_id: jobId,
      status: 'processing',
    }

    if (retryFromPhase) {
      const phaseIdx = VALID_PHASES.indexOf(retryFromPhase as PhaseName)
      responseBody.retry_from_phase = retryFromPhase
      responseBody.phases_preserved = VALID_PHASES.slice(0, phaseIdx)
      responseBody.message = `Retry iniciado a partir da fase ${retryFromPhase}.`
    } else {
      responseBody.message = 'Pipeline de enriquecimento iniciado.'
    }

    return json(responseBody)
  } catch (err) {
    console.error(`${LOG} unexpected error`, String(err))
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, 500)
  }
})
