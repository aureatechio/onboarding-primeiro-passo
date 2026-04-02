import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface ReenviarNotificationResult {
  success: boolean
  code: string
  compra_id: string
  envelope_id: string
  mode: 'single' | 'all'
  summary?: Array<{ signer_id?: string; notified?: boolean }>
}

export interface ReplaceSignerResult {
  success: boolean
  code: string
  compra_id: string
  envelope_id: string
  old_signer_id: string
  new_signer_id: string
  notified: boolean
  notify_warning?: string | null
  crm_sync_warning?: string | null
}

export interface ClicksignSigner {
  signer_key: string
  email?: string
  phone?: string | null
  name?: string
}

interface UseReenviarContratoReturn {
  loading: boolean
  error: string | null
  result: ReenviarNotificationResult | ReplaceSignerResult | null
  resendNotification: (params: {
    compraId: string
    mode: 'single' | 'all'
    signerId?: string
    message?: string
  }) => Promise<boolean>
  replaceSigner: (params: {
    compraId: string
    oldSignerId: string
    newName: string
    newEmail: string
    newPhone?: string
    notify?: boolean
  }) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

function mapErrorCode(code?: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Dados inválidos para executar a operação.'
    case 'COMPRA_NOT_FOUND':
      return 'Compra não encontrada.'
    case 'CONTRACT_NOT_SENT':
      return 'Esta compra ainda não possui envelope ClickSign.'
    case 'SIGNER_MISMATCH':
      return 'Signatário inválido para esta compra.'
    case 'SIGNER_NOT_FOUND_IN_COMPRA':
      return 'Signatário informado não foi encontrado na compra.'
    case 'SIGNER_NOT_REPLACEABLE':
      return 'Não foi possível substituir o signatário no estado atual do envelope.'
    case 'UNAUTHORIZED':
      return 'Não autorizado para executar esta ação.'
    case 'CLICKSIGN_UNAVAILABLE':
      return 'ClickSign indisponível no momento. Tente novamente.'
    case 'CLICKSIGN_ERROR':
      return 'Falha de integração com a ClickSign.'
    default:
      return 'Erro de conexão com o servidor'
  }
}

export function useReenviarContrato(): UseReenviarContratoReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<
    ReenviarNotificationResult | ReplaceSignerResult | null
  >(null)

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  const resendNotification = useCallback(
    async (params: {
      compraId: string
      mode: 'single' | 'all'
      signerId?: string
      message?: string
    }): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/resend-clicksign-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              compra_id: params.compraId,
              mode: params.mode,
              signer_id: params.signerId,
              message: params.message,
            }),
          }
        )

        const data = (await response.json()) as
          | ReenviarNotificationResult
          | { code?: string; message?: string; error?: string }

        if (!response.ok) {
          const code = 'code' in data ? data.code : undefined
          const message =
            ('message' in data && data.message) ||
            ('error' in data && data.error) ||
            mapErrorCode(code)
          setError(message)
          setLoading(false)
          return false
        }

        setResult(data as ReenviarNotificationResult)
        setLoading(false)
        return true
      } catch {
        setError('Erro de conexão com o servidor')
        setLoading(false)
        return false
      }
    },
    []
  )

  const replaceSigner = useCallback(
    async (params: {
      compraId: string
      oldSignerId: string
      newName: string
      newEmail: string
      newPhone?: string
      notify?: boolean
    }): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/replace-clicksign-signer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              compra_id: params.compraId,
              old_signer_id: params.oldSignerId,
              new_signer: {
                name: params.newName,
                email: params.newEmail,
                phone_number: params.newPhone,
              },
              notify: params.notify ?? true,
            }),
          }
        )

        const data = (await response.json()) as
          | ReplaceSignerResult
          | { code?: string; message?: string; error?: string }

        if (!response.ok) {
          const code = 'code' in data ? data.code : undefined
          const upstreamStatus =
            'upstream_status' in data ? (data as Record<string, unknown>).upstream_status : undefined
          const message =
            ('message' in data && data.message) ||
            ('error' in data && data.error) ||
            mapErrorCode(code)
          const detail = upstreamStatus
            ? `${message} [HTTP ${upstreamStatus}]`
            : message
          setError(detail)
          setLoading(false)
          return false
        }

        const replaceResult = data as ReplaceSignerResult

        // Persist corrected signer contact in CRM to keep source-of-truth aligned
        let crmSyncWarning: string | null = null
        try {
          const { data: compraData } = await supabase
            .from('compras')
            .select('cliente_id')
            .eq('id', params.compraId)
            .single()

          const clienteId = compraData?.cliente_id
          if (clienteId) {
            const { error: updateError } = await supabase
              .from('clientes')
              .update({
                razaosocial: params.newName,
                email: params.newEmail,
                telefone: params.newPhone ?? null,
              })
              .eq('id', clienteId)

            if (updateError) {
              crmSyncWarning =
                'Signatário atualizado, mas não foi possível sincronizar os dados do cliente no CRM.'
              console.warn('[useReenviarContrato] CRM sync warning:', updateError.message)
            }
          }
        } catch (crmSyncError) {
          crmSyncWarning =
            'Signatário atualizado, mas houve falha ao sincronizar os dados do cliente no CRM.'
          console.warn('[useReenviarContrato] CRM sync exception:', crmSyncError)
        }

        setResult({
          ...replaceResult,
          crm_sync_warning: crmSyncWarning,
        })
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

  return {
    loading,
    error,
    result,
    resendNotification,
    replaceSigner,
    reset,
  }
}
