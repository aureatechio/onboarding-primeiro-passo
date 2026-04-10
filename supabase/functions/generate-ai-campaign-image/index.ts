import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireServiceRole } from '../_shared/service-role-auth.ts'
import { generateImage } from '../_shared/ai-campaign/image-generator.ts'
import { PROMPT_VERSION } from '../_shared/ai-campaign/prompt-builder.ts'
import { log } from '../_shared/ai-campaign/logger.ts'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface WorkerBody {
  job_id: string
  asset_id: string
  compra_id: string
  group_name: string
  format: string
  celebrity_png_url: string
  client_logo_url: string
  campaign_image_url?: string
  reference_image_url?: string
  gemini_model_name?: string
  gemini_api_base_url?: string
  max_retries?: number
  max_image_download_bytes?: number
  aspect_ratio?: string
  prompt: string
  temperature?: number
  top_p?: number
  top_k?: number
  safety_settings?: Array<{ category: string; threshold: string }>
  system_instruction_text?: string
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = requireServiceRole(req)
  if (!authResult.authorized) return authResult.response

  let body: WorkerBody
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_BODY', message: 'Body JSON invalido.' }, 400)
  }

  const {
    job_id,
    asset_id,
    compra_id,
    group_name,
    format,
    celebrity_png_url,
    client_logo_url,
    campaign_image_url,
    reference_image_url,
    gemini_model_name,
    gemini_api_base_url,
    max_retries,
    max_image_download_bytes,
    aspect_ratio,
    prompt,
    temperature,
    top_p,
    top_k,
    safety_settings,
    system_instruction_text,
  } = body

  if (!job_id || !asset_id || !compra_id || !group_name || !format || !celebrity_png_url || !prompt) {
    return json({ success: false, code: 'MISSING_FIELDS', message: 'Campos obrigatorios faltando.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'CONFIG_ERROR', message: 'Supabase env vars not configured.' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    await supabase
      .from('ai_campaign_assets')
      .update({ status: 'processing' })
      .eq('id', asset_id)

    log.info(
      { jobId: job_id, compraId: compra_id, stage: 'generation', group: group_name, format },
      'Worker: generating image'
    )

    const result = await generateImage(
      prompt,
      celebrity_png_url,
      client_logo_url || '',
      campaign_image_url,
      reference_image_url || undefined,
      {
        modelName: gemini_model_name,
        baseUrl: gemini_api_base_url,
        maxRetries: max_retries,
        maxImageDownloadBytes: max_image_download_bytes,
        aspectRatio: aspect_ratio,
        temperature,
        topP: top_p,
        topK: top_k,
        safetySettings: safety_settings,
        systemInstruction: system_instruction_text,
      },
    )

    if (result.success && result.imageData) {
      const ext = result.mimeType.includes('jpeg') ? 'jpg' : 'png'
      const storagePath = `${compra_id}/${job_id}/${group_name}_${format.replace(':', 'x')}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('ai-campaign-assets')
        .upload(storagePath, result.imageData, {
          contentType: result.mimeType,
          upsert: true,
        })

      if (uploadError) {
        log.error(
          { jobId: job_id, compraId: compra_id, stage: 'upload', group: group_name, format },
          'Upload error',
          { error: uploadError.message }
        )
        await markAssetFailed(supabase, asset_id, job_id, group_name, format, 'upload_error', uploadError.message)
        return json({ success: false, asset_id, status: 'failed', error: uploadError.message })
      }

      await supabase
        .from('ai_campaign_assets')
        .update({
          status: 'completed',
          image_url: storagePath,
          prompt_version: PROMPT_VERSION,
        })
        .eq('id', asset_id)

      await incrementJobGenerated(supabase, job_id)

      log.info(
        { jobId: job_id, compraId: compra_id, stage: 'persistence', group: group_name, format },
        'Asset completed'
      )
      return json({ success: true, asset_id, status: 'completed' })
    }

    const errMsg = result.error || 'Unknown generation error'
    log.warn(
      { jobId: job_id, compraId: compra_id, stage: 'generation', group: group_name, format },
      'Generation failed',
      { error: errMsg }
    )
    await markAssetFailed(supabase, asset_id, job_id, group_name, format, 'model_error', errMsg)

    return json({ success: false, asset_id, status: 'failed', error: errMsg })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(
      { jobId: job_id, compraId: compra_id, stage: 'generation', group: group_name, format },
      'Unhandled worker exception',
      { error: message }
    )

    await markAssetFailed(
      supabase,
      asset_id,
      job_id,
      group_name,
      format,
      'worker_unhandled_error',
      message
    )

    return json({
      success: false,
      code: 'WORKER_UNHANDLED_ERROR',
      asset_id,
      status: 'failed',
      error: message,
    })
  }
})

async function markAssetFailed(
  supabase: ReturnType<typeof createClient>,
  assetId: string,
  jobId: string,
  groupName: string,
  format: string,
  errorType: string,
  errorMessage: string,
): Promise<void> {
  await supabase
    .from('ai_campaign_assets')
    .update({ status: 'failed' })
    .eq('id', assetId)

  try {
    await supabase.from('ai_campaign_errors').insert({
      job_id: jobId,
      group_name: groupName,
      format,
      error_type: errorType,
      error_message: errorMessage.substring(0, 1000),
      attempt: 1,
    })
  } catch (e) {
    log.error({ jobId, stage: 'persistence' }, 'Failed to log error to DB', { error: String(e) })
  }
}

async function incrementJobGenerated(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
): Promise<void> {
  const { data } = await supabase
    .from('ai_campaign_assets')
    .select('id')
    .eq('job_id', jobId)
    .eq('status', 'completed')

  const count = data?.length ?? 0

  await supabase
    .from('ai_campaign_jobs')
    .update({
      total_generated: count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}
