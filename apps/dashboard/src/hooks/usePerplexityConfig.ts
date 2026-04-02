import { useState, useCallback } from 'react'

export interface PerplexityConfig {
  model: string
  api_base_url: string
  timeout_ms: number
  temperature: number
  top_p: number
  search_mode: string
  search_recency_filter: string
  system_prompt: string
  user_prompt_template: string
  insights_count: number
  prompt_version: string
  strategy_version: string
  contract_version: string
  api_key_hint: string | null
  api_key_source: 'database' | 'env_var' | 'none'
  updated_at: string
}

export type PerplexityConfigUpdate = Partial<PerplexityConfig> & {
  api_key?: string
}

export interface UsePerplexityConfigReturn {
  config: PerplexityConfig | null
  loading: boolean
  saving: boolean
  error: string | null
  success: string | null
  fetchConfig: () => Promise<boolean>
  updateConfig: (
    data: PerplexityConfigUpdate
  ) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function usePerplexityConfig(): UsePerplexityConfigReturn {
  const [config, setConfig] = useState<PerplexityConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reset = useCallback(() => {
    setConfig(null)
    setError(null)
    setSuccess(null)
  }, [])

  const fetchConfig = useCallback(
    async (): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/get-perplexity-config`,
          {
            method: 'GET',
          }
        )

        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'Erro ao buscar configurações')
          setLoading(false)
          return false
        }

        setConfig(data.config as PerplexityConfig)
        setLoading(false)
        return true
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro de conexão com o servidor'
        )
        setLoading(false)
        return false
      }
    },
    []
  )

  const updateConfig = useCallback(
    async (
      data: PerplexityConfigUpdate
    ): Promise<boolean> => {
      setSaving(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/update-perplexity-config`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          }
        )

        const result = await response.json()

        if (!response.ok) {
          setError(result.error ?? 'Erro ao atualizar configurações')
          setSaving(false)
          return false
        }

        setConfig(result.config as PerplexityConfig)
        setSuccess('Configurações salvas com sucesso')
        setSaving(false)
        return true
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro de conexão com o servidor'
        )
        setSaving(false)
        return false
      }
    },
    []
  )

  return { config, loading, saving, error, success, fetchConfig, updateConfig, reset }
}
