/**
 * Shared admin password guard.
 *
 * Simple authentication via `x-admin-password` header.
 * Used by operational endpoints (config panels, upsert tools).
 *
 * Env var: ADMIN_PASSWORD (default: "megazord")
 */

import { corsHeaders } from './cors.ts'

export interface AdminAuthResult {
  authorized: true
}

export interface AdminAuthError {
  authorized: false
  response: Response
}

export type AdminAuthCheck = AdminAuthResult | AdminAuthError

export function requireAdminPassword(req: Request): AdminAuthCheck {
  const expected = Deno.env.get('ADMIN_PASSWORD') || 'megazord'
  const provided = req.headers.get('x-admin-password')?.trim()

  if (!provided || provided !== expected) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          error: 'Senha admin inválida ou ausente',
          code: 'UNAUTHORIZED',
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
