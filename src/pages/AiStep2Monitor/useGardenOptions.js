import { useState, useEffect } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

export default function useGardenOptions() {
  const [data, setData] = useState({
    celebrities: [],
    segments: [],
    subsegments: [],
    businesses: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-garden-options`)
        const json = await res.json()

        if (!cancelled && json.success) {
          setData(json.data)
        } else if (!cancelled) {
          setError(json.message || 'Erro ao carregar opcoes.')
        }
      } catch (err) {
        if (!cancelled) setError('Erro de conexao ao carregar opcoes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { ...data, loading, error }
}
