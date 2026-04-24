import { assertEquals } from 'jsr:@std/assert@1'
import { isAuthError, requireAuth } from './auth.ts'

function setEnv() {
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co')
  Deno.env.set('SUPABASE_ANON_KEY', 'anon')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service')
}

Deno.test('requireAuth returns 401 when Authorization header is missing', async () => {
  setEnv()
  const req = new Request('https://example.com', { method: 'POST' })
  const result = await requireAuth(req)
  assertEquals(isAuthError(result), true)
  if (isAuthError(result)) {
    assertEquals(result.error.status, 401)
    const body = (await result.error.json()) as { code: string }
    assertEquals(body.code, 'UNAUTHORIZED')
  }
})

Deno.test('requireAuth returns 401 when header is not Bearer', async () => {
  setEnv()
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Basic abc' },
  })
  const result = await requireAuth(req)
  assertEquals(isAuthError(result), true)
})

Deno.test('requireAuth returns 500 CONFIG_ERROR when env vars missing', async () => {
  Deno.env.delete('SUPABASE_URL')
  Deno.env.delete('SUPABASE_ANON_KEY')
  Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY')
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { Authorization: 'Bearer faketoken' },
  })
  const result = await requireAuth(req)
  assertEquals(isAuthError(result), true)
  if (isAuthError(result)) {
    assertEquals(result.error.status, 500)
    const body = (await result.error.json()) as { code: string }
    assertEquals(body.code, 'CONFIG_ERROR')
  }
})
