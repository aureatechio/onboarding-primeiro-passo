import { useState, useCallback } from 'react'

export interface CheckoutConfig {
  checkout_base_url: string
  webhook_retorno_url: string | null
  link_expiration_hours: number
  pix_expiration_seconds: number
  cielo_environment: string
  cartao_enabled: boolean
  pix_enabled: boolean
  boleto_enabled: boolean
  max_parcelas: number
  parcelas_sem_juros: number
  pix_discount_percent: number
  pix_discount_min_value_centavos: number
  boleto_first_due_days: number
  recorrente_enabled: boolean
  recorrente_intervalo_default: string
  recorrente_max_tentativas: number
  max_retry_attempts_30d: number
  enable_smart_retry: boolean
  enable_3ds_enforcement: boolean
  max_retry_attempts_per_session: number
  canary_percentage: number
  /** checkout_v1 = fluxo atual; checkout_v2 = contrato-flow-v3 (sem e-mail automático de assinatura) */
  checkout_version: 'checkout_v1' | 'checkout_v2'
  updated_at: string
}

function normalizeCheckoutConfigPayload(
  raw: Partial<CheckoutConfig> & Record<string, unknown>,
): CheckoutConfig {
  const v = raw.checkout_version === 'checkout_v2' ? 'checkout_v2' : 'checkout_v1'
  return { ...(raw as CheckoutConfig), checkout_version: v }
}

export interface UseCheckoutConfigReturn {
  config: CheckoutConfig | null
  loading: boolean
  saving: boolean
  error: string | null
  success: string | null
  fetchConfig: (password: string) => Promise<boolean>
  updateConfig: (
    password: string,
    data: Partial<CheckoutConfig>
  ) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function useCheckoutConfig(): UseCheckoutConfigReturn {
  const [config, setConfig] = useState<CheckoutConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reset = useCallback(() => {
    setConfig(null)
    setError(null)
    setSuccess(null)
  }, [])

  const fetchConfig = useCallback(
    async (password: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/get-checkout-config`,
          {
            method: 'GET',
            headers: {
              'x-admin-password': password,
            },
          }
        )

        const data = await response.json()

        if (!response.ok) {
          setError(
            data.code === 'UNAUTHORIZED'
              ? 'Senha incorreta'
              : data.error ?? 'Erro ao buscar configurações'
          )
          setLoading(false)
          return false
        }

        setConfig(normalizeCheckoutConfigPayload(data.config as Partial<CheckoutConfig>))
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

  const updateConfig = useCallback(
    async (
      password: string,
      data: Partial<CheckoutConfig>
    ): Promise<boolean> => {
      setSaving(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/update-checkout-config`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-password': password,
            },
            body: JSON.stringify(data),
          }
        )

        const result = await response.json()

        if (!response.ok) {
          setError(
            result.code === 'UNAUTHORIZED'
              ? 'Senha incorreta'
              : result.error ?? 'Erro ao atualizar configurações'
          )
          setSaving(false)
          return false
        }

        setConfig(normalizeCheckoutConfigPayload(result.config as Partial<CheckoutConfig>))
        setSuccess('Configurações salvas com sucesso')
        setSaving(false)
        return true
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro de conexão com o servidor'
        )
        setSaving(false)
        return false
      }
    },
    []
  )

  return { config, loading, saving, error, success, fetchConfig, updateConfig, reset }
}
