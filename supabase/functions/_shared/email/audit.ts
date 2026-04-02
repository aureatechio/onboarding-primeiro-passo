interface BuildEmailAuditMetadataParams {
  requestId: string
  sentByUserId?: string | null
  sentByUserEmail?: string | null
  recipientEmail: string
  recipientName: string
  checkoutLink: string
  source: 'session' | 'fallback'
  sessionId: string | null
  propostaDescricao: string
  valorFormatado: string
  metodosDisponiveisLabels: string[]
  status: 'success' | 'error'
  providerId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}

export function buildCheckoutEmailAuditMetadata(
  params: BuildEmailAuditMetadataParams
): Record<string, unknown> {
  return {
    event: 'manual_checkout_email_send_attempt',
    request_id: params.requestId,
    sent_by_user_id: params.sentByUserId ?? null,
    sent_by_user_email: params.sentByUserEmail ?? null,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    checkout_link: params.checkoutLink,
    source: params.source,
    session_id: params.sessionId,
    proposta_descricao: params.propostaDescricao,
    valor_formatado: params.valorFormatado,
    metodos_disponiveis: params.metodosDisponiveisLabels,
    status: params.status,
    provider: 'resend',
    provider_id: params.providerId ?? null,
    error_code: params.errorCode ?? null,
    error_message: params.errorMessage ?? null,
  }
}

interface BuildBoletoEmailAuditMetadataParams {
  requestId: string
  compraId: string
  sentByUserId?: string | null
  sentByUserEmail?: string | null
  recipientEmail: string
  recipientName: string
  ccEmails: string[]
  propostaDescricao: string
  valorFormatado: string
  boletoUrls: string[]
  status: 'success' | 'error'
  providerId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}

export function buildBoletoEmailAuditMetadata(
  params: BuildBoletoEmailAuditMetadataParams
): Record<string, unknown> {
  return {
    event: 'manual_boleto_email_send_attempt',
    request_id: params.requestId,
    compra_id: params.compraId,
    sent_by_user_id: params.sentByUserId ?? null,
    sent_by_user_email: params.sentByUserEmail ?? null,
    recipient_email: params.recipientEmail,
    recipient_name: params.recipientName,
    cc_emails: params.ccEmails,
    proposta_descricao: params.propostaDescricao,
    valor_formatado: params.valorFormatado,
    boleto_urls: params.boletoUrls,
    status: params.status,
    provider: 'resend',
    provider_id: params.providerId ?? null,
    error_code: params.errorCode ?? null,
    error_message: params.errorMessage ?? null,
  }
}
