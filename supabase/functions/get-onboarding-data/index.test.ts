import { assertEquals } from 'jsr:@std/assert'
import { formatVigencia, handleRequest, isValidUuid } from './index.ts'

Deno.test('isValidUuid validates uuid format', () => {
  assertEquals(
    isValidUuid('11111111-1111-1111-1111-111111111111'),
    true
  )
  assertEquals(isValidUuid('abc'), false)
})

Deno.test('formatVigencia prefers tempoocomprado and falls back to meses', () => {
  assertEquals(formatVigencia('3 meses', 6), '3 meses')
  assertEquals(formatVigencia(null, 6), '6 meses')
  assertEquals(formatVigencia(null, null), 'Periodo contratado')
})

Deno.test('handleRequest returns INVALID_COMPRA_ID when query is invalid', async () => {
  const req = new Request('https://example.com/functions/v1/get-onboarding-data?compra_id=abc', {
    method: 'GET',
  })

  const response = await handleRequest(req, {
    fetchOnboardingData: async () => ({
      found: false,
      eligible: false,
      data: null,
    }),
  })
  const body = (await response.json()) as { code: string }

  assertEquals(response.status, 400)
  assertEquals(body.code, 'INVALID_COMPRA_ID')
})

Deno.test('handleRequest returns COMPRA_NOT_FOUND', async () => {
  const req = new Request(
    'https://example.com/functions/v1/get-onboarding-data?compra_id=11111111-1111-1111-1111-111111111111',
    { method: 'GET' }
  )

  const response = await handleRequest(req, {
    fetchOnboardingData: async () => ({
      found: false,
      eligible: false,
      data: null,
    }),
  })
  const body = (await response.json()) as { code: string }

  assertEquals(response.status, 404)
  assertEquals(body.code, 'COMPRA_NOT_FOUND')
})

Deno.test('handleRequest returns COMPRA_NOT_ELIGIBLE', async () => {
  const req = new Request(
    'https://example.com/functions/v1/get-onboarding-data?compra_id=11111111-1111-1111-1111-111111111111',
    { method: 'GET' }
  )

  const response = await handleRequest(req, {
    fetchOnboardingData: async () => ({
      found: true,
      eligible: false,
      data: null,
    }),
  })
  const body = (await response.json()) as { code: string }

  assertEquals(response.status, 409)
  assertEquals(body.code, 'COMPRA_NOT_ELIGIBLE')
})

Deno.test('handleRequest returns payload when compra is eligible and identity is null', async () => {
  const req = new Request(
    'https://example.com/functions/v1/get-onboarding-data?compra_id=11111111-1111-1111-1111-111111111111',
    { method: 'GET' }
  )

  const response = await handleRequest(req, {
    fetchOnboardingData: async () => ({
      found: true,
      eligible: true,
      data: {
        compra_id: '11111111-1111-1111-1111-111111111111',
        clientName: 'Maria',
        celebName: 'Rodrigo Faro',
        praca: 'Sao Paulo - Capital',
        segmento: 'Odontologia',
        pacote: '2 videos + 4 estaticas',
        vigencia: '3 meses',
        atendente: 'Yasmin',
        atendenteGenero: 'f',
        identity: null,
        progress: null,
      },
    }),
  })
  const body = (await response.json()) as {
    success: boolean
    data: { clientName: string; identity: null }
  }

  assertEquals(response.status, 200)
  assertEquals(body.success, true)
  assertEquals(body.data.clientName, 'Maria')
  assertEquals(body.data.identity, null)
})

Deno.test('handleRequest returns payload with identity when already saved', async () => {
  const req = new Request(
    'https://example.com/functions/v1/get-onboarding-data?compra_id=11111111-1111-1111-1111-111111111111',
    { method: 'GET' }
  )

  const response = await handleRequest(req, {
    fetchOnboardingData: async () => ({
      found: true,
      eligible: true,
      data: {
        compra_id: '11111111-1111-1111-1111-111111111111',
        clientName: 'Maria',
        celebName: 'Rodrigo Faro',
        praca: 'Sao Paulo - Capital',
        segmento: 'Odontologia',
        pacote: '2 videos + 4 estaticas',
        vigencia: '3 meses',
        atendente: 'Yasmin',
        atendenteGenero: 'f',
        identity: {
          choice: 'add_now',
          logo_path: '11111111-1111-1111-1111-111111111111/logo.png',
          brand_palette: ['#d4ba71', '#423617'],
          font_choice: 'inter',
          campaign_images_paths: [],
          campaign_notes: 'Site: https://maria.com.br | Instagram: https://www.instagram.com/maria',
          production_path: 'standard',
          site_url: 'https://maria.com.br',
          instagram_handle: 'maria',
          updated_at: '2026-04-06T17:38:02.696Z',
        },
        progress: null,
      },
    }),
  })
  const body = (await response.json()) as {
    success: boolean
    data: {
      clientName: string
      identity: {
        choice: string
        logo_path: string
        brand_palette: string[]
        font_choice: string
        campaign_notes: string
        production_path: string
      }
    }
  }

  assertEquals(response.status, 200)
  assertEquals(body.success, true)
  assertEquals(body.data.identity?.choice, 'add_now')
  assertEquals(body.data.identity?.logo_path, '11111111-1111-1111-1111-111111111111/logo.png')
  assertEquals(body.data.identity?.brand_palette, ['#d4ba71', '#423617'])
  assertEquals(body.data.identity?.font_choice, 'inter')
  assertEquals(body.data.identity?.production_path, 'standard')
})
