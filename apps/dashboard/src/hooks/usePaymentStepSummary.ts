import { useCallback, useEffect, useState } from 'react'
import { fetchRawSessionsForCompraTimeline } from '@/lib/fetch-compra-timeline-sessions'
import {
  computePaymentStepSummary,
  type PaymentStepSummary,
} from '@/lib/payment-step-summary'

interface UsePaymentStepSummaryResult {
  summary: PaymentStepSummary | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Paid/total + label for PipelineStepper, aligned with unified payment timeline.
 * Only meaningful when split_group_id is set; otherwise summary stays null.
 */
export function usePaymentStepSummary(
  compraId: string | null,
  splitGroupId: string | null,
  splitType: string | null,
  /** Bumps refetch when pipeline row changes (e.g. after realtime refresh). */
  bumpKey?: string | null,
): UsePaymentStepSummaryResult {
  const [summary, setSummary] = useState<PaymentStepSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!compraId || !splitGroupId) {
      setSummary(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: raw, error: fetchErr } = await fetchRawSessionsForCompraTimeline(
        compraId,
        splitGroupId,
      )
      if (fetchErr) {
        setError(fetchErr)
        setSummary(null)
        return
      }
      setSummary(computePaymentStepSummary(raw, splitType))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar resumo')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [compraId, splitGroupId, splitType])

  useEffect(() => {
    void load()
  }, [load, bumpKey])

  return { summary, loading, error, refetch: load }
}
