import { corsHeaders } from './cors.ts'
import { isAuthError, requireAuth, type AuthSuccess } from './auth.ts'

export type AppRole = 'admin' | 'operator' | 'viewer'

export type RbacSuccess = AuthSuccess & {
  appRole: AppRole
}

export type RbacError = { ok: false; error: Response }

const VALID_ROLES: readonly AppRole[] = ['admin', 'operator', 'viewer']

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function forbidden(message = 'Permissao insuficiente.'): Response {
  return json({ success: false, code: 'FORBIDDEN', message }, 403)
}

function isAppRole(value: unknown): value is AppRole {
  return VALID_ROLES.includes(value as AppRole)
}

export function isRbacError(result: RbacSuccess | RbacError): result is RbacError {
  return result.ok === false
}

export async function requireRole(
  req: Request,
  allowedRoles: readonly AppRole[],
): Promise<RbacSuccess | RbacError> {
  const authResult = await requireAuth(req)
  if (isAuthError(authResult)) return authResult

  const { data, error } = await authResult.serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', authResult.user.id)
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      error: json(
        { success: false, code: 'ROLE_LOOKUP_FAILED', message: 'Nao foi possivel validar permissao.' },
        500,
      ),
    }
  }

  const appRole = data?.role
  if (!isAppRole(appRole) || !allowedRoles.includes(appRole)) {
    return { ok: false, error: forbidden() }
  }

  const { data: profile, error: profileError } = await authResult.serviceClient
    .from('profiles')
    .select('status')
    .eq('id', authResult.user.id)
    .maybeSingle()

  if (profileError) {
    return {
      ok: false,
      error: json(
        { success: false, code: 'PROFILE_LOOKUP_FAILED', message: 'Nao foi possivel validar status.' },
        500,
      ),
    }
  }

  if (profile?.status !== 'active') {
    return { ok: false, error: forbidden('Usuario desativado.') }
  }

  return { ...authResult, appRole }
}

export function requireAdmin(req: Request): Promise<RbacSuccess | RbacError> {
  return requireRole(req, ['admin'])
}

export function assertValidRole(value: unknown): AppRole | null {
  return isAppRole(value) ? value : null
}
