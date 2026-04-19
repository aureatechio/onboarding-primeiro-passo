import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert'
import {
  buildPrompt,
  computeInputHashAsync,
  GROUPS,
  FORMATS,
  type PromptInput,
  type HashOptions,
} from './prompt-builder.ts'

const TEST_GROUP_DIRECTIONS = {
  moderna: 'CREATIVE DIRECTION — MODERNA (Dark & Bold)\n- Background: Black.',
  clean: 'CREATIVE DIRECTION — CLEAN (White & Editorial)\n- Background: White.',
  retail: 'CREATIVE DIRECTION — RETAIL (Bold & Commercial)\n- Background: Brand color.',
}

const TEST_FORMAT_INSTRUCTIONS = {
  '1:1': 'OUTPUT FORMAT: Square 1:1 (1080x1080 px). Centered composition.',
  '4:5': 'OUTPUT FORMAT: Portrait 4:5 (1080x1350 px). Vertical emphasis.',
  '16:9': 'OUTPUT FORMAT: Landscape 16:9 (1920x1080 px). Horizontal layout.',
  '9:16': 'OUTPUT FORMAT: Vertical Story 9:16 (1080x1920 px). Full vertical.',
}

const TEST_HASH_OPTIONS: HashOptions = {
  promptVersion: 'v1.0.0',
  globalRulesVersion: 'v1.0.0',
}

const BASE_INPUT: PromptInput = {
  globalRules: 'GLOBAL RULES TEXT',
  clientName: 'Acme Corp',
  celebName: 'Ana Silva',
  brandPalette: ['#FF0000', '#00FF00', '#0000FF'],
  fontChoice: 'inter',
  groupDirections: TEST_GROUP_DIRECTIONS,
  formatInstructions: TEST_FORMAT_INSTRUCTIONS,
}

Deno.test('GROUPS x FORMATS = 12 combinations', () => {
  assertEquals(GROUPS.length * FORMATS.length, 12)
})

Deno.test('buildPrompt includes all required sections', () => {
  const prompt = buildPrompt(BASE_INPUT, 'moderna', '1:1')

  assert(prompt.includes('GLOBAL RULES TEXT'), 'should include global rules')
  assert(prompt.includes('Acme Corp'), 'should include client name')
  assert(prompt.includes('Ana Silva'), 'should include celeb name')
  assert(prompt.includes('#FF0000'), 'should include brand color')
  assert(prompt.includes('inter'), 'should include font')
  assert(prompt.includes('MODERNA'), 'should include group direction')
  assert(prompt.includes('1:1'), 'should include format')
  assert(prompt.includes('1080x1080'), 'should include pixel dimensions')
})

Deno.test('buildPrompt works without campaignNotes', () => {
  const prompt = buildPrompt(BASE_INPUT, 'clean', '4:5')
  assert(prompt.length > 0)
  assert(!prompt.includes('Additional Notes'))
})

Deno.test('buildPrompt includes campaignNotes when provided', () => {
  const input: PromptInput = { ...BASE_INPUT, campaignNotes: 'Foco em jovens' }
  const prompt = buildPrompt(input, 'retail', '9:16')
  assert(prompt.includes('Additional Notes: Foco em jovens'))
})

Deno.test('buildPrompt generates different prompts for different groups', () => {
  const moderna = buildPrompt(BASE_INPUT, 'moderna', '1:1')
  const clean = buildPrompt(BASE_INPUT, 'clean', '1:1')
  const retail = buildPrompt(BASE_INPUT, 'retail', '1:1')

  assertNotEquals(moderna, clean)
  assertNotEquals(moderna, retail)
  assertNotEquals(clean, retail)
})

Deno.test('buildPrompt generates different prompts for different formats', () => {
  const square = buildPrompt(BASE_INPUT, 'moderna', '1:1')
  const portrait = buildPrompt(BASE_INPUT, 'moderna', '4:5')
  const landscape = buildPrompt(BASE_INPUT, 'moderna', '16:9')
  const story = buildPrompt(BASE_INPUT, 'moderna', '9:16')

  assertNotEquals(square, portrait)
  assertNotEquals(square, landscape)
  assertNotEquals(square, story)
})

Deno.test('buildPrompt final sentence mentions logo and celebrity protection', () => {
  const prompt = buildPrompt(BASE_INPUT, 'moderna', '1:1')
  assert(prompt.includes('logo MUST be used as-is'), 'should mention logo protection')
  assert(prompt.includes('celebrity photo MUST remain 100% untouched'), 'should mention celebrity protection')
  assert(prompt.includes('Brazilian Portuguese'), 'should mention language')
})

Deno.test('computeInputHashAsync is deterministic', async () => {
  const hash1 = await computeInputHashAsync(BASE_INPUT, TEST_HASH_OPTIONS)
  const hash2 = await computeInputHashAsync(BASE_INPUT, TEST_HASH_OPTIONS)
  assertEquals(hash1, hash2)
})

Deno.test('computeInputHashAsync produces different hash for different inputs', async () => {
  const hash1 = await computeInputHashAsync(BASE_INPUT, TEST_HASH_OPTIONS)
  const hash2 = await computeInputHashAsync({ ...BASE_INPUT, clientName: 'Other Corp' }, TEST_HASH_OPTIONS)
  assertNotEquals(hash1, hash2)
})

Deno.test('computeInputHashAsync produces different hash with/without campaignImageUrl', async () => {
  const hashWithout = await computeInputHashAsync(BASE_INPUT, TEST_HASH_OPTIONS)
  const hashWith = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, campaignImageUrl: 'https://example.com/image.png' })
  assertNotEquals(hashWithout, hashWith)
})

Deno.test('computeInputHashAsync is order-insensitive for palette', async () => {
  const input1: PromptInput = { ...BASE_INPUT, brandPalette: ['#FF0000', '#00FF00'] }
  const input2: PromptInput = { ...BASE_INPUT, brandPalette: ['#00FF00', '#FF0000'] }
  const hash1 = await computeInputHashAsync(input1, TEST_HASH_OPTIONS)
  const hash2 = await computeInputHashAsync(input2, TEST_HASH_OPTIONS)
  assertEquals(hash1, hash2)
})

Deno.test('computeInputHashAsync returns hex string of 64 chars', async () => {
  const hash = await computeInputHashAsync(BASE_INPUT, TEST_HASH_OPTIONS)
  assertEquals(hash.length, 64)
  assert(/^[0-9a-f]+$/.test(hash))
})

Deno.test('computeInputHashAsync changes when reference signature changes', async () => {
  const hash1 = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, referenceSignature: 'moderna:text' })
  const hash2 = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, referenceSignature: 'moderna:image:pathA' })
  assertNotEquals(hash1, hash2)
})

Deno.test('computeInputHashAsync changes when promptVersion changes', async () => {
  const hash1 = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, promptVersion: 'v1.0.0' })
  const hash2 = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, promptVersion: 'v2.0.0' })
  assertNotEquals(hash1, hash2)
})

Deno.test('computeInputHashAsync changes when globalRulesVersion changes', async () => {
  const hash1 = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, globalRulesVersion: 'v1.0.0' })
  const hash2 = await computeInputHashAsync(BASE_INPUT, { ...TEST_HASH_OPTIONS, globalRulesVersion: 'v2.0.0' })
  assertNotEquals(hash1, hash2)
})
