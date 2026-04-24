import { useEffect, useRef, useState } from 'react'
import { monitorTheme } from '../../theme'

const ACELERAI_BLUE = '#384ffe'
const DESTRUCTIVE = '#ff0058'
const SANS = "'Inter', system-ui, sans-serif"
const HEX_RE = /^#[0-9a-f]{6}$/i
const MAX_COLORS = 8

function normalizeHex(value) {
  const s = String(value || '').trim().toLowerCase()
  if (!s) return ''
  const v = s.startsWith('#') ? s : `#${s}`
  if (v.length === 4 && /^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  return v
}

export default function PaletteEditor({ value = [], onSave, saving = false, error = null }) {
  const [colors, setColors] = useState(value)
  const [draftColor, setDraftColor] = useState('#384ffe')
  const [localError, setLocalError] = useState(null)
  const dragIndex = useRef(null)
  const initial = useRef(JSON.stringify(value))

  useEffect(() => {
    setColors(value)
    initial.current = JSON.stringify(value)
  }, [value])

  const dirty = JSON.stringify(colors) !== initial.current

  function addColor() {
    const hex = normalizeHex(draftColor)
    if (!HEX_RE.test(hex)) {
      setLocalError('Hex invalido. Use #RRGGBB.')
      return
    }
    if (colors.length >= MAX_COLORS) {
      setLocalError(`Maximo ${MAX_COLORS} cores.`)
      return
    }
    setLocalError(null)
    setColors([...colors, hex])
  }

  function removeColor(idx) {
    setColors(colors.filter((_, i) => i !== idx))
  }

  function updateColor(idx, nextHex) {
    const hex = normalizeHex(nextHex)
    const copy = [...colors]
    copy[idx] = hex
    setColors(copy)
  }

  function onDragStart(idx) {
    dragIndex.current = idx
  }

  function onDragOver(e, idx) {
    e.preventDefault()
    if (dragIndex.current === null || dragIndex.current === idx) return
    const copy = [...colors]
    const [moved] = copy.splice(dragIndex.current, 1)
    copy.splice(idx, 0, moved)
    dragIndex.current = idx
    setColors(copy)
  }

  function onDragEnd() {
    dragIndex.current = null
  }

  async function commit() {
    for (const c of colors) {
      if (!HEX_RE.test(c)) {
        setLocalError(`Cor invalida: ${c}`)
        return
      }
    }
    setLocalError(null)
    const res = await onSave?.(colors)
    if (res?.ok) initial.current = JSON.stringify(colors)
  }

  const displayError = error || localError

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {colors.length === 0 && (
          <span style={{ fontSize: 12, color: monitorTheme.textMuted }}>
            Nenhuma cor na paleta. Adicione abaixo.
          </span>
        )}
        {colors.map((hex, idx) => (
          <div
            key={`${hex}-${idx}`}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={onDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 6,
              borderRadius: 8,
              background: monitorTheme.cardElevatedBg,
              border: `1px solid ${monitorTheme.borderStrong}`,
              cursor: 'grab',
            }}
          >
            <span
              aria-hidden
              style={{ fontSize: 12, color: monitorTheme.textMuted, userSelect: 'none' }}
              title="Arrastar"
            >
              ⋮⋮
            </span>
            <input
              type="color"
              value={HEX_RE.test(hex) ? hex : '#000000'}
              onChange={(e) => updateColor(idx, e.target.value)}
              aria-label={`Cor ${idx + 1}`}
              style={{
                width: 28,
                height: 28,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
            <input
              type="text"
              value={hex}
              onChange={(e) => updateColor(idx, e.target.value)}
              maxLength={7}
              style={{
                width: 80,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                color: monitorTheme.textPrimary,
                background: monitorTheme.controlBg,
                border: `1px solid ${HEX_RE.test(hex) ? monitorTheme.borderStrong : DESTRUCTIVE}`,
                borderRadius: 6,
                padding: '4px 6px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => removeColor(idx)}
              aria-label={`Remover cor ${hex}`}
              style={{
                background: 'transparent',
                color: monitorTheme.textMuted,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                padding: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = DESTRUCTIVE)}
              onMouseLeave={(e) => (e.currentTarget.style.color = monitorTheme.textMuted)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <input
          type="color"
          value={draftColor}
          onChange={(e) => setDraftColor(e.target.value)}
          aria-label="Nova cor"
          style={{ width: 32, height: 32, border: 'none', background: 'transparent', padding: 0 }}
        />
        <input
          type="text"
          value={draftColor}
          onChange={(e) => setDraftColor(e.target.value)}
          placeholder="#RRGGBB"
          style={{
            width: 100,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            color: monitorTheme.textPrimary,
            background: monitorTheme.controlBg,
            border: `1px solid ${monitorTheme.borderStrong}`,
            borderRadius: 6,
            padding: '6px 8px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={addColor}
          disabled={colors.length >= MAX_COLORS}
          style={{
            background: 'transparent',
            color: monitorTheme.textPrimary,
            border: `1px solid ${monitorTheme.borderStrong}`,
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            cursor: colors.length >= MAX_COLORS ? 'not-allowed' : 'pointer',
            fontFamily: SANS,
          }}
        >
          + adicionar
        </button>
        <span style={{ fontSize: 11, color: monitorTheme.textMuted, marginLeft: 'auto' }}>
          {colors.length}/{MAX_COLORS}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={commit}
          disabled={!dirty || saving}
          style={{
            background: !dirty || saving ? `${ACELERAI_BLUE}66` : ACELERAI_BLUE,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 600,
            cursor: !dirty || saving ? 'not-allowed' : 'pointer',
            fontFamily: SANS,
          }}
        >
          {saving ? 'Salvando…' : 'Salvar paleta'}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setColors(JSON.parse(initial.current))}
            style={{
              background: 'transparent',
              color: monitorTheme.textPrimary,
              border: `1px solid ${monitorTheme.borderStrong}`,
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: SANS,
            }}
          >
            Descartar
          </button>
        )}
      </div>

      {displayError && (
        <div style={{ marginTop: 8, fontSize: 11, color: DESTRUCTIVE }}>{displayError}</div>
      )}
    </div>
  )
}
