import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAdminPassword } from '../_shared/admin-auth.ts'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_ACTIONS = ['allow', 'revoke', 'block'] as const
type Action = (typeof VALID_ACTIONS)[number]

const VALID_REASONS = [
  'negotiated_payment_terms',
  'manual_exception',
  'revoked_by_admin',
  'other',
] as const

const ACTION_TO_STATUS: Record<Action, string> = {
  allow: 'allowed',
  revoke: 'revoked',
  block: 'blocked',
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ success: false, code: 'METHOD_NOT_ALLOWED', message: 'Use POST.' }, 405)
  }

  const authCheck = requireAdminPassword(req)
  if (!authCheck.authorized) {
    return (authCheck as { authorized: false; response: Response }).response
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ success: false, code: 'INVALID_JSON', message: 'JSON invalido.' }, 400)
  }

  const compraId = String(body.compra_id ?? '').trim()
  const action = String(body.action ?? '').trim() as Action
  const reasonCode = String(body.reason_code ?? '').trim()
  const notes = body.notes ? String(body.notes).trim().slice(0, 1000) : null
  const allowedUntil = body.allowed_until ? String(body.allowed_until).trim() : null
  const actorId = body.actor_id ? String(body.actor_id).trim() : 'admin'

  if (!compraId || !UUID_RE.test(compraId)) {
    return json({ success: false, code: 'INVALID_COMPRA_ID', message: 'compra_id ausente ou invalido.' }, 400)
  }

  if (!VALID_ACTIONS.includes(action)) {
    return json({
      success: false,
      code: 'INVALID_ACTION',
      message: `action invalida. Use: ${VALID_ACTIONS.join(', ')}`,
    }, 400)
  }

  if (!VALID_REASONS.includes(reasonCode as (typeof VALID_REASONS)[number])) {
    return json({
      success: false,
      code: 'INVALID_REASON',
      message: `reason_code invalido. Use: ${VALID_REASONS.join(', ')}`,
    }, 400)
  }

  if (allowedUntil && Number.isNaN(Date.parse(allowedUntil))) {
    return json({ success: false, code: 'INVALID_DATE', message: 'allowed_until invalido.' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, code: 'CONFIG_ERROR', message: 'Supabase env vars not configured.' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: compra, error: compraError } = await supabase
    .from('compras')
    .select('id')
    .eq('id', compraId)
    .maybeSingle()

  if (compraError || !compra) {
    return json({ success: false, code: 'COMPRA_NOT_FOUND', message: 'Compra nao encontrada.' }, 404)
  }

  const newStatus = ACTION_TO_STATUS[action]

  const { data: upserted, error: upsertError } = await supabase
    .from('onboarding_access')
    .upsert(
      {
        compra_id: compraId,
        status: newStatus,
        reason_code: reasonCode,
        notes,
        allowed_until: action === 'allow' ? allowedUntil : null,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'compra_id' },
    )
    .select('id, compra_id, status, reason_code, notes, allowed_until, updated_at')
    .single()

  if (upsertError || !upserted) {
    console.error('[set-onboarding-access] upsert error:', upsertError)
    return json({ success: false, code: 'DB_ERROR', message: 'Erro ao salvar acesso.' }, 500)
  }

  return json({
    success: true,
    access: upserted,
    message: `Onboarding ${newStatus} para compra ${compraId}.`,
  })
})
