import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? ''
const COOLDOWN_MS = 60_000

type SessionMap<T> = Record<string, T>

export interface ReconcileApiResult {
  session_id: string
  status: string | null
  payment_status: number | null
  payment_status_description: string | null
  status_changed: boolean
  completed_at: string | null
}

interface ManualReconcileInput {
  sessionId: string
  compraId?: string | null
  statusBefore?: string | null
  paymentId?: string | null
  adminPassword: string
}

interface ReconcileFeedback {
  kind: 'success' | 'warning'
  message: string
}

interface ManualReconcileState {
  loadingBySession: SessionMap<boolean>
  errorBySession: SessionMap<string | null>
  feedbackBySession: SessionMap<ReconcileFeedback | null>
  resultBySession: SessionMap<ReconcileApiResult | null>
  cooldownUntilBySession: SessionMap<number>
}

function isEligible(status: string | null | undefined, paymentId: string | null | undefined): boolean {
  if (!paymentId) return false
  const normalized = String(status || '').toLowerCase()
  return normalized === 'pending' || normalized === 'processing'
}

function normalizeApiError(payload: unknown, statusCode: number): string {
  if (typeof payload === 'object' && payload !== null) {
    const body = payload as Record<string, unknown>
    if (body.code === 'UNAUTHORIZED') return 'Senha de admin incorreta'
    if (typeof body.message === 'string' && body.message.trim()) return body.message
    if (typeof body.error === 'string' && body.error.trim()) return body.error
  }
  return `Falha na reconciliação (${statusCode})`
}

async function validateAdminPassword(adminPassword: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/get-checkout-config`, {
    method: 'GET',
    headers: { 'x-admin-password': adminPassword },
  })

  if (response.ok) return

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  throw new Error(normalizeApiError(payload, response.status))
}

export function useManualReconcile() {
  const [state, setState] = useState<ManualReconcileState>({
    loadingBySession: {},
    errorBySession: {},
    feedbackBySession: {},
    resultBySession: {},
    cooldownUntilBySession: {},
  })
  const [clock, setClock] = useState(Date.now())

  const hasActiveCooldown = useMemo(
    () =>
      Object.values(state.cooldownUntilBySession).some(
        (until) => Number.isFinite(until) && until > clock
      ),
    [clock, state.cooldownUntilBySession]
  )

  useEffect(() => {
    if (!hasActiveCooldown) return
    const timer = window.setInterval(() => {
      setClock(Date.now())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hasActiveCooldown])

  const getCooldownSeconds = useCallback(
    (sessionId: string): number => {
      const until = state.cooldownUntilBySession[sessionId] ?? 0
      if (until <= clock) return 0
      return Math.ceil((until - clock) / 1000)
    },
    [clock, state.cooldownUntilBySession]
  )

  const reconcile = useCallback(async (input: ManualReconcileInput): Promise<boolean> => {
    const { sessionId, compraId, statusBefore, paymentId, adminPassword } = input
    const currentCooldown = state.cooldownUntilBySession[sessionId] ?? 0
    const now = Date.now()
    const cooldownSeconds = currentCooldown > now ? Math.ceil((currentCooldown - now) / 1000) : 0

    if (!adminPassword.trim()) {
      setState((prev) => ({
        ...prev,
        errorBySession: {
          ...prev.errorBySession,
          [sessionId]: 'Informe a senha de admin para reconciliar',
        },
      }))
      return false
    }

    if (!isEligible(statusBefore, paymentId)) {
      setState((prev) => ({
        ...prev,
        errorBySession: {
          ...prev.errorBySession,
          [sessionId]: 'Sessão não elegível para reconciliação manual',
        },
      }))
      return false
    }

    if (cooldownSeconds > 0) {
      setState((prev) => ({
        ...prev,
        errorBySession: {
          ...prev.errorBySession,
          [sessionId]: `Aguarde ${cooldownSeconds}s para reconciliar novamente`,
        },
      }))
      return false
    }

    setState((prev) => ({
      ...prev,
      loadingBySession: { ...prev.loadingBySession, [sessionId]: true },
      errorBySession: { ...prev.errorBySession, [sessionId]: null },
      feedbackBySession: { ...prev.feedbackBySession, [sessionId]: null },
    }))

    const startedAt = Date.now()

    try {
      await validateAdminPassword(adminPassword)

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/check-payment-status?session_id=${encodeURIComponent(sessionId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )

      let payload: unknown = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (!response.ok) {
        throw new Error(normalizeApiError(payload, response.status))
      }

      const body = payload as Record<string, unknown>
      const result: ReconcileApiResult = {
        session_id: String(body.session_id ?? sessionId),
        status: body.status == null ? null : String(body.status),
        payment_status:
          typeof body.payment_status === 'number' ? body.payment_status : null,
        payment_status_description:
          body.payment_status_description == null
            ? null
            : String(body.payment_status_description),
        status_changed: body.status_changed === true,
        completed_at: body.completed_at == null ? null : String(body.completed_at),
      }

      const executionTimeMs = Date.now() - startedAt
      const feedbackMessage = result.status_changed
        ? 'Status atualizado agora'
        : 'Sem alteração'

      const { error: auditError } = await supabase.from('checkout_audit_log').insert({
        session_id: sessionId,
        compra_id: compraId ?? null,
        event_type: 'MANUAL_RECONCILE',
        function_name: 'dashboard-manual-reconcile',
        execution_time_ms: executionTimeMs,
        metadata: {
          status_before: statusBefore ?? null,
          status_after: result.status,
          status_changed: result.status_changed,
          payment_status: result.payment_status,
          payment_status_description: result.payment_status_description,
          completed_at: result.completed_at,
          triggered_by: 'dashboard',
        },
      })

      const feedback: ReconcileFeedback = auditError
        ? {
            kind: 'warning',
            message: `${feedbackMessage} (auditoria não registrada)`,
          }
        : { kind: 'success', message: feedbackMessage }

      setState((prev) => ({
        ...prev,
        resultBySession: { ...prev.resultBySession, [sessionId]: result },
        feedbackBySession: { ...prev.feedbackBySession, [sessionId]: feedback },
        cooldownUntilBySession: {
          ...prev.cooldownUntilBySession,
          [sessionId]: Date.now() + COOLDOWN_MS,
        },
      }))

      return true
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao reconciliar pagamento'
      setState((prev) => ({
        ...prev,
        errorBySession: { ...prev.errorBySession, [sessionId]: message },
      }))
      return false
    } finally {
      setState((prev) => ({
        ...prev,
        loadingBySession: { ...prev.loadingBySession, [sessionId]: false },
      }))
    }
  }, [state.cooldownUntilBySession])

  return {
    isEligible,
    loadingBySession: state.loadingBySession,
    errorBySession: state.errorBySession,
    feedbackBySession: state.feedbackBySession,
    resultBySession: state.resultBySession,
    getCooldownSeconds,
    reconcile,
  }
}
