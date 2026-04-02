import { describe, expect, it } from 'vitest'
import {
  computePaymentStepSummary,
  resolvePaymentStepperLabel,
} from '../../src/lib/payment-step-summary'
import type { RawTimelineSession } from '../../src/lib/payment-timeline'

function raw(overrides: Partial<RawTimelineSession> = {}): RawTimelineSession {
  return {
    id: 's1',
    split_index: null,
    split_group_id: null,
    metodo_pagamento: 'pix',
    status: 'completed',
    valor_centavos: 1000,
    payment_id: 'p1',
    payment_status: 2,
    completed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('resolvePaymentStepperLabel', () => {
  it('returns 2 meios for dual_payment split_type', () => {
    expect(
      resolvePaymentStepperLabel([raw({ metodo_pagamento: 'cartao' })], 'dual_payment'),
    ).toBe('2 meios')
  })

  it('returns 2 meios when timeline has PIX and boleto (entrada + carnê)', () => {
    const timeline = [
      raw({ metodo_pagamento: 'pix', split_group_id: null }),
      raw({
        metodo_pagamento: 'boleto',
        split_group_id: 'g1',
        split_index: 1,
        status: 'completed',
      }),
    ]
    expect(resolvePaymentStepperLabel(timeline, 'boleto_parcelado')).toBe('2 meios')
  })

  it('returns Boleto parcelado when only boleto parcels', () => {
    const timeline = [
      raw({
        id: 'b1',
        metodo_pagamento: 'boleto',
        split_group_id: 'g1',
        split_index: 1,
        status: 'completed',
      }),
      raw({
        id: 'b2',
        metodo_pagamento: 'boleto',
        split_group_id: 'g1',
        split_index: 2,
        status: 'pending',
        payment_id: null,
      }),
    ]
    expect(resolvePaymentStepperLabel(timeline, 'boleto_parcelado')).toBe('Boleto parcelado')
  })
})

describe('computePaymentStepSummary', () => {
  it('computes 2/12 paid and 2 meios for PIX + 11 boletos (1 paid)', () => {
    const pix = raw({
      id: 'pix',
      split_group_id: null,
      metodo_pagamento: 'pix',
      status: 'completed',
      created_at: '2026-02-13T20:13:00Z',
    })
    const expired = raw({
      id: 'exp',
      split_group_id: null,
      metodo_pagamento: 'cartao',
      status: 'expired',
      payment_id: null,
      created_at: '2026-02-13T17:00:00Z',
    })
    const parent = raw({
      id: 'par',
      split_group_id: 'g1',
      split_index: null,
      status: 'split_created',
      metodo_pagamento: 'boleto',
      created_at: '2026-03-11T23:07:00Z',
    })
    const boletos = Array.from({ length: 11 }, (_, i) =>
      raw({
        id: `b${i + 1}`,
        split_group_id: 'g1',
        split_index: i + 1,
        metodo_pagamento: 'boleto',
        status: i === 0 ? 'completed' : 'pending',
        payment_id: i === 0 ? 'pay' : null,
        created_at: `2026-03-11T23:07:${15 + i}Z`,
      }),
    )
    const summary = computePaymentStepSummary(
      [expired, pix, parent, ...boletos],
      'boleto_parcelado',
    )
    expect(summary.label).toBe('2 meios')
    expect(summary.paid).toBe(2)
    expect(summary.total).toBe(12)
  })

  it('dual payment two cartoes: 2 meios and counts from timeline', () => {
    const parent = raw({
      id: 'p',
      split_group_id: 'g2',
      split_index: null,
      status: 'split_created',
    })
    const c1 = raw({
      id: 'c1',
      split_group_id: 'g2',
      split_index: 1,
      metodo_pagamento: 'cartao',
      status: 'completed',
    })
    const c2 = raw({
      id: 'c2',
      split_group_id: 'g2',
      split_index: 2,
      metodo_pagamento: 'cartao',
      status: 'completed',
    })
    const summary = computePaymentStepSummary([parent, c2, c1], 'dual_payment')
    expect(summary.label).toBe('2 meios')
    expect(summary.paid).toBe(2)
    expect(summary.total).toBe(2)
  })
})
