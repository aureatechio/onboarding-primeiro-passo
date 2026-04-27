import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireAdmin, type AppRole } from '../_shared/rbac.ts'
import { json, parseRole, parseStatus } from '../_shared/user-management.ts'

type AuthUser = {
  id: string
  email?: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
}

function readPositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'GET') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' }, 405)
  }

  const authResult = await requireAdmin(req)
  if (isRbacError(authResult)) return authResult.error
  const { serviceClient } = authResult

  const url = new URL(req.url)
  const page = readPositiveInt(url.searchParams.get('page'), 1, 10000)
  const limit = readPositiveInt(url.searchParams.get('limit'), 20, 100)
  const search = (url.searchParams.get('search') ?? '').trim().toLowerCase()
  const roleFilter = url.searchParams.has('role') ? parseRole(url.searchParams.get('role')) : null
  const statusFilter = url.searchParams.has('status') ? parseStatus(url.searchParams.get('status')) : null

  if (url.searchParams.has('role') && !roleFilter) {
    return json({ success: false, code: 'INVALID_ROLE', message: 'role invalido.' }, 400)
  }
  if (url.searchParams.has('status') && !statusFilter) {
    return json({ success: false, code: 'INVALID_STATUS', message: 'status invalido.' }, 400)
  }

  const { data: authData, error: authError } = await serviceClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (authError) {
    return json({ success: false, code: 'AUTH_ERROR', message: authError.message }, 500)
  }

  const authUsers = ((authData?.users ?? []) as AuthUser[])
  const ids = authUsers.map((user) => user.id)

  const [{ data: profiles, error: profileError }, { data: roles, error: roleError }] =
    await Promise.all([
      ids.length
        ? serviceClient
          .from('profiles')
          .select('id, email, full_name, avatar_url, status, created_at, updated_at')
          .in('id', ids)
        : Promise.resolve({ data: [], error: null }),
      ids.length
        ? serviceClient.from('user_roles').select('user_id, role, assigned_by, assigned_at').in('user_id', ids)
        : Promise.resolve({ data: [], error: null }),
    ])

  if (profileError || roleError) {
    return json({
      success: false,
      code: 'DB_ERROR',
      message: profileError?.message || roleError?.message || 'Erro ao listar usuarios.',
    }, 500)
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const roleById = new Map((roles ?? []).map((role) => [role.user_id, role]))

  const allUsers = authUsers
    .map((authUser) => {
      const profile = profileById.get(authUser.id)
      const role = roleById.get(authUser.id)
      return {
        id: authUser.id,
        email: profile?.email || authUser.email || null,
        full_name: profile?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        role: (role?.role || 'viewer') as AppRole,
        status: profile?.status || 'active',
        assigned_by: role?.assigned_by || null,
        assigned_at: role?.assigned_at || null,
        created_at: profile?.created_at || authUser.created_at || null,
        updated_at: profile?.updated_at || null,
        last_sign_in_at: authUser.last_sign_in_at || null,
      }
    })
    .filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false
      if (statusFilter && user.status !== statusFilter) return false
      if (!search) return true
      return [user.email, user.full_name].some((value) => String(value ?? '').toLowerCase().includes(search))
    })

  const total = allUsers.length
  const summary = allUsers.reduce((acc, user) => {
    acc.roles[user.role] += 1
    if (user.status === 'disabled') acc.status.disabled += 1
    else acc.status.active += 1
    return acc
  }, {
    total,
    roles: { admin: 0, operator: 0, viewer: 0 },
    status: { active: 0, disabled: 0 },
  })
  const from = (page - 1) * limit
  const users = allUsers.slice(from, from + limit)

  return json({
    success: true,
    users,
    summary,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  })
})
