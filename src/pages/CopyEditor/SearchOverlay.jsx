import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { COLORS } from '../../theme/colors'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'
import { ETAPAS_META } from './constants'

/**
 * Recursively collect all string values from an object.
 * Returns array of { path: string[], value: string, etapaId: string }
 */
function collectStrings(obj, path = [], etapaId = '') {
  const results = []
  if (typeof obj === 'string') {
    results.push({ path: [...path], value: obj, etapaId })
  } else if (typeof obj === 'function') {
    // Skip functions — not searchable
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...collectStrings(item, [...path, i], etapaId))
    })
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      results.push(...collectStrings(obj[key], [...path, key], etapaId))
    }
  }
  return results
}

function highlightMatch(text, query) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return (
    <>
      {before}
      <mark style={{ background: `${COLORS.accent}40`, color: COLORS.text, borderRadius: 2, padding: '0 1px' }}>
        {match}
      </mark>
      {after}
    </>
  )
}

export default function SearchOverlay({ sections, isOpen, onClose, onSelectResult }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const results = useCallback(() => {
    if (!query || query.length < 2) return []
    const all = []
    for (const { id } of ETAPAS_META) {
      if (!sections[id]) continue
      const strings = collectStrings(sections[id], [], id)
      for (const s of strings) {
        if (s.value.toLowerCase().includes(query.toLowerCase())) {
          all.push(s)
        }
      }
    }
    return all.slice(0, 30)
  }, [query, sections])()

  // Group by etapa
  const grouped = {}
  for (const r of results) {
    if (!grouped[r.etapaId]) grouped[r.etapaId] = []
    grouped[r.etapaId].push(r)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: monitorTheme.pageBg,
          borderRadius: monitorRadius.lg,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          maxHeight: 'calc(100vh - 160px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: `1px solid ${monitorTheme.border}`,
        }}>
          <Search size={18} color={monitorTheme.textMuted} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar texto em todas as etapas..."
            style={{
              flex: 1,
              border: 'none',
              fontSize: 15,
              background: 'transparent',
              color: monitorTheme.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: `1px solid ${monitorTheme.border}`,
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} color={monitorTheme.textMuted} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', padding: '8px 0', flex: 1 }}>
          {query.length < 2 && (
            <p style={{ color: monitorTheme.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>
              Digite ao menos 2 caracteres para buscar
            </p>
          )}
          {query.length >= 2 && results.length === 0 && (
            <p style={{ color: monitorTheme.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>
              Nenhum resultado encontrado
            </p>
          )}
          {Object.entries(grouped).map(([etapaId, items]) => {
            const meta = ETAPAS_META.find((e) => e.id === etapaId)
            return (
              <div key={etapaId}>
                <p style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: monitorTheme.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '8px 16px 4px',
                  margin: 0,
                }}>
                  {meta?.label || etapaId}
                </p>
                {items.map((item, i) => {
                  const snippet = item.value.length > 120
                    ? item.value.slice(0, 120) + '...'
                    : item.value
                  const pathStr = item.path.filter((p) => typeof p === 'string').join('.')

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        onSelectResult(etapaId, item.path)
                        onClose()
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: 0,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = monitorTheme.cardMutedBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <p style={{ fontSize: 10, color: monitorTheme.textMuted, margin: '0 0 2px 0', fontFamily: "'JetBrains Mono', monospace" }}>
                        {pathStr}
                      </p>
                      <p style={{ fontSize: 13, color: monitorTheme.textPrimary, margin: 0, lineHeight: 1.4 }}>
                        {highlightMatch(snippet, query)}
                      </p>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div style={{
            padding: '8px 16px',
            borderTop: `1px solid ${monitorTheme.border}`,
            fontSize: 11, color: monitorTheme.textMuted,
          }}>
            {results.length} resultado{results.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
