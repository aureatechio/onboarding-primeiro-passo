import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface BoletoSession {
  id: string
  split_index: number | null
  metodo_pagamento: string | null
  status: string
  valor_centavos: number
  boleto_url: string
  boleto_barcode: string | null
  boleto_digitable_line: string | null
  boleto_number: string | null
  boleto_vencimento: string | null
  payment_id: string | null
  payment_status: number | null
  created_at: string
  updated_at: string
}

interface UseBoletosResult {
  boletos: BoletoSession[]
  loading: boolean
  error: string | null
  fetch: (compraId: string) => Promise<void>
}

export function useBoletos(): UseBoletosResult {
  const [boletos, setBoletos] = useState<BoletoSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (compraId: string) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('checkout_sessions')
      .select(
        'id, split_index, metodo_pagamento, status, valor_centavos, boleto_url, boleto_barcode, boleto_digitable_line, boleto_number, boleto_vencimento, payment_id, payment_status, created_at, updated_at',
      )
      .eq('compra_id', compraId)
      .is('split_group_id', null)
      .not('boleto_url', 'is', null)
      .order('split_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
      setBoletos([])
    } else {
      setBoletos((data as BoletoSession[]) ?? [])
    }

    setLoading(false)
  }, [])

  return { boletos, loading, error, fetch }
}
