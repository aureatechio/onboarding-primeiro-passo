import { useCallback, useMemo, useState } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SERVICE_ROLE_KEY = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined) ?? ''

type ExecutionMode = 'dry_run' | 'execute'

interface ExecuteParams {
  clienteId: string
  adminPassword: string
  mode: ExecutionMode
}

interface ExecuteResult {
  success: boolean
  errorMessage?: string
}

interface UseOmieBackfillClientAddressReturn {
  loading: boolean
  error: string | null
  execute: (params: ExecuteParams) => Promise<ExecuteResult>
}

const normalizeBearerToken = (token: string) => token.trim().replace(/^Bearer\s+/i, '')
const INTERNAL_BEARER = normalizeBearerToken(SERVICE_ROLE_KEY)

function mapError(code?: string, message?: string): string {
  switch (code) {
    case 'ADMIN_PASSWORD_INVALID':
      return 'Senha administrativa inválida.'
    case 'UNAUTHORIZED':
      return 'Credencial interna inválida.'
    case 'INVALID_REQUEST':
      return message ?? 'Parâmetros inválidos.'
    case 'CLIENTE_NOT_FOUND':
      return 'Cliente não encontrado.'
    default:
      return message ?? 'Falha ao executar backfill unitário.'
  }
}

export function useOmieBackfillClientAddress(): UseOmieBackfillClientAddressReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (params: ExecuteParams): Promise<ExecuteResult> => {
    setLoading(true)
    setError(null)
    try {
      if (!SUPABASE_URL || !INTERNAL_BEARER) {
        throw new Error('Configuração interna ausente para executar função.')
      }
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/omie-backfill-client-address`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${INTERNAL_BEARER}`,
            'x-admin-password': params.adminPassword.trim(),
          },
          body: JSON.stringify({
            mode: params.mode,
            cliente_id: params.clienteId,
          }),
        }
      )
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        const code = typeof data.code === 'string' ? data.code : undefined
        const message = typeof data.message === 'string' ? data.message : undefined
        const errorMsg = mapError(code, message)
        setError(errorMsg)
        setLoading(false)
        return { success: false, errorMessage: errorMsg }
      }
      setLoading(false)
      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao executar backfill.'
      setError(errorMsg)
      setLoading(false)
      return { success: false, errorMessage: errorMsg }
    }
  }, [])

  return useMemo(() => ({ loading, error, execute }), [loading, error, execute])
}
