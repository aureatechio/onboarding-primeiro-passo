import { assertEquals, assertFalse } from 'jsr:@std/assert'
import { requireAdminPassword } from '../_shared/admin-auth.ts'
import { VALID_CATEGORIES } from '../_shared/nanobanana/config.ts'

// ---------------------------------------------------------------------------
// Admin Auth Guard Tests
// ---------------------------------------------------------------------------

Deno.test('requireAdminPassword rejects request without x-admin-password header', () => {
  const req = new Request('https://example.com/test', {
    method: 'POST',
    headers: {},
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, false)
  assertEquals(result.response.status, 401)
})

Deno.test('requireAdminPassword rejects request with wrong password', () => {
  const req = new Request('https://example.com/test', {
    method: 'POST',
    headers: { 'x-admin-password': 'wrongpassword' },
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, false)
  assertEquals(result.response.status, 401)
})

Deno.test('requireAdminPassword accepts request with correct password', () => {
  const req = new Request('https://example.com/test', {
    method: 'POST',
    headers: { 'x-admin-password': 'megazord' },
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, true)
})

Deno.test('requireAdminPassword response body on rejection contains code UNAUTHORIZED', async () => {
  const req = new Request('https://example.com/test', {
    method: 'POST',
    headers: { 'x-admin-password': 'invalid' },
  })

  const result = requireAdminPassword(req)

  assertEquals(result.authorized, false)
  const body = await result.response.json()
  assertEquals(body.code, 'UNAUTHORIZED')
})

// ---------------------------------------------------------------------------
// Category Validation Tests
// ---------------------------------------------------------------------------

Deno.test('moderna is a valid category', () => {
  assertEquals(VALID_CATEGORIES.includes('moderna'), true)
})

Deno.test('clean is a valid category', () => {
  assertEquals(VALID_CATEGORIES.includes('clean'), true)
})

Deno.test('retail is a valid category', () => {
  assertEquals(VALID_CATEGORIES.includes('retail'), true)
})

Deno.test('invalid is NOT a valid category', () => {
  assertFalse(VALID_CATEGORIES.includes('invalid'))
})

Deno.test('empty string is NOT a valid category', () => {
  assertFalse(VALID_CATEGORIES.includes(''))
})

Deno.test('VALID_CATEGORIES has exactly 3 elements', () => {
  assertEquals(VALID_CATEGORIES.length, 3)
})
