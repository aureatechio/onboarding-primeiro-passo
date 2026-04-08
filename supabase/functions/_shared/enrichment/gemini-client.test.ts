import { assertEquals, assert } from 'jsr:@std/assert'
import {
  bytesToBase64,
  parseBackoffMs,
  callGeminiText,
  type GeminiCallConfig,
} from './gemini-client.ts'

// ---------------------------------------------------------------------------
// bytesToBase64
// ---------------------------------------------------------------------------

Deno.test('bytesToBase64 encodes empty array', () => {
  assertEquals(bytesToBase64(new Uint8Array([])), '')
})

Deno.test('bytesToBase64 encodes known bytes', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
  assertEquals(bytesToBase64(bytes), btoa('Hello'))
})

// ---------------------------------------------------------------------------
// parseBackoffMs
// ---------------------------------------------------------------------------

Deno.test('parseBackoffMs parses comma-separated values', () => {
  assertEquals(parseBackoffMs('1000,3000'), [1000, 3000])
})

Deno.test('parseBackoffMs handles single value', () => {
  assertEquals(parseBackoffMs('2000'), [2000])
})

Deno.test('parseBackoffMs filters invalid values', () => {
  assertEquals(parseBackoffMs('1000,abc,3000'), [1000, 3000])
})

Deno.test('parseBackoffMs returns empty for empty string', () => {
  assertEquals(parseBackoffMs(''), [])
})

// ---------------------------------------------------------------------------
// callGeminiText — with mock fetch
// ---------------------------------------------------------------------------

const BASE_CONFIG: GeminiCallConfig = {
  apiKey: 'test-key',
  modelName: 'gemini-test',
  baseUrl: 'https://gemini.test/v1beta',
  temperature: 0.2,
  timeoutMs: 5000,
  maxRetries: 1,
  backoffMs: [100],
}

Deno.test('callGeminiText returns text from successful response', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Hello world' }] } }],
        }),
        { status: 200 },
      ),
    )) as typeof fetch

  try {
    const result = await callGeminiText('test prompt', null, BASE_CONFIG)
    assertEquals(result.text, 'Hello world')
    assertEquals(result.retryCount, 0)
    assert(result.durationMs >= 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('callGeminiText returns empty string for empty candidates', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    )) as typeof fetch

  try {
    const result = await callGeminiText('test', null, BASE_CONFIG)
    assertEquals(result.text, '')
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('callGeminiText retries on 429 and succeeds', async () => {
  const originalFetch = globalThis.fetch
  let callCount = 0
  globalThis.fetch = (() => {
    callCount++
    if (callCount === 1) {
      return Promise.resolve(new Response('rate limited', { status: 429 }))
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'ok after retry' }] } }],
        }),
        { status: 200 },
      ),
    )
  }) as typeof fetch

  try {
    const config = { ...BASE_CONFIG, backoffMs: [50] }
    const result = await callGeminiText('test', null, config)
    assertEquals(result.text, 'ok after retry')
    assertEquals(result.retryCount, 1)
    assertEquals(callCount, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('callGeminiText returns empty after exhausting retries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(new Response('error', { status: 500 }))) as typeof fetch

  try {
    const config = { ...BASE_CONFIG, maxRetries: 1, backoffMs: [10] }
    const result = await callGeminiText('test', null, config)
    assertEquals(result.text, '')
    assertEquals(result.retryCount, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('callGeminiText sends image part when provided', async () => {
  const originalFetch = globalThis.fetch
  let capturedBody: string | null = null
  globalThis.fetch = ((
    _url: string | URL | Request,
    init?: RequestInit,
  ) => {
    capturedBody = init?.body as string
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'colors found' }] } }],
        }),
        { status: 200 },
      ),
    )
  }) as typeof fetch

  try {
    const image = { mimeType: 'image/png', base64Data: 'AAAA' }
    await callGeminiText('analyze', image, BASE_CONFIG)

    assert(capturedBody !== null)
    const parsed = JSON.parse(capturedBody!)
    assertEquals(parsed.contents[0].parts.length, 2)
    assertEquals(parsed.contents[0].parts[0].inlineData.mimeType, 'image/png')
    assertEquals(parsed.contents[0].parts[0].inlineData.data, 'AAAA')
    assertEquals(parsed.contents[0].parts[1].text, 'analyze')
  } finally {
    globalThis.fetch = originalFetch
  }
})
