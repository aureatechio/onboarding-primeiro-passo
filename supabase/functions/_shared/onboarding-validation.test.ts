import { assertEquals } from 'jsr:@std/assert@1'
import {
  getFileExtension,
  validateBrandDisplayName,
  validateBrandPalette,
  validateCampaignNotes,
  validateInstagramHandle,
  validateLogoFile,
  validateProductionPath,
  validateSiteUrl,
  validateUuid,
} from './onboarding-validation.ts'

const OK_UUID = '11111111-1111-1111-1111-111111111111'

Deno.test('validateUuid accepts well-formed UUID', () => {
  const r = validateUuid(OK_UUID)
  assertEquals(r.ok, true)
})

Deno.test('validateUuid rejects malformed UUID', () => {
  const r = validateUuid('abc')
  assertEquals(r.ok, false)
  if (!r.ok) assertEquals(r.error.code, 'INVALID_UUID')
})

Deno.test('validateBrandDisplayName rejects empty', () => {
  const r = validateBrandDisplayName('   ')
  assertEquals(r.ok, false)
  if (!r.ok) assertEquals(r.error.code, 'BRAND_NAME_EMPTY')
})

Deno.test('validateBrandDisplayName rejects > 120 chars', () => {
  const r = validateBrandDisplayName('a'.repeat(121))
  assertEquals(r.ok, false)
  if (!r.ok) assertEquals(r.error.code, 'BRAND_NAME_TOO_LONG')
})

Deno.test('validateBrandDisplayName accepts normal name and trims', () => {
  const r = validateBrandDisplayName('  Nike  ')
  assertEquals(r.ok, true)
  if (r.ok) assertEquals(r.value, 'Nike')
})

Deno.test('validateInstagramHandle strips @', () => {
  const r = validateInstagramHandle('@nike.oficial')
  assertEquals(r.ok, true)
  if (r.ok) assertEquals(r.value, 'nike.oficial')
})

Deno.test('validateInstagramHandle rejects invalid chars', () => {
  const r = validateInstagramHandle('in valido!')
  assertEquals(r.ok, false)
})

Deno.test('validateInstagramHandle accepts empty', () => {
  const r = validateInstagramHandle('')
  assertEquals(r.ok, true)
  if (r.ok) assertEquals(r.value, '')
})

Deno.test('validateSiteUrl requires http(s)', () => {
  assertEquals(validateSiteUrl('ftp://x').ok, false)
  assertEquals(validateSiteUrl('https://x.com').ok, true)
  assertEquals(validateSiteUrl('http://y.com').ok, true)
})

Deno.test('validateSiteUrl rejects > 500 chars', () => {
  const r = validateSiteUrl('https://' + 'a'.repeat(500))
  assertEquals(r.ok, false)
})

Deno.test('validateCampaignNotes rejects > 2000 chars', () => {
  const r = validateCampaignNotes('a'.repeat(2001))
  assertEquals(r.ok, false)
})

Deno.test('validateBrandPalette accepts up to 8 hex colors', () => {
  const r = validateBrandPalette(['#ff0000', '#00FF00', '#0000ff'])
  assertEquals(r.ok, true)
  if (r.ok) assertEquals(r.value, ['#ff0000', '#00ff00', '#0000ff'])
})

Deno.test('validateBrandPalette rejects > 8 colors', () => {
  const palette = Array(9).fill('#ff0000')
  const r = validateBrandPalette(palette)
  assertEquals(r.ok, false)
  if (!r.ok) assertEquals(r.error.code, 'TOO_MANY_COLORS')
})

Deno.test('validateBrandPalette rejects invalid hex', () => {
  const r = validateBrandPalette(['#zzz'])
  assertEquals(r.ok, false)
  if (!r.ok) assertEquals(r.error.code, 'INVALID_COLOR')
})

Deno.test('validateBrandPalette rejects non-array', () => {
  const r = validateBrandPalette('#ff0000' as unknown)
  assertEquals(r.ok, false)
})

Deno.test('validateProductionPath accepts standard/hybrid', () => {
  assertEquals(validateProductionPath('standard').ok, true)
  assertEquals(validateProductionPath('hybrid').ok, true)
  assertEquals(validateProductionPath('invalid').ok, false)
})

Deno.test('validateLogoFile rejects > 5MB', () => {
  const file = new File([new Uint8Array(6 * 1024 * 1024)], 'big.png', { type: 'image/png' })
  const r = validateLogoFile(file)
  assertEquals(r.ok, false)
  if (!r.ok) assertEquals(r.error.code, 'LOGO_TOO_LARGE')
})

Deno.test('validateLogoFile accepts PNG under limit', () => {
  const file = new File([new Uint8Array(1024)], 'ok.png', { type: 'image/png' })
  assertEquals(validateLogoFile(file).ok, true)
})

Deno.test('validateLogoFile rejects text/plain', () => {
  const file = new File(['x'], 'a.txt', { type: 'text/plain' })
  const r = validateLogoFile(file)
  assertEquals(r.ok, false)
})

Deno.test('getFileExtension from name', () => {
  assertEquals(getFileExtension(new File([''], 'logo.PNG')), 'png')
  assertEquals(getFileExtension(new File([''], 'logo.svg')), 'svg')
})

Deno.test('getFileExtension falls back to mime', () => {
  assertEquals(getFileExtension(new File([''], 'noext', { type: 'image/webp' })), 'webp')
  assertEquals(getFileExtension(new File([''], 'noext', { type: 'application/pdf' })), 'pdf')
})
