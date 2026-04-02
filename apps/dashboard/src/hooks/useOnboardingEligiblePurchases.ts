import { useCallback, useState } from 'react'

export interface OnboardingEligiblePurchase {
  compra_id: string
  clientName: string
  celebName: string
  label: string
}

interface ApiSuccess {
  success: true
  data: OnboardingEligiblePurchase[]
}

interface ApiError {
  success: false
  code?: string
  message?: string
}

interface UseOnboardingEligiblePurchasesReturn {
  options: OnboardingEligiblePurchase[]
  loading: boolean
  error: string | null
  fetchOptions: () => Promise<void>
}

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

export function useOnboardingEligiblePurchases(): UseOnboardingEligiblePurchasesReturn {
  const [options, setOptions] = useState<OnboardingEligiblePurchase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (!SUPABASE_URL) {
      setError('VITE_SUPABASE_URL nao configurada no dashboard.')
      setLoading(false)
      return
    }

    if (!SUPABASE_KEY) {
      setError('VITE_SUPABASE_SERVICE_ROLE_KEY nao configurada no dashboard.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/list-onboarding-eligible-purchases?limit=150`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      )

      const result = (await response.json()) as ApiSuccess | ApiError

      if (!response.ok || result.success === false) {
        setError(
          result.success === false
            ? result.message ?? 'Nao foi possivel carregar compras elegiveis.'
            : 'Nao foi possivel carregar compras elegiveis.'
        )
        setLoading(false)
        return
      }

      setOptions(result.data)
      setLoading(false)
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Erro inesperado ao carregar compras elegiveis.'
      )
      setLoading(false)
    }
  }, [])

  return {
    options,
    loading,
    error,
    fetchOptions,
  }
}
