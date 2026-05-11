import { authClient as defaultAuthClient } from './auth-client'

const defaultEnv = import.meta.env ?? {}

export class AdminEdgeError extends Error {
  constructor(message, code, status, payload) {
    super(message)
    this.name = 'AdminEdgeError'
    this.code = code
    this.status = status
    this.payload = payload
  }
}

function sessionExpiredError() {
  return new AdminEdgeError('Sessao expirada. Faca login novamente.', 'NO_SESSION', 401)
}

function buildHeaders(token, isMultipart, anonKey) {
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
  }
  if (!isMultipart) headers['Content-Type'] = 'application/json'
  return headers
}

export function createAdminEdgeClient({
  authClient = defaultAuthClient,
  env = defaultEnv,
  fetchImpl = fetch,
} = {}) {
  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  let refreshInFlightPromise = null

  async function getAccessToken() {
    if (!authClient) return null
    const { data } = await authClient.auth.getSession()
    return data?.session?.access_token ?? null
  }

  async function refreshToken() {
    if (!authClient) return null
    if (!refreshInFlightPromise) {
      refreshInFlightPromise = authClient.auth
        .refreshSession()
        .then(({ data, error }) => {
          if (error) return null
          return data?.session?.access_token ?? null
        })
        .catch(() => null)
        .finally(() => {
          refreshInFlightPromise = null
        })
    }
    return refreshInFlightPromise
  }

  async function doFetch(path, { method = 'POST', body, isMultipart = false, token }) {
    const url = `${supabaseUrl}/functions/v1/${path}`
    const init = { method, headers: buildHeaders(token, isMultipart, anonKey) }
    if (body !== undefined) {
      init.body = isMultipart ? body : JSON.stringify(body)
    }
    return fetchImpl(url, init)
  }

  async function adminFetch(path, { method = 'POST', body, isMultipart = false } = {}) {
    if (!supabaseUrl || !anonKey) {
      throw new Error('Supabase env vars ausentes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
    }

    const token = await getAccessToken()
    if (!token) {
      throw sessionExpiredError()
    }

    let response = await doFetch(path, { method, body, isMultipart, token })

    if (response.status === 401) {
      const refreshed = await refreshToken()
      if (!refreshed) {
        throw sessionExpiredError()
      }
      response = await doFetch(path, { method, body, isMultipart, token: refreshed })
    }

    let payload = null
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
    }

    if (!response.ok) {
      const code = payload?.code || `HTTP_${response.status}`
      const message = payload?.message || `Erro ${response.status} em ${path}.`
      throw new AdminEdgeError(message, code, response.status, payload)
    }

    return payload
  }

  return { adminFetch }
}

export const { adminFetch } = createAdminEdgeClient()
