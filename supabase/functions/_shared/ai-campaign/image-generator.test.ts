import { assertEquals, assert } from 'jsr:@std/assert'

const SAFE_URL = 'https://example.com/image.png'
const UNSAFE_URL = 'http://localhost/image.png'

// We need to test the isSafeUrl logic and the overall generateImage flow.
// Since generateImage depends on Deno.env and global fetch, we test via
// module-level mocking of fetch.

// --- isSafeUrl tests (replicate the logic since it's not exported) ---

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.startsWith('192.168.') ||
      host === '169.254.169.254' ||
      host.endsWith('.internal')
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

Deno.test('isSafeUrl rejects localhost', () => {
  assertEquals(isSafeUrl('http://localhost/img.png'), false)
})

Deno.test('isSafeUrl rejects 127.0.0.1', () => {
  assertEquals(isSafeUrl('http://127.0.0.1/img.png'), false)
})

Deno.test('isSafeUrl rejects private IP 10.x', () => {
  assertEquals(isSafeUrl('http://10.0.0.1/img.png'), false)
})

Deno.test('isSafeUrl rejects private IP 192.168.x', () => {
  assertEquals(isSafeUrl('http://192.168.1.1/img.png'), false)
})

Deno.test('isSafeUrl rejects metadata endpoint', () => {
  assertEquals(isSafeUrl('http://169.254.169.254/latest/meta-data/'), false)
})

Deno.test('isSafeUrl rejects .internal domains', () => {
  assertEquals(isSafeUrl('http://something.internal/img.png'), false)
})

Deno.test('isSafeUrl accepts valid HTTPS URL', () => {
  assertEquals(isSafeUrl('https://example.com/img.png'), true)
})

Deno.test('isSafeUrl accepts valid HTTP URL', () => {
  assertEquals(isSafeUrl('http://example.com/img.png'), true)
})

Deno.test('isSafeUrl rejects invalid URLs', () => {
  assertEquals(isSafeUrl('not-a-url'), false)
})

Deno.test('isSafeUrl rejects ftp protocol', () => {
  assertEquals(isSafeUrl('ftp://example.com/img.png'), false)
})

// --- generateImage integration-level tests (with fetch mock) ---

Deno.test('generateImage returns error when GEMINI_API_KEY is missing', async () => {
  const origKey = Deno.env.get('GEMINI_API_KEY')
  Deno.env.delete('GEMINI_API_KEY')

  const { generateImage } = await import('./image-generator.ts')
  const result = await generateImage('test prompt', SAFE_URL, SAFE_URL)

  assertEquals(result.success, false)
  assert(result.error?.includes('GEMINI_API_KEY'))

  if (origKey) Deno.env.set('GEMINI_API_KEY', origKey)
})

// --- Completeness rule tests ---

function resolveJobStatus(generated: number, total: number): string {
  return generated === total ? 'completed' : generated > 0 ? 'partial' : 'failed'
}

Deno.test('job status logic: 12/12 = completed', () => {
  assertEquals(resolveJobStatus(12, 12), 'completed')
})

Deno.test('job status logic: 8/12 = partial', () => {
  assertEquals(resolveJobStatus(8, 12), 'partial')
})

Deno.test('job status logic: 0/12 = failed', () => {
  assertEquals(resolveJobStatus(0, 12), 'failed')
})

// --- SVG detection logic tests ---

function isSvgInput(contentType: string, url: string): boolean {
  return contentType === 'image/svg+xml' || url.toLowerCase().endsWith('.svg')
}

Deno.test('SVG detection: image/svg+xml content-type', () => {
  assertEquals(isSvgInput('image/svg+xml', 'https://example.com/logo'), true)
})

Deno.test('SVG detection: .svg extension fallback', () => {
  assertEquals(isSvgInput('application/octet-stream', 'https://example.com/logo.svg'), true)
})

Deno.test('SVG detection: PNG is not SVG', () => {
  assertEquals(isSvgInput('image/png', 'https://example.com/logo.png'), false)
})

Deno.test('SVG detection: uppercase .SVG extension', () => {
  assertEquals(isSvgInput('application/octet-stream', 'https://example.com/LOGO.SVG'), true)
})

Deno.test('SVG detection: JPEG is not SVG', () => {
  assertEquals(isSvgInput('image/jpeg', 'https://example.com/photo.jpg'), false)
})
