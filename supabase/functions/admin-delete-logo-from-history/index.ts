// admin-delete-logo-from-history (ONB-23)
// Remove um registro de onboarding_logo_history + arquivo no storage.
// Bloqueia delete do registro ativo.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { isRbacError, requireRole } from '../_shared/rbac.ts'
import { validateUuid } from '../_shared/onboarding-validation.ts'

const BUCKET = 'onboarding-identity'

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST ou DELETE.' }, 405)
  }

  const authResult = await requireRole(req, ['admin'])
  if (isRbacError(authResult)) return authResult.error
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

  const { data: row, error: fetchErr } = await serviceClient
    .from('onboarding_logo_history')
    .select('id, compra_id, logo_path, is_active')
    .eq('id', historyId)
    .maybeSingle()

  if (fetchErr) {
    return json({ success: false, code: 'DB_ERROR', message: fetchErr.message }, 500)
  }
  if (!row || row.compra_id !== compraId) {
    return json({ success: false, code: 'NOT_FOUND', message: 'Registro nao encontrado para essa compra.' }, 404)
  }
  if (row.is_active) {
    return json({
      success: false,
      code: 'ACTIVE_LOGO_PROTECTED',
      message: 'Nao e possivel deletar o logo ativo. Ative outro antes.',
    }, 409)
  }

  const { error: storageErr } = await serviceClient.storage.from(BUCKET).remove([row.logo_path])
  if (storageErr) {
    // nao aborta: arquivo pode ja ter sido removido manualmente
    console.warn('storage remove failed', storageErr.message)
  }

  const { error: deleteErr } = await serviceClient
    .from('onboarding_logo_history')
    .delete()
    .eq('id', historyId)

  if (deleteErr) {
    return json({ success: false, code: 'DB_ERROR', message: deleteErr.message }, 500)
  }

  return json({ success: true, deleted_id: historyId })
})
