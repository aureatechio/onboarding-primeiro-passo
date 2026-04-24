// requireAuth helper: valida JWT de usuário (não service_role) vindo do dashboard.
// Uso:
//   const result = await requireAuth(req)
//   if (isAuthError(result)) return result.error
//   const { user, serviceClient } = result
//
// Edges admin-* devem ser deployadas SEM --no-verify-jwt; este helper adiciona validação
// defensiva e expõe o cliente Supabase com service_role para operações DB/Storage.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

export type AuthSuccess = {
  ok: true
  user: { id: string; email: string | null; role?: string }
  serviceClient: SupabaseClient
  token: string
}
export type AuthError = { ok: false; error: Response }

export function isAuthError(result: AuthSuccess | AuthError): result is AuthError {
  return result.ok === false
}

function unauthorized(message: string, code = 'UNAUTHORIZED'): Response {
  return new Response(
    JSON.stringify({ success: false, code, message }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

function parseBearer(header: string | null): string | null {
  if (!header) return null
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return null
  return header.slice(prefix.length).trim()
}

export async function requireAuth(req: Request): Promise<AuthSuccess | AuthError> {
  const token = parseBearer(req.headers.get('authorization'))
  if (!token) {
    return { ok: false, error: unauthorized('Authorization Bearer <jwt> obrigatorio.') }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return {
      ok: false,
      error: new Response(
        JSON.stringify({ success: false, code: 'CONFIG_ERROR', message: 'Env ausente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    }
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data, error } = await userClient.auth.getUser(token)
  if (error || !data?.user) {
    return { ok: false, error: unauthorized('JWT invalido ou expirado.', 'INVALID_JWT') }
  }

  // Rejeita service_role tokens — esta rota é para usuário humano autenticado no dashboard.
  const role = (data.user.role ?? 'authenticated').toLowerCase()
  if (role === 'service_role') {
    return { ok: false, error: unauthorized('service_role nao permitido nesta rota.', 'FORBIDDEN') }
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    ok: true,
    user: { id: data.user.id, email: data.user.email ?? null, role },
    serviceClient,
    token,
  }
}
