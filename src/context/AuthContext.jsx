import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authClient, hasAuthEnv } from '../lib/auth-client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const envError = !hasAuthEnv()
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(!envError)
  const refreshInFlight = useRef(false)

  useEffect(() => {
    if (envError || !authClient) return

    let cancelled = false

    authClient.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data?.session ?? null)
      setIsAuthLoading(false)
    }).catch((err) => {
      console.warn('[AuthProvider] getSession failed:', err?.message)
      if (!cancelled) setIsAuthLoading(false)
    })

    const { data: sub } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setIsAuthLoading(false)
    })

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [envError])

  const signInWithPassword = useCallback(async ({ email, password }) => {
    if (!authClient) throw new Error('Autenticacao nao configurada')
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })
    if (error) throw error
    setSession(data?.session ?? null)
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (!authClient) {
      setSession(null)
      return
    }
    try {
      await authClient.auth.signOut()
    } finally {
      setSession(null)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!authClient) return null
    if (refreshInFlight.current) return session
    refreshInFlight.current = true
    try {
      const { data, error } = await authClient.auth.refreshSession()
      if (error) throw error
      setSession(data?.session ?? null)
      return data?.session ?? null
    } catch (err) {
      console.warn('[AuthProvider] refreshSession failed, signing out:', err?.message)
      setSession(null)
      return null
    } finally {
      refreshInFlight.current = false
    }
  }, [session])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthLoading,
      isAuthenticated: Boolean(session),
      envError,
      signInWithPassword,
      signOut,
      refreshSession,
    }),
    [session, isAuthLoading, envError, signInWithPassword, signOut, refreshSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return ctx
}
