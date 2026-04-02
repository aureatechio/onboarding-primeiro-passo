import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { successJson, errorJson } from '../_shared/garden/validate.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const [celebRes, segRes, subRes, negRes] = await Promise.all([
      supabase
        .from('celebridades')
        .select('id, nome, fotoPrincipal')
        .eq('ativo', true)
        .order('nome'),
      supabase
        .from('segmentos')
        .select('id, nome')
        .eq('active', true)
        .order('nome'),
      supabase
        .from('subsegmento')
        .select('id, nome, segmento')
        .eq('active', true)
        .order('nome'),
      supabase
        .from('negocio')
        .select('id, nome, segmento_id, subsegmento_id')
        .eq('active', true)
        .order('nome'),
    ])

    if (celebRes.error) throw celebRes.error
    if (segRes.error) throw segRes.error
    if (subRes.error) throw subRes.error
    if (negRes.error) throw negRes.error

    return successJson({
      celebrities: celebRes.data ?? [],
      segments: segRes.data ?? [],
      subsegments: (subRes.data ?? []).map((s: Record<string, unknown>) => ({
        id: s.id,
        nome: s.nome,
        segmento_id: s.segmento,
      })),
      businesses: negRes.data ?? [],
    }, corsHeaders)
  } catch (err) {
    console.error('[get-garden-options] error:', err)
    return errorJson(
      'INTERNAL_ERROR',
      'Erro ao carregar opcoes.',
      500,
      corsHeaders,
    )
  }
})
