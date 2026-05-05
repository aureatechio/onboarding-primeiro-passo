import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { GROUPS, FORMATS } from '../_shared/ai-campaign/prompt-builder.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const ipHits = new Map<string, { count: number; resetAt: number }>()
const VALID_STATUSES = ['pending', 'processing', 'completed', 'partial', 'failed'] as const
const STUCK_ASSET_AGE_MINUTES = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipHits.get(ip)
  if (!entry || now >= entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function createSignedUrlIfPath(
  supabase: any,
  bucket: string,
  pathOrUrl: string | null | undefined,
  expiresInSec: number
): Promise<string | null> {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const { data } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, expiresInSec)
  return data?.signedUrl ?? null
}

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return fallback
  return parsed
}

function normalizeStatus(value: string | null): string {
  if (!value) return ''
  return value.trim().toLowerCase()
}

function getFailureSource(errorType: string | null): string {
  if (!errorType) return 'unknown'
  if (errorType.startsWith('worker_')) return 'worker'
  if (errorType.includes('upload')) return 'storage_upload'
  if (errorType.includes('model') || errorType.includes('provider')) return 'provider'
  if (errorType.includes('db') || errorType.includes('persistence')) return 'database'
  return 'unknown'
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = value?.trim()
    if (normalized) return normalized
  }
  return null
}

async function resolveNamesByCompraIds(
  supabase: any,
  compraIds: string[]
): Promise<{
  compraMap: Record<string, {
    cliente_id: string | null
    celebridade: string | null
    leadid: string | null
    imagemproposta_id: string | null
  }>
  clientNameByCompraId: Record<string, string>
  legalClientNameByCompraId: Record<string, string>
  celebrityNameMap: Record<string, string>
}> {
  if (compraIds.length === 0) {
    return {
      compraMap: {},
      clientNameByCompraId: {},
      legalClientNameByCompraId: {},
      celebrityNameMap: {},
    }
  }

  const { data: comprasRows } = await supabase
    .from('compras')
    .select('id, cliente_id, celebridade, leadid, imagemproposta_id')
    .in('id', compraIds)

  const compraMap: Record<string, {
    cliente_id: string | null
    celebridade: string | null
    leadid: string | null
    imagemproposta_id: string | null
  }> = {}
  const clientIds = new Set<string>()
  const celebrityIds = new Set<string>()
  const leadIds = new Set<string>()
  const propostaIds = new Set<string>()

  for (const row of comprasRows || []) {
    compraMap[row.id] = {
      cliente_id: row.cliente_id ?? null,
      celebridade: row.celebridade ?? null,
      leadid: row.leadid ?? null,
      imagemproposta_id: row.imagemproposta_id ?? null,
    }
    if (row.cliente_id) clientIds.add(row.cliente_id)
    if (row.celebridade) celebrityIds.add(row.celebridade)
    if (row.leadid) leadIds.add(row.leadid)
    if (row.imagemproposta_id) propostaIds.add(row.imagemproposta_id)
  }

  const [clientsRes, celebsRes, leadsRes, propostasRes, identitiesRes] = await Promise.all([
    clientIds.size > 0
      ? supabase
        .from('clientes')
        .select('id, nome, nome_fantasia, razaosocial')
        .in('id', Array.from(clientIds))
      : Promise.resolve({ data: [] as Array<Record<string, string>>, error: null }),
    celebrityIds.size > 0
      ? supabase
        .from('celebridadesReferencia')
        .select('id, nome')
        .in('id', Array.from(celebrityIds))
      : Promise.resolve({ data: [] as Array<Record<string, string>>, error: null }),
    leadIds.size > 0
      ? supabase
        .from('leads')
        .select('lead_id, empresa')
        .in('lead_id', Array.from(leadIds))
      : Promise.resolve({ data: [] as Array<Record<string, string>>, error: null }),
    propostaIds.size > 0
      ? supabase
        .from('imagemProposta')
        .select('idproposta, nome_empresa')
        .in('idproposta', Array.from(propostaIds))
      : Promise.resolve({ data: [] as Array<Record<string, string>>, error: null }),
    supabase
      .from('onboarding_identity')
      .select('compra_id, brand_display_name')
      .in('compra_id', compraIds),
  ])

  const clientFallbackByClientId: Record<string, string> = {}
  const legalClientNameByClientId: Record<string, string> = {}
  for (const client of clientsRes.data || []) {
    clientFallbackByClientId[client.id] =
      firstNonEmpty(client.nome_fantasia, client.nome, client.razaosocial) || 'Cliente'
    legalClientNameByClientId[client.id] =
      firstNonEmpty(client.razaosocial, client.nome, client.nome_fantasia) || 'Cliente'
  }

  const companyNameByLeadId: Record<string, string> = {}
  for (const lead of leadsRes.data || []) {
    const companyName = firstNonEmpty(lead.empresa)
    if (lead.lead_id && companyName) companyNameByLeadId[lead.lead_id] = companyName
  }

  const companyNameByPropostaId: Record<string, string> = {}
  for (const proposta of propostasRes.data || []) {
    const companyName = firstNonEmpty(proposta.nome_empresa)
    if (proposta.idproposta && companyName) companyNameByPropostaId[proposta.idproposta] = companyName
  }

  const brandNameByCompraId: Record<string, string> = {}
  for (const identity of identitiesRes.data || []) {
    const brandName = firstNonEmpty(identity.brand_display_name)
    if (identity.compra_id && brandName) brandNameByCompraId[identity.compra_id] = brandName
  }

  const clientNameByCompraId: Record<string, string> = {}
  const legalClientNameByCompraId: Record<string, string> = {}
  for (const [compraId, compraInfo] of Object.entries(compraMap)) {
    clientNameByCompraId[compraId] =
      firstNonEmpty(
        brandNameByCompraId[compraId],
        compraInfo.leadid ? companyNameByLeadId[compraInfo.leadid] : null,
        compraInfo.imagemproposta_id ? companyNameByPropostaId[compraInfo.imagemproposta_id] : null,
        compraInfo.cliente_id ? clientFallbackByClientId[compraInfo.cliente_id] : null,
      ) || 'Cliente'
    legalClientNameByCompraId[compraId] =
      firstNonEmpty(
        compraInfo.cliente_id ? legalClientNameByClientId[compraInfo.cliente_id] : null,
        clientNameByCompraId[compraId],
      ) || 'Cliente'
  }

  const celebrityNameMap: Record<string, string> = {}
  for (const celeb of celebsRes.data || []) {
    celebrityNameMap[celeb.id] = celeb.nome || 'Celebridade'
  }

  return { compraMap, clientNameByCompraId, legalClientNameByCompraId, celebrityNameMap }
}

interface AvailablePurchase {
  compra_id: string
  clientName: string
  celebName: string
  label: string
  eligible: boolean
  eligibility_reason: string | null
  checkout_status: string | null
  clicksign_status: string | null
  vendaaprovada: boolean | null
  onboarding_access_status: string | null
}

async function resolveAvailablePurchases(
  supabase: any
): Promise<AvailablePurchase[]> {
  const { data: comprasRows, error: comprasError } = await supabase
    .from('compras')
    .select('id, cliente_id, celebridade, checkout_status, clicksign_status, vendaaprovada, created_at')
    .eq('clicksign_status', 'Assinado')
    .order('created_at', { ascending: false })
    .limit(200)

  if (comprasError || !comprasRows || comprasRows.length === 0) return []

  const compraIds = comprasRows.map((row: any) => row.id)

  const [namesResult, accessResult] = await Promise.all([
    resolveNamesByCompraIds(supabase, compraIds),
    supabase
      .from('onboarding_access')
      .select('compra_id, status, allowed_until')
      .in('compra_id', compraIds),
  ])

  const { compraMap, clientNameByCompraId, celebrityNameMap } = namesResult
  const accessByCompra: Record<string, { status: string; allowed_until: string | null }> = {}
  for (const row of accessResult.data || []) {
    accessByCompra[row.compra_id] = { status: row.status, allowed_until: row.allowed_until }
  }

  return comprasRows.map((row: any) => {
    const compraInfo = compraMap[row.id] || { cliente_id: null, celebridade: null }
    const clientName = clientNameByCompraId[row.id] || 'Cliente'
    const celebName = compraInfo.celebridade
      ? (celebrityNameMap[compraInfo.celebridade] || 'Celebridade contratada')
      : 'Celebridade contratada'

    const isPaid = row.checkout_status === 'pago'
    const access = accessByCompra[row.id]
    let manuallyAllowed = false
    if (access?.status === 'allowed') {
      const notExpired = !access.allowed_until ||
        new Date(access.allowed_until).getTime() >= Date.now()
      if (notExpired) manuallyAllowed = true
    }

    const eligible = isPaid || manuallyAllowed
    let eligibilityReason: string | null = null
    if (!eligible) eligibilityReason = 'compra_nao_paga'

    return {
      compra_id: row.id,
      clientName,
      celebName,
      label: `${clientName} - ${celebName}`,
      eligible,
      eligibility_reason: eligibilityReason,
      checkout_status: row.checkout_status,
      clicksign_status: row.clicksign_status,
      vendaaprovada: row.vendaaprovada,
      onboarding_access_status: access?.status ?? null,
    }
  })
}

async function resolveEligibleOnboardingPurchases(
  supabase: any
): Promise<
  Array<{
    compra_id: string
    clientName: string
    celebName: string
    label: string
  }>
> {
  const all = await resolveAvailablePurchases(supabase)
  return all
    .filter((p) => p.eligible)
    .map(({ compra_id, clientName, celebName, label }) => ({
      compra_id,
      clientName,
      celebName,
      label,
    }))
}

async function resolvePerplexityBriefingCompraIds(
  supabase: any,
  compraIds: string[]
): Promise<Set<string>> {
  if (compraIds.length === 0) return new Set<string>()

  const { data, error } = await supabase
    .from('onboarding_briefings')
    .select('compra_id')
    .in('compra_id', compraIds)
    .eq('status', 'done')
    .eq('provider', 'perplexity')

  if (error || !data) return new Set<string>()

  return new Set(
    data
      .map((row: any) => row.compra_id)
      .filter((compraId: unknown): compraId is string => Boolean(compraId))
  )
}

function applySearchFilter(query: string, builder: any) {
  if (!query) return builder
  if (UUID_REGEX.test(query)) {
    return builder.or(`id.eq.${query},compra_id.eq.${query}`)
  }
  return builder.ilike('status', `%${query}%`)
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'GET') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' }, 405)
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return json({ success: false, code: 'RATE_LIMITED', message: 'Muitas requisicoes. Aguarde.' }, 429)
  }

  const url = new URL(req.url)
  const mode = (url.searchParams.get('mode')?.trim().toLowerCase() || '') as 'list' | 'detail' | ''
  const jobId = url.searchParams.get('job_id')?.trim() ?? ''
  let compraId = url.searchParams.get('compra_id')?.trim() ?? ''
  const page = toPositiveInt(url.searchParams.get('page'), 1)
  const requestedLimit = toPositiveInt(url.searchParams.get('limit'), 20)
  const limit = Math.min(requestedLimit, 100)
  const statusFilter = normalizeStatus(url.searchParams.get('status'))
  const qFilter = url.searchParams.get('q')?.trim() ?? ''
  const shouldUseDetailMode = mode === 'detail' || Boolean(jobId) || Boolean(compraId)

  if (shouldUseDetailMode && !jobId && !compraId) {
    return json({
      success: false,
      code: 'MISSING_PARAM',
      message: 'Informe job_id ou compra_id.',
    }, 400)
  }

  if (jobId && !UUID_REGEX.test(jobId)) {
    return json({ success: false, code: 'INVALID_JOB_ID', message: 'job_id invalido.' }, 400)
  }
  if (compraId && !UUID_REGEX.test(compraId)) {
    return json({ success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id invalido.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const signedUrlExpirySec = parseInt(Deno.env.get('AI_CAMPAIGN_URL_EXPIRY_SECONDS') || '604800', 10)

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'CONFIG_ERROR', message: 'Supabase env vars not configured.' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (!shouldUseDetailMode) {
    if (statusFilter && !VALID_STATUSES.includes(statusFilter as (typeof VALID_STATUSES)[number])) {
      return json({
        success: false,
        code: 'INVALID_STATUS',
        message: 'status invalido.',
      }, 400)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabase
      .from('ai_campaign_jobs')
      .select('id, compra_id, status, prompt_version, total_expected, total_generated, created_at, updated_at', {
        count: 'exact',
      })
      .order('updated_at', { ascending: false })
      .range(from, to)

    if (statusFilter) {
      listQuery = listQuery.eq('status', statusFilter)
    }
    listQuery = applySearchFilter(qFilter, listQuery)

    const { data: jobsRows, error: listError, count } = await listQuery
    if (listError) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao listar jobs.' }, 500)
    }

    const listedJobs = jobsRows || []
    const listedJobIds = Array.from(new Set(listedJobs.map((job) => String(job.id))))
    const nowMs = Date.now()
    const stuckCutoffMs = STUCK_ASSET_AGE_MINUTES * 60_000

    const [assetsByJobRes, errorsByJobRes] = await Promise.all([
      listedJobIds.length > 0
        ? supabase
          .from('ai_campaign_assets')
          .select('job_id, status, created_at')
          .in('job_id', listedJobIds)
        : Promise.resolve({ data: [] as Array<Record<string, string>>, error: null }),
      listedJobIds.length > 0
        ? supabase
          .from('ai_campaign_errors')
          .select('job_id, error_type, created_at')
          .in('job_id', listedJobIds)
          .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as Array<Record<string, string>>, error: null }),
    ])

    if (assetsByJobRes.error || errorsByJobRes.error) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao agregar diagnosticos.' }, 500)
    }

    const assetStatsByJob: Record<string, { failed: number; stuck: number; processingOrPending: number }> = {}
    for (const asset of assetsByJobRes.data || []) {
      const key = String(asset.job_id)
      if (!assetStatsByJob[key]) {
        assetStatsByJob[key] = { failed: 0, stuck: 0, processingOrPending: 0 }
      }
      const status = String(asset.status || '')
      if (status === 'failed') assetStatsByJob[key].failed += 1
      if (status === 'processing' || status === 'pending') {
        assetStatsByJob[key].processingOrPending += 1
        const createdAtMs = asset.created_at ? Date.parse(String(asset.created_at)) : NaN
        if (!Number.isNaN(createdAtMs) && nowMs - createdAtMs >= stuckCutoffMs) {
          assetStatsByJob[key].stuck += 1
        }
      }
    }

    const lastErrorByJob: Record<string, { error_type: string | null; created_at: string | null }> = {}
    for (const row of errorsByJobRes.data || []) {
      const key = String(row.job_id)
      if (!lastErrorByJob[key]) {
        lastErrorByJob[key] = {
          error_type: row.error_type ? String(row.error_type) : null,
          created_at: row.created_at ? String(row.created_at) : null,
        }
      }
    }

    let summaryQuery = supabase
      .from('ai_campaign_jobs')
      .select('status')
      .order('updated_at', { ascending: false })

    summaryQuery = applySearchFilter(qFilter, summaryQuery)
    const { data: summaryRows, error: summaryError } = await summaryQuery
    if (summaryError) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao resumir jobs.' }, 500)
    }

    const summary = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      partial: 0,
      failed: 0,
    }
    for (const row of summaryRows || []) {
      summary.total += 1
      const statusKey = String(row.status || '') as keyof typeof summary
      if (statusKey in summary) {
        summary[statusKey] += 1
      }
    }

    const compraIds = Array.from(
      new Set((listedJobs || []).map((job) => String(job.compra_id)))
    ) as string[]
    const [{ compraMap, clientNameByCompraId, celebrityNameMap }, briefingCompraIds, availablePurchases] =
      await Promise.all([
        resolveNamesByCompraIds(supabase, compraIds),
        resolvePerplexityBriefingCompraIds(supabase, compraIds),
        resolveAvailablePurchases(supabase),
      ])
    const eligiblePurchases = availablePurchases
      .filter((p) => p.eligible)
      .map(({ compra_id, clientName, celebName, label }) => ({
        compra_id,
        clientName,
        celebName,
        label,
      }))

    const items = (listedJobs || []).map((job) => {
      const totalExpected = Number(job.total_expected || 12)
      const totalGenerated = Number(job.total_generated || 0)
      const percent = totalExpected > 0
        ? Math.round((Math.min(totalGenerated, totalExpected) / totalExpected) * 100)
        : 0
      const currentJobId = String(job.id)
      const assetStats = assetStatsByJob[currentJobId] || {
        failed: 0,
        stuck: 0,
        processingOrPending: 0,
      }
      const lastError = lastErrorByJob[currentJobId] || { error_type: null, created_at: null }
      const inconsistencyFlags: string[] = []
      if (String(job.status) === 'failed' && assetStats.processingOrPending > 0) {
        inconsistencyFlags.push('job_failed_with_processing_assets')
      }
      if (String(job.status) === 'failed' && !lastError.error_type) {
        inconsistencyFlags.push('job_failed_without_errors')
      }
      if (assetStats.stuck > 0) {
        inconsistencyFlags.push('stuck_assets_detected')
      }

      const compraInfo = compraMap[String(job.compra_id)] || {
        cliente_id: null,
        celebridade: null,
      }

      return {
        job_id: job.id,
        compra_id: job.compra_id,
        status: job.status,
        prompt_version: job.prompt_version,
        total_expected: totalExpected,
        total_generated: totalGenerated,
        percent,
        created_at: job.created_at,
        updated_at: job.updated_at,
        client_name: clientNameByCompraId[String(job.compra_id)] || null,
        celebrity_name: compraInfo.celebridade
          ? (celebrityNameMap[compraInfo.celebridade] || null)
          : null,
        has_perplexity_briefing: briefingCompraIds.has(String(job.compra_id)),
        failed_assets_count: assetStats.failed,
        stuck_assets_count: assetStats.stuck,
        last_error_type: lastError.error_type,
        last_error_at: lastError.created_at,
        has_inconsistency: inconsistencyFlags.length > 0,
        inconsistency_flags: inconsistencyFlags,
      }
    })

    const totalCount = count || 0
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / limit) : 1

    return json({
      success: true,
      mode: 'list',
      filters: {
        page,
        limit,
        status: statusFilter || null,
        q: qFilter || null,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: totalPages,
      },
      summary,
      items,
      eligible_purchases: eligiblePurchases,
      available_purchases: availablePurchases,
    })
  }

  let job: Record<string, unknown> | null = null
  if (jobId) {
    const { data: foundJob, error: foundJobError } = await supabase
      .from('ai_campaign_jobs')
      .select(
        'id, compra_id, status, prompt_version, total_expected, total_generated, created_at, updated_at'
      )
      .eq('id', jobId)
      .maybeSingle()

    if (foundJobError) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar job.' }, 500)
    }
    if (!foundJob) {
      return json({ success: false, code: 'JOB_NOT_FOUND', message: 'Job nao encontrado.' }, 404)
    }
    job = foundJob
    compraId = String(foundJob.compra_id || compraId)
  } else {
    const { data: foundJob, error: foundJobError } = await supabase
      .from('ai_campaign_jobs')
      .select(
        'id, compra_id, status, prompt_version, total_expected, total_generated, created_at, updated_at'
      )
      .eq('compra_id', compraId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (foundJobError) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar job.' }, 500)
    }
    job = foundJob || null
  }

  const [comprasRes, identityRes, briefingRes, namesResult] = await Promise.all([
    supabase
      .from('compras')
      .select('id, cliente_id, celebridade, checkout_status, clicksign_status, vendaaprovada')
      .eq('id', compraId)
      .maybeSingle(),
    supabase
      .from('onboarding_identity')
      .select(
        'id, choice, logo_path, brand_palette, font_choice, campaign_images_paths, campaign_notes, production_path, brand_display_name, instagram_handle, site_url, created_at, updated_at'
      )
      .eq('compra_id', compraId)
      .maybeSingle(),
    supabase
      .from('onboarding_briefings')
      .select(
        'id, mode, brief_text, audio_path, audio_duration_sec, transcript, transcript_status, status, provider, created_at, updated_at'
      )
      .eq('compra_id', compraId)
      .maybeSingle(),
    resolveNamesByCompraIds(supabase, [compraId]),
  ])

  if (comprasRes.error || identityRes.error || briefingRes.error) {
    return json({
      success: false,
      code: 'DB_ERROR',
      message: 'Erro ao montar dados do monitor.',
    }, 500)
  }

  const compra = comprasRes.data
  const identity = identityRes.data
  const briefing = briefingRes.data

  const clientName = namesResult.clientNameByCompraId[compraId] || null
  const legalClientName = namesResult.legalClientNameByCompraId[compraId] || null

  let celebrityName: string | null = null
  let celebrityImageUrl: string | null = null
  if (compra?.celebridade) {
    const { data: celeb } = await supabase
      .from('celebridadesReferencia')
      .select('nome, fotoPrincipal')
      .eq('id', compra.celebridade)
      .maybeSingle()
    if (celeb) {
      celebrityName = celeb.nome || null
      celebrityImageUrl = celeb.fotoPrincipal || null
    }
  }

  const [logoUrl, briefingAudioUrl, campaignImageUrls, logoHistoryRes] = await Promise.all([
    createSignedUrlIfPath(supabase, 'onboarding-identity', identity?.logo_path, signedUrlExpirySec),
    createSignedUrlIfPath(supabase, 'onboarding-briefings', briefing?.audio_path, signedUrlExpirySec),
    Promise.all(
      (identity?.campaign_images_paths || []).map((path: string) =>
        createSignedUrlIfPath(supabase, 'onboarding-identity', path, signedUrlExpirySec)
      )
    ),
    supabase
      .from('onboarding_logo_history')
      .select('id, logo_path, original_filename, mime_type, size_bytes, uploaded_at, uploaded_by_user_id, is_active')
      .eq('compra_id', compraId)
      .order('uploaded_at', { ascending: false }),
  ])

  const logoHistoryRows = (logoHistoryRes.data || []) as Array<Record<string, unknown>>
  const logoHistory = await Promise.all(
    logoHistoryRows.map(async (row) => ({
      id: row.id,
      logo_path: row.logo_path,
      logo_url: await createSignedUrlIfPath(
        supabase,
        'onboarding-identity',
        String(row.logo_path || ''),
        signedUrlExpirySec,
      ),
      original_filename: row.original_filename,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      uploaded_at: row.uploaded_at,
      uploaded_by_user_id: row.uploaded_by_user_id,
      is_active: row.is_active,
    }))
  )

  let assets: Array<Record<string, unknown>> = []
  let errors: Array<Record<string, unknown>> = []
  let missing: Array<{ group: string; format: string }> = []
  let diagnostics: Record<string, unknown> = {
    status_counts: {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      pending: 0,
    },
    worker_failures_count: 0,
    inconsistency_flags: [],
    last_error: null,
    last_failure_source: 'unknown',
  }

  if (job?.id) {
    const [assetsRes, errorsRes] = await Promise.all([
      supabase
        .from('ai_campaign_assets')
        .select('id, group_name, format, status, image_url, width, height, prompt_version, created_at')
        .eq('job_id', job.id)
        .order('group_name')
        .order('format'),
      supabase
        .from('ai_campaign_errors')
        .select('id, group_name, format, error_type, error_message, attempt, created_at')
        .eq('job_id', job.id)
        .order('created_at'),
    ])

    if (assetsRes.error || errorsRes.error) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar assets/erros.' }, 500)
    }

    assets = (assetsRes.data || []) as Array<Record<string, unknown>>
    for (const asset of assets) {
      const signed = await createSignedUrlIfPath(
        supabase,
        'ai-campaign-assets',
        String(asset.image_url || ''),
        signedUrlExpirySec
      )
      asset.image_url = signed
    }
    errors = (errorsRes.data || []) as Array<Record<string, unknown>>

    const nowMs = Date.now()
    const stuckCutoffMs = STUCK_ASSET_AGE_MINUTES * 60_000
    const jobUpdatedAtMs = job.updated_at ? Date.parse(String(job.updated_at)) : NaN
    const jobIsRecentlyActive = !Number.isNaN(jobUpdatedAtMs) && nowMs - jobUpdatedAtMs < stuckCutoffMs

    const staleAssetIds: string[] = []
    if (!jobIsRecentlyActive) {
      for (const asset of assets) {
        const status = String(asset.status || '')
        if (status === 'pending' || status === 'processing') {
          staleAssetIds.push(String(asset.id))
        }
      }
    }

    if (staleAssetIds.length > 0) {
      await supabase
        .from('ai_campaign_assets')
        .update({ status: 'failed' })
        .in('id', staleAssetIds)
        .eq('job_id', String(job.id))

      for (const asset of assets) {
        if (staleAssetIds.includes(String(asset.id))) {
          asset.status = 'failed'
          await supabase.from('ai_campaign_errors').insert({
            job_id: String(job.id),
            group_name: String(asset.group_name || ''),
            format: String(asset.format || ''),
            error_type: 'stale_pending_auto_reconciled',
            error_message: `Asset stuck in non-terminal status for >${STUCK_ASSET_AGE_MINUTES}min. Auto-reconciled to failed by monitor.`,
            attempt: 1,
          })
        }
      }

      const reconciledCompleted = assets.filter((a) => String(a.status) === 'completed').length
      const reconciledFailed = assets.filter((a) => String(a.status) === 'failed').length
      const reconciledStatus =
        reconciledCompleted === assets.length && assets.length > 0
          ? 'completed'
          : reconciledCompleted > 0
            ? 'partial'
            : 'failed'

      await supabase
        .from('ai_campaign_jobs')
        .update({
          status: reconciledStatus,
          total_generated: reconciledCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', String(job.id))

      job.status = reconciledStatus
      job.total_generated = reconciledCompleted

      const { data: freshErrors } = await supabase
        .from('ai_campaign_errors')
        .select('id, group_name, format, error_type, error_message, attempt, created_at')
        .eq('job_id', job.id)
        .order('created_at')
      errors = (freshErrors || []) as Array<Record<string, unknown>>
    }

    const statusCounts = {
      total: assets.length,
      completed: 0,
      failed: 0,
      processing: 0,
      pending: 0,
    }
    for (const asset of assets) {
      const status = String(asset.status || '')
      if (status === 'completed') statusCounts.completed += 1
      else if (status === 'failed') statusCounts.failed += 1
      else if (status === 'processing') statusCounts.processing += 1
      else if (status === 'pending') statusCounts.pending += 1
    }

    const workerFailuresCount = errors.filter((err) =>
      String(err.error_type || '').startsWith('worker_')
    ).length
    const lastError =
      errors.length > 0
        ? {
          error_type: String(errors[errors.length - 1].error_type || ''),
          error_message: String(errors[errors.length - 1].error_message || ''),
          created_at: String(errors[errors.length - 1].created_at || ''),
        }
        : null

    const inconsistencyFlags: string[] = []
    if (String(job.status) === 'failed' && statusCounts.processing + statusCounts.pending > 0) {
      inconsistencyFlags.push('job_failed_with_processing_assets')
    }
    if (String(job.status) === 'failed' && errors.length === 0) {
      inconsistencyFlags.push('job_failed_without_errors')
    }
    if (statusCounts.failed > 0 && errors.length === 0) {
      inconsistencyFlags.push('failed_assets_without_error_records')
    }

    diagnostics = {
      status_counts: statusCounts,
      worker_failures_count: workerFailuresCount,
      inconsistency_flags: inconsistencyFlags,
      last_error: lastError,
      last_failure_source: getFailureSource(lastError?.error_type || null),
    }

    const generatedSet = new Set(
      assets.map((a) => `${String(a.group_name)}:${String(a.format)}`)
    )
    missing = GROUPS.flatMap((group) =>
      FORMATS
        .filter((format) => !generatedSet.has(`${group}:${format}`))
        .map((format) => ({ group, format }))
    )
  }

  const totalExpected = Number(job?.total_expected || 12)
  const totalGenerated = Number(job?.total_generated || assets.length || 0)
  const progressPercent = totalExpected > 0
    ? Math.round((Math.min(totalGenerated, totalExpected) / totalExpected) * 100)
    : 0

  return json({
    success: true,
    mode: 'detail',
    input: {
      compra_id: compraId,
      job_id: job?.id ?? null,
    },
    job: job
      ? {
        id: job.id,
        compra_id: job.compra_id,
        status: job.status,
        prompt_version: job.prompt_version,
        total_expected: totalExpected,
        total_generated: totalGenerated,
        created_at: job.created_at,
        updated_at: job.updated_at,
      }
      : null,
    progress: {
      total_expected: totalExpected,
      total_generated: totalGenerated,
      percent: progressPercent,
    },
    assets,
    errors,
    diagnostics,
    missing: missing.length > 0 ? missing : undefined,
    onboarding: {
      compra: compra
        ? {
          id: compra.id,
          checkout_status: compra.checkout_status,
          clicksign_status: compra.clicksign_status,
          vendaaprovada: compra.vendaaprovada,
          cliente_id: compra.cliente_id,
          celebridade_id: compra.celebridade,
        }
        : null,
      identity: identity
        ? {
          id: identity.id,
          choice: identity.choice,
          brand_palette: identity.brand_palette || [],
          font_choice: identity.font_choice,
          campaign_notes: identity.campaign_notes,
          production_path: identity.production_path,
          brand_display_name: identity.brand_display_name ?? null,
          instagram_handle: identity.instagram_handle ?? null,
          site_url: identity.site_url ?? null,
          created_at: identity.created_at,
          updated_at: identity.updated_at,
          uploads: {
            logo_path: identity.logo_path,
            logo_url: logoUrl,
            campaign_images_paths: identity.campaign_images_paths || [],
            campaign_images_urls: campaignImageUrls.filter(Boolean),
          },
          logo_history: logoHistory,
        }
        : null,
      briefing: briefing
        ? {
          id: briefing.id,
          mode: briefing.mode,
          brief_text: briefing.brief_text,
          audio_duration_sec: briefing.audio_duration_sec,
          transcript: briefing.transcript,
          transcript_status: briefing.transcript_status,
          status: briefing.status,
          provider: briefing.provider,
          created_at: briefing.created_at,
          updated_at: briefing.updated_at,
          audio_path: briefing.audio_path,
          audio_url: briefingAudioUrl,
        }
        : null,
      client: {
        name: clientName,
        legal_name: legalClientName,
      },
      celebrity: {
        name: celebrityName,
        image_url: celebrityImageUrl,
      },
    },
  })
})
