import type { TransactionPipeline } from '@/hooks/useTransaction'
import {
  isBoletoParceladoSplit,
  isDualPaymentSplit,
} from '@/lib/split-status'

export type PaymentMethodLabel =
  | '2 meios'
  | 'Boleto parcelado'
  | 'Recorrente'
  | 'Cartão'
  | 'PIX'
  | 'Boleto'
  | '—'

/**
 * Resolves the display label for a transaction's payment method.
 * Priority: split_type > Recorrente > raw method mapping.
 */
export function getPaymentMethodLabel(tx: TransactionPipeline): PaymentMethodLabel {
  if (tx.split_group_id) {
    if (isBoletoParceladoSplit(tx.split_type)) return 'Boleto parcelado'
    if (isDualPaymentSplit(tx.split_type)) return '2 meios'
  }

  if (
    tx.checkout_recorrencia_enabled ||
    tx.metodo_pagamento === 'cartao_recorrente'
  ) {
    return 'Recorrente'
  }

  return mapRawMethod(tx.metodo_pagamento)
}

function mapRawMethod(method: string | null): PaymentMethodLabel {
  if (!method) return '—'
  const normalized = method.toLowerCase()
  if (normalized === 'pix') return 'PIX'
  if (normalized.includes('cartao') || normalized.includes('card')) return 'Cartão'
  if (normalized.includes('boleto')) return 'Boleto'
  return '—'
}

const METHOD_BADGE_CLASSES: Record<PaymentMethodLabel, string> = {
  '2 meios': 'bg-pink-100 text-pink-800 border-pink-200',
  'Boleto parcelado': 'bg-orange-100 text-orange-800 border-orange-200',
  'Cartão': 'bg-blue-100 text-blue-800 border-blue-200',
  'PIX': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Boleto': 'bg-amber-100 text-amber-800 border-amber-200',
  'Recorrente': 'bg-violet-100 text-violet-800 border-violet-200',
  '—': 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

export function getMethodBadgeClass(label: PaymentMethodLabel): string {
  return METHOD_BADGE_CLASSES[label] ?? METHOD_BADGE_CLASSES['—']
}

export function truncateText(text: string | null, maxLength: number): string {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export function formatVigencia(meses: number | null): string {
  if (meses == null) return '—'
  return `${meses} meses`
}
