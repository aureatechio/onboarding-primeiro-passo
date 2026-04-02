import { useState, useCallback } from 'react'

interface DeletedTable {
  tabela: string
  registros_afetados: number
}

interface DeleteOptions {
  lead?: boolean
  cliente?: boolean
}

interface DeleteResult {
  success: boolean
  compra_id: string
  deleted: DeletedTable[]
  warnings?: string[]
  preserved?: string[]
}

interface UseDeleteTransactionResult {
  loading: boolean
  error: string | null
  result: DeleteResult | null
  deleteTransaction: (
    compraId: string,
    password: string,
    deleteOptions?: DeleteOptions
  ) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function useDeleteTransaction(): UseDeleteTransactionResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DeleteResult | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  const deleteTransaction = useCallback(
    async (
      compraId: string,
      password: string,
      deleteOptions?: DeleteOptions
    ): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/delete-transaction`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-password': password,
            },
            body: JSON.stringify({
              compra_id: compraId,
              delete_options: {
                lead: deleteOptions?.lead ?? false,
                cliente: deleteOptions?.cliente ?? false,
              },
            }),
          }
        )

        const data = await response.json()

        if (!response.ok) {
          const message =
            data.code === 'UNAUTHORIZED'
              ? 'Senha incorreta'
              : data.code === 'NOT_FOUND'
                ? 'Transação não encontrada'
                : data.error ?? 'Erro ao deletar transação'
          setError(message)
          setLoading(false)
          return false
        }

        setResult(data as DeleteResult)
        setLoading(false)
        return true
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro de conexão com o servidor'
        )
        setLoading(false)
        return false
      }
    },
    []
  )

  return { loading, error, result, deleteTransaction, reset }
}
