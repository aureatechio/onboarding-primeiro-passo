import { describe, expect, it } from 'vitest'
import {
  isRelevantSession,
  sortTimelineSessions,
  buildTimeline,
  type RawTimelineSession,
} from '../../src/lib/payment-timeline'

function session(overrides: Partial<RawTimelineSession> = {}): RawTimelineSession {
  return {
    id: 'sess-1',
    split_index: null,
    split_group_id: null,
    metodo_pagamento: 'pix',
    status: 'completed',
    valor_centavos: 1000,
    payment_id: 'pay-1',
    payment_status: 2,
    completed_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('isRelevantSession', () => {
  it('excludes split_created parent sessions', () => {
    expect(
      isRelevantSession(session({ status: 'split_created', split_group_id: 'g1' })),
    ).toBe(false)
  })

  it('excludes group sessions with null split_index (parent)', () => {
    expect(
      isRelevantSession(
        session({ status: 'pending', split_group_id: 'g1', split_index: null }),
      ),
    ).toBe(false)
  })

  it('includes group sessions with valid split_index', () => {
    expect(
      isRelevantSession(
        session({ status: 'pending', split_group_id: 'g1', split_index: 1 }),
      ),
    ).toBe(true)
  })

  it('excludes expired entry session without payment_id', () => {
    expect(
      isRelevantSession(
        session({ status: 'expired', split_group_id: null, payment_id: null }),
      ),
    ).toBe(false)
  })

  it('includes expired entry session with payment_id', () => {
    expect(
      isRelevantSession(
        session({ status: 'expired', split_group_id: null, payment_id: 'pay-x' }),
      ),
    ).toBe(true)
  })

  it('excludes failed entry session without payment_id', () => {
    expect(
      isRelevantSession(
        session({ status: 'failed', split_group_id: null, payment_id: null }),
      ),
    ).toBe(false)
  })

  it('includes completed entry session (PIX)', () => {
    expect(
      isRelevantSession(
        session({ status: 'completed', split_group_id: null, metodo_pagamento: 'pix' }),
      ),
    ).toBe(true)
  })
})

describe('sortTimelineSessions', () => {
  it('places entry sessions (no split_group_id) before group sessions', () => {
    const entry = session({ split_group_id: null, created_at: '2026-02-01T00:00:00Z' })
    const carne = session({
      split_group_id: 'g1',
      split_index: 1,
      created_at: '2026-01-01T00:00:00Z',
    })
    const sorted = [carne, entry].sort(sortTimelineSessions)
    expect(sorted[0]).toBe(entry)
    expect(sorted[1]).toBe(carne)
  })

  it('sorts multiple entry sessions by created_at', () => {
    const first = session({
      id: 'e1',
      split_group_id: null,
      created_at: '2026-01-01T00:00:00Z',
    })
    const second = session({
      id: 'e2',
      split_group_id: null,
      created_at: '2026-01-02T00:00:00Z',
    })
    const sorted = [second, first].sort(sortTimelineSessions)
    expect(sorted[0]).toBe(first)
    expect(sorted[1]).toBe(second)
  })

  it('sorts group sessions by split_index', () => {
    const p1 = session({ id: 'b1', split_group_id: 'g1', split_index: 1 })
    const p2 = session({ id: 'b2', split_group_id: 'g1', split_index: 2 })
    const p3 = session({ id: 'b3', split_group_id: 'g1', split_index: 3 })
    const sorted = [p3, p1, p2].sort(sortTimelineSessions)
    expect(sorted.map((s) => s.id)).toEqual(['b1', 'b2', 'b3'])
  })
})

describe('buildTimeline', () => {
  it('builds unified timeline with global displayIndex for PIX + boleto parcelado', () => {
    const pixEntry = session({
      id: 'pix-entry',
      split_group_id: null,
      metodo_pagamento: 'pix',
      status: 'completed',
      created_at: '2026-02-13T20:13:00Z',
    })
    const expiredCartao = session({
      id: 'expired-cartao',
      split_group_id: null,
      metodo_pagamento: 'cartao',
      status: 'expired',
      payment_id: null,
      created_at: '2026-02-13T17:00:00Z',
    })
    const splitParent = session({
      id: 'split-parent',
      split_group_id: 'g1',
      split_index: null,
      status: 'split_created',
      created_at: '2026-03-11T23:07:00Z',
    })
    const boleto1 = session({
      id: 'boleto-1',
      split_group_id: 'g1',
      split_index: 1,
      metodo_pagamento: 'boleto',
      status: 'completed',
      created_at: '2026-03-11T23:07:15Z',
    })
    const boleto2 = session({
      id: 'boleto-2',
      split_group_id: 'g1',
      split_index: 2,
      metodo_pagamento: 'boleto',
      status: 'pending',
      payment_id: null,
      created_at: '2026-03-11T23:07:16Z',
    })
    const boleto3 = session({
      id: 'boleto-3',
      split_group_id: 'g1',
      split_index: 3,
      metodo_pagamento: 'boleto',
      status: 'pending',
      payment_id: null,
      created_at: '2026-03-11T23:07:17Z',
    })

    const timeline = buildTimeline([
      expiredCartao,
      pixEntry,
      splitParent,
      boleto3,
      boleto1,
      boleto2,
    ])

    expect(timeline).toHaveLength(4)
    expect(timeline[0]).toMatchObject({ id: 'pix-entry', displayIndex: 1 })
    expect(timeline[1]).toMatchObject({ id: 'boleto-1', displayIndex: 2 })
    expect(timeline[2]).toMatchObject({ id: 'boleto-2', displayIndex: 3 })
    expect(timeline[3]).toMatchObject({ id: 'boleto-3', displayIndex: 4 })
  })

  it('builds timeline for dual payment (both in group)', () => {
    const cartao1 = session({
      id: 'c1',
      split_group_id: 'g2',
      split_index: 1,
      metodo_pagamento: 'cartao',
      status: 'completed',
    })
    const cartao2 = session({
      id: 'c2',
      split_group_id: 'g2',
      split_index: 2,
      metodo_pagamento: 'cartao',
      status: 'completed',
    })
    const parent = session({
      id: 'parent',
      split_group_id: 'g2',
      split_index: null,
      status: 'split_created',
    })

    const timeline = buildTimeline([parent, cartao2, cartao1])
    expect(timeline).toHaveLength(2)
    expect(timeline[0]).toMatchObject({ id: 'c1', displayIndex: 1 })
    expect(timeline[1]).toMatchObject({ id: 'c2', displayIndex: 2 })
  })

  it('returns empty for no relevant sessions', () => {
    const expired = session({ status: 'expired', payment_id: null })
    const failed = session({ status: 'failed', payment_id: null })
    expect(buildTimeline([expired, failed])).toHaveLength(0)
  })

  it('keeps failed entry with payment_id (gateway reached)', () => {
    const failedWithPayment = session({
      id: 'f1',
      status: 'failed',
      split_group_id: null,
      payment_id: 'pay-declined',
    })
    const timeline = buildTimeline([failedWithPayment])
    expect(timeline).toHaveLength(1)
    expect(timeline[0]).toMatchObject({ id: 'f1', displayIndex: 1 })
  })
})
