import { assertEquals } from 'jsr:@std/assert'
import { getSessionNotRetryableApiError } from './checkout-session-errors.ts'

Deno.test('getSessionNotRetryableApiError: processing + payment_id + PIX QR -> SESSION_PROCESSING_WITH_PIX', () => {
  const err = getSessionNotRetryableApiError({
    status: 'processing',
    payment_id: 'pid-1',
    pix_qrcode_text: '00020101',
    payment_response: null,
  })
  assertEquals(err.code, 'SESSION_PROCESSING_WITH_PIX')
})

Deno.test('getSessionNotRetryableApiError: processing + payment_id + Payment.Type Pix -> SESSION_PROCESSING_WITH_PIX', () => {
  const err = getSessionNotRetryableApiError({
    status: 'processing',
    payment_id: 'pid-1',
    pix_qrcode_text: null,
    pix_qrcode_base64: null,
    payment_response: { Payment: { Type: 'Pix' } },
  })
  assertEquals(err.code, 'SESSION_PROCESSING_WITH_PIX')
})

Deno.test('getSessionNotRetryableApiError: processing + payment_id sem PIX -> SESSION_PROCESSING_WITH_PAYMENT', () => {
  const err = getSessionNotRetryableApiError({
    status: 'processing',
    payment_id: 'pid-1',
    pix_qrcode_text: null,
    pix_qrcode_base64: null,
    payment_response: { Payment: { Type: 'Boleto' } },
  })
  assertEquals(err.code, 'SESSION_PROCESSING_WITH_PAYMENT')
})

Deno.test('getSessionNotRetryableApiError: completed -> SESSION_NON_RETRYABLE', () => {
  const err = getSessionNotRetryableApiError({
    status: 'completed',
    payment_id: null,
  })
  assertEquals(err.code, 'SESSION_NON_RETRYABLE')
})
