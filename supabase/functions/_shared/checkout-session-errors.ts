/**
 * Mensagens e códigos HTTP/API para sessão não retryable (sem dependências de Supabase/split).
 */

/** Mensagem amigável quando a sessão não permite nova tentativa (status não retryable) */
export function getSessionNotRetryableMessage(status: string | null | undefined): string {
  const _s = status ?? 'desconhecido'
  return `Não foi possível continuar com este link. Se você acabou de pagar, aguarde a confirmação. Caso contrário, solicite um novo link de checkout para tentar novamente.`
}

export interface SessionNotRetryableApiError {
  code: string
  message: string
}

/** Campos mínimos para mensagem/código acionável quando a sessão não é retryable */
export interface SessionForNotRetryableError {
  status: string | null | undefined
  payment_id?: string | null
  pix_qrcode_text?: string | null
  pix_qrcode_base64?: string | null
  payment_response?: unknown
}

function paymentResponseLooksLikePix(paymentResponse: unknown): boolean {
  if (!paymentResponse || typeof paymentResponse !== 'object') return false
  const pr = paymentResponse as { Payment?: { Type?: string } }
  return String(pr.Payment?.Type || '').toLowerCase() === 'pix'
}

/**
 * Código e mensagem específicos para suporte/UX (ex.: PIX em andamento vs. sessão genérica bloqueada).
 */
export function getSessionNotRetryableApiError(
  session: SessionForNotRetryableError,
): SessionNotRetryableApiError {
  const status = session.status ?? ''
  const hasStoredPixQr = !!(session.pix_qrcode_text || session.pix_qrcode_base64)
  const hasPixInResponse = paymentResponseLooksLikePix(session.payment_response)

  if (status === 'processing' && session.payment_id && (hasStoredPixQr || hasPixInResponse)) {
    return {
      code: 'SESSION_PROCESSING_WITH_PIX',
      message:
        'Esta sessão já tem um PIX em andamento. Para pagar por boleto ou outro meio, solicite um novo link de checkout ao vendedor.',
    }
  }

  if (status === 'processing' && session.payment_id) {
    return {
      code: 'SESSION_PROCESSING_WITH_PAYMENT',
      message:
        'Pagamento em andamento nesta sessão. Aguarde a confirmação ou solicite um novo link ao vendedor.',
    }
  }

  if (status === 'processing') {
    return {
      code: 'SESSION_PROCESSING',
      message: getSessionNotRetryableMessage(status),
    }
  }

  return {
    code: 'SESSION_NON_RETRYABLE',
    message: getSessionNotRetryableMessage(status),
  }
}
