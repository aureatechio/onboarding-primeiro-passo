// admin-set-active-logo (ONB-23)
// Marca um registro de onboarding_logo_history como ativo e atualiza logo_path.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { isAuthError, requireAuth } from '../_shared/auth.ts'
import { validateUuid } from '../_shared/onboarding-validation.ts'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST ou PATCH.' }, 405)
  }

  const authResult = await requireAuth(req)
  if (isAuthError(authResult)) return authResult.error
  const { serviceClient } = authResult

  let body: { compra_id?: string; logo_history_id?: string }
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_JSON', message: 'Body JSON invalido.' }, 400)
  }

  const compraCheck = validateUuid(body.compra_id ?? '', 'compra_id')
  if (!compraCheck.ok) return json({ success: false, ...compraCheck.error }, 400)
  const idCheck = validateUuid(body.logo_history_id ?? '', 'logo_history_id')
  if (!idCheck.ok) return json({ success: false, ...idCheck.error }, 400)

  const compraId = compraCheck.value
  const historyId = idCheck.value

  // Confirma que o registro pertence à compra
  const { data: target, error: fetchErr } = await serviceClient
    .from('onboarding_logo_history')
    .select('id, compra_id, logo_path, is_active')
    .eq('id', historyId)
    .maybeSingle()

  if (fetchErr) {
    return json({ success: false, code: 'DB_ERROR', message: fetchErr.message }, 500)
  }
  if (!target || target.compra_id !== compraId) {
    return json({ success: false, code: 'NOT_FOUND', message: 'Registro nao encontrado para essa compra.' }, 404)
  }

  if (target.is_active) {
    return json({ success: true, already_active: true, logo_path: target.logo_path })
  }

  // Desativa os outros primeiro (evita violar unique index parcial)
  const { error: deactErr } = await serviceClient
    .from('onboarding_logo_history')
    .update({ is_active: false })
    .eq('compra_id', compraId)
    .eq('is_active', true)

  if (deactErr) {
    return json({ success: false, code: 'DB_ERROR', message: deactErr.message }, 500)
  }

  const { error: activateErr } = await serviceClient
    .from('onboarding_logo_history')
    .update({ is_active: true })
    .eq('id', historyId)

  if (activateErr) {
    return json({ success: false, code: 'DB_ERROR', message: activateErr.message }, 500)
  }

  const { error: identityErr } = await serviceClient
    .from('onboarding_identity')
    .update({ logo_path: target.logo_path, updated_at: new Date().toISOString() })
    .eq('compra_id', compraId)

  if (identityErr) {
    return json({ success: false, code: 'IDENTITY_UPDATE_FAILED', message: identityErr.message }, 500)
  }

  return json({ success: true, logo_path: target.logo_path })
})
