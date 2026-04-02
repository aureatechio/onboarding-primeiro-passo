import { assertEquals } from 'jsr:@std/assert@1/assert-equals'
import { assertStringIncludes } from 'jsr:@std/assert@1/assert-includes'
import {
  buildOperationalEventPayload,
  OPERATIONAL_EVENT_TYPES,
} from './operational-events.ts'
import {
  buildOperationalWhatsAppMessage,
  formatCentavosBRL,
  shortUuid,
  truncateOperationalError,
} from './operational-events-message.ts'
import { FALLBACK_CELEBRIDADE, FALLBACK_VENDEDOR } from './operational-events-labels.ts'

const baseCtx = {
  vendedor_nome: 'Maria Vendas',
  celebridade_nome: 'Celebridade X',
  compra_id_short: '…00000001',
  session_id_short: '…00000002',
}

Deno.test('buildOperationalEventPayload includes message and required fields', () => {
  const p = buildOperationalEventPayload({
    event_type: OPERATIONAL_EVENT_TYPES.PAYMENT_SUCCEEDED,
    message: 'test message',
    occurred_at: '2026-03-23T12:00:00.000Z',
    compra_id: 'c1',
    session_id: 's1',
    source: 'cielo-webhook',
    dedupe_key: 'payment_ok:s1',
    metadata: { metodo_pagamento: 'pix' },
  })
  assertEquals(p.event_type, 'checkout.payment_succeeded')
  assertEquals(p.message, 'test message')
  assertEquals(p.occurred_at, '2026-03-23T12:00:00.000Z')
  assertEquals(p.compra_id, 'c1')
  assertEquals(p.session_id, 's1')
  assertEquals(p.source, 'cielo-webhook')
  assertEquals(p.dedupe_key, 'payment_ok:s1')
  assertEquals(p.metadata?.metodo_pagamento, 'pix')
})

Deno.test('buildOperationalEventPayload redacts sensitive metadata keys', () => {
  const p = buildOperationalEventPayload({
    event_type: OPERATIONAL_EVENT_TYPES.OMIE_INTEGRATION_FAILED,
    message: 'x',
    metadata: { api_token: 'secret', last_error: 'x' },
  })
  assertEquals(p.metadata?.api_token, '[redacted]')
  assertEquals(p.metadata?.last_error, 'x')
})

Deno.test('buildOperationalEventPayload omits empty optional fields', () => {
  const p = buildOperationalEventPayload({
    event_type: OPERATIONAL_EVENT_TYPES.CONTRACT_SIGNED,
    message: 'signed',
    compra_id: 'c2',
  })
  assertEquals('session_id' in p, false)
  assertEquals('metadata' in p, false)
})

Deno.test('formatCentavosBRL uses pt-BR thousands and decimal separators', () => {
  assertEquals(formatCentavosBRL(10000), '100,00')
  assertEquals(formatCentavosBRL(50), '0,50')
  assertEquals(formatCentavosBRL(0), '0,00')
  assertEquals(formatCentavosBRL(123456789), '1.234.567,89')
  assertEquals(formatCentavosBRL(-500), '-5,00')
  assertEquals(formatCentavosBRL('invalid'), undefined)
})

Deno.test('shortUuid shows last 8 chars', () => {
  assertEquals(shortUuid('aaaaaaaa-bbbb-cccc-dddd-1234567890ab'), '…567890ab')
})

Deno.test('truncateOperationalError truncates long text', () => {
  const long = 'x'.repeat(250)
  const t = truncateOperationalError(long, 200)
  assertEquals(t.length, 200)
  assertStringIncludes(t, '…')
})

Deno.test('buildOperationalWhatsAppMessage includes vendedor and celebridade for each type', () => {
  const types = [
    'checkout.session_created',
    'checkout.session_expired',
    'contract.signed',
    'checkout.payment_succeeded',
    'checkout.payment_failed',
    'omie.integration_synced',
    'omie.integration_failed',
  ] as const
  for (const event_type of types) {
    const msg = buildOperationalWhatsAppMessage(event_type, {
      ...baseCtx,
      ...(event_type === 'checkout.payment_failed' || event_type === 'omie.integration_failed'
        ? { last_error: 'Erro teste' }
        : {}),
    })
    assertStringIncludes(msg, baseCtx.vendedor_nome)
    assertStringIncludes(msg, baseCtx.celebridade_nome)
    assertEquals(msg.trim().length > 0, true)
  }
})

Deno.test('buildOperationalWhatsAppMessage uses fallbacks when names empty', () => {
  const msg = buildOperationalWhatsAppMessage('checkout.session_created', {
    vendedor_nome: '  ',
    celebridade_nome: '',
    compra_id_short: '…abc',
  })
  assertStringIncludes(msg, FALLBACK_VENDEDOR)
  assertStringIncludes(msg, FALLBACK_CELEBRIDADE)
})
