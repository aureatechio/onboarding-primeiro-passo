import { describe, expect, it } from 'vitest'
import {
  computePaymentFinancialSummary,
  getPaymentSettlementLabel,
} from '../../src/lib/payment-financial-summary'
import type { RawTimelineSession } from '../../src/lib/payment-timeline'

function raw(overrides: Partial<RawTimelineSession> = {}): RawTimelineSession {
  return {
    id: 's1',
    split_index: null,
    split_group_id: null,
    metodo_pagamento: 'pix',
    status: 'completed',
    valor_centavos: 100000,
    payment_id: 'p1',
    payment_status: 2,
    completed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('computePaymentFinancialSummary', () => {
  it('returns quitado when paid value reaches total sale', () => {
    const summary = computePaymentFinancialSummary(
      [raw({ valor_centavos: 100000, status: 'completed' })],
      1000,
    )

    expect(summary.valorVendaCentavos).toBe(100000)
    expect(summary.totalPagoCentavos).toBe(100000)
    expect(summary.saldoPendenteCentavos).toBe(0)
    expect(summary.situacaoQuitacao).toBe('quitado')
  })

  it('returns parcial when there is confirmed entry but pending balance', () => {
    const sessions = [
      raw({ id: 'pix-ok', metodo_pagamento: 'pix', status: 'completed', valor_centavos: 100000 }),
      raw({
        id: 'card-failed',
        metodo_pagamento: 'cartao',
        status: 'failed',
        payment_id: 'pay-declined',
        valor_centavos: 885000,
      }),
    ]

    const summary = computePaymentFinancialSummary(sessions, 8850)

    expect(summary.valorVendaCentavos).toBe(885000)
    expect(summary.totalPagoCentavos).toBe(100000)
    expect(summary.saldoPendenteCentavos).toBe(785000)
    expect(summary.situacaoQuitacao).toBe('parcial')
  })

  it('returns nao_pago when no completed session exists', () => {
    const sessions = [
      raw({
        id: 'p1',
        status: 'pending',
        payment_id: null,
        metodo_pagamento: 'cartao',
        valor_centavos: 250000,
      }),
      raw({
        id: 'f1',
        status: 'failed',
        payment_id: null,
        metodo_pagamento: 'cartao',
        valor_centavos: 250000,
      }),
    ]

    const summary = computePaymentFinancialSummary(sessions, 2500)

    expect(summary.totalPagoCentavos).toBe(0)
    expect(summary.saldoPendenteCentavos).toBe(250000)
    expect(summary.situacaoQuitacao).toBe('nao_pago')
  })
})

describe('getPaymentSettlementLabel', () => {
  it('maps labels correctly', () => {
    expect(getPaymentSettlementLabel('quitado')).toBe('Quitação total')
    expect(getPaymentSettlementLabel('parcial')).toBe('Quitação parcial')
    expect(getPaymentSettlementLabel('nao_pago')).toBe('Não quitado')
  })
})
