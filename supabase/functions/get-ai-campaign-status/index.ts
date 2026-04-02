import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { GROUPS, FORMATS } from '../_shared/ai-campaign/prompt-builder.ts'
import { log } from '../_shared/ai-campaign/logger.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const ipHits = new Map<string, { count: number; resetAt: number }>()

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
  const jobId = url.searchParams.get('job_id')?.trim() ?? ''
  const compraId = url.searchParams.get('compra_id')?.trim() ?? ''

  if (!jobId && !compraId) {
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
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'CONFIG_ERROR', message: 'Supabase env vars not configured.' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let jobQuery = supabase
    .from('ai_campaign_jobs')
    .select('id, compra_id, status, prompt_version, total_expected, total_generated, created_at, updated_at')

  if (jobId) {
    jobQuery = jobQuery.eq('id', jobId)
  } else {
    jobQuery = jobQuery.eq('compra_id', compraId).order('created_at', { ascending: false }).limit(1)
  }

  const { data: job, error: jobError } = await jobQuery.maybeSingle()

  if (jobError) {
    log.error({ compraId: compraId || undefined, stage: 'delivery' }, 'Job query error', { error: jobError.message })
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar job.' }, 500)
  }

  if (!job) {
    return json({ success: false, code: 'JOB_NOT_FOUND', message: 'Job nao encontrado.' }, 404)
  }

  const { data: rawAssets } = await supabase
    .from('ai_campaign_assets')
    .select('id, group_name, format, image_url, width, height, prompt_version, created_at')
    .eq('job_id', job.id)
    .order('group_name')
    .order('format')

  const urlExpirySec = parseInt(Deno.env.get('AI_CAMPAIGN_URL_EXPIRY_SECONDS') || '604800', 10)

  const assets = rawAssets || []
  for (const asset of assets) {
    if (asset.image_url && !asset.image_url.startsWith('http')) {
      const { data: signed } = await supabase.storage
        .from('ai-campaign-assets')
        .createSignedUrl(asset.image_url, urlExpirySec)
      if (signed?.signedUrl) {
        asset.image_url = signed.signedUrl
      }
    }
  }

  const { data: errors } = await supabase
    .from('ai_campaign_errors')
    .select('id, group_name, format, error_type, error_message, attempt, created_at')
    .eq('job_id', job.id)
    .order('created_at')

  const allGroupFormats: Array<{ group: string; format: string }> = []
  for (const g of GROUPS) {
    for (const f of FORMATS) {
      allGroupFormats.push({ group: g, format: f })
    }
  }

  const generatedSet = new Set(
    assets.map((a) => `${a.group_name}:${a.format}`)
  )

  const missing = allGroupFormats
    .filter((gf) => !generatedSet.has(`${gf.group}:${gf.format}`))
    .map((gf) => ({ group: gf.group, format: gf.format }))

  return json({
    success: true,
    job: {
      id: job.id,
      compra_id: job.compra_id,
      status: job.status,
      prompt_version: job.prompt_version,
      total_expected: job.total_expected,
      total_generated: job.total_generated,
      created_at: job.created_at,
      updated_at: job.updated_at,
    },
    assets,
    errors: errors || [],
    missing: missing.length > 0 ? missing : undefined,
  })
})
