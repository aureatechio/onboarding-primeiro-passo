import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleCors } from '../_shared/cors.ts'
import { isRbacError, requireRole } from '../_shared/rbac.ts'
import { json } from '../_shared/user-management.ts'
import {
  parseDashboardActivityEvent,
  parseDashboardPath,
  sanitizeUserAgent,
} from './validation.ts'

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authResult = await requireRole(req, ['admin', 'operator', 'viewer'])
  if (isRbacError(authResult)) return authResult.error
  const { user, serviceClient } = authResult

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_JSON', message: 'JSON invalido.' }, 400)
  }

  const event = parseDashboardActivityEvent(body.event)
  const path = parseDashboardPath(body.path)

  if (!event) {
    return json({ success: false, code: 'INVALID_EVENT', message: 'event invalido.' }, 400)
  }
  if (!path) {
    return json({ success: false, code: 'INVALID_PATH', message: 'path invalido.' }, 400)
  }

  const now = new Date().toISOString()
  const userAgent = sanitizeUserAgent(req.headers.get('user-agent'))

  const { data: current, error: readError } = await serviceClient
    .from('dashboard_user_activity')
    .select('user_id, login_count')
    .eq('user_id', user.id)
    .maybeSingle()

  if (readError) {
    return json({ success: false, code: 'DB_READ_ERROR', message: readError.message }, 500)
  }

  const payload = event === 'login'
    ? {
      user_id: user.id,
      last_login_at: now,
      last_seen_at: now,
      login_count: Number(current?.login_count ?? 0) + 1,
      last_login_user_agent: userAgent,
      last_seen_path: path,
    }
    : {
      user_id: user.id,
      last_seen_at: now,
      login_count: Number(current?.login_count ?? 0),
      last_seen_path: path,
    }

  const { data, error } = await serviceClient
    .from('dashboard_user_activity')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, last_login_at, last_seen_at, login_count, last_seen_path, updated_at')
    .single()

  if (error) return json({ success: false, code: 'DB_WRITE_ERROR', message: error.message }, 500)

  return json({ success: true, activity: data })
})
