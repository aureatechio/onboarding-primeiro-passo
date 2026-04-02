/**
 * Canonical label + paid/total for payment stepper badge, aligned with
 * unified payment timeline (Detalhes do Pagamento).
 */

import { buildTimeline, type RawTimelineSession } from '@/lib/payment-timeline'
import {
  getSplitTypeLabel,
  isBoletoParceladoSplit,
  isDualPaymentSplit,
} from '@/lib/split-status'

export interface PaymentStepSummary {
  label: string
  paid: number
  total: number
}

function methodCategory(metodo: string | null): string | null {
  if (!metodo) return null
  const m = metodo.toLowerCase()
  if (m === 'pix') return 'pix'
  if (m.includes('boleto')) return 'boleto'
  if (m.includes('cartao') || m.includes('card')) return 'cartao'
  return 'other'
}

/**
 * Rótulo do stepper quando há split_group_id:
 * - dual_payment no grupo -> "2 meios"
 * - timeline com 2+ categorias de método (ex.: PIX + boleto) -> "2 meios"
 * - boleto_parcelado homogêneo -> "Boleto parcelado"
 * - demais -> getSplitTypeLabel
 */
export function resolvePaymentStepperLabel(
  timelineSessions: Array<{ metodo_pagamento: string | null }>,
  splitType: string | null,
): string {
  if (isDualPaymentSplit(splitType)) return '2 meios'

  const cats = new Set(
    timelineSessions
      .map((s) => methodCategory(s.metodo_pagamento))
      .filter((c): c is string => c != null && c !== 'other'),
  )
  if (cats.size >= 2) return '2 meios'

  if (isBoletoParceladoSplit(splitType)) return 'Boleto parcelado'

  return getSplitTypeLabel(splitType)
}

export function computePaymentStepSummary(
  rawSessions: RawTimelineSession[],
  splitType: string | null,
): PaymentStepSummary {
  const timeline = buildTimeline(rawSessions)
  const paid = timeline.filter((s) => s.status === 'completed').length
  const total = timeline.length
  const label = resolvePaymentStepperLabel(timeline, splitType)
  return { label, paid, total }
}
