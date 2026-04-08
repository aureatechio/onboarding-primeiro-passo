import { assertEquals, assert } from 'jsr:@std/assert'
import {
  isValidHexColor,
  extractColorsFromImage,
  extractColorsViaGemini,
  extractColorsFromCss,
  decodePngPixels,
} from './color-extractor.ts'

// ---------------------------------------------------------------------------
// isValidHexColor
// ---------------------------------------------------------------------------

Deno.test('isValidHexColor accepts valid 6-digit hex', () => {
  assertEquals(isValidHexColor('#384ffe'), true)
  assertEquals(isValidHexColor('#FFFFFF'), true)
  assertEquals(isValidHexColor('#000000'), true)
})

Deno.test('isValidHexColor rejects invalid colors', () => {
  assertEquals(isValidHexColor('#GGG'), false)
  assertEquals(isValidHexColor('#fff'), false) // 3-digit not accepted
  assertEquals(isValidHexColor('384ffe'), false) // missing #
  assertEquals(isValidHexColor(''), false)
  assertEquals(isValidHexColor('#12345'), false)
})

// ---------------------------------------------------------------------------
// extractColorsFromImage (algorithmic — PNG)
// ---------------------------------------------------------------------------

Deno.test('extractColorsFromImage returns colors for valid PNG fixture', async () => {
  const fixturePath = new URL(
    './__tests__/fixtures/minimal.png',
    import.meta.url,
  ).pathname.replace(/^\/([A-Z]:)/, '$1')

  const pngBytes = await Deno.readFile(fixturePath)
  const pixelData = await decodePngPixels(pngBytes)

  assert(pixelData !== null, 'PNG decode should succeed')

  const colors = extractColorsFromImage(pngBytes, pixelData!, 5)

  assert(colors.length > 0, 'Should extract at least one color')
  for (const c of colors) {
    assert(isValidHexColor(c), `Color ${c} should be valid hex`)
  }
})

Deno.test('extractColorsFromImage returns empty for non-PNG data', async () => {
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
  const pixelData = await decodePngPixels(jpegHeader)
  assertEquals(pixelData, null)
})

// ---------------------------------------------------------------------------
// decodePngPixels
// ---------------------------------------------------------------------------

Deno.test('decodePngPixels decodes minimal 4x4 RGB PNG', async () => {
  const fixturePath = new URL(
    './__tests__/fixtures/minimal.png',
    import.meta.url,
  ).pathname.replace(/^\/([A-Z]:)/, '$1')

  const pngBytes = await Deno.readFile(fixturePath)
  const result = await decodePngPixels(pngBytes)

  assert(result !== null, 'Should decode successfully')
  assertEquals(result!.width, 4)
  assertEquals(result!.height, 4)
  assertEquals(result!.data.length, 4 * 4 * 4) // 4x4 pixels, 4 channels (RGBA)

  // Top-left pixel should be red (255, 0, 0, 255)
  assertEquals(result!.data[0], 255) // R
  assertEquals(result!.data[1], 0)   // G
  assertEquals(result!.data[2], 0)   // B
  assertEquals(result!.data[3], 255) // A (RGB PNG -> alpha = 255)

  // Top-right pixel (index 3) should be green (0, 204, 0, 255)
  const idx3 = 3 * 4
  assertEquals(result!.data[idx3], 0)
  assertEquals(result!.data[idx3 + 1], 204)
  assertEquals(result!.data[idx3 + 2], 0)
})

Deno.test('decodePngPixels returns null for non-PNG bytes', async () => {
  const notPng = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8])
  assertEquals(await decodePngPixels(notPng), null)
})

// ---------------------------------------------------------------------------
// extractColorsViaGemini (mocked)
// ---------------------------------------------------------------------------

Deno.test('extractColorsViaGemini parses valid JSON array from Gemini', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '["#384ffe", "#1a1a2e", "#f5f5f5"]' }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )) as typeof fetch

  try {
    const colors = await extractColorsViaGemini(
      new Uint8Array([1, 2, 3]),
      'image/png',
      'analyze colors',
      {
        apiKey: 'test',
        modelName: 'test-model',
        baseUrl: 'https://test.com/v1beta',
        temperature: 0.2,
        timeoutMs: 5000,
        maxRetries: 0,
        backoffMs: [],
      },
    )
    assertEquals(colors, ['#384ffe', '#1a1a2e', '#f5f5f5'])
  } finally {
    globalThis.fetch = originalFetch
  }
})

Deno.test('extractColorsViaGemini returns empty for malformed response', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Here are some colors: red, blue and green' }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    )) as typeof fetch

  try {
    const colors = await extractColorsViaGemini(
      new Uint8Array([1, 2, 3]),
      'image/png',
      'analyze colors',
      {
        apiKey: 'test',
        modelName: 'test',
        baseUrl: 'https://test.com/v1beta',
        temperature: 0.2,
        timeoutMs: 5000,
        maxRetries: 0,
        backoffMs: [],
      },
    )
    assertEquals(colors, [])
  } finally {
    globalThis.fetch = originalFetch
  }
})

// ---------------------------------------------------------------------------
// extractColorsFromCss
// ---------------------------------------------------------------------------

Deno.test('extractColorsFromCss extracts CSS custom variables', () => {
  const css = `
    :root {
      --primary: #384ffe;
      --secondary: #1a1a2e;
    }
  `
  const colors = extractColorsFromCss(css, 5)
  assert(colors.includes('#384ffe'))
  assert(colors.includes('#1a1a2e'))
})

Deno.test('extractColorsFromCss extracts hex and rgb colors', () => {
  const css = `
    body { color: #333333; background-color: rgb(245, 245, 245); }
    h1 { color: #ff0058; }
  `
  const colors = extractColorsFromCss(css, 10)
  assert(colors.includes('#333333'))
  assert(colors.includes('#ff0058'))
  assert(colors.includes('#f5f5f5')) // rgb(245,245,245) -> #f5f5f5
})

Deno.test('extractColorsFromCss returns empty for CSS without colors', () => {
  const css = `
    body { margin: 0; padding: 10px; }
    .container { display: flex; }
  `
  assertEquals(extractColorsFromCss(css, 5), [])
})

Deno.test('extractColorsFromCss discards invalid hex values', () => {
  const css = `
    :root { --bad: #GGG; --good: #384ffe; }
  `
  const colors = extractColorsFromCss(css, 5)
  assert(colors.includes('#384ffe'))
  assert(!colors.some((c) => c.includes('GGG')))
})
