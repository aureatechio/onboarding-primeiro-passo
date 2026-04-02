import { assertEquals } from 'jsr:@std/assert'
import {
  buildParcelasFromSessions,
  resolveMeioPagamento,
  type PaidCheckoutSession,
} from './parcelas-builder.ts'

// --- resolveMeioPagamento ---

Deno.test('resolveMeioPagamento maps pix', () => {
  const result = resolveMeioPagamento('pix')
  assertEquals(result, { meio_pagamento: '17', tipo_documento: 'PIX' })
})

Deno.test('resolveMeioPagamento maps boleto', () => {
  const result = resolveMeioPagamento('boleto')
  assertEquals(result, { meio_pagamento: '15', tipo_documento: 'BOL' })
})

Deno.test('resolveMeioPagamento maps cartao', () => {
  const result = resolveMeioPagamento('cartao')
  assertEquals(result, { meio_pagamento: '03', tipo_documento: 'CRC' })
})

Deno.test('resolveMeioPagamento maps credit_card', () => {
  const result = resolveMeioPagamento('credit_card')
  assertEquals(result, { meio_pagamento: '03', tipo_documento: 'CRC' })
})

Deno.test('resolveMeioPagamento maps Cartao de Credito (partial match)', () => {
  const result = resolveMeioPagamento('Cartao de Credito')
  assertEquals(result, { meio_pagamento: '03', tipo_documento: 'CRC' })
})

Deno.test('resolveMeioPagamento returns undefined for unknown', () => {
  assertEquals(resolveMeioPagamento('transferencia'), undefined)
  assertEquals(resolveMeioPagamento(null), undefined)
  assertEquals(resolveMeioPagamento(undefined), undefined)
})

// --- buildParcelasFromSessions ---

const makeSession = (overrides: Partial<PaidCheckoutSession> = {}): PaidCheckoutSession => ({
  metodo_pagamento: 'pix',
  valor_centavos: 1000000,
  parcelas: 1,
  split_group_id: null,
  split_index: null,
  boleto_vencimento: null,
  completed_at: '2026-03-19T10:00:00.000Z',
  updated_at: '2026-03-19T10:00:00.000Z',
  payment_id: 'pay-001',
  payment_response: null,
  ...overrides,
})

Deno.test('buildParcelasFromSessions returns null for empty sessions', () => {
  assertEquals(buildParcelasFromSessions([], 2500000), null)
})

Deno.test('buildParcelasFromSessions: single PIX payment', () => {
  const sessions = [makeSession({ metodo_pagamento: 'pix', valor_centavos: 2500000 })]
  const result = buildParcelasFromSessions(sessions, 2500000)

  assertEquals(result !== null, true)
  assertEquals(result!.cCodParc, '999')
  assertEquals(result!.nQtdeParc, 1)
  assertEquals(result!.parcelas.length, 1)
  assertEquals(result!.parcelas[0].nParcela, 1)
  assertEquals(result!.parcelas[0].nValor, 25000)
  assertEquals(result!.parcelas[0].nPercentual, 100)
  assertEquals(result!.parcelas[0].tipo_documento, 'PIX')
  assertEquals(result!.parcelas[0].meio_pagamento, '17')
})

Deno.test('buildParcelasFromSessions: single cartao 3x generates 1 line (recebimento a vista)', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'cartao',
      valor_centavos: 3000000,
      parcelas: 3,
      payment_response: { Payment: { Nsu: '12345' } },
    }),
  ]
  const result = buildParcelasFromSessions(sessions, 3000000)

  // Cartão is always received upfront by the seller — always 1 parcela line
  assertEquals(result!.nQtdeParc, 1)
  assertEquals(result!.parcelas.length, 1)
  assertEquals(result!.parcelas[0].tipo_documento, 'CRC')
  assertEquals(result!.parcelas[0].meio_pagamento, '03')
  assertEquals(result!.parcelas[0].nsu, '12345')
  assertEquals(result!.parcelas[0].nValor, 30000)
  assertEquals(result!.parcelas[0].nPercentual, 100)
})

Deno.test('buildParcelasFromSessions: split PIX + boleto 3x', () => {
  const groupId = 'split-abc'
  const sessions: PaidCheckoutSession[] = [
    makeSession({
      metodo_pagamento: 'pix',
      valor_centavos: 1000000,
      parcelas: 1,
      split_group_id: groupId,
      split_index: 0,
      completed_at: '2026-03-19T10:00:00.000Z',
      payment_id: 'pix-pay-001',
    }),
    makeSession({
      metodo_pagamento: 'boleto',
      valor_centavos: 1500000,
      parcelas: 3,
      split_group_id: groupId,
      split_index: 1,
      boleto_vencimento: '19/03/2026',
      payment_id: 'bol-pay-001',
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 2500000)!

  assertEquals(result.cCodParc, '999')
  assertEquals(result.nQtdeParc, 4)
  assertEquals(result.parcelas.length, 4)

  // First parcela: PIX
  assertEquals(result.parcelas[0].nParcela, 1)
  assertEquals(result.parcelas[0].nValor, 10000)
  assertEquals(result.parcelas[0].tipo_documento, 'PIX')

  // Parcelas 2-4: boleto
  assertEquals(result.parcelas[1].tipo_documento, 'BOL')
  assertEquals(result.parcelas[2].tipo_documento, 'BOL')
  assertEquals(result.parcelas[3].tipo_documento, 'BOL')

  const totalValor = result.parcelas.reduce((sum, p) => sum + p.nValor, 0)
  assertEquals(totalValor, 25000)

  const totalPct = result.parcelas.reduce((sum, p) => sum + p.nPercentual, 0)
  assertEquals(totalPct, 100)
})

Deno.test('buildParcelasFromSessions: single boleto à vista', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'boleto',
      valor_centavos: 500000,
      parcelas: 1,
      boleto_vencimento: '25/03/2026',
    }),
  ]
  const result = buildParcelasFromSessions(sessions, 500000)!

  assertEquals(result.nQtdeParc, 1)
  assertEquals(result.parcelas[0].dDtVenc, '25/03/2026')
  assertEquals(result.parcelas[0].tipo_documento, 'BOL')
  assertEquals(result.parcelas[0].nValor, 5000)
})

Deno.test('buildParcelasFromSessions: split pix + cartao 6x generates 2 lines (both a vista)', () => {
  const groupId = 'split-xyz'
  const sessions: PaidCheckoutSession[] = [
    makeSession({
      metodo_pagamento: 'pix',
      valor_centavos: 800000,
      parcelas: 1,
      split_group_id: groupId,
      split_index: 0,
    }),
    makeSession({
      metodo_pagamento: 'cartao',
      valor_centavos: 1200000,
      parcelas: 6,
      split_group_id: groupId,
      split_index: 1,
      payment_response: { Payment: { Nsu: 'NSU-6x' } },
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 2000000)!

  // Cartão is always à vista → 1 PIX + 1 CRC = 2 total lines (not 1 + 6)
  assertEquals(result.nQtdeParc, 2)
  assertEquals(result.parcelas[0].tipo_documento, 'PIX')
  assertEquals(result.parcelas[1].tipo_documento, 'CRC')
  assertEquals(result.parcelas[1].nsu, 'NSU-6x')

  const totalValor = result.parcelas.reduce((sum, p) => sum + p.nValor, 0)
  assertEquals(totalValor, 20000)

  const totalPct = result.parcelas.reduce((sum, p) => sum + p.nPercentual, 0)
  assertEquals(totalPct, 100)
})

Deno.test('buildParcelasFromSessions: sessions sorted by split_index', () => {
  const groupId = 'sort-test'
  const sessions: PaidCheckoutSession[] = [
    makeSession({
      metodo_pagamento: 'boleto',
      valor_centavos: 500000,
      parcelas: 1,
      split_group_id: groupId,
      split_index: 1,
    }),
    makeSession({
      metodo_pagamento: 'pix',
      valor_centavos: 500000,
      parcelas: 1,
      split_group_id: groupId,
      split_index: 0,
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 1000000)!

  assertEquals(result.parcelas[0].tipo_documento, 'PIX')
  assertEquals(result.parcelas[1].tipo_documento, 'BOL')
})

Deno.test('buildParcelasFromSessions: rounding adjustment on last parcela (boleto parcelado)', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'boleto',
      valor_centavos: 1000000,
      parcelas: 3,
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 1000000)!
  assertEquals(result.nQtdeParc, 3)

  const totalValor = result.parcelas.reduce((sum, p) => sum + p.nValor, 0)
  assertEquals(totalValor, 10000)

  const totalPct = result.parcelas.reduce((sum, p) => sum + p.nPercentual, 0)
  assertEquals(totalPct, 100)
})

Deno.test('buildParcelasFromSessions: NSU resolved from payment_response.Nsu', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'cartao',
      valor_centavos: 500000,
      payment_response: { Nsu: '999888' },
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 500000)!
  assertEquals(result.parcelas[0].nsu, '999888')
})

Deno.test('buildParcelasFromSessions: NSU fallback to ProofOfSale', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'cartao',
      valor_centavos: 500000,
      payment_response: { ProofOfSale: '777666' },
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 500000)!
  assertEquals(result.parcelas[0].nsu, '777666')
})

Deno.test('buildParcelasFromSessions: NSU fallback to payment_id', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'pix',
      valor_centavos: 500000,
      payment_response: null,
      payment_id: 'pay-fallback-123',
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 500000)!
  assertEquals(result.parcelas[0].nsu, 'pay-fallback-123')
})

Deno.test('buildParcelasFromSessions: cartao 12x in split with pix generates 2 lines total', () => {
  const groupId = 'split-card12x'
  const sessions: PaidCheckoutSession[] = [
    makeSession({
      metodo_pagamento: 'pix',
      valor_centavos: 1000000,
      parcelas: 1,
      split_group_id: groupId,
      split_index: 0,
    }),
    makeSession({
      metodo_pagamento: 'cartao',
      valor_centavos: 500000,
      parcelas: 12,
      split_group_id: groupId,
      split_index: 1,
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 1500000)!

  assertEquals(result.nQtdeParc, 2)
  assertEquals(result.parcelas[0].tipo_documento, 'PIX')
  assertEquals(result.parcelas[1].tipo_documento, 'CRC')
  assertEquals(result.parcelas[1].nValor, 5000)

  const totalValor = result.parcelas.reduce((sum, p) => sum + p.nValor, 0)
  assertEquals(totalValor, 15000)
})

Deno.test('buildParcelasFromSessions: boleto 3x maintains 3 lines (regression)', () => {
  const sessions = [
    makeSession({
      metodo_pagamento: 'boleto',
      valor_centavos: 1500000,
      parcelas: 3,
      boleto_vencimento: '19/03/2026',
    }),
  ]

  const result = buildParcelasFromSessions(sessions, 1500000)!

  assertEquals(result.nQtdeParc, 3)
  assertEquals(result.parcelas.length, 3)
  for (const p of result.parcelas) {
    assertEquals(p.tipo_documento, 'BOL')
  }

  const totalValor = result.parcelas.reduce((sum, p) => sum + p.nValor, 0)
  assertEquals(totalValor, 15000)
})
