import { assertEquals, assert } from 'jsr:@std/assert'
import {
  detectAndValidateFont,
  type FontDetectionInput,
} from './font-detector.ts'
import type { EnrichmentConfig } from './config-types.ts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<EnrichmentConfig> = {}): EnrichmentConfig {
  return {
    id: 'test-config',
    color_gemini_prompt: '',
    color_fallback_palette: ['#384ffe'],
    color_extraction_max: 5,
    font_validation_prompt:
      'A empresa "${company_name}" do segmento "${segment}" usa a fonte "${detected_font}". Responda JSON: { "approved": boolean, "reason": "string", "suggestion": "string ou null" }',
    font_suggestion_prompt:
      'Sugira uma fonte para "${company_name}" do segmento "${segment}". Responda SOMENTE o nome da fonte.',
    font_fallback: 'Inter',
    briefing_auto_mode: 'text',
    gemini_model_name: 'gemini-test',
    gemini_api_base_url: 'https://gemini.test/v1beta',
    gemini_temperature: 0.2,
    timeout_colors_ms: 10000,
    timeout_font_ms: 5000,
    timeout_briefing_ms: 30000,
    timeout_campaign_ms: 10000,
    retry_gemini_max: 1,
    retry_gemini_backoff_ms: '50',
    retry_scrape_max: 0,
    retry_scrape_backoff_ms: '100',
    scrape_timeout_ms: 3000,
    scrape_user_agent: 'TestBot/1.0',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSiteFetch(fontFamily: string): typeof fetch {
  const html = `<html><head><style>body { font-family: '${fontFamily}', sans-serif; }</style></head><body></body></html>`
  return ((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    if (urlStr.includes('example.com')) {
      return Promise.resolve(
        new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
      )
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }) as typeof fetch
}

let geminiCallCount = 0

function makeGeminiFetch(
  responses: Array<{ text: string; status?: number }>,
  siteFetch?: typeof fetch,
): typeof fetch {
  geminiCallCount = 0
  return ((url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url

    if (urlStr.includes('gemini.test')) {
      const resp = responses[geminiCallCount] ?? responses[responses.length - 1]
      geminiCallCount++
      const status = resp.status ?? 200
      if (status !== 200) {
        return Promise.resolve(new Response('error', { status }))
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: resp.text }] } }],
          }),
          { status: 200 },
        ),
      )
    }

    if (siteFetch) {
      return siteFetch(url, init)
    }
    return Promise.resolve(new Response('Not Found', { status: 404 }))
  }) as typeof fetch
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

Deno.test('font-detector: CSS returns Montserrat, Gemini approves -> site_css', async () => {
  const originalFetch = globalThis.fetch
  const siteFetch = makeSiteFetch('Montserrat')
  globalThis.fetch = makeGeminiFetch(
    [{ text: '{ "approved": true, "reason": "Profissional e moderna", "suggestion": null }' }],
    siteFetch,
  )

  try {
    const input: FontDetectionInput = {
      siteUrl: 'https://example.com',
      companyName: 'Teste Corp',
      segment: 'Tecnologia',
      config: makeConfig(),
      geminiApiKey: 'test-key',
    }

    const result = await detectAndValidateFont(input)

    assertEquals(result.font, 'Montserrat')
    assertEquals(result.source, 'site_css')
    assertEquals(result.validated, true)
    assert(result.validationReason !== null)
    assert(result.attempts.length >= 2) // scrape + validation
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('font-detector: CSS returns Comic Sans, Gemini rejects with suggestion Poppins', async () => {
  const originalFetch = globalThis.fetch
  const siteFetch = makeSiteFetch('Comic Sans')
  globalThis.fetch = makeGeminiFetch(
    [{ text: '{ "approved": false, "reason": "Nao profissional", "suggestion": "Poppins" }' }],
    siteFetch,
  )

  try {
    const input: FontDetectionInput = {
      siteUrl: 'https://example.com',
      companyName: 'Lojinha',
      segment: 'Varejo',
      config: makeConfig(),
      geminiApiKey: 'test-key',
    }

    const result = await detectAndValidateFont(input)

    assertEquals(result.font, 'Poppins')
    assertEquals(result.source, 'site_css')
    assertEquals(result.validated, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('font-detector: no siteUrl, Gemini suggests Roboto -> gemini_suggestion', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = makeGeminiFetch([{ text: 'Roboto' }])

  try {
    const input: FontDetectionInput = {
      siteUrl: null,
      companyName: 'Empresa Nova',
      segment: 'Saude',
      config: makeConfig(),
      geminiApiKey: 'test-key',
    }

    const result = await detectAndValidateFont(input)

    assertEquals(result.font, 'Roboto')
    assertEquals(result.source, 'gemini_suggestion')
    assertEquals(result.validated, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('font-detector: all Gemini calls fail -> fallback Inter', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = makeGeminiFetch([{ text: '', status: 500 }, { text: '', status: 500 }])

  try {
    const input: FontDetectionInput = {
      siteUrl: null,
      companyName: 'Offline Corp',
      segment: 'Industrial',
      config: makeConfig({ retry_gemini_max: 0 }),
      geminiApiKey: 'test-key',
    }

    const result = await detectAndValidateFont(input)

    assertEquals(result.font, 'Inter')
    assertEquals(result.source, 'fallback')
    assertEquals(result.validated, false)
    assert(result.attempts.some((a) => a.method === 'fallback'))
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('font-detector: Gemini returns 429, retry succeeds on 2nd attempt', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = makeGeminiFetch([
    { text: '', status: 429 },
    { text: 'Lato' },
  ])

  try {
    const input: FontDetectionInput = {
      siteUrl: null,
      companyName: 'Retry Corp',
      segment: 'Servicos',
      config: makeConfig({ retry_gemini_max: 1, retry_gemini_backoff_ms: '50' }),
      geminiApiKey: 'test-key',
    }

    const result = await detectAndValidateFont(input)

    assertEquals(result.font, 'Lato')
    assertEquals(result.source, 'gemini_suggestion')
  } finally {
    globalThis.fetch = originalFetch
  }
})
