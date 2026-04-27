/* global Deno */
import { assertEquals } from 'jsr:@std/assert'
import { resolveDetailCompraId } from './utils.js'

Deno.test('resolveDetailCompraId prefers compra_id from URL', () => {
  const result = resolveDetailCompraId({
    urlCompraId: 'url-compra',
    data: { input: { compra_id: 'payload-compra' } },
    job: { compra_id: 'job-compra' },
    onboarding: { compra: { id: 'onboarding-compra' } },
  })

  assertEquals(result, 'url-compra')
})

Deno.test('resolveDetailCompraId falls back to payload input compra_id', () => {
  const result = resolveDetailCompraId({
    urlCompraId: '',
    data: { input: { compra_id: 'payload-compra' } },
    job: { compra_id: 'job-compra' },
    onboarding: { compra: { id: 'onboarding-compra' } },
  })

  assertEquals(result, 'payload-compra')
})

Deno.test('resolveDetailCompraId falls back to job compra_id', () => {
  const result = resolveDetailCompraId({
    urlCompraId: '',
    data: {},
    job: { compra_id: 'job-compra' },
    onboarding: { compra: { id: 'onboarding-compra' } },
  })

  assertEquals(result, 'job-compra')
})

Deno.test('resolveDetailCompraId falls back to onboarding compra id', () => {
  const result = resolveDetailCompraId({
    urlCompraId: '',
    data: {},
    job: {},
    onboarding: { compra: { id: 'onboarding-compra' } },
  })

  assertEquals(result, 'onboarding-compra')
})

Deno.test('resolveDetailCompraId returns empty string when no compra_id is available', () => {
  const result = resolveDetailCompraId({
    urlCompraId: '',
    data: {},
    job: {},
    onboarding: {},
  })

  assertEquals(result, '')
})
