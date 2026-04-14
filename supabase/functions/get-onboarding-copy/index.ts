/**
 * Edge Function: get-onboarding-copy
 *
 * Returns the current published onboarding copy from the singleton table.
 * Public access (no authentication required).
 *
 * If version is 0 or content is empty, the frontend falls back to static copy.js.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, corsHeaders } from '../_shared/cors.ts'

const CONFIG_TABLE = 'onboarding_copy'

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Método não permitido', code: 'METHOD_NOT_ALLOWED' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select('content, version, published_by, updated_at')
      .limit(1)
      .single()

    if (error) {
      console.error('[get-onboarding-copy] DB error:', error)
      return jsonResponse({ success: false, code: 'DB_ERROR', message: error.message }, 500)
    }

    return jsonResponse({
      success: true,
      content: data?.content ?? {},
      version: data?.version ?? 0,
      published_by: data?.published_by ?? 'system',
      updated_at: data?.updated_at ?? null,
    })
  } catch (err) {
    console.error('[get-onboarding-copy] Error:', err)
    return jsonResponse({ success: false, code: 'INTERNAL_ERROR', message: String(err) }, 500)
  }
})
