import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let authClient = null

export function hasAuthEnv() {
  return Boolean(url && anonKey)
}

export function getAuthClient() {
  if (!hasAuthEnv()) return null

  if (!authClient) {
    authClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'aurea.auth',
      },
    })
  }

  return authClient
}
