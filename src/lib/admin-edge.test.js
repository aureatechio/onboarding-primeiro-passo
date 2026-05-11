/* global Deno */
import { assertEquals, assertInstanceOf, assertRejects } from 'jsr:@std/assert'
import { AdminEdgeError, createAdminEdgeClient } from './admin-edge.js'

const env = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function createAuthClient({
  token = 'old-token',
  refreshedToken = 'new-token',
  refreshError = null,
  refreshDelayMs = 0,
  counters,
} = {}) {
  return {
    auth: {
      async getSession() {
        counters.getSession += 1
        return { data: { session: token ? { access_token: token } : null } }
      },
      async refreshSession() {
        counters.refreshSession += 1
        if (refreshDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, refreshDelayMs))
        }
        return {
          data: { session: refreshedToken ? { access_token: refreshedToken } : null },
          error: refreshError,
        }
      },
    },
  }
}

Deno.test('adminFetch succeeds without refreshing when the first request is OK', async () => {
  const counters = { getSession: 0, refreshSession: 0 }
  const requests = []
  const { adminFetch } = createAdminEdgeClient({
    authClient: createAuthClient({ counters }),
    env,
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return jsonResponse(200, { success: true })
    },
  })

  const result = await adminFetch('list-users', { method: 'GET' })

  assertEquals(result, { success: true })
  assertEquals(counters.getSession, 1)
  assertEquals(counters.refreshSession, 0)
  assertEquals(requests.length, 1)
  assertEquals(requests[0].init.headers.Authorization, 'Bearer old-token')
})

Deno.test('adminFetch refreshes once and retries once after a 401', async () => {
  const counters = { getSession: 0, refreshSession: 0 }
  const requests = []
  const { adminFetch } = createAdminEdgeClient({
    authClient: createAuthClient({ counters }),
    env,
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return requests.length === 1
        ? jsonResponse(401, { code: 'JWT_EXPIRED', message: 'Expired' })
        : jsonResponse(200, { success: true })
    },
  })

  const result = await adminFetch('set-user-status', {
    body: { user_id: 'u1', status: 'active' },
  })

  assertEquals(result, { success: true })
  assertEquals(counters.refreshSession, 1)
  assertEquals(requests.length, 2)
  assertEquals(requests[0].init.headers.Authorization, 'Bearer old-token')
  assertEquals(requests[1].init.headers.Authorization, 'Bearer new-token')
})

Deno.test('adminFetch shares one refreshSession call across concurrent 401 responses', async () => {
  const counters = { getSession: 0, refreshSession: 0 }
  const requests = []
  const { adminFetch } = createAdminEdgeClient({
    authClient: createAuthClient({ counters, refreshDelayMs: 20 }),
    env,
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return init.headers.Authorization === 'Bearer old-token'
        ? jsonResponse(401, { code: 'JWT_EXPIRED', message: 'Expired' })
        : jsonResponse(200, { success: true })
    },
  })

  const results = await Promise.all([
    adminFetch('update-user-role', { body: { user_id: 'u1', role: 'admin' } }),
    adminFetch('set-user-status', { body: { user_id: 'u1', status: 'active' } }),
    adminFetch('delete-user', { body: { user_id: 'u2' } }),
  ])

  assertEquals(results, [{ success: true }, { success: true }, { success: true }])
  assertEquals(counters.refreshSession, 1)
  assertEquals(requests.filter((request) => request.init.headers.Authorization === 'Bearer old-token').length, 3)
  assertEquals(requests.filter((request) => request.init.headers.Authorization === 'Bearer new-token').length, 3)
})

Deno.test('adminFetch throws a session error when refresh fails after a 401', async () => {
  const counters = { getSession: 0, refreshSession: 0 }
  const { adminFetch } = createAdminEdgeClient({
    authClient: createAuthClient({
      counters,
      refreshedToken: null,
      refreshError: new Error('rate limited'),
    }),
    env,
    fetchImpl: async () => jsonResponse(401, { code: 'JWT_EXPIRED', message: 'Expired' }),
  })

  const error = await assertRejects(
    () => adminFetch('list-users', { method: 'GET' }),
    AdminEdgeError,
    'Sessao expirada',
  )

  assertEquals(error.code, 'NO_SESSION')
  assertEquals(error.status, 401)
  assertEquals(counters.refreshSession, 1)
})

Deno.test('adminFetch preserves code, status, and payload for final non-OK responses', async () => {
  const counters = { getSession: 0, refreshSession: 0 }
  const payload = { code: 'DENIED', message: 'Sem permissao.', details: { role: 'viewer' } }
  const { adminFetch } = createAdminEdgeClient({
    authClient: createAuthClient({ counters }),
    env,
    fetchImpl: async () => jsonResponse(403, payload),
  })

  const error = await assertRejects(
    () => adminFetch('set-user-status', { body: { user_id: 'u1', status: 'active' } }),
    AdminEdgeError,
    'Sem permissao.',
  )

  assertInstanceOf(error, AdminEdgeError)
  assertEquals(error.code, 'DENIED')
  assertEquals(error.status, 403)
  assertEquals(error.payload, payload)
  assertEquals(counters.refreshSession, 0)
})
