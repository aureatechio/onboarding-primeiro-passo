import { assertEquals } from 'jsr:@std/assert@1/assert-equals'
import { requireAdminPassword } from '../_shared/admin-auth.ts'
import {
  VALID_DIRECTION_MODES,
  VALID_CATEGORIES,
  REFERENCE_BUCKET,
} from '../_shared/nanobanana/config.ts'

// ============================================================================
// Admin Auth Guard Tests
// ============================================================================

Deno.test('requireAdminPassword returns authorized:true when correct password provided', () => {
  const req = new Request('https://example.com/test', {
    method: 'PATCH',
    headers: { 'x-admin-password': 'megazord' },
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, true)
})

Deno.test('requireAdminPassword returns authorized:false with 401 when no header', () => {
  const req = new Request('https://example.com/test', {
    method: 'PATCH',
    headers: {},
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, false)
  assertEquals(result.response.status, 401)
})

Deno.test('requireAdminPassword returns authorized:false with 401 when wrong password', () => {
  const req = new Request('https://example.com/test', {
    method: 'PATCH',
    headers: { 'x-admin-password': 'wrong-password' },
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, false)
  assertEquals(result.response.status, 401)
})

Deno.test('requireAdminPassword uses env var ADMIN_PASSWORD when set', async () => {
  const customPassword = 'custom-secret-password-12345'
  Deno.env.set('ADMIN_PASSWORD', customPassword)

  try {
    const req = new Request('https://example.com/test', {
      method: 'PATCH',
      headers: { 'x-admin-password': customPassword },
    })

    const result = requireAdminPassword(req)

    assertEquals(result.authorized, true)
  } finally {
    Deno.env.delete('ADMIN_PASSWORD')
  }
})

Deno.test('requireAdminPassword defaults to megazord when env var not set', () => {
  // Ensure env var is not set
  Deno.env.delete('ADMIN_PASSWORD')

  const req = new Request('https://example.com/test', {
    method: 'PATCH',
    headers: { 'x-admin-password': 'megazord' },
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, true)
})

// ============================================================================
// Validation Logic Tests (Shared Constants)
// ============================================================================

Deno.test('VALID_DIRECTION_MODES includes text, image, both', () => {
  assertEquals(VALID_DIRECTION_MODES.includes('text'), true)
  assertEquals(VALID_DIRECTION_MODES.includes('image'), true)
  assertEquals(VALID_DIRECTION_MODES.includes('both'), true)
})

Deno.test('VALID_DIRECTION_MODES does NOT include invalid values', () => {
  assertEquals(VALID_DIRECTION_MODES.includes('invalid'), false)
  assertEquals(VALID_DIRECTION_MODES.includes('video'), false)
  assertEquals(VALID_DIRECTION_MODES.includes('audio'), false)
})

Deno.test('VALID_CATEGORIES has exactly 3 items: moderna, clean, retail', () => {
  assertEquals(VALID_CATEGORIES.length, 3)
  assertEquals(VALID_CATEGORIES.includes('moderna'), true)
  assertEquals(VALID_CATEGORIES.includes('clean'), true)
  assertEquals(VALID_CATEGORIES.includes('retail'), true)
})

Deno.test('REFERENCE_BUCKET equals nanobanana-references', () => {
  assertEquals(REFERENCE_BUCKET, 'nanobanana-references')
})
