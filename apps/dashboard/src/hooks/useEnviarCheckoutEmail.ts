import { useCallback, useState } from 'react'

export interface SendCheckoutEmailPayload {
  email: string
  nome: string
  checkoutLink: string
}

export interface SendCheckoutEmailResult {
  success: boolean
  message: string
  auditId: string
}

export interface CheckoutEmailPreview {
  source: 'session' | 'fallback'
  sessionId: string | null
  propostaDescricao: string
  valorFormatado: string
  metodosDisponiveis: string[]
  nomeDestinatario: string
  checkoutLink: string
}

interface ApiError {
  success?: boolean
  message?: string
  code?: string
}

interface UseEnviarCheckoutEmailReturn {
  loading: boolean
  error: string | null
  result: SendCheckoutEmailResult | null
  previewLoading: boolean
  previewError: string | null
  preview: CheckoutEmailPreview | null
  enviar: (payload: SendCheckoutEmailPayload) => Promise<boolean>
  carregarPreview: (payload: Pick<SendCheckoutEmailPayload, 'nome' | 'checkoutLink'>) => Promise<void>
  clearPreview: () => void
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

function mapErrorMessage(error: ApiError): string {
  if (error.code === 'VALIDATION_ERROR') return error.message ?? 'Dados inválidos'
  if (error.code === 'UNAUTHORIZED') return 'Não autorizado para enviar email'
  if (error.code === 'EMAIL_PROVIDER_ERROR' || error.code === 'SMTP_SEND_ERROR')
    return 'Falha no provedor de email. Tente novamente.'
  return error.message ?? 'Erro ao enviar email'
}

function parseSessionIdFromCheckoutLink(checkoutLink: string): string | null {
  try {
    const url = new URL(checkoutLink)
    const sessionId = url.searchParams.get('session')
    if (
      !sessionId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sessionId
      )
    ) {
      return null
    }
    return sessionId
  } catch {
    return null
  }
}

function formatBRLFromCentavos(value: number | null | undefined): string {
  if (value == null) return 'Valor disponível no checkout'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)
}

function mapPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'pix':
      return 'PIX'
    case 'cartao':
      return 'Cartão de crédito'
    case 'boleto':
      return 'Boleto'
    case 'dois_meios':
      return '2 meios de pagamento'
    default:
      return method
  }
}

export function useEnviarCheckoutEmail(): UseEnviarCheckoutEmailReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SendCheckoutEmailResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CheckoutEmailPreview | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  const clearPreview = useCallback(() => {
    setPreviewLoading(false)
    setPreviewError(null)
    setPreview(null)
  }, [])

  const enviar = useCallback(
    async (payload: SendCheckoutEmailPayload): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/send-checkout-link-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify(payload),
          }
        )

        const data = (await response.json()) as SendCheckoutEmailResult | ApiError

        if (!response.ok) {
          setError(mapErrorMessage(data as ApiError))
          setLoading(false)
          return false
        }

        setResult(data as SendCheckoutEmailResult)
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

  const carregarPreview = useCallback(
    async (payload: Pick<SendCheckoutEmailPayload, 'nome' | 'checkoutLink'>) => {
      const sessionId = parseSessionIdFromCheckoutLink(payload.checkoutLink)
      if (!sessionId) {
        setPreview({
          source: 'fallback',
          sessionId: null,
          propostaDescricao: 'Proposta comercial AUREA',
          valorFormatado: 'Valor disponível no checkout',
          metodosDisponiveis: ['PIX', 'Cartão de crédito', 'Boleto'],
          nomeDestinatario: payload.nome.trim() || 'Cliente',
          checkoutLink: payload.checkoutLink,
        })
        setPreviewError(null)
        return
      }

      setPreviewLoading(true)
      setPreviewError(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/get-checkout-session?session_id=${sessionId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (!response.ok) {
          setPreview({
            source: 'fallback',
            sessionId,
            propostaDescricao: 'Proposta comercial AUREA',
            valorFormatado: 'Valor disponível no checkout',
            metodosDisponiveis: ['PIX', 'Cartão de crédito', 'Boleto'],
            nomeDestinatario: payload.nome.trim() || 'Cliente',
            checkoutLink: payload.checkoutLink,
          })
          setPreviewError('Não foi possível carregar dados da sessão. Preview em fallback.')
          setPreviewLoading(false)
          return
        }

        const data = (await response.json()) as {
          cliente_nome?: string | null
          item_descricao?: string | null
          valor_centavos?: number | null
          payment_methods?: { visible?: string[] }
        }

        const visibleMethods = data.payment_methods?.visible ?? ['pix', 'cartao']
        const methodLabels = visibleMethods
          .filter((method) => method !== 'boleto_parcelado')
          .map(mapPaymentMethodLabel)

        setPreview({
          source: 'session',
          sessionId,
          propostaDescricao: data.item_descricao || 'Proposta comercial AUREA',
          valorFormatado: formatBRLFromCentavos(data.valor_centavos),
          metodosDisponiveis: methodLabels.length > 0 ? methodLabels : ['PIX', 'Cartão de crédito'],
          nomeDestinatario:
            data.cliente_nome?.trim() || payload.nome.trim() || 'Cliente',
          checkoutLink: payload.checkoutLink,
        })
        setPreviewLoading(false)
      } catch {
        setPreview({
          source: 'fallback',
          sessionId,
          propostaDescricao: 'Proposta comercial AUREA',
          valorFormatado: 'Valor disponível no checkout',
          metodosDisponiveis: ['PIX', 'Cartão de crédito', 'Boleto'],
          nomeDestinatario: payload.nome.trim() || 'Cliente',
          checkoutLink: payload.checkoutLink,
        })
        setPreviewError('Erro de conexão ao buscar sessão. Preview em fallback.')
        setPreviewLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    result,
    previewLoading,
    previewError,
    preview,
    enviar,
    carregarPreview,
    clearPreview,
    reset,
  }
}
