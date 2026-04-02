import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface SplitSession {
  id: string
  split_index: number | null
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

interface UseSplitGroupSessionsResult {
  sessions: SplitSession[]
  loading: boolean
  error: string | null
  fetch: (splitGroupId: string) => Promise<void>
}

const FIELDS = [
  'id',
  'split_index',
  'metodo_pagamento',
  'status',
  'valor_centavos',
  'payment_id',
  'payment_status',
  'boleto_url',
  'boleto_barcode',
  'boleto_digitable_line',
  'boleto_vencimento',
  'boleto_number',
  'completed_at',
  'created_at',
  'updated_at',
].join(', ')

export function useSplitGroupSessions(
  splitGroupId: string | null,
): UseSplitGroupSessionsResult {
  const [sessions, setSessions] = useState<SplitSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (groupId: string) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('checkout_sessions')
      .select(FIELDS)
      .eq('split_group_id', groupId)
      .order('split_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
      setSessions([])
    } else {
      setSessions((data as unknown as SplitSession[]) ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (splitGroupId) {
      void fetch(splitGroupId)
    } else {
      setSessions([])
    }
  }, [splitGroupId, fetch])

  return { sessions, loading, error, fetch }
}
