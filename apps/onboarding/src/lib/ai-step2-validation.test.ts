import { assertEquals } from 'jsr:@std/assert'

// Import the JS validation module using relative path
const {
  validateLogoFile,
  validatePalette,
  validateFont,
  validateAiStep2Inputs,
  // deno-lint-ignore no-explicit-any
} = await import('./ai-step2-validation.js') as any

// --- validateLogoFile ---

Deno.test('validateLogoFile: rejects null file', () => {
  const result = validateLogoFile(null)
  assertEquals(result.valid, false)
})

Deno.test('validateLogoFile: accepts valid PNG under 5MB', () => {
  const file = { type: 'image/png', size: 1024 * 1024 }
  assertEquals(validateLogoFile(file).valid, true)
})

Deno.test('validateLogoFile: accepts JPEG', () => {
  assertEquals(validateLogoFile({ type: 'image/jpeg', size: 2 * 1024 * 1024 }).valid, true)
})

Deno.test('validateLogoFile: accepts SVG', () => {
  assertEquals(validateLogoFile({ type: 'image/svg+xml', size: 100 * 1024 }).valid, true)
})

Deno.test('validateLogoFile: accepts WebP', () => {
  assertEquals(validateLogoFile({ type: 'image/webp', size: 500 * 1024 }).valid, true)
})

Deno.test('validateLogoFile: rejects file > 5MB', () => {
  const result = validateLogoFile({ type: 'image/png', size: 6 * 1024 * 1024 })
  assertEquals(result.valid, false)
})

Deno.test('validateLogoFile: rejects unsupported type', () => {
  const result = validateLogoFile({ type: 'application/pdf', size: 1024 })
  assertEquals(result.valid, false)
})

// --- validatePalette ---

Deno.test('validatePalette: accepts 1 valid hex color', () => {
  assertEquals(validatePalette(['#FF0000']).valid, true)
})

Deno.test('validatePalette: accepts 5 colors', () => {
  assertEquals(validatePalette(['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000']).valid, true)
})

Deno.test('validatePalette: rejects empty palette', () => {
  assertEquals(validatePalette([]).valid, false)
})

Deno.test('validatePalette: rejects 6 colors', () => {
  assertEquals(validatePalette(['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#AABBCC']).valid, false)
})

Deno.test('validatePalette: rejects invalid hex color', () => {
  assertEquals(validatePalette(['#FF0000', 'not-a-color']).valid, false)
})

Deno.test('validatePalette: rejects null input', () => {
  assertEquals(validatePalette(null).valid, false)
})

// --- validateFont ---

Deno.test('validateFont: accepts non-empty string', () => {
  assertEquals(validateFont('inter').valid, true)
})

Deno.test('validateFont: rejects empty string', () => {
  assertEquals(validateFont('').valid, false)
})

Deno.test('validateFont: rejects null', () => {
  assertEquals(validateFont(null).valid, false)
})

Deno.test('validateFont: rejects whitespace-only', () => {
  assertEquals(validateFont('   ').valid, false)
})

// --- validateAiStep2Inputs ---

Deno.test('validateAiStep2Inputs: valid with all required fields', () => {
  const result = validateAiStep2Inputs({
    logoFile: { type: 'image/png', size: 1024 },
    logoName: 'logo.png',
    colors: ['#FF0000'],
    fontId: 'inter',
  })
  assertEquals(result.valid, true)
  assertEquals(Object.keys(result.errors).length, 0)
})

Deno.test('validateAiStep2Inputs: valid with logoName but no logoFile (rehydrated)', () => {
  const result = validateAiStep2Inputs({
    logoFile: null,
    logoName: 'previous-logo.png',
    colors: ['#FF0000'],
    fontId: 'inter',
  })
  assertEquals(result.valid, true)
})

Deno.test('validateAiStep2Inputs: invalid without logo', () => {
  const result = validateAiStep2Inputs({
    logoFile: null,
    logoName: '',
    colors: ['#FF0000'],
    fontId: 'inter',
  })
  assertEquals(result.valid, false)
  assertEquals(typeof result.errors.logo, 'string')
})

Deno.test('validateAiStep2Inputs: invalid without font', () => {
  const result = validateAiStep2Inputs({
    logoFile: null,
    logoName: 'logo.png',
    colors: ['#FF0000'],
    fontId: '',
  })
  assertEquals(result.valid, false)
  assertEquals(typeof result.errors.font, 'string')
})

Deno.test('validateAiStep2Inputs: aggregates multiple errors', () => {
  const result = validateAiStep2Inputs({
    logoFile: null,
    logoName: '',
    colors: [],
    fontId: '',
  })
  assertEquals(result.valid, false)
  assertEquals(typeof result.errors.logo, 'string')
  assertEquals(typeof result.errors.palette, 'string')
  assertEquals(typeof result.errors.font, 'string')
})
