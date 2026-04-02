import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type RetryMode = 'single' | 'failed'

interface RetryBody {
  job_id?: string
  asset_id?: string
  mode?: RetryMode
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

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  let body: RetryBody
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_BODY', message: 'Body JSON invalido.' }, 400)
  }

  const jobId = (body.job_id || '').trim()
  const assetId = (body.asset_id || '').trim()
  const mode: RetryMode = body.mode === 'single' ? 'single' : 'failed'

  if (!jobId || !UUID_REGEX.test(jobId)) {
    return json({ success: false, code: 'INVALID_JOB_ID', message: 'job_id invalido.' }, 400)
  }
  if (mode === 'single' && (!assetId || !UUID_REGEX.test(assetId))) {
    return json(
      { success: false, code: 'INVALID_ASSET_ID', message: 'asset_id invalido para mode=single.' },
      400,
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'CONFIG_ERROR', message: 'Supabase env vars not configured.' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: job, error: jobError } = await supabase
    .from('ai_campaign_jobs')
    .select('id, compra_id, status')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar job.' }, 500)
  }
  if (!job) {
    return json({ success: false, code: 'JOB_NOT_FOUND', message: 'Job nao encontrado.' }, 404)
  }

  const { data: busyAssets, error: busyError } = await supabase
    .from('ai_campaign_assets')
    .select('id')
    .eq('job_id', jobId)
    .in('status', ['pending', 'processing'])

  if (busyError) {
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao validar estado do job.' }, 500)
  }
  if ((busyAssets?.length || 0) > 0) {
    return json(
      {
        success: false,
        code: 'JOB_BUSY',
        message: 'Job ainda em andamento. Aguarde finalizar antes de um novo reprocessamento.',
      },
      409,
    )
  }

  let targets: Array<{ id: string; status: string; group_name: string; format: string }> = []
  if (mode === 'single') {
    const { data: singleAsset, error: singleError } = await supabase
      .from('ai_campaign_assets')
      .select('id, status, group_name, format')
      .eq('id', assetId)
      .eq('job_id', jobId)
      .maybeSingle()

    if (singleError) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar asset alvo.' }, 500)
    }
    if (!singleAsset) {
      return json({ success: false, code: 'ASSET_NOT_FOUND', message: 'Asset nao encontrado para este job.' }, 404)
    }
    targets = [singleAsset]
  } else {
    const { data: failedAssets, error: failedError } = await supabase
      .from('ai_campaign_assets')
      .select('id, status, group_name, format')
      .eq('job_id', jobId)
      .eq('status', 'failed')

    if (failedError) {
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar assets com falha.' }, 500)
    }
    targets = failedAssets || []
  }

  if (targets.length === 0) {
    return json({
      success: true,
      job_id: jobId,
      retried_count: 0,
      message: 'Nenhum asset elegivel para retry.',
    })
  }

  if (targets.some((target) => target.status !== 'failed')) {
    return json(
      {
        success: false,
        code: 'INVALID_ASSET_STATE',
        message: 'Retry permitido apenas para assets com status failed.',
      },
      409,
    )
  }

  const targetIds = targets.map((target) => target.id)
  const { error: prepareError } = await supabase
    .from('ai_campaign_assets')
    .update({
      status: 'pending',
      image_url: '',
      width: null,
      height: null,
    })
    .in('id', targetIds)
    .eq('job_id', jobId)

  if (prepareError) {
    return json({ success: false, code: 'DB_ERROR', message: 'Falha ao preparar assets para retry.' }, 500)
  }

  await supabase
    .from('ai_campaign_jobs')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', jobId)

  const triggerResponse = await fetch(`${supabaseUrl}/functions/v1/create-ai-campaign-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ compra_id: job.compra_id }),
  })

  if (!triggerResponse.ok) {
    const bodyText = await triggerResponse.text()
    return json(
      {
        success: false,
        code: 'RETRY_TRIGGER_ERROR',
        message: 'Falha ao disparar reprocessamento.',
        details: bodyText.substring(0, 300),
      },
      500,
    )
  }

  const triggerPayload = await triggerResponse.json()
  return json({
    success: true,
    job_id: jobId,
    compra_id: job.compra_id,
    mode,
    retried_count: targetIds.length,
    target_asset_ids: targetIds,
    trigger: {
      status: triggerPayload?.status ?? null,
      message: triggerPayload?.message ?? null,
    },
  })
})
