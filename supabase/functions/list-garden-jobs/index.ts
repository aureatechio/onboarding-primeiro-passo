import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorJson, successJson, BUCKET_NAME } from '../_shared/garden/validate.ts'

const URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 dias
const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20
const VALID_TOOLS = ['post-gen']
const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed']

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const url = new URL(req.url)
    const toolParam = url.searchParams.get('tool') ?? 'all'
    const statusParam = url.searchParams.get('status') ?? 'completed'
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
    )

    if (toolParam !== 'all' && !VALID_TOOLS.includes(toolParam)) {
      return errorJson('INVALID_INPUT', `tool invalido. Valores aceitos: all, ${VALID_TOOLS.join(', ')}`, 400, corsHeaders)
    }
    if (statusParam !== 'all' && !VALID_STATUSES.includes(statusParam)) {
      return errorJson('INVALID_INPUT', `status invalido. Valores aceitos: all, ${VALID_STATUSES.join(', ')}`, 400, corsHeaders)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let query = supabase
      .from('garden_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    if (toolParam !== 'all') {
      query = query.eq('tool', toolParam)
    }
    if (statusParam !== 'all') {
      query = query.eq('status', statusParam)
    }

    const { data: jobs, error, count } = await query

    if (error) {
      console.error('[list-garden-jobs] db error:', error)
      return errorJson('INTERNAL_ERROR', 'Erro ao consultar jobs.', 500, corsHeaders)
    }

    // Regenerar signed URLs para jobs completados
    const items = await Promise.all(
      (jobs ?? []).map(async (job) => {
        let outputImageUrl = job.output_image_url
        if (job.status === 'completed' && job.output_image_path) {
          const { data: signedData } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(job.output_image_path, URL_EXPIRY_SECONDS)
          if (signedData?.signedUrl) {
            outputImageUrl = signedData.signedUrl
          }
        }
        return {
          job_id: job.id,
          tool: job.tool,
          status: job.status,
          input_prompt: job.input_prompt,
          input_format: job.input_format,
          input_metadata: job.input_metadata,
          output_image_url: outputImageUrl,
          duration_ms: job.duration_ms,
          error_code: job.error_code,
          error_message: job.error_message,
          created_at: job.created_at,
        }
      }),
    )

    return successJson(
      {
        items,
        total: count ?? 0,
        page,
        limit,
      },
      corsHeaders,
    )
  } catch (err) {
    console.error('[list-garden-jobs] error:', err)
    return errorJson('INTERNAL_ERROR', 'Erro interno.', 500, corsHeaders)
  }
})
