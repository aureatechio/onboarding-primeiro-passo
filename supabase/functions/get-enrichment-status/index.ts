import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  try {
    const url = new URL(req.url)
    const compraId = url.searchParams.get('compra_id')?.trim() ?? ''

    if (!compraId || !UUID_REGEX.test(compraId)) {
      return json(
        { success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id ausente ou invalido.' },
        400,
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: job, error } = await supabase
      .from('onboarding_enrichment_jobs')
      .select('*')
      .eq('compra_id', compraId)
      .maybeSingle()

    if (error) {
      console.error('[get-enrichment-status] db error:', error)
      return json({ success: false, code: 'DB_ERROR', message: 'Erro ao buscar job.' }, 500)
    }

    if (!job) {
      return json(
        { success: false, code: 'NOT_FOUND', message: 'Nenhum job de enriquecimento encontrado.' },
        404,
      )
    }

    return json({ success: true, data: job })
  } catch (err) {
    console.error('[get-enrichment-status] unexpected error:', err)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, 500)
  }
})
