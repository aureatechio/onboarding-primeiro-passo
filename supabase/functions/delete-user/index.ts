import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireAdmin } from '../_shared/rbac.ts'
import { isOnlyAdmin, json, parseUuid } from '../_shared/user-management.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = await requireAdmin(req)
  if (isRbacError(authResult)) return authResult.error
  const { user, serviceClient } = authResult

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_JSON', message: 'JSON invalido.' }, 400)
  }

  const userId = parseUuid(body.user_id)
  if (!userId) return json({ success: false, code: 'INVALID_USER_ID', message: 'user_id invalido.' }, 400)
  if (userId === user.id) {
    return json({ success: false, code: 'SELF_DELETE', message: 'Voce nao pode excluir a propria conta.' }, 409)
  }

  try {
    if (await isOnlyAdmin(serviceClient, userId)) {
      return json({ success: false, code: 'LAST_ADMIN', message: 'Nao e possivel excluir o unico admin.' }, 409)
    }
  } catch (err) {
    return json({ success: false, code: 'LOCKOUT_CHECK_FAILED', message: String(err) }, 500)
  }

  const { error } = await serviceClient.auth.admin.deleteUser(userId)
  if (error) return json({ success: false, code: 'DELETE_FAILED', message: error.message }, 500)

  return json({ success: true, deleted_user_id: userId })
})
