import { useState, useCallback, useMemo, useEffect } from 'react'
import * as copyModule from '../../copy'
import { deepMergeCopy } from '../../lib/deep-merge'
import { adminFetch } from '../../lib/admin-edge'
import { ETAPAS_META, UI } from './constants'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deep clone que preserva funções (não clonáveis via structuredClone).
 */
function deepCloneWithFunctions(value) {
  if (value === null || value === undefined) return value
  if (typeof value === 'function') return value
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(deepCloneWithFunctions)
  const clone = {}
  for (const key of Object.keys(value)) {
    clone[key] = deepCloneWithFunctions(value[key])
  }
  return clone
}

function getByPath(obj, path) {
  return path.reduce((acc, key) => (acc != null ? acc[key] : undefined), obj)
}

function setByPath(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const next = deepCloneWithFunctions(obj)
  next[head] = setByPath(next[head] ?? {}, rest, value)
  return next
}

// ─── Build sections from static copy.js ─────────────────────────────────────

function buildStaticSections() {
  const sections = {}
  for (const { exportKey, id } of ETAPAS_META) {
    const original = copyModule[exportKey]
    if (original) {
      sections[id] = deepCloneWithFunctions(original)
    }
  }
  return sections
}

const STATIC_SECTIONS = buildStaticSections()

// ─── Diff computation (for publishing) ──────────────────────────────────────

/**
 * Recursively compute diff between current and original.
 * Returns object with only changed non-function values, or null if no changes.
 */
function computeDiff(current, original) {
  if (current === original) return null
  if (typeof current === 'function') return null
  if (typeof current !== typeof original) return current
  if (typeof current !== 'object' || current === null) {
    return current !== original ? current : null
  }
  if (Array.isArray(current)) {
    if (JSON.stringify(current) !== JSON.stringify(original)) return current
    return null
  }
  // Object: recurse
  const diff = {}
  let hasChanges = false
  for (const key of Object.keys(current)) {
    if (typeof current[key] === 'function') continue
    const fieldDiff = computeDiff(current[key], original?.[key])
    if (fieldDiff !== null) {
      diff[key] = fieldDiff
      hasChanges = true
    }
  }
  return hasChanges ? diff : null
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCopyEditor() {
  const [sections, setSections] = useState(() => buildStaticSections())
  const [originalSections, setOriginalSections] = useState(STATIC_SECTIONS)
  const [dirtyEtapas, setDirtyEtapas] = useState(new Set())
  const [supabaseVersion, setSupabaseVersion] = useState(0)
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(true)
  const [publishStatus, setPublishStatus] = useState('idle')
  const [publishError, setPublishError] = useState(null)

  // ── Fetch current published copy on mount ───────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchPublished() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        setIsLoadingFromSupabase(false)
        return
      }

      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/get-onboarding-copy`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return

        if (data.success && data.version > 0 && data.content) {
          // Merge Supabase overrides over static defaults
          const merged = {}
          for (const { id, exportKey } of ETAPAS_META) {
            const staticCopy = STATIC_SECTIONS[id]
            const override = data.content[exportKey]
            merged[id] = override
              ? deepCloneWithFunctions(deepMergeCopy(staticCopy, override))
              : deepCloneWithFunctions(staticCopy)
          }
          setSections(merged)
          setOriginalSections(merged)
          setSupabaseVersion(data.version)
        }
      } catch (err) {
        console.warn('[useCopyEditor] Failed to fetch published copy:', err.message)
      } finally {
        if (!cancelled) setIsLoadingFromSupabase(false)
      }
    }

    fetchPublished()
    return () => { cancelled = true }
  }, [])

  // ── Update field ────────────────────────────────────────────────────────
  const updateField = useCallback((etapaId, path, value) => {
    setSections((prev) => ({
      ...prev,
      [etapaId]: setByPath(prev[etapaId], path, value),
    }))
    setDirtyEtapas((prev) => new Set([...prev, etapaId]))
  }, [])

  // ── Reset section ───────────────────────────────────────────────────────
  const resetSection = useCallback((etapaId) => {
    setSections((prev) => ({
      ...prev,
      [etapaId]: deepCloneWithFunctions(originalSections[etapaId]),
    }))
    setDirtyEtapas((prev) => {
      const next = new Set(prev)
      next.delete(etapaId)
      return next
    })
  }, [originalSections])

  // ── Import JSON ─────────────────────────────────────────────────────────
  // Merge imported content over current sections. Preserves functions
  // (strings matching the function placeholder are ignored). Marks every
  // imported etapa as dirty so the Publicar button is enabled.
  const importFromJSON = useCallback((jsonContent) => {
    if (!jsonContent || typeof jsonContent !== 'object' || Array.isArray(jsonContent)) {
      return { success: false, reason: 'invalid-json' }
    }

    const FUNCTION_PLACEHOLDER = '[function — edite diretamente no copy.js]'

    const mergeImport = (current, imported) => {
      if (imported === FUNCTION_PLACEHOLDER) return current
      if (typeof current === 'function') return current
      if (Array.isArray(imported)) return imported
      if (
        imported &&
        typeof imported === 'object' &&
        current &&
        typeof current === 'object' &&
        !Array.isArray(current)
      ) {
        const merged = { ...current }
        for (const key of Object.keys(imported)) {
          merged[key] = mergeImport(current[key], imported[key])
        }
        return merged
      }
      return imported
    }

    const newSections = { ...sections }
    const importedKeys = []

    for (const { id, exportKey } of ETAPAS_META) {
      if (jsonContent[exportKey]) {
        newSections[id] = mergeImport(sections[id], jsonContent[exportKey])
        importedKeys.push(exportKey)
      }
    }

    if (importedKeys.length === 0) {
      return { success: false, reason: 'no-valid-keys' }
    }

    setSections(newSections)
    setDirtyEtapas((prev) => {
      const next = new Set(prev)
      for (const { id, exportKey } of ETAPAS_META) {
        if (importedKeys.includes(exportKey)) next.add(id)
      }
      return next
    })

    return { success: true, imported: importedKeys }
  }, [sections])

  // ── Export JSON ─────────────────────────────────────────────────────────
  const exportAsJSON = useCallback(() => {
    const exportable = {}
    for (const { id, exportKey } of ETAPAS_META) {
      exportable[exportKey] = sections[id]
    }
    const serialized = JSON.stringify(
      exportable,
      (_, v) => (typeof v === 'function' ? '[function — edite diretamente no copy.js]' : v),
      2
    )
    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = UI.exportFileName
    a.click()
    URL.revokeObjectURL(url)
  }, [sections])

  // ── Publish to Supabase ─────────────────────────────────────────────────
  const publishToSupabase = useCallback(async (_adminPassword, notes = '') => {
    setPublishStatus('publishing')
    setPublishError(null)

    try {
      // Compute diff: only changed non-function values per etapa
      const content = {}
      const changedEtapas = []

      for (const { id, exportKey } of ETAPAS_META) {
        const etapaDiff = computeDiff(sections[id], originalSections[id])
        if (etapaDiff) {
          content[exportKey] = etapaDiff
          changedEtapas.push(exportKey)
        }
      }

      if (changedEtapas.length === 0) {
        setPublishStatus('idle')
        return { success: false, reason: 'no-changes' }
      }

      const data = await adminFetch('update-onboarding-copy', {
        method: 'POST',
        body: {
          content,
          changed_etapas: changedEtapas,
          notes: notes.trim() || null,
        },
      })

      if (!data.success) {
        const errMsg = data.error || data.message || 'Erro ao publicar copy'
        setPublishStatus('error')
        setPublishError(errMsg)
        return { success: false, reason: errMsg }
      }

      // Success: update baseline to current state
      setSupabaseVersion(data.version)
      setOriginalSections(deepCloneWithFunctions(sections))
      setDirtyEtapas(new Set())
      setPublishStatus('success')

      // Reset status after delay
      setTimeout(() => setPublishStatus('idle'), 3000)

      return { success: true, version: data.version }
    } catch (err) {
      setPublishStatus('error')
      setPublishError(err.message)
      return { success: false, reason: err.message }
    }
  }, [sections, originalSections])

  // ── Computed ────────────────────────────────────────────────────────────
  const isDirty = useMemo(() => dirtyEtapas.size > 0, [dirtyEtapas])

  const getOriginalValue = useCallback((etapaId, path) => {
    return getByPath(originalSections[etapaId], path)
  }, [originalSections])

  return {
    sections,
    originalSections,
    dirtyEtapas,
    isDirty,
    updateField,
    resetSection,
    exportAsJSON,
    importFromJSON,
    getOriginalValue,
    // Supabase integration
    publishToSupabase,
    publishStatus,
    publishError,
    supabaseVersion,
    isLoadingFromSupabase,
  }
}
