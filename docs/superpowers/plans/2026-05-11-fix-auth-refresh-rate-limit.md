# Fix Auth Refresh Rate Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the onboarding dashboard from creating concurrent manual Supabase Auth refresh calls that can trigger `429 Too Many Requests` on `/auth/v1/token`.

**Architecture:** Keep a single Supabase browser client in `src/lib/auth-client.js` and make `src/lib/admin-edge.js` responsible only for protected Edge Function calls. When an Edge Function returns `401`, `adminFetch` will perform at most one shared refresh operation across concurrent callers, retry each original request once, and surface `NO_SESSION` when refresh fails.

**Tech Stack:** React 19, Vite, `@supabase/supabase-js`, Deno tests for browser-adjacent utility modules, npm build/lint gates.

---

## File Structure

- Modify: `src/lib/admin-edge.js`
  - Owns `adminFetch`, token lookup, protected Edge Function fetches, and retry-after-refresh behavior.
  - Add module-scoped `refreshPromise` so concurrent `401` responses share one `auth.refreshSession()` call.
- Create: `src/lib/admin-edge.test.js`
  - Deno unit tests using dependency injection hooks from `admin-edge.js`.
  - Covers no-refresh success, single retry after `401`, concurrent refresh dedupe, failed refresh, and non-OK final response.
- Modify: `package.json`
  - Add a small `test` script that runs existing Deno tests plus the new `admin-edge` test.

## Task 1: Add Test Seams To `admin-edge`

**Files:**
- Modify: `src/lib/admin-edge.js`

- [ ] **Step 1: Replace direct imports/constants with default dependency holders**

At the top of `src/lib/admin-edge.js`, replace the current import/constants block with:

```js
import { authClient } from './auth-client'

const runtimeConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}

let authDependency = authClient
let fetchDependency = (...args) => fetch(...args)
let refreshPromise = null
```

- [ ] **Step 2: Update existing helpers to read from dependency holders**

Update `getAccessToken`, `buildHeaders`, `doFetch`, and the env check inside `adminFetch` to use `authDependency`, `fetchDependency`, and `runtimeConfig`:

```js
async function getAccessToken() {
  if (!authDependency) return null
  const { data } = await authDependency.auth.getSession()
  return data?.session?.access_token ?? null
}

function buildHeaders(token, isMultipart) {
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: runtimeConfig.anonKey,
  }
  if (!isMultipart) headers['Content-Type'] = 'application/json'
  return headers
}

async function doFetch(path, { method = 'POST', body, isMultipart = false, token }) {
  const url = `${runtimeConfig.supabaseUrl}/functions/v1/${path}`
  const init = { method, headers: buildHeaders(token, isMultipart) }
  if (body !== undefined) {
    init.body = isMultipart ? body : JSON.stringify(body)
  }
  return fetchDependency(url, init)
}
```

Inside `adminFetch`, use:

```js
if (!runtimeConfig.supabaseUrl || !runtimeConfig.anonKey) {
  throw new Error('Supabase env vars ausentes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
}
```

- [ ] **Step 3: Add test-only dependency helpers at the bottom**

Append these exports after `AdminEdgeError`:

```js
export function __setAdminEdgeTestDependencies({ authClient: nextAuthClient, fetch: nextFetch, supabaseUrl, anonKey } = {}) {
  authDependency = nextAuthClient === undefined ? authClient : nextAuthClient
  fetchDependency = nextFetch || ((...args) => fetch(...args))
  runtimeConfig.supabaseUrl = supabaseUrl === undefined ? import.meta.env.VITE_SUPABASE_URL : supabaseUrl
  runtimeConfig.anonKey = anonKey === undefined ? import.meta.env.VITE_SUPABASE_ANON_KEY : anonKey
  refreshPromise = null
}

export function __resetAdminEdgeTestDependencies() {
  authDependency = authClient
  fetchDependency = (...args) => fetch(...args)
  runtimeConfig.supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  runtimeConfig.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  refreshPromise = null
}
```

- [ ] **Step 4: Run lint to catch syntax issues**

Run:

```bash
npm run lint
```

Expected: exit `0`, or existing lint warnings only if the repo already has warnings.

## Task 2: Write Failing Tests For Refresh Behavior

**Files:**
- Create: `src/lib/admin-edge.test.js`

- [ ] **Step 1: Create the Deno test file**

Create `src/lib/admin-edge.test.js` with:

```js
/* global Deno */
import { assertEquals, assertRejects } from 'jsr:@std/assert'
import {
  AdminEdgeError,
  __resetAdminEdgeTestDependencies,
  __setAdminEdgeTestDependencies,
  adminFetch,
} from './admin-edge.js'

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function createAuthClient({ sessionToken = 'token-1', refreshedToken = 'token-2', refreshError = null } = {}) {
  const calls = {
    getSession: 0,
    refreshSession: 0,
  }

  return {
    calls,
    client: {
      auth: {
        async getSession() {
          calls.getSession += 1
          return { data: { session: sessionToken ? { access_token: sessionToken } : null } }
        },
        async refreshSession() {
          calls.refreshSession += 1
          if (refreshError) return { data: { session: null }, error: refreshError }
          return { data: { session: refreshedToken ? { access_token: refreshedToken } : null }, error: null }
        },
      },
    },
  }
}

Deno.test('adminFetch sends the current access token without refreshing on success', async () => {
  const auth = createAuthClient()
  const requests = []

  __setAdminEdgeTestDependencies({
    authClient: auth.client,
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'anon-key',
    fetch: async (url, init) => {
      requests.push({ url, init })
      return jsonResponse(200, { ok: true })
    },
  })

  try {
    const result = await adminFetch('list-users', { body: { page: 1 } })

    assertEquals(result, { ok: true })
    assertEquals(auth.calls.getSession, 1)
    assertEquals(auth.calls.refreshSession, 0)
    assertEquals(requests.length, 1)
    assertEquals(requests[0].url, 'https://example.supabase.co/functions/v1/list-users')
    assertEquals(requests[0].init.headers.Authorization, 'Bearer token-1')
    assertEquals(requests[0].init.headers.apikey, 'anon-key')
    assertEquals(requests[0].init.body, '{"page":1}')
  } finally {
    __resetAdminEdgeTestDependencies()
  }
})

Deno.test('adminFetch refreshes once and retries once after a 401', async () => {
  const auth = createAuthClient()
  const authorizations = []

  __setAdminEdgeTestDependencies({
    authClient: auth.client,
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'anon-key',
    fetch: async (_url, init) => {
      authorizations.push(init.headers.Authorization)
      return authorizations.length === 1
        ? jsonResponse(401, { code: 'JWT_EXPIRED', message: 'expired' })
        : jsonResponse(200, { ok: true })
    },
  })

  try {
    const result = await adminFetch('update-user-role')

    assertEquals(result, { ok: true })
    assertEquals(auth.calls.refreshSession, 1)
    assertEquals(authorizations, ['Bearer token-1', 'Bearer token-2'])
  } finally {
    __resetAdminEdgeTestDependencies()
  }
})

Deno.test('adminFetch shares one refresh across concurrent 401 responses', async () => {
  const auth = createAuthClient()
  const authorizations = []

  __setAdminEdgeTestDependencies({
    authClient: auth.client,
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'anon-key',
    fetch: async (_url, init) => {
      authorizations.push(init.headers.Authorization)
      if (init.headers.Authorization === 'Bearer token-1') {
        return jsonResponse(401, { code: 'JWT_EXPIRED', message: 'expired' })
      }
      return jsonResponse(200, { ok: true })
    },
  })

  try {
    const results = await Promise.all([
      adminFetch('record-dashboard-activity'),
      adminFetch('record-dashboard-activity'),
      adminFetch('record-dashboard-activity'),
    ])

    assertEquals(results, [{ ok: true }, { ok: true }, { ok: true }])
    assertEquals(auth.calls.refreshSession, 1)
    assertEquals(authorizations.filter((value) => value === 'Bearer token-1').length, 3)
    assertEquals(authorizations.filter((value) => value === 'Bearer token-2').length, 3)
  } finally {
    __resetAdminEdgeTestDependencies()
  }
})

Deno.test('adminFetch returns NO_SESSION when refresh after 401 fails', async () => {
  const auth = createAuthClient({ refreshError: new Error('rate limited') })

  __setAdminEdgeTestDependencies({
    authClient: auth.client,
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'anon-key',
    fetch: async () => jsonResponse(401, { code: 'JWT_EXPIRED', message: 'expired' }),
  })

  try {
    const error = await assertRejects(
      () => adminFetch('list-users'),
      AdminEdgeError,
      'Sessao expirada. Faca login novamente.'
    )

    assertEquals(error.code, 'NO_SESSION')
    assertEquals(error.status, 401)
    assertEquals(auth.calls.refreshSession, 1)
  } finally {
    __resetAdminEdgeTestDependencies()
  }
})

Deno.test('adminFetch preserves the final non-OK response after a retry', async () => {
  const auth = createAuthClient()
  let requestCount = 0

  __setAdminEdgeTestDependencies({
    authClient: auth.client,
    supabaseUrl: 'https://example.supabase.co',
    anonKey: 'anon-key',
    fetch: async () => {
      requestCount += 1
      return requestCount === 1
        ? jsonResponse(401, { code: 'JWT_EXPIRED', message: 'expired' })
        : jsonResponse(403, { code: 'FORBIDDEN', message: 'Sem permissao.' })
    },
  })

  try {
    const error = await assertRejects(
      () => adminFetch('update-user-role'),
      AdminEdgeError,
      'Sem permissao.'
    )

    assertEquals(error.code, 'FORBIDDEN')
    assertEquals(error.status, 403)
    assertEquals(auth.calls.refreshSession, 1)
    assertEquals(requestCount, 2)
  } finally {
    __resetAdminEdgeTestDependencies()
  }
})
```

- [ ] **Step 2: Run the new test and confirm it fails before implementation**

Run:

```bash
deno test src/lib/admin-edge.test.js --allow-env --allow-net
```

Expected before Task 3: at least the concurrent test fails because current `adminFetch` does not share one refresh promise.

## Task 3: Implement Shared Refresh In `admin-edge`

**Files:**
- Modify: `src/lib/admin-edge.js`

- [ ] **Step 1: Replace `refreshToken` with a shared refresh helper**

Replace the current `refreshToken` function with:

```js
async function refreshAccessToken() {
  if (!authDependency) return null

  if (!refreshPromise) {
    refreshPromise = authDependency.auth
      .refreshSession()
      .then(({ data, error }) => {
        if (error) return null
        return data?.session?.access_token ?? null
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}
```

- [ ] **Step 2: Make `adminFetch` retry once after a successful shared refresh**

Replace the `if (response.status === 401)` block with:

```js
if (response.status === 401) {
  const refreshedToken = await refreshAccessToken()
  if (!refreshedToken) {
    throw new AdminEdgeError('Sessao expirada. Faca login novamente.', 'NO_SESSION', 401)
  }
  response = await doFetch(path, { method, body, isMultipart, token: refreshedToken })
}
```

- [ ] **Step 3: Run the focused test**

Run:

```bash
deno test src/lib/admin-edge.test.js --allow-env --allow-net
```

Expected: all `admin-edge` tests pass.

## Task 4: Add A Repo Test Script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `test` under `scripts`**

Add this script after `lint`:

```json
"test": "deno test src/lib/admin-edge.test.js src/lib/ai-step2-validation.test.ts src/pages/AiStep2Monitor/utils.test.js --allow-env --allow-net",
```

The scripts block should include:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "test": "deno test src/lib/admin-edge.test.js src/lib/ai-step2-validation.test.ts src/pages/AiStep2Monitor/utils.test.js --allow-env --allow-net",
  "preview": "vite preview",
  "gate:lockfiles": "bash scripts/check-lockfiles.sh",
  "gate:deps": "npm ci",
  "gate:prepush": "npm run gate:lockfiles && npm run gate:deps && npm run lint && npm run build",
  "prepare": "husky"
}
```

- [ ] **Step 2: Run the repo test script**

Run:

```bash
npm run test
```

Expected: all Deno tests pass.

## Task 5: Verify Browser And Supabase Evidence

**Files:**
- No source edits.

- [ ] **Step 1: Run static verification**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit `0`.

- [ ] **Step 2: Start local app**

Run:

```bash
npm run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 3: Exercise login manually with browser tooling**

Open `/login` locally. With a valid test account, submit once and inspect Network for `/auth/v1/token`.

Expected:
- One `grant_type=password` request for the login attempt.
- No burst of concurrent `grant_type=refresh_token` requests immediately after login.
- If protected admin Edge Function calls receive `401`, concurrent calls should produce at most one refresh token request followed by individual retries.

- [ ] **Step 4: Re-check Supabase Auth logs after deploy**

Use the Supabase MCP:

```text
get_project_url
get_logs(service: "auth")
get_logs(service: "api")
```

Expected:
- `get_project_url` returns `https://awqtzoefutnfmnbomujt.supabase.co`.
- Recent logs no longer show rapid bursts of `POST /token` with `grant_type=refresh_token` from `https://acelerai-primeiro-passo.vercel.app`.

## Task 6: Linear Update

**Files:**
- No source edits.

- [ ] **Step 1: Comment on ONB-26**

Add a Linear comment with this content:

```markdown
Correção aplicada para reduzir 429 no Supabase Auth:

- `adminFetch` agora compartilha uma única Promise de refresh token entre chamadas concorrentes.
- Cada chamada original faz no máximo um retry após `401`.
- Falha no refresh retorna `NO_SESSION`, evitando loop de retries.
- Testes cobrem sucesso sem refresh, retry pós-401, dedupe concorrente, falha de refresh e preservação de erro final.
- Validações executadas: `npm run test`, `npm run lint`, `npm run build`.

MCP Supabase confirmado no projeto correto: `https://awqtzoefutnfmnbomujt.supabase.co`.
```

- [ ] **Step 2: Comment on ONB-27**

Add a Linear comment with this content:

```markdown
Sub-issue ligada ao rate limit de refresh token:

A mitigação no app `acelerai-primeiro-passo` foi focada no ponto local que ainda executava refresh manual (`src/lib/admin-edge.js`). O SDK mantém `autoRefreshToken: true`; o refresh manual agora fica deduplicado e limitado a um retry por request quando uma Edge Function protegida retorna `401`.
```

## Self-Review

- Spec coverage: ONB-26 login 429, ONB-27 refresh token burst, MCP project confirmation, local code root cause, tests, validation, and Linear follow-up are covered.
- Placeholder scan: no `TBD`, no generic "handle edge cases", no unspecified tests.
- Type consistency: the planned helpers are `__setAdminEdgeTestDependencies`, `__resetAdminEdgeTestDependencies`, `refreshAccessToken`, and the tests import the same names.
