import { useCallback, useEffect, useState } from 'react'
import { fetchRawSessionsForCompraTimeline } from '@/lib/fetch-compra-timeline-sessions'
import {
  computePaymentFinancialSummary,
  getPaymentSettlementLabel,
  type PaymentFinancialSummary,
} from '@/lib/payment-financial-summary'

interface UsePaymentFinancialSummaryResult {
  summary: PaymentFinancialSummary | null
  settlementHint: string | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePaymentFinancialSummary(
  compraId: string | null,
  splitGroupId: string | null,
  valorTotal: number | null | undefined,
  bumpKey?: string | null,
): UsePaymentFinancialSummaryResult {
  const [summary, setSummary] = useState<PaymentFinancialSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!compraId) {
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

      setSummary(computePaymentFinancialSummary(raw, valorTotal))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar resumo financeiro')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [compraId, splitGroupId, valorTotal])

  useEffect(() => {
    void load()
  }, [load, bumpKey])

  return {
    summary,
    settlementHint: summary ? getPaymentSettlementLabel(summary.situacaoQuitacao) : null,
    loading,
    error,
    refetch: load,
  }
}
