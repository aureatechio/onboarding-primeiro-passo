import { useState, useCallback } from 'react'

export interface NanoBananaConfig {
  gemini_model_name: string
  gemini_api_base_url: string
  max_retries: number
  worker_batch_size: number
  url_expiry_seconds: number
  max_image_download_bytes: number
  global_rules: string
  global_rules_version: string
  prompt_version: string
  direction_moderna: string
  direction_clean: string
  direction_retail: string
  direction_moderna_image_path: string | null
  direction_clean_image_path: string | null
  direction_retail_image_path: string | null
  direction_moderna_image_url?: string | null
  direction_clean_image_url?: string | null
  direction_retail_image_url?: string | null
  format_1_1: string
  format_4_5: string
  format_16_9: string
  format_9_16: string
  updated_at: string
}

export interface UseNanoBananaConfigReturn {
  config: NanoBananaConfig | null
  loading: boolean
  saving: boolean
  error: string | null
  success: string | null
  fetchConfig: () => Promise<boolean>
  updateConfig: (
    data: Partial<NanoBananaConfig> | FormData
  ) => Promise<boolean>
  readDirectionFromImage: (
    category: 'moderna' | 'clean' | 'retail',
    file: File
  ) => Promise<string | null>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export function useNanoBananaConfig(): UseNanoBananaConfigReturn {
  const [config, setConfig] = useState<NanoBananaConfig | null>(null)
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
          `${SUPABASE_URL}/functions/v1/get-nanobanana-config`,
          {
            method: 'GET',
          }
        )

        const data = await response.json()

        if (!response.ok) {
          setError(
            data.error ?? 'Erro ao buscar configurações'
          )
          setLoading(false)
          return false
        }

        setConfig(data.config as NanoBananaConfig)
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
      data: Partial<NanoBananaConfig> | FormData
    ): Promise<boolean> => {
      setSaving(true)
      setError(null)
      setSuccess(null)

      try {
        const isFormData = data instanceof FormData
        const response = await fetch(`${SUPABASE_URL}/functions/v1/update-nanobanana-config`, {
          method: 'PATCH',
          headers: isFormData
            ? {}
            : {
              'Content-Type': 'application/json',
            },
          body: isFormData ? data : JSON.stringify(data),
        })

        const result = await response.json()

        if (!response.ok) {
          setError(result.error ?? 'Erro ao atualizar configurações')
          setSaving(false)
          return false
        }

        setConfig(result.config as NanoBananaConfig)
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

  const readDirectionFromImage = useCallback(
    async (
      category: 'moderna' | 'clean' | 'retail',
      file: File
    ): Promise<string | null> => {
      setError(null)
      setSuccess(null)

      try {
        const formData = new FormData()
        formData.append('category', category)
        formData.append('image', file)

        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/read-nanobanana-reference`,
          {
            method: 'POST',
            body: formData,
          }
        )

        const result = await response.json()
        if (!response.ok) {
          setError(result.error ?? 'Erro ao ler imagem de referência')
          return null
        }

        const text = typeof result.direction_text === 'string' ? result.direction_text.trim() : ''
        if (!text) {
          setError('A leitura da imagem não retornou texto')
          return null
        }

        return text
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro de conexão ao ler imagem'
        )
        return null
      }
    },
    []
  )

  return {
    config,
    loading,
    saving,
    error,
    success,
    fetchConfig,
    updateConfig,
    readDirectionFromImage,
    reset,
  }
}
