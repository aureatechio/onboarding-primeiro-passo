import { useState, useCallback, useMemo } from 'react'
import * as copyModule from '../../copy'
import { ETAPAS_META, UI } from './constants'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deep clone que preserva funções (não clonáveis via structuredClone).
 * Clona apenas primitivos, arrays e objetos planos; mantém referências de funções.
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

/**
 * Lê o valor num objeto por path array, ex: ['slide1', 'body']
 */
function getByPath(obj, path) {
  return path.reduce((acc, key) => (acc != null ? acc[key] : undefined), obj)
}

/**
 * Retorna novo objeto com valor modificado no path.
 */
function setByPath(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const next = deepCloneWithFunctions(obj)
  next[head] = setByPath(next[head] ?? {}, rest, value)
  return next
}

// ─── Snapshot inicial do copy.js ────────────────────────────────────────────

function buildInitialSections() {
  const sections = {}
  for (const { exportKey, id } of ETAPAS_META) {
    const original = copyModule[exportKey]
    if (original) {
      sections[id] = deepCloneWithFunctions(original)
    }
  }
  return sections
}

const ORIGINAL_SECTIONS = buildInitialSections()

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useCopyEditor() {
  const [sections, setSections] = useState(() => buildInitialSections())
  const [dirtyEtapas, setDirtyEtapas] = useState(new Set())

  /**
   * Atualiza um campo dentro de uma etapa.
   * @param {string} etapaId  - id da etapa (ex: 'etapa1')
   * @param {string[]} path   - caminho do campo (ex: ['slide1', 'body'])
   * @param {*} value         - novo valor
   */
  const updateField = useCallback((etapaId, path, value) => {
    setSections((prev) => ({
      ...prev,
      [etapaId]: setByPath(prev[etapaId], path, value),
    }))
    setDirtyEtapas((prev) => new Set([...prev, etapaId]))
  }, [])

  /**
   * Reseta uma etapa ao valor original importado de copy.js.
   * @param {string} etapaId
   */
  const resetSection = useCallback((etapaId) => {
    setSections((prev) => ({
      ...prev,
      [etapaId]: deepCloneWithFunctions(ORIGINAL_SECTIONS[etapaId]),
    }))
    setDirtyEtapas((prev) => {
      const next = new Set(prev)
      next.delete(etapaId)
      return next
    })
  }, [])

  /**
   * Gera download do estado atual como JSON.
   */
  const exportAsJSON = useCallback(() => {
    const exportable = {}
    for (const { id, exportKey } of ETAPAS_META) {
      exportable[exportKey] = sections[id]
    }

    // Serializar — funções são convertidas para string descritiva
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

  /**
   * Retorna o valor original de um campo (para comparação dirty).
   */
  const getOriginalValue = useCallback((etapaId, path) => {
    return getByPath(ORIGINAL_SECTIONS[etapaId], path)
  }, [])

  const isDirty = useMemo(() => dirtyEtapas.size > 0, [dirtyEtapas])

  return {
    sections,
    dirtyEtapas,
    isDirty,
    updateField,
    resetSection,
    exportAsJSON,
    getOriginalValue,
    originalSections: ORIGINAL_SECTIONS,
  }
}
