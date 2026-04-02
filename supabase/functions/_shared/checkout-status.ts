import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { handleSplitCompletion } from './split.ts'
import { moveLeadToGanhoIfEligible } from './lead-stage.ts'
export {
  getSessionNotRetryableApiError,
  getSessionNotRetryableMessage,
  type SessionForNotRetryableError,
  type SessionNotRetryableApiError,
} from './checkout-session-errors.ts'

const RETRYABLE_STATUSES = ['pending', 'failed'] as const
const TERMINAL_STATUSES = ['completed', 'cancelled', 'expired'] as const

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['processing', 'failed', 'cancelled', 'expired', 'split_created', 'completed'],
  failed: ['processing', 'cancelled', 'expired'],
  processing: ['completed', 'failed', 'cancelled', 'expired'],
  split_created: ['cancelled', 'expired'],
  completed: [],
  cancelled: [],
  expired: [],
}

const STALE_THRESHOLDS = {
  NO_PAYMENT_ID_MS: 5 * 60 * 1000, // 5 min sem payment_id = crash/timeout
  PIX_EXPIRATION_BUFFER_MS: 5 * 60 * 1000, // 5 min apos exp. do PIX
  SESSION_EXPIRY_BUFFER_MS: 0, // sessao vencida vira stale imediato
  GENERIC_STALE_MS: 2 * 60 * 60 * 1000, // 2h timeout generico
} as const

export interface SessionForStaleCheck {
  id: string
  compra_id: string
  status: string
  split_group_id?: string | null
  payment_id?: string | null
  pix_expiration?: string | null
  metodo_pagamento?: string | null
  updated_at?: string | null
  expires_at?: string | null
}

export function mapCieloStatus(status: number): string {
  switch (status) {
    case 0:
      return 'pending'
    case 1:
      return 'processing'
    case 2:
      return 'completed'
    case 3:
      return 'failed'
    case 10:
      return 'cancelled'
    case 11:
      return 'failed'
    case 12:
      return 'pending'
    case 13:
      return 'failed'
    case 20:
      return 'pending'
    default:
      return 'pending'
  }
}

export function getStatusDescription(status: number): string {
  switch (status) {
    case 0:
      return 'Nao finalizado'
    case 1:
      return 'Autorizado'
    case 2:
      return 'Pagamento confirmado'
    case 3:
      return 'Negado'
    case 10:
      return 'Cancelado'
    case 11:
      return 'Estornado'
    case 12:
      return 'Pendente'
    case 13:
      return 'Abortado'
    case 20:
      return 'Agendado'
    default:
      return 'Status desconhecido'
  }
}

export interface QueryCieloPaymentStatusResult {
  paymentStatus: number | null
  configError: boolean
  paymentPayload: unknown | null
}

export async function queryCieloPaymentStatus(paymentId: string): Promise<number | null>
export async function queryCieloPaymentStatus(
  paymentId: string,
  options: { includeMetadata: true },
): Promise<QueryCieloPaymentStatusResult>
export async function queryCieloPaymentStatus(
  paymentId: string,
  options?: { includeMetadata?: boolean },
): Promise<number | null | QueryCieloPaymentStatusResult> {
  const queryUrl = Deno.env.get('CIELO_QUERY_URL')
  const merchantId = Deno.env.get('CIELO_MERCHANT_ID')
  const merchantKey = Deno.env.get('CIELO_MERCHANT_KEY')
  const includeMetadata = options?.includeMetadata === true

  if (!queryUrl || !merchantId || !merchantKey) {
    return includeMetadata
      ? { paymentStatus: null, configError: true, paymentPayload: null }
      : null
  }

  try {
    const cieloResponse = await fetch(`${queryUrl.replace(/\/$/, '')}/v2/sales/${paymentId}`, {
      method: 'GET',
      headers: {
        MerchantId: merchantId,
        MerchantKey: merchantKey,
      },
    })

    if (!cieloResponse.ok) {
      return includeMetadata
        ? { paymentStatus: null, configError: false, paymentPayload: null }
        : null
    }

    const cieloData = await cieloResponse.json()
    const cieloStatus = Number(cieloData?.Payment?.Status)
    const paymentStatus = Number.isFinite(cieloStatus) ? cieloStatus : null

    return includeMetadata
      ? { paymentStatus, configError: false, paymentPayload: cieloData }
      : paymentStatus
  } catch {
    return includeMetadata
      ? { paymentStatus: null, configError: false, paymentPayload: null }
      : null
  }
}

export function isRetryableStatus(status: string | null | undefined): boolean {
  return status != null && (RETRYABLE_STATUSES as readonly string[]).includes(status)
}

export function isTerminalStatus(status: string | null | undefined): boolean {
  return status != null && (TERMINAL_STATUSES as readonly string[]).includes(status)
}

export function canTransitionStatus(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus]
  return !!allowed && allowed.includes(toStatus)
}

export function assertStatusTransition(
  fromStatus: string,
  toStatus: string,
): { ok: true } | { ok: false; code: 'INVALID_STATUS_TRANSITION'; message: string } {
  if (canTransitionStatus(fromStatus, toStatus)) {
    return { ok: true }
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || []
  return {
    ok: false,
    code: 'INVALID_STATUS_TRANSITION',
    message: `Transition not allowed: ${fromStatus} -> ${toStatus}. Allowed: ${allowed.join(', ') || '(none)'}`,
  }
}

function toMs(dateValue: string | null | undefined): number | null {
  if (!dateValue) return null
  const value = new Date(dateValue).getTime()
  return Number.isFinite(value) ? value : null
}

export function isStaleProcessing(session: SessionForStaleCheck): boolean {
  if (session.status !== 'processing') return false

  const now = Date.now()

  if (!session.payment_id) {
    const updatedAt = toMs(session.updated_at)
    if (updatedAt && now - updatedAt > STALE_THRESHOLDS.NO_PAYMENT_ID_MS) return true
  }

  if (session.metodo_pagamento === 'pix' && session.pix_expiration) {
    const pixExpiry = toMs(session.pix_expiration)
    if (pixExpiry && now > pixExpiry + STALE_THRESHOLDS.PIX_EXPIRATION_BUFFER_MS) return true
  }

  const sessionExpiry = toMs(session.expires_at)
  if (sessionExpiry && now > sessionExpiry + STALE_THRESHOLDS.SESSION_EXPIRY_BUFFER_MS) return true

  const updatedAt = toMs(session.updated_at)
  if (updatedAt && now - updatedAt > STALE_THRESHOLDS.GENERIC_STALE_MS) return true

  return false
}

export async function autoRecoverStaleSession(
  supabase: SupabaseClient,
  session: SessionForStaleCheck,
  externalCieloStatus: number | null,
  externalCieloPayload: unknown | null,
): Promise<{ recovered: boolean; newStatus: string }> {
  if (!isStaleProcessing(session)) {
    return { recovered: false, newStatus: session.status }
  }

  if (session.payment_id) {
    if (externalCieloStatus === 2) {
      let compraStatus = 'pago'
      if (session.split_group_id) {
        try {
          const { allPaid } = await handleSplitCompletion(supabase, session)
          compraStatus = allPaid ? 'pago' : 'parcialmente_pago'
        } catch {
          compraStatus = 'parcialmente_pago'
        }
      }

      const { error: compraUpdateError } = await supabase
        .from('compras')
        .update({ checkout_status: compraStatus })
        .eq('id', session.compra_id)

      await supabase
        .from('checkout_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_status: externalCieloStatus,
          payment_response: externalCieloPayload,
        })
        .eq('id', session.id)

      if (compraStatus === 'pago' && !compraUpdateError) {
        void moveLeadToGanhoIfEligible(session.compra_id, supabase, 'payment')
      }

      return { recovered: true, newStatus: 'completed' }
    }
  }

  await supabase
    .from('checkout_sessions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)

  return { recovered: true, newStatus: 'failed' }
}
