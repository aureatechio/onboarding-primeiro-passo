import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { CONFIG_TABLE } from '../_shared/enrichment/config.ts'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select('*')
      .limit(1)
      .single()

    if (error) {
      console.error('[get-enrichment-config] db error:', error)
      return json(
        { success: false, code: 'DB_ERROR', message: 'Erro ao buscar configuracao.' },
        500,
      )
    }

    return json({ success: true, config: data })
  } catch (err) {
    console.error('[get-enrichment-config] unexpected error:', err)
    return json({ success: false, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, 500)
  }
})
