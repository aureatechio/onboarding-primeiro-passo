import { useState, useCallback } from 'react'

interface DiscountSnapshot {
  valor_centavos: number
  valor_original_centavos: number
  desconto_aplicado_centavos: number
  desconto_percentual: number | null
  desconto_tipo: string | null
}

export interface ApplyDiscountResult {
  success: boolean
  session_id: string
  compra_id: string
  cliente_nome: string | null
  before: DiscountSnapshot
  after: DiscountSnapshot
}

interface UseApplyDiscountReturn {
  loading: boolean
  error: string | null
  result: ApplyDiscountResult | null
  applyDiscount: (
    sessionId: string,
    descontoPercentual: number,
    password: string
  ) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function useApplyDiscount(): UseApplyDiscountReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApplyDiscountResult | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  const applyDiscount = useCallback(
    async (
      sessionId: string,
      descontoPercentual: number,
      password: string
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/apply-discount`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-password': password,
            },
            body: JSON.stringify({
              session_id: sessionId,
              desconto_percentual: descontoPercentual,
            }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          const message =
            data.code === 'UNAUTHORIZED'
              ? 'Senha incorreta'
              : data.code === 'NOT_FOUND'
                ? 'Sessão não encontrada'
                : data.code === 'INVALID_STATUS'
                  ? data.error
                  : data.error ?? 'Erro ao aplicar desconto'
          setError(message)
          setLoading(false)
          return false
        }

        setResult(data as ApplyDiscountResult)
        setLoading(false)
        return true
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro de conexão com o servidor'
        )
        setLoading(false)
        return false
      }
    },
    []
  )

  return { loading, error, result, applyDiscount, reset }
}
