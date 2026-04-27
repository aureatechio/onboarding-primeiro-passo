import { useState } from 'react'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'
import { TEMPLATE_VARIABLES, PREVIEW_EXAMPLE_VALUES, UI } from './constants'

const brand = monitorTheme.brand

// ─── Renderiza um template seguramente ───────────────────────────────────────

function renderTemplate(value, vars) {
  if (typeof value === 'function') {
    try {
      const args = Object.values(vars)
      return String(value(...args))
    } catch {
      return '[erro ao renderizar função]'
    }
  }
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? `\${${key}}`)
  }
  return String(value ?? '')
}

// ─── PreviewPanel ─────────────────────────────────────────────────────────────

export default function PreviewPanel({ sections, activeEtapaId }) {
  const [vars, setVars] = useState(PREVIEW_EXAMPLE_VALUES)
  const [collapsed, setCollapsed] = useState(false)

  const updateVar = (key, val) => setVars((prev) => ({ ...prev, [key]: val }))

  const etapaData = sections?.[activeEtapaId]

  const templateFields = []
  function collectTemplates(obj, prefix = '') {
    if (!obj || typeof obj !== 'object') return
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof val === 'function') {
        templateFields.push({ key: fullKey, value: val })
      } else if (typeof val === 'string' && /\$\{/.test(val)) {
        templateFields.push({ key: fullKey, value: val })
      } else if (typeof val === 'object' && !Array.isArray(val)) {
        collectTemplates(val, fullKey)
      }
    }
  }

  if (etapaData) collectTemplates(etapaData)

  return (
    <div
      style={{
        background: monitorTheme.cardMutedBg,
        border: `1px solid ${monitorTheme.border}`,
        borderRadius: monitorRadius.lg,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${designTokens.space[7]}px ${designTokens.space[8]}px`,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: monitorTheme.textPrimary,
        }}
      >
        <div>
          <p style={{ ...TYPE.label, color: monitorTheme.textPrimary, fontWeight: 700, margin: 0 }}>
            {UI.previewTitle}
          </p>
          <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, margin: 0, marginTop: 2 }}>
            {UI.previewSubtitle}
          </p>
        </div>
        <span style={{ color: monitorTheme.textMuted, fontSize: 11 }}>
          {collapsed ? UI.expand : UI.collapse}
        </span>
      </button>

      {!collapsed && (
        <div
          style={{
            padding: `0 ${designTokens.space[8]}px ${designTokens.space[8]}px`,
            borderTop: `1px solid ${monitorTheme.border}`,
          }}
        >
          {/* Variáveis editáveis */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
              marginBottom: designTokens.space[8],
              marginTop: designTokens.space[7],
            }}
          >
            {Object.entries(TEMPLATE_VARIABLES).map(([key, meta]) => (
              <div key={key}>
                <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginBottom: 4, fontSize: 10, textTransform: 'uppercase' }}>
                  {meta.label}
                </p>
                <input
                  type="text"
                  value={String(vars[key] ?? '')}
                  onChange={(e) => updateVar(key, e.target.value)}
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    color: monitorTheme.textPrimary,
                    border: `1px solid ${monitorTheme.border}`,
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    fontFamily: "'JetBrains Mono', monospace",
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = brand }}
                  onBlur={(e) => { e.target.style.borderColor = monitorTheme.border }}
                />
              </div>
            ))}
          </div>

          {/* Renders */}
          {templateFields.length === 0 ? (
            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, fontStyle: 'italic' }}>
              Nenhum campo com variáveis nesta etapa.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {templateFields.map(({ key, value }) => (
                <div
                  key={key}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${monitorTheme.borderSoft}`,
                    borderRadius: monitorRadius.md,
                    padding: '10px 12px',
                  }}
                >
                  <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginBottom: 6, fontSize: 10, textTransform: 'uppercase' }}>
                    {key}
                  </p>
                  <p style={{ ...TYPE.body, color: monitorTheme.textPrimary, margin: 0, lineHeight: 1.5 }}>
                    {renderTemplate(value, vars)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
