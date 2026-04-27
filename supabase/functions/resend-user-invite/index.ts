import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireAdmin } from '../_shared/rbac.ts'
import {
  inviteRedirectTo,
  isPendingInvite,
  json,
  parseEmail,
  parseFullName,
  parseUuid,
} from '../_shared/user-management.ts'

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
  if (!userId) return json({ success: false, code: 'INVALID_USER_ID', message: 'user_id invalido.' }, 400)

  const { data: authData, error: authError } = await serviceClient.auth.admin.getUserById(userId)
  if (authError) return json({ success: false, code: 'AUTH_LOOKUP_FAILED', message: authError.message }, 500)
  if (!authData?.user) return json({ success: false, code: 'USER_NOT_FOUND', message: 'Usuario nao encontrado.' }, 404)

  const authUser = authData.user
  const email = parseEmail(authUser.email)
  if (!email) return json({ success: false, code: 'NO_EMAIL', message: 'Usuario sem email valido.' }, 409)

  if (!isPendingInvite(authUser)) {
    return json({
      success: false,
      code: 'INVITE_ALREADY_ACCEPTED',
      message: 'O convite deste usuario ja foi aceito ou a conta nao foi criada por convite.',
    }, 409)
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('full_name, status')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    return json({ success: false, code: 'PROFILE_LOOKUP_FAILED', message: profileError.message }, 500)
  }
  if (profile?.status === 'disabled') {
    return json({ success: false, code: 'USER_DISABLED', message: 'Usuario desativado.' }, 409)
  }

  const fullName =
    parseFullName(profile?.full_name) ||
    parseFullName(authUser.user_metadata?.full_name) ||
    email.split('@')[0]

  const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: inviteRedirectTo(req),
  })

  if (error || !data?.user?.id) {
    return json({
      success: false,
      code: 'RESEND_INVITE_FAILED',
      message: error?.message || 'Nao foi possivel reenviar o convite.',
    }, 500)
  }

  return json({
    success: true,
    user: {
      id: data.user.id,
      email,
      invited_at: data.user.invited_at ?? null,
      confirmation_sent_at: data.user.confirmation_sent_at ?? null,
    },
  })
})
