import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import {
  ETAPA1,
  ETAPA2,
  ETAPA3,
  ETAPA4,
  ETAPA5,
  ETAPA6,
  ETAPA62,
  ETAPA_FINAL,
} from '../copy'
import { deepMergeCopy } from '../lib/deep-merge'

const CopyContext = createContext(null)

/** Maps etapa export keys to static defaults */
const STATIC_DEFAULTS = {
  ETAPA1,
  ETAPA2,
  ETAPA3,
  ETAPA4,
  ETAPA5,
  ETAPA6,
  ETAPA62,
  ETAPA_FINAL,
}

/**
 * CopyProvider — fetches published copy from Supabase and deep-merges
 * over the static copy.js defaults. Falls back to static if fetch fails.
 */
export function CopyProvider({ children }) {
  const [resolved, setResolved] = useState(STATIC_DEFAULTS)
  const [isLoading, setIsLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function fetchCopy() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/get-onboarding-copy`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        if (cancelled) return

        if (data.success && data.version > 0 && data.content) {
          const merged = { ...STATIC_DEFAULTS }
          for (const key of Object.keys(STATIC_DEFAULTS)) {
            if (data.content[key]) {
              merged[key] = deepMergeCopy(STATIC_DEFAULTS[key], data.content[key])
            }
          }
          setResolved(merged)
          setVersion(data.version)
        }
      } catch (err) {
        console.warn('[CopyProvider] Failed to fetch copy, using static defaults:', err.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchCopy()
    return () => { cancelled = true }
  }, [])

  const value = useMemo(
    () => ({ ...resolved, isLoading, version }),
    [resolved, isLoading, version]
  )

  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>
}

/**
 * useCopy — access the resolved copy (static defaults + Supabase overrides).
 * Returns { ETAPA1, ETAPA2, ..., ETAPA_FINAL, isLoading, version }
 */
export function useCopy() {
  const ctx = useContext(CopyContext)
  if (!ctx) {
    // Fallback for components outside CopyProvider (e.g. CopyEditor route)
    return { ...STATIC_DEFAULTS, isLoading: false, version: 0 }
  }
  return ctx
}
