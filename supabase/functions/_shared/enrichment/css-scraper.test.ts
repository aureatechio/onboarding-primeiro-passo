import { assertEquals, assert } from 'jsr:@std/assert'
import {
  fetchAndParseCss,
  extractFontsFromCss,
  type ScrapeConfig,
} from './css-scraper.ts'

const BASE_CONFIG: ScrapeConfig = {
  timeoutMs: 5000,
  userAgent: 'TestBot/1.0',
  maxRetries: 0,
  backoffMs: [],
}

function mockFetch(responses: Map<string, { body: string; headers?: Record<string, string>; status?: number }>): typeof fetch {
  return ((url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    const resp = responses.get(urlStr)
    if (!resp) {
      return Promise.resolve(new Response('Not Found', { status: 404 }))
    }
    return Promise.resolve(
      new Response(resp.body, {
        status: resp.status ?? 200,
        headers: resp.headers ?? { 'content-type': 'text/html' },
      }),
    )
  }) as typeof fetch
}

// ---------------------------------------------------------------------------
// extractFontsFromCss
// ---------------------------------------------------------------------------

Deno.test('extractFontsFromCss extracts font-family declarations', () => {
  const css = `
    body { font-family: 'Montserrat', sans-serif; }
    h1 { font-family: 'Poppins', sans-serif; }
    h2 { font-family: 'Montserrat', serif; }
  `
  const result = extractFontsFromCss(css)

  assertEquals(result.primary, 'Montserrat') // most frequent
  assert(result.all.includes('Montserrat'))
  assert(result.all.includes('Poppins'))
  assert(!result.all.includes('sans-serif'))
  assertEquals(result.raw.length, 3)
})

Deno.test('extractFontsFromCss filters generic fonts', () => {
  const css = `body { font-family: sans-serif; }`
  const result = extractFontsFromCss(css)

  assertEquals(result.primary, null)
  assertEquals(result.all.length, 0)
})

Deno.test('extractFontsFromCss extracts Google Fonts from @import', () => {
  const css = `@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700');`
  const result = extractFontsFromCss(css)

  assert(result.all.includes('Roboto'))
})

Deno.test('extractFontsFromCss handles empty CSS', () => {
  const result = extractFontsFromCss('')

  assertEquals(result.primary, null)
  assertEquals(result.all, [])
  assertEquals(result.raw, [])
})

// ---------------------------------------------------------------------------
// fetchAndParseCss — with mock fetch
// ---------------------------------------------------------------------------

Deno.test('fetchAndParseCss extracts from inline CSS', async () => {
  const html = `
    <html><head>
    <style>
      :root { --primary: #384ffe; }
      body { font-family: 'Inter', sans-serif; color: #333333; }
    </style>
    </head><body></body></html>
  `

  const fetcher = mockFetch(
    new Map([['https://example.com', { body: html, headers: { 'content-type': 'text/html' } }]]),
  )

  const result = await fetchAndParseCss('https://example.com', BASE_CONFIG, { fetchFn: fetcher })

  assert(result.colors.length > 0)
  assert(result.colors.includes('#384ffe'))
  assertEquals(result.fonts.primary, 'Inter')
  assert(result.fetchDurationMs >= 0)
})

Deno.test('fetchAndParseCss follows linked stylesheets', async () => {
  const html = `
    <html><head>
    <link rel="stylesheet" href="https://example.com/styles.css">
    </head><body></body></html>
  `
  const css = `body { font-family: 'Roboto', sans-serif; color: #ff6b35; }`

  const fetcher = mockFetch(
    new Map([
      ['https://example.com', { body: html, headers: { 'content-type': 'text/html' } }],
      ['https://example.com/styles.css', { body: css, headers: { 'content-type': 'text/css' } }],
    ]),
  )

  const result = await fetchAndParseCss('https://example.com', BASE_CONFIG, { fetchFn: fetcher })

  assert(result.colors.includes('#ff6b35'))
  assertEquals(result.fonts.primary, 'Roboto')
})

Deno.test('fetchAndParseCss returns empty on timeout', async () => {
  const fetcher = (() =>
    new Promise((_resolve, reject) => {
      setTimeout(() => reject(new Error('AbortError')), 100)
    })) as typeof fetch

  const config = { ...BASE_CONFIG, timeoutMs: 50 }
  const result = await fetchAndParseCss('https://slow-site.com', config, { fetchFn: fetcher })

  assertEquals(result.colors, [])
  assertEquals(result.fonts.primary, null)
})

Deno.test('fetchAndParseCss returns empty on 404', async () => {
  const fetcher = (() =>
    Promise.resolve(new Response('Not Found', { status: 404 }))) as typeof fetch

  const result = await fetchAndParseCss('https://missing.com', BASE_CONFIG, { fetchFn: fetcher })

  assertEquals(result.colors, [])
  assertEquals(result.fonts.primary, null)
})

Deno.test('fetchAndParseCss returns empty for non-HTML content type', async () => {
  const fetcher = (() =>
    Promise.resolve(
      new Response('{"data": true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )) as typeof fetch

  const result = await fetchAndParseCss('https://api.example.com', BASE_CONFIG, { fetchFn: fetcher })

  assertEquals(result.colors, [])
  assertEquals(result.fonts.primary, null)
})

Deno.test('fetchAndParseCss extracts CSS variables from fixture', async () => {
  const html = `
    <html><head>
    <style>
      :root { --primary: #384ffe; --brand-color: #ff6b35; }
      body { font-family: 'Montserrat', sans-serif; }
    </style>
    </head><body></body></html>
  `

  const fetcher = mockFetch(
    new Map([['https://test.com', { body: html, headers: { 'content-type': 'text/html' } }]]),
  )

  const result = await fetchAndParseCss('https://test.com', BASE_CONFIG, { fetchFn: fetcher })

  assert(result.colors.includes('#384ffe'))
  assert(result.colors.includes('#ff6b35'))
})

Deno.test('fetchAndParseCss extracts Google Fonts from @import in CSS', async () => {
  const html = `
    <html><head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400');
      body { font-family: 'Poppins', sans-serif; }
    </style>
    </head><body></body></html>
  `

  const fetcher = mockFetch(
    new Map([['https://fonts.example.com', { body: html, headers: { 'content-type': 'text/html' } }]]),
  )

  const result = await fetchAndParseCss('https://fonts.example.com', BASE_CONFIG, { fetchFn: fetcher })

  assertEquals(result.fonts.primary, 'Poppins')
  assert(result.fonts.all.includes('Poppins'))
})
