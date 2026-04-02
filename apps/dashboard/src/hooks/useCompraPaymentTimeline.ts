import { useCallback, useEffect, useState } from 'react'
import { buildTimeline } from '@/lib/payment-timeline'
import { fetchRawSessionsForCompraTimeline } from '@/lib/fetch-compra-timeline-sessions'

export interface TimelineSession {
  id: string
  displayIndex: number
  split_index: number | null
  split_group_id: string | null
  metodo_pagamento: string | null
  status: string
  valor_centavos: number
  payment_id: string | null
  payment_status: number | null
  boleto_url: string | null
  boleto_barcode: string | null
  boleto_digitable_line: string | null
  boleto_vencimento: string | null
  boleto_number: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface UseCompraPaymentTimelineResult {
  sessions: TimelineSession[]
  paidCount: number
  totalCount: number
  loading: boolean
  error: string | null
  fetch: (compraId: string, splitGroupId?: string | null) => Promise<void>
}

export function useCompraPaymentTimeline(
  compraId: string | null,
  splitGroupId: string | null,
): UseCompraPaymentTimelineResult {
  const [sessions, setSessions] = useState<TimelineSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(
    async (cId: string, sgId?: string | null) => {
      setLoading(true)
      setError(null)

      try {
        const groupId = sgId ?? splitGroupId
        const { data: allRaw, error: fetchErr } = await fetchRawSessionsForCompraTimeline(
          cId,
          groupId,
        )

        if (fetchErr) {
          setError(fetchErr)
          setSessions([])
          return
        }

        type RawSession = Omit<TimelineSession, 'displayIndex'>
        setSessions(buildTimeline(allRaw as RawSession[]))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar timeline')
        setSessions([])
      } finally {
        setLoading(false)
      }
    },
    [splitGroupId],
  )

  useEffect(() => {
    if (compraId) {
      void fetch(compraId, splitGroupId)
    } else {
      setSessions([])
    }
  }, [compraId, splitGroupId, fetch])

  const paidCount = sessions.filter((s) => s.status === 'completed').length
  const totalCount = sessions.length

  return { sessions, paidCount, totalCount, loading, error, fetch }
}
