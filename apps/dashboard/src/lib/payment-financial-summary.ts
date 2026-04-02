import { buildTimeline, type RawTimelineSession } from '@/lib/payment-timeline'

export type PaymentSettlementStatus = 'quitado' | 'parcial' | 'nao_pago'

export interface PaymentFinancialSummary {
  valorVendaCentavos: number
  totalPagoCentavos: number
  saldoPendenteCentavos: number
  totalSessoesConsideradas: number
  situacaoQuitacao: PaymentSettlementStatus
}

function toSafeCentavos(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  // valor_total da compra vem em reais na view de pipeline
  return Math.max(0, Math.round(value * 100))
}

export function getPaymentSettlementLabel(status: PaymentSettlementStatus): string {
  if (status === 'quitado') return 'Quitação total'
  if (status === 'parcial') return 'Quitação parcial'
  return 'Não quitado'
}

export function computePaymentFinancialSummary(
  rawSessions: RawTimelineSession[],
  valorTotal: number | null | undefined,
): PaymentFinancialSummary {
  const timeline = buildTimeline(rawSessions)
  const valorVendaCentavos = toSafeCentavos(valorTotal)

  const totalPagoCentavos = timeline.reduce((acc, session) => {
    if (session.status !== 'completed') return acc
    return acc + Math.max(0, session.valor_centavos ?? 0)
  }, 0)

  const saldoPendenteCentavos = Math.max(valorVendaCentavos - totalPagoCentavos, 0)

  let situacaoQuitacao: PaymentSettlementStatus = 'nao_pago'
  if (totalPagoCentavos > 0 && saldoPendenteCentavos > 0) situacaoQuitacao = 'parcial'
  if (valorVendaCentavos > 0 && saldoPendenteCentavos === 0) situacaoQuitacao = 'quitado'

  return {
    valorVendaCentavos,
    totalPagoCentavos,
    saldoPendenteCentavos,
    totalSessoesConsideradas: timeline.length,
    situacaoQuitacao,
  }
}
