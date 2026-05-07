import { getAuthClient } from './auth-client'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function getAccessToken() {
  const authClient = getAuthClient()
  if (!authClient) return null
  const { data } = await authClient.auth.getSession()
  return data?.session?.access_token ?? null
}

function buildHeaders(token, isMultipart) {
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: ANON_KEY,
  }
  if (!isMultipart) headers['Content-Type'] = 'application/json'
  return headers
}

async function doFetch(path, { method = 'POST', body, isMultipart = false, token }) {
  const url = `${SUPABASE_URL}/functions/v1/${path}`
  const init = { method, headers: buildHeaders(token, isMultipart) }
  if (body !== undefined) {
    init.body = isMultipart ? body : JSON.stringify(body)
  }
  return fetch(url, init)
}

export async function adminFetch(path, { method = 'POST', body, isMultipart = false } = {}) {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error('Supabase env vars ausentes (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  }

  let token = await getAccessToken()
  if (!token) {
    throw new AdminEdgeError('Sessao expirada. Faca login novamente.', 'NO_SESSION', 401)
  }

  let response = await doFetch(path, { method, body, isMultipart, token })

  if (response.status === 401) {
    const retryToken = await getAccessToken()
    if (retryToken && retryToken !== token) {
      token = retryToken
      response = await doFetch(path, { method, body, isMultipart, token })
    }
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

export class AdminEdgeError extends Error {
  constructor(message, code, status, payload) {
    super(message)
    this.name = 'AdminEdgeError'
    this.code = code
    this.status = status
    this.payload = payload
  }
}
