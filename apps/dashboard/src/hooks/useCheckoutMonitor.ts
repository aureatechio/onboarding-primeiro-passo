import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  CheckoutHealthKpis,
  PendingSessionSla,
  StatusDivergence,
  WebhookSignalHour,
  AuditAlert,
  StatusDistributionEntry,
} from '@/lib/checkout-monitor'
import { ALERT_EVENT_TYPES } from '@/lib/checkout-monitor'

const REALTIME_DEBOUNCE_MS = 2_000
const POLLING_INTERVAL_MS = 60_000

interface CheckoutMonitorState {
  kpis: CheckoutHealthKpis | null
  pendingSessions: PendingSessionSla[]
  divergences: StatusDivergence[]
  webhookSignal: WebhookSignalHour[]
  alerts: AuditAlert[]
  statusDistribution: StatusDistributionEntry[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

const INITIAL_STATE: CheckoutMonitorState = {
  kpis: null,
  pendingSessions: [],
  divergences: [],
  webhookSignal: [],
  alerts: [],
  statusDistribution: [],
  loading: false,
  error: null,
  lastUpdated: null,
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function useCheckoutMonitor() {
  const [state, setState] = useState<CheckoutMonitorState>(INITIAL_STATE)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchAll = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const [
        pendingRes,
        divergenceRes,
        webhookRes,
        alertsRes,
        statusRes,
        completionRes,
      ] = await Promise.all([
        supabase
          .from('v_checkout_pending_sessions_sla')
          .select('*')
          .order('pending_age_minutes', { ascending: false }),

        supabase.from('v_checkout_status_divergences').select('*'),

        supabase
          .from('v_checkout_webhook_signal_24h')
          .select('*')
          .order('hour_bucket', { ascending: true }),

        supabase
          .from('checkout_audit_log')
          .select('id, event_type, function_name, metadata, created_at')
          .in('event_type', [...ALERT_EVENT_TYPES])
          .order('created_at', { ascending: false })
          .limit(50),

        supabase
          .from('checkout_sessions')
          .select('status')
          .gte('created_at', since24h),

        supabase
          .from('checkout_sessions')
          .select('created_at, completed_at')
          .eq('status', 'completed')
          .not('completed_at', 'is', null)
          .gte('created_at', since24h),
      ])

      if (!mountedRef.current) return

      const isViewMissing = (err: { message?: string } | null) =>
        err?.message?.includes('does not exist') ?? false

      const pendingSessions = isViewMissing(pendingRes.error)
        ? []
        : ((pendingRes.data ?? []) as PendingSessionSla[])
      const divergences = isViewMissing(divergenceRes.error)
        ? []
        : ((divergenceRes.data ?? []) as StatusDivergence[])
      const webhookSignal = isViewMissing(webhookRes.error)
        ? []
        : ((webhookRes.data ?? []) as WebhookSignalHour[])
      const alerts = (alertsRes.data ?? []) as AuditAlert[]

      if (pendingRes.error && isViewMissing(pendingRes.error))
        console.warn('[CheckoutMonitor] SLA view unavailable — using empty data')
      if (divergenceRes.error && isViewMissing(divergenceRes.error))
        console.warn('[CheckoutMonitor] Divergences view unavailable — using empty data')
      if (webhookRes.error && isViewMissing(webhookRes.error))
        console.warn('[CheckoutMonitor] Webhook signal view unavailable — using empty data')

      const statusRows = (statusRes.data ?? []) as { status: string }[]
      const statusCounts = new Map<string, number>()
      for (const row of statusRows) {
        statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
      }
      const statusDistribution: StatusDistributionEntry[] = Array.from(
        statusCounts.entries()
      ).map(([status, count]) => ({ status, count }))

      const totalLast24h = statusRows.length
      const completedLast24h = statusCounts.get('completed') ?? 0
      const failedLast24h = statusCounts.get('failed') ?? 0

      const completionRows = (completionRes.data ?? []) as {
        created_at: string
        completed_at: string
      }[]
      let avgCompletionSeconds: number | null = null
      if (completionRows.length > 0) {
        const totalSeconds = completionRows.reduce((sum, row) => {
          const created = new Date(row.created_at).getTime()
          const completed = new Date(row.completed_at).getTime()
          return sum + (completed - created) / 1000
        }, 0)
        avgCompletionSeconds = Math.round(totalSeconds / completionRows.length)
      }

      const slaWarningCount = pendingSessions.filter(
        (s) => s.sla_bucket === 'warning'
      ).length
      const slaCriticalCount = pendingSessions.filter(
        (s) => s.sla_bucket === 'critical'
      ).length

      const kpis: CheckoutHealthKpis = {
        pendingSessions: toNumber(
          pendingSessions.filter((s) => s.status === 'pending').length ||
            statusCounts.get('pending'),
          0
        ),
        processingSessions: toNumber(
          pendingSessions.filter((s) => s.status === 'processing').length ||
            statusCounts.get('processing'),
          0
        ),
        completedLast24h,
        failedLast24h,
        totalLast24h,
        successRate:
          totalLast24h > 0
            ? Math.round((completedLast24h / totalLast24h) * 1000) / 10
            : null,
        failureRate:
          totalLast24h > 0
            ? Math.round((failedLast24h / totalLast24h) * 1000) / 10
            : null,
        avgCompletionSeconds,
        slaWarningCount,
        slaCriticalCount,
        divergenceCount: divergences.length,
      }

      const allErrors = [
        pendingRes.error,
        divergenceRes.error,
        webhookRes.error,
        alertsRes.error,
        statusRes.error,
        completionRes.error,
      ]
      const fatalMessages = allErrors
        .filter(
          (e): e is NonNullable<typeof e> => e != null && !isViewMissing(e)
        )
        .map((e) => e.message)

      setState({
        kpis,
        pendingSessions,
        divergences,
        webhookSignal,
        alerts,
        statusDistribution,
        loading: false,
        error:
          fatalMessages.length > 0
            ? `Erro ao carregar dados: ${fatalMessages.join('; ')}`
            : null,
        lastUpdated: new Date(),
      })
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof Error ? err.message : 'Erro ao carregar monitor'
      setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }, [])

  const debouncedFetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(fetchAll, REALTIME_DEBOUNCE_MS)
  }, [fetchAll])

  useEffect(() => {
    mountedRef.current = true
    void fetchAll()

    const channel = supabase
      .channel('checkout-monitor:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkout_sessions' },
        debouncedFetch
      )
      .subscribe()

    pollingRef.current = setInterval(fetchAll, POLLING_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      channel.unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [fetchAll, debouncedFetch])

  return {
    ...state,
    refetch: fetchAll,
  }
}
