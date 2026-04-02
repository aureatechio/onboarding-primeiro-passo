import { useState, useCallback } from 'react'

export type DevCredentialRow = {
  env_key: string
  env_value: string
  created_at: string
  updated_at: string
}

export interface UseDevCredentialsReturn {
  credentials: DevCredentialRow[]
  loading: boolean
  saving: boolean
  error: string | null
  success: string | null
  fetchCredentials: (password: string) => Promise<boolean>
  upsertCredentials: (
    password: string,
    entries: Array<{ env_key: string; env_value: string }>,
    auditSource?: 'form' | 'import'
  ) => Promise<boolean>
  deleteCredential: (password: string, envKey: string) => Promise<boolean>
  logExport: (
    password: string,
    scope: 'all' | 'selected',
    keyCount: number
  ) => Promise<void>
  resetMessages: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function useDevCredentials(): UseDevCredentialsReturn {
  const [credentials, setCredentials] = useState<DevCredentialRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const resetMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  const fetchCredentials = useCallback(async (password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/dev-credentials`, {
        method: 'GET',
        headers: { 'x-admin-password': password },
      })
      const data = (await response.json()) as Record<string, unknown>
      if (!response.ok) {
        setError(
          data.code === 'UNAUTHORIZED'
            ? 'Senha incorreta'
            : (data.error as string) ?? 'Erro ao carregar credenciais'
        )
        setLoading(false)
        return false
      }
      const list = data.credentials as DevCredentialRow[] | undefined
      setCredentials(Array.isArray(list) ? list : [])
      setLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão')
      setLoading(false)
      return false
    }
  }, [])

  const upsertCredentials = useCallback(
    async (
      password: string,
      entries: Array<{ env_key: string; env_value: string }>,
      auditSource: 'form' | 'import' = 'form'
    ): Promise<boolean> => {
      setSaving(true)
      setError(null)
      setSuccess(null)
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/dev-credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({ entries, auditSource }),
        })
        const data = (await response.json()) as Record<string, unknown>
        if (!response.ok) {
          setError(
            data.code === 'UNAUTHORIZED'
              ? 'Senha incorreta'
              : (data.error as string) ?? 'Erro ao salvar'
          )
          setSaving(false)
          return false
        }
        setSaving(false)
        await fetchCredentials(password)
        setSuccess('Credenciais salvas com sucesso')
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de conexão')
        setSaving(false)
        return false
      }
    },
    [fetchCredentials]
  )

  const deleteCredential = useCallback(
    async (password: string, envKey: string): Promise<boolean> => {
      setSaving(true)
      setError(null)
      setSuccess(null)
      try {
        const url = new URL(`${SUPABASE_URL}/functions/v1/dev-credentials`)
        url.searchParams.set('env_key', envKey)
        const response = await fetch(url.toString(), {
          method: 'DELETE',
          headers: { 'x-admin-password': password },
        })
        const data = (await response.json()) as Record<string, unknown>
        if (!response.ok) {
          setError(
            data.code === 'UNAUTHORIZED'
              ? 'Senha incorreta'
              : (data.error as string) ?? 'Erro ao excluir'
          )
          setSaving(false)
          return false
        }
        setSaving(false)
        await fetchCredentials(password)
        setSuccess(`Chave ${envKey} removida`)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro de conexão')
        setSaving(false)
        return false
      }
    },
    [fetchCredentials]
  )

  const logExport = useCallback(async (password: string, scope: 'all' | 'selected', keyCount: number) => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/dev-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ logExport: { scope, keyCount } }),
      })
    } catch {
      /* auditoria best-effort */
    }
  }, [])

  return {
    credentials,
    loading,
    saving,
    error,
    success,
    fetchCredentials,
    upsertCredentials,
    deleteCredential,
    logExport,
    resetMessages,
  }
}
