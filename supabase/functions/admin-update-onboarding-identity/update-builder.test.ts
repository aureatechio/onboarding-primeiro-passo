import { assertEquals } from 'jsr:@std/assert'
import { buildIdentityUpdate } from './update-builder.ts'

Deno.test('buildIdentityUpdate accepts font_choice', () => {
  const result = buildIdentityUpdate({ font_choice: 'Inter' })

  assertEquals(result.ok, true)
  if (result.ok) assertEquals(result.update.font_choice, 'Inter')
})

Deno.test('buildIdentityUpdate clears empty font_choice to null', () => {
  const result = buildIdentityUpdate({ font_choice: '' })

  assertEquals(result.ok, true)
  if (result.ok) assertEquals(result.update.font_choice, null)
})

Deno.test('buildIdentityUpdate rejects font_choice over 100 chars', () => {
  const result = buildIdentityUpdate({ font_choice: 'a'.repeat(101) })

  assertEquals(result.ok, false)
  if (!result.ok) assertEquals(result.error.code, 'FONT_TOO_LONG')
})

Deno.test('buildIdentityUpdate maps editable identity fields', () => {
  const result = buildIdentityUpdate({
    brand_display_name: 'Minha Marca',
    brand_palette: ['#384FFE', '#111111'],
    campaign_notes: 'Observacao interna',
  })

  assertEquals(result.ok, true)
  if (result.ok) {
    assertEquals(result.update.brand_display_name, 'Minha Marca')
    assertEquals(result.update.brand_palette, ['#384ffe', '#111111'])
    assertEquals(result.update.campaign_notes, 'Observacao interna')
    assertEquals(result.siteOrHandleChanged, false)
  }
})

Deno.test('buildIdentityUpdate clears nullable text fields', () => {
  const result = buildIdentityUpdate({
    brand_display_name: '',
    campaign_notes: '',
    site_url: '',
    instagram_handle: '',
  })

  assertEquals(result.ok, true)
  if (result.ok) {
    assertEquals(result.update.brand_display_name, null)
    assertEquals(result.update.campaign_notes, null)
    assertEquals(result.update.site_url, null)
    assertEquals(result.update.instagram_handle, null)
    assertEquals(result.siteOrHandleChanged, true)
  }
})

Deno.test('buildIdentityUpdate marks site and instagram changes for reenrich', () => {
  const result = buildIdentityUpdate({
    site_url: 'https://example.com',
    instagram_handle: '@minha.marca',
  })

  assertEquals(result.ok, true)
  if (result.ok) {
    assertEquals(result.update.site_url, 'https://example.com')
    assertEquals(result.update.instagram_handle, 'minha.marca')
    assertEquals(result.siteOrHandleChanged, true)
  }
})
