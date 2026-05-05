/* global Deno */
import { assertEquals } from 'jsr:@std/assert'
import { getAssetStableKey, normalizeMonitorAssets, resolveDetailCompraId } from './utils.js'

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

Deno.test('normalizeMonitorAssets uses asset id as stable key when available', () => {
  const [asset] = normalizeMonitorAssets([{ id: 'asset-1', group_name: 'feed', format: '1:1' }])

  assertEquals(asset.stableKey, 'id:asset-1')
  assertEquals(getAssetStableKey(asset), 'id:asset-1')
})

Deno.test('normalizeMonitorAssets builds deterministic fallback keys without array index', () => {
  const [asset] = normalizeMonitorAssets([
    {
      job_id: 'job-1',
      compra_id: 'compra-1',
      group_name: 'stories',
      format: '9:16',
      image_url: 'https://example.com/image.png',
      updated_at: '2026-05-05T12:00:00Z',
    },
  ])

  assertEquals(
    asset.stableKey,
    'job-1|compra-1|stories|9:16|https://example.com/image.png|2026-05-05T12:00:00Z'
  )
})

Deno.test('normalizeMonitorAssets disambiguates duplicate fallback signatures', () => {
  const assets = normalizeMonitorAssets([
    { group_name: 'feed', format: '1:1' },
    { group_name: 'feed', format: '1:1' },
  ])

  assertEquals(assets[0].stableKey, 'feed|1:1')
  assertEquals(assets[1].stableKey, 'feed|1:1#2')
})
