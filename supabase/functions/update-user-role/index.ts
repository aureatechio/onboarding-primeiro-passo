import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireAdmin } from '../_shared/rbac.ts'
import { isOnlyAdmin, json, parseRole, parseUuid } from '../_shared/user-management.ts'

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
  const role = parseRole(body.role)
  if (!userId) return json({ success: false, code: 'INVALID_USER_ID', message: 'user_id invalido.' }, 400)
  if (!role) return json({ success: false, code: 'INVALID_ROLE', message: 'role invalido.' }, 400)

  try {
    if (role !== 'admin' && await isOnlyAdmin(serviceClient, userId)) {
      return json({
        success: false,
        code: 'LAST_ADMIN',
        message: 'Nao e possivel rebaixar o unico admin.',
      }, 409)
    }
  } catch (err) {
    return json({ success: false, code: 'LOCKOUT_CHECK_FAILED', message: String(err) }, 500)
  }

  const { data, error } = await serviceClient
    .from('user_roles')
    .upsert({
      user_id: userId,
      role,
      assigned_by: user.id,
      assigned_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('user_id, role, assigned_by, assigned_at')
    .single()

  if (error) return json({ success: false, code: 'DB_ERROR', message: error.message }, 500)

  return json({ success: true, role: data })
})
