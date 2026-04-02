/**
 * Mapeamento dos códigos de status da Cielo/Braspag para labels em português.
 * Source of truth: supabase/functions/_shared/checkout-status.ts#getStatusDescription.
 * Keep in sync when Cielo status codes change.
 */
const PAYMENT_STATUS_LABELS: Record<number, string> = {
  0: 'Não finalizado',
  1: 'Autorizado',
  2: 'Pagamento confirmado',
  3: 'Negado',
  10: 'Cancelado',
  11: 'Estornado',
  12: 'Pendente',
  13: 'Abortado',
  20: 'Agendado',
}

/**
 * Retorna a descrição legível do status de pagamento (Cielo/Braspag).
 * Para códigos desconhecidos retorna "Status {número}".
 */
export function getPaymentStatusLabel(status: number | null | undefined): string {
  if (status == null) return '—'
  return PAYMENT_STATUS_LABELS[status] ?? `Status ${status}`
}

/**
 * Retorna o texto para tooltip do status de pagamento.
 * Inclui label e código Cielo para suporte e debugging.
 */
export function getPaymentStatusTooltip(status: number | null | undefined): string {
  if (status == null) return ''
  const label = PAYMENT_STATUS_LABELS[status]
  return label
    ? `${label} (código Cielo: ${status})`
    : `Status não mapeado (código Cielo: ${status})`
}


