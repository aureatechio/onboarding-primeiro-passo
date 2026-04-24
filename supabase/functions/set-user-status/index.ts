import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireAdmin } from '../_shared/rbac.ts'
import { isOnlyAdmin, json, parseStatus, parseUuid } from '../_shared/user-management.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = await requireAdmin(req)
  if (isRbacError(authResult)) return authResult.error
  const { serviceClient } = authResult

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_JSON', message: 'JSON invalido.' }, 400)
  }

  const userId = parseUuid(body.user_id)
  const status = parseStatus(body.status)
  if (!userId) return json({ success: false, code: 'INVALID_USER_ID', message: 'user_id invalido.' }, 400)
  if (!status) return json({ success: false, code: 'INVALID_STATUS', message: 'status invalido.' }, 400)

  try {
    if (status === 'disabled' && await isOnlyAdmin(serviceClient, userId)) {
      return json({
        success: false,
        code: 'LAST_ADMIN',
        message: 'Nao e possivel desativar o unico admin.',
      }, 409)
    }
  } catch (err) {
    return json({ success: false, code: 'LOCKOUT_CHECK_FAILED', message: String(err) }, 500)
  }

  const { error: authError } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: status === 'disabled' ? '876000h' : 'none',
  })

  if (authError) return json({ success: false, code: 'AUTH_UPDATE_FAILED', message: authError.message }, 500)

  const { data, error } = await serviceClient
    .from('profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, status, updated_at')
    .single()

  if (error) return json({ success: false, code: 'DB_ERROR', message: error.message }, 500)

  return json({ success: true, profile: data })
})
