import { useCallback, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface CheckoutSessionBrief {
  cliente_nome: string | null
  valor_centavos: number | null
  parcelas: number | null
  card_brand: string | null
  card_last_four: string | null
  expires_at: string | null
  permite_dois_meios: boolean | null
  metodo_pagamento: string | null
  payment_response: Record<string, unknown> | null
}

interface UseCheckoutSessionBriefResult {
  data: CheckoutSessionBrief | null
  loading: boolean
  error: string | null
  fetch: (compraId: string) => Promise<void>
}

export function useCheckoutSessionBrief(): UseCheckoutSessionBriefResult {
  const [data, setData] = useState<CheckoutSessionBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastCompraIdRef = useRef<string | null>(null)

  const fetch = useCallback(async (compraId: string) => {
    if (lastCompraIdRef.current === compraId && data) return
    lastCompraIdRef.current = compraId

    setLoading(true)
    setError(null)

    const { data: row, error: err } = await supabase
      .from('checkout_sessions')
      .select(
        'cliente_nome, valor_centavos, parcelas, card_brand, card_last_four, expires_at, permite_dois_meios, metodo_pagamento, payment_response',
      )
      .eq('compra_id', compraId)
      .maybeSingle()

    if (err) {
      setError(err.message)
      setData(null)
    } else {
      setData(row as CheckoutSessionBrief | null)
    }

    setLoading(false)
  }, [data])

  return { data, loading, error, fetch }
}
