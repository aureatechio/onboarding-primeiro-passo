import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { type AppRole, assertValidRole } from './rbac.ts'

export const VALID_STATUSES = ['active', 'disabled'] as const
export type UserStatus = (typeof VALID_STATUSES)[number]
export type InvitationStatus = 'pending' | 'accepted' | 'not_invited'
export type InvitationAuthFields = {
  invited_at?: string | null
  email_confirmed_at?: string | null
  confirmed_at?: string | null
  last_sign_in_at?: string | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_DASHBOARD_URL = 'https://acelerai-primeiro-passo.vercel.app'

export function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-correlation-id',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Content-Type': 'application/json',
    },
  })
}

export function parseUuid(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return UUID_RE.test(normalized) ? normalized : null
}

export function parseRole(value: unknown): AppRole | null {
  return assertValidRole(String(value ?? '').trim())
}

export function parseStatus(value: unknown): UserStatus | null {
  const normalized = String(value ?? '').trim()
  return VALID_STATUSES.includes(normalized as UserStatus) ? (normalized as UserStatus) : null
}

export function parseEmail(value: unknown): string | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  return EMAIL_RE.test(normalized) && normalized.length <= 254 ? normalized : null
}

export function parseFullName(value: unknown): string | null {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  return normalized.slice(0, 160)
}

export function resolveInvitationStatus(user: InvitationAuthFields): InvitationStatus {
  if (!user.invited_at) return 'not_invited'
  if (user.email_confirmed_at || user.confirmed_at || user.last_sign_in_at) return 'accepted'
  return 'pending'
}

export function isPendingInvite(user: InvitationAuthFields): boolean {
  return resolveInvitationStatus(user) === 'pending'
}

export async function countAdmins(serviceClient: SupabaseClient): Promise<number> {
  const { count, error } = await serviceClient
    .from('user_roles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin')

  if (error) throw error
  return count ?? 0
}

export async function isOnlyAdmin(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await serviceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (data?.role !== 'admin') return false
  return (await countAdmins(serviceClient)) <= 1
}

export function inviteRedirectTo(req: Request): string | undefined {
  const configured = Deno.env.get('DASHBOARD_URL') || Deno.env.get('SITE_URL')
  const baseUrl = configured || DEFAULT_DASHBOARD_URL

  return `${baseUrl.replace(/\/$/, '')}/reset-password?type=invite`
}
