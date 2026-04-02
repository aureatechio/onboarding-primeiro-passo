import { corsHeaders } from './cors.ts'

interface JwtPayload {
  role?: string
  ref?: string
}

function parseBearerToken(header: string | null): string | null {
  if (!header) return null
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return null
  return header.slice(prefix.length).trim()
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const normalized = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    const raw = atob(padded)
    return JSON.parse(raw) as JwtPayload
  } catch {
    return null
  }
}

export type ServiceRoleAuthResult =
  | { authorized: true }
  | { authorized: false; response: Response }

export function requireServiceRole(req: Request): ServiceRoleAuthResult {
  const token = parseBearerToken(req.headers.get('authorization'))
  const runtimeServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (token && runtimeServiceRoleKey && token === runtimeServiceRoleKey) {
    return { authorized: true }
  }

  const jwtPayload = token ? parseJwtPayload(token) : null

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  let projectRef: string | null = null
  try {
    projectRef = new URL(supabaseUrl).host.split('.')[0]
  } catch { /* ignore */ }

  if (
    !token ||
    !jwtPayload ||
    jwtPayload.role !== 'service_role' ||
    (projectRef && jwtPayload.ref && jwtPayload.ref !== projectRef)
  ) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Authorization invalida',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  return { authorized: true }
}
