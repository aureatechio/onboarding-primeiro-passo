import { useCallback, useState } from 'react'

export interface BoletoEmailData {
  compraId: string
  email: string
  nome: string
  propostaDescricao: string
  valorVendaFormatado: string
  valorFormatado: string
  boletoUrls: string[]
  boletoCount: number
  subject: string
  recentSends: BoletoEmailHistoryItem[]
}

export interface BoletoEmailHistoryItem {
  auditId: string
  sentAt: string
  recipientEmail: string
  sentByUserEmail: string | null
}

export interface SendBoletosEmailPayload {
  compraId: string
  email: string
  nome: string
  ccEmails: string[]
  subject: string
}

export interface SendBoletosEmailResult {
  success: boolean
  message: string
  auditId: string
}

interface ApiError {
  success?: boolean
  message?: string
  code?: string
}

interface UseEnviarBoletosEmailReturn {
  fetchLoading: boolean
  sendLoading: boolean
  fetchError: string | null
  sendError: string | null
  data: BoletoEmailData | null
  result: SendBoletosEmailResult | null
  buscarDados: (compraId: string) => Promise<BoletoEmailData | null>
  enviar: (payload: SendBoletosEmailPayload) => Promise<boolean>
  resetFeedback: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const DEFAULT_SUBJECT = 'Seus boletos e detalhes da proposta'

function mapErrorMessage(error: ApiError): string {
  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message
  }

  if (error.code === 'VALIDATION_ERROR') return error.message ?? 'Dados inválidos'
  if (error.code === 'UNAUTHORIZED') return 'Não autorizado para enviar email'
  if (error.code === 'NOT_FOUND') return error.message ?? 'Dados não encontrados'
  if (error.code === 'EMAIL_PROVIDER_ERROR')
    return 'Falha no provedor de email. Tente novamente.'
  return error.message ?? 'Erro ao processar solicitação'
}

async function postToBoletoEmailFunction<T>(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data: T | ApiError }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-boleto-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as T | ApiError
  return {
    ok: response.ok,
    data,
  }
}

export function useEnviarBoletosEmail(): UseEnviarBoletosEmailReturn {
  const [fetchLoading, setFetchLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [data, setData] = useState<BoletoEmailData | null>(null)
  const [result, setResult] = useState<SendBoletosEmailResult | null>(null)

  const resetFeedback = useCallback(() => {
    setFetchError(null)
    setSendError(null)
    setResult(null)
  }, [])

  const buscarDados = useCallback(
    async (compraId: string): Promise<BoletoEmailData | null> => {
      setFetchLoading(true)
      setFetchError(null)
      setResult(null)

      try {
        const response = await postToBoletoEmailFunction<{
          success: true
          data: BoletoEmailData
        }>({
          action: 'fetch',
          compraId,
        })

        if (!response.ok) {
          const errorData = response.data as ApiError
          setFetchError(mapErrorMessage(errorData))
          setData(null)
          setFetchLoading(false)
          return null
        }

        const rawFetched = (response.data as { success: true; data: BoletoEmailData }).data
        const fetched: BoletoEmailData = {
          ...rawFetched,
          subject: rawFetched.subject?.trim() || DEFAULT_SUBJECT,
          recentSends: Array.isArray(rawFetched.recentSends)
            ? rawFetched.recentSends
            : [],
        }
        setData(fetched)
        setFetchLoading(false)
        return fetched
      } catch (error) {
        setFetchError(
          error instanceof Error ? error.message : 'Erro de conexão com o servidor'
        )
        setData(null)
        setFetchLoading(false)
        return null
      }
    },
    []
  )

  const enviar = useCallback(
    async (payload: SendBoletosEmailPayload): Promise<boolean> => {
      setSendLoading(true)
      setSendError(null)
      setResult(null)

      try {
        const response = await postToBoletoEmailFunction<SendBoletosEmailResult>({
          action: 'send',
          compraId: payload.compraId,
          email: payload.email,
          nome: payload.nome,
          ccEmails: payload.ccEmails,
          subject: payload.subject,
        })

        if (!response.ok) {
          const errorData = response.data as ApiError
          setSendError(mapErrorMessage(errorData))
          setSendLoading(false)
          return false
        }

        setResult(response.data as SendBoletosEmailResult)
        setSendLoading(false)
        return true
      } catch (error) {
        setSendError(
          error instanceof Error ? error.message : 'Erro de conexão com o servidor'
        )
        setSendLoading(false)
        return false
      }
    },
    []
  )

  return {
    fetchLoading,
    sendLoading,
    fetchError,
    sendError,
    data,
    result,
    buscarDados,
    enviar,
    resetFeedback,
  }
}
