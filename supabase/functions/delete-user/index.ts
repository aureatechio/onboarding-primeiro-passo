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
    return json({ success: false, code: 'SELF_DELETE', message: 'Voce nao pode remover o proprio acesso.' }, 409)
  }

  try {
    if (await isOnlyAdmin(serviceClient, userId)) {
      return json({ success: false, code: 'LAST_ADMIN', message: 'Nao e possivel remover acesso do unico admin.' }, 409)
    }
  } catch (err) {
    return json({ success: false, code: 'LOCKOUT_CHECK_FAILED', message: String(err) }, 500)
  }

  const { error: activityError } = await serviceClient
    .from('dashboard_user_activity')
    .delete()
    .eq('user_id', userId)

  if (activityError) return json({ success: false, code: 'ACTIVITY_DELETE_FAILED', message: activityError.message }, 500)

  const { error: roleError } = await serviceClient
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (roleError) return json({ success: false, code: 'ROLE_DELETE_FAILED', message: roleError.message }, 500)

  const { error: profileError } = await serviceClient
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) return json({ success: false, code: 'PROFILE_DELETE_FAILED', message: profileError.message }, 500)

  return json({ success: true, revoked_user_id: userId })
})
