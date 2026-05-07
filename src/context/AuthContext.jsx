import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { getAuthClient } from '../lib/auth-client'

const AuthContext = createContext(null)

function shouldLoadAuth(pathname) {
  return (
    pathname === '/login' ||
    pathname.startsWith('/ai-step2') ||
    pathname === '/copy-editor' ||
    pathname === '/users' ||
    pathname === '/profile'
  )
}

export function AuthProvider({ children }) {
  const location = useLocation()
  const authEnabled = shouldLoadAuth(location.pathname)
  const authClient = useMemo(() => (authEnabled ? getAuthClient() : null), [authEnabled])
  const envError = authEnabled && !authClient
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(authEnabled && !envError)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const refreshInFlight = useRef(false)

  const loadUserAccess = useCallback(async (nextSession) => {
    if (!authClient || !nextSession?.user?.id) {
      setProfile(null)
      setRole(null)
      return { profile: null, role: null }
    }

    const userId = nextSession.user.id
    const [{ data: profileData, error: profileError }, { data: roleData, error: roleError }] =
      await Promise.all([
        authClient
          .from('profiles')
          .select('id, email, full_name, avatar_url, status, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle(),
        authClient.from('user_roles').select('role, assigned_at').eq('user_id', userId).maybeSingle(),
      ])

    if (profileError) throw profileError
    if (roleError) throw roleError

    if (!profileData || !roleData?.role) {
      setProfile(null)
      setRole(null)
      return { profile: null, role: null, accessRevoked: true }
    }

    const nextProfile = profileData
    const nextRole = roleData.role

    setProfile(nextProfile)
    setRole(nextRole)
    return { profile: nextProfile, role: nextRole, accessRevoked: false }
  }, [authClient])

  useEffect(() => {
    if (!authEnabled) {
      setSession(null)
      setProfile(null)
      setRole(null)
      setIsAuthLoading(false)
      return undefined
    }

    if (envError || !authClient) {
      setIsAuthLoading(false)
      return undefined
    }

    let cancelled = false
    setIsAuthLoading(true)

    authClient.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      const nextSession = data?.session ?? null
      const access = await loadUserAccess(nextSession)
      if (nextSession && access.accessRevoked) {
        await authClient.auth.signOut()
        setSession(null)
      } else {
        setSession(nextSession)
      }
      setIsAuthLoading(false)
    }).catch((err) => {
      console.warn('[AuthProvider] getSession failed:', err?.message)
      if (!cancelled) setIsAuthLoading(false)
    })

    const { data: sub } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setSession(null)
        setProfile(null)
        setRole(null)
        setIsAuthLoading(false)
        return
      }

      loadUserAccess(nextSession)
        .then(async (access) => {
          if (access.accessRevoked) {
            await authClient.auth.signOut()
            setSession(null)
          } else {
            setSession(nextSession)
          }
        })
        .catch((err) => {
          console.warn('[AuthProvider] load access failed:', err?.message)
          setSession(null)
          setProfile(null)
          setRole(null)
        })
        .finally(() => setIsAuthLoading(false))
    })

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [authClient, authEnabled, envError, loadUserAccess])

  const signInWithPassword = useCallback(async ({ email, password }) => {
    if (!authClient) throw new Error('Autenticacao nao configurada')
    const { data, error } = await authClient.auth.signInWithPassword({ email, password })
    if (error) throw error
    const nextSession = data?.session ?? null
    const access = await loadUserAccess(nextSession)
    if (access.accessRevoked) {
      await authClient.auth.signOut()
      setSession(null)
      setProfile(null)
      setRole(null)
      throw new Error('Seu acesso a este app foi removido. Fale com um administrador.')
    }
    if (access.profile?.status === 'disabled') {
      await authClient.auth.signOut()
      setSession(null)
      setProfile(null)
      setRole(null)
      throw new Error('Usuario desativado. Fale com um administrador.')
    }
    setSession(nextSession)
    return data
  }, [authClient, loadUserAccess])

  const signOut = useCallback(async () => {
    if (!authClient) {
      setSession(null)
      return
    }
    try {
      await authClient.auth.signOut()
    } finally {
      setSession(null)
      setProfile(null)
      setRole(null)
    }
  }, [authClient])

  const refreshSession = useCallback(async () => {
    if (!authClient) return null
    if (refreshInFlight.current) return session
    refreshInFlight.current = true
    try {
      const { data, error } = await authClient.auth.getSession()
      if (error) throw error
      const nextSession = data?.session ?? null
      const access = await loadUserAccess(nextSession)
      if (nextSession && access.accessRevoked) {
        await authClient.auth.signOut()
        setSession(null)
        setProfile(null)
        setRole(null)
        return null
      }
      setSession(nextSession)
      return nextSession
    } catch (err) {
      console.warn('[AuthProvider] reload session failed, signing out:', err?.message)
      setSession(null)
      setProfile(null)
      setRole(null)
      return null
    } finally {
      refreshInFlight.current = false
    }
  }, [authClient, session, loadUserAccess])

  const refreshProfile = useCallback(async () => {
    const access = await loadUserAccess(session)
    if (session && access.accessRevoked) {
      await authClient?.auth.signOut()
      setSession(null)
      setProfile(null)
      setRole(null)
    }
    return access
  }, [authClient, loadUserAccess, session])

  const hasRole = useCallback((allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    return Boolean(role && roles.includes(role))
  }, [role])

  const isAdmin = role === 'admin'
  const isOperator = role === 'operator'
  const isViewer = role === 'viewer'

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin,
      isOperator,
      isViewer,
      isAuthLoading,
      isAuthenticated: Boolean(session),
      envError,
      hasRole,
      signInWithPassword,
      signOut,
      refreshSession,
      refreshProfile,
    }),
    [
      session,
      profile,
      role,
      isAdmin,
      isOperator,
      isViewer,
      isAuthLoading,
      envError,
      hasRole,
      signInWithPassword,
      signOut,
      refreshSession,
      refreshProfile,
    ]
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
