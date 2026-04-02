import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import {
  isValidUuid,
  errorJson,
  successJson,
  BUCKET_NAME,
} from '../_shared/garden/validate.ts'

const URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 dias

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')

    if (!isValidUuid(jobId)) {
      return errorJson('INVALID_INPUT', 'job_id deve ser UUID valido.', 400, corsHeaders)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: job, error } = await supabase
      .from('garden_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return errorJson('NOT_FOUND', 'Job nao encontrado.', 404, corsHeaders)
    }

    // Se completado e tem output, gerar signed URL fresca
    let outputImageUrl = job.output_image_url
    if (job.status === 'completed' && job.output_image_path) {
      const { data: signedData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(job.output_image_path, URL_EXPIRY_SECONDS)
      if (signedData?.signedUrl) {
        outputImageUrl = signedData.signedUrl
      }
    }

    return successJson({
      job_id: job.id,
      tool: job.tool,
      status: job.status,
      output_image_url: outputImageUrl,
      duration_ms: job.duration_ms,
      error_code: job.error_code,
      error_message: job.error_message,
      input_format: job.input_format,
      input_metadata: job.input_metadata,
      request_id: job.request_id,
      created_at: job.created_at,
      updated_at: job.updated_at,
    }, corsHeaders)
  } catch (err) {
    console.error('[get-garden-job] error:', err)
    return errorJson('INTERNAL_ERROR', 'Erro interno.', 500, corsHeaders)
  }
})
