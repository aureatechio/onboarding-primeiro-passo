import type { TransactionPipeline } from '@/hooks/useTransaction'

export type StepStatus = 'completed' | 'in_progress' | 'error' | 'pending'

export function getStepStatus(
  stepKey: string,
  data: TransactionPipeline
): StepStatus {
  switch (stepKey) {
    case 'checkout':
      if (data.checkout_session_status === 'completed') return 'completed'
      if (
        data.checkout_session_status === 'failed' ||
        data.checkout_session_status === 'expired' ||
        data.checkout_session_status === 'cancelled'
      )
        return 'error'
      if (data.checkout_session_status === 'processing') return 'in_progress'
      if (data.checkout_session_status === 'split_created') return 'in_progress'
      return data.session_id ? 'in_progress' : 'pending'

    case 'payment':
      if (data.checkout_session_status === 'completed' && data.payment_id)
        return 'completed'
      if (
        data.checkout_session_status === 'failed' ||
        data.checkout_session_status === 'cancelled'
      )
        return 'error'
      if (data.payment_id) return 'in_progress'
      if (data.checkout_session_status === 'completed') return 'completed'
      return 'pending'

    case 'nfe':
      if (data.nfe_status === 'Issued') return 'completed'
      if (data.nfe_status === 'Error' || data.nfe_status === 'Cancelled')
        return 'error'
      if (
        data.nfe_status === 'Created' ||
        data.nfe_status === 'Processing' ||
        data.nfe_status === 'awaiting_nfse'
      )
        return 'in_progress'
      return 'pending'

    case 'contract':
      if (data.clicksign_status === 'Assinado') return 'completed'
      if (data.clicksign_status === 'error') return 'error'
      if (data.clicksign_status === 'Aguardando Assinatura')
        return 'in_progress'
      if (data.clicksign_envelope_id) return 'in_progress'
      return 'pending'

    case 'omie':
      if (data.omie_status === 'synced') return 'completed'
      if (data.omie_status === 'failed') return 'error'
      if (data.omie_status === 'pending' || data.omie_status === 'processing')
        return 'in_progress'
      return 'pending'

    default:
      return 'pending'
  }
}

export function getStepTimestamp(
  stepKey: string,
  data: TransactionPipeline
): string | null {
  switch (stepKey) {
    case 'checkout':
      return data.checkout_created_at
    case 'payment':
      return data.checkout_completed_at
    case 'nfe':
      return data.nfe_created_at
    case 'contract':
      return data.data_assinatura_concluida ?? data.data_envio_assinatura
    case 'omie':
      return data.omie_synced_at ?? data.omie_created_at
    default:
      return null
  }
}
