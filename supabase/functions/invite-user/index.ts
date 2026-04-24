import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireAdmin } from '../_shared/rbac.ts'
import {
  inviteRedirectTo,
  json,
  parseEmail,
  parseFullName,
  parseRole,
} from '../_shared/user-management.ts'

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

  const email = parseEmail(body.email)
  const fullName = parseFullName(body.full_name)
  const role = parseRole(body.role) ?? 'viewer'

  if (!email) return json({ success: false, code: 'INVALID_EMAIL', message: 'Email invalido.' }, 400)
  if (!fullName) return json({ success: false, code: 'INVALID_NAME', message: 'Nome obrigatorio.' }, 400)

  const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: inviteRedirectTo(req),
  })

  if (error || !data?.user?.id) {
    return json({
      success: false,
      code: 'INVITE_FAILED',
      message: error?.message || 'Nao foi possivel enviar convite.',
    }, 500)
  }

  const invitedUser = data.user
  const now = new Date().toISOString()

  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: invitedUser.id,
      email,
      full_name: fullName,
      status: 'active',
      updated_at: now,
    }, { onConflict: 'id' })

  if (profileError) {
    return json({ success: false, code: 'PROFILE_UPSERT_FAILED', message: profileError.message }, 500)
  }

  const { error: roleError } = await serviceClient
    .from('user_roles')
    .upsert({
      user_id: invitedUser.id,
      role,
      assigned_by: user.id,
      assigned_at: now,
    }, { onConflict: 'user_id' })

  if (roleError) {
    return json({ success: false, code: 'ROLE_UPSERT_FAILED', message: roleError.message }, 500)
  }

  return json({
    success: true,
    user: {
      id: invitedUser.id,
      email,
      full_name: fullName,
      role,
      status: 'active',
      invited_at: invitedUser.invited_at ?? null,
    },
  })
})
