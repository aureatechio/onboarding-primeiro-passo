import { useEffect, useRef, useState } from 'react'
import { monitorTheme } from '../../theme'

const ACELERAI_BLUE = monitorTheme.actionPrimaryBg
const DESTRUCTIVE = monitorTheme.dangerTextStrong
const SANS = "'Inter', system-ui, sans-serif"

export default function EditableField({
  label,
  value,
  onSave,
  placeholder,
  multiline = false,
  rows = 3,
  type = 'text',
  saving = false,
  error = null,
  disabled = false,
  help,
  maxLength,
}) {
  const [draft, setDraft] = useState(value ?? '')
  const [editing, setEditing] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) setDraft(value ?? '')
  }, [value, editing])

  useEffect(() => {
    if (justSaved) {
      const t = setTimeout(() => setJustSaved(false), 1500)
      return () => clearTimeout(t)
    }
  }, [justSaved])

  function start() {
    if (disabled) return
    setEditing(true)
    setDraft(value ?? '')
    queueMicrotask(() => inputRef.current?.focus())
  }

  function cancel() {
    setEditing(false)
    setDraft(value ?? '')
  }

  async function commit() {
    const next = (draft ?? '').trim()
    if (next === (value ?? '').trim()) {
      setEditing(false)
      return
    }
    const result = await onSave?.(next)
    if (result?.ok) {
      setEditing(false)
      setJustSaved(true)
    }
  }

  function handleKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      commit()
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      commit()
    }
  }

  const borderColor = error
    ? DESTRUCTIVE
    : justSaved
    ? monitorTheme.successText
    : editing
    ? ACELERAI_BLUE
    : monitorTheme.borderStrong

  const commonStyle = {
    fontSize: 13,
    color: monitorTheme.textPrimary,
    background: monitorTheme.controlBg,
    border: `1px solid ${borderColor}`,
    borderRadius: 8,
    padding: '8px 10px',
    width: '100%',
    fontFamily: SANS,
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: monitorTheme.textMuted,
            marginBottom: 6,
          }}
        >
          <span>{label}</span>
          {saving && (
            <span style={{ fontSize: 10, color: ACELERAI_BLUE, textTransform: 'none', letterSpacing: 0 }}>
              salvando…
            </span>
          )}
          {justSaved && !saving && (
            <span style={{ fontSize: 10, color: monitorTheme.successText, textTransform: 'none', letterSpacing: 0 }}>
              ✓ salvo
            </span>
          )}
        </label>
      )}

      {editing ? (
        <div>
          {multiline ? (
            <textarea
              ref={inputRef}
              value={draft}
              rows={rows}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              onBlur={commit}
              style={{ ...commonStyle, resize: 'vertical', lineHeight: 1.55 }}
            />
          ) : (
            <input
              ref={inputRef}
              type={type}
              value={draft}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              onBlur={commit}
              style={commonStyle}
            />
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={commit}
              disabled={saving}
              style={primaryBtn(saving)}
            >
              Salvar
            </button>
            <button type="button" onClick={cancel} disabled={saving} style={ghostBtn}>
              Cancelar
            </button>
            <span style={{ fontSize: 11, color: monitorTheme.textMuted, alignSelf: 'center' }}>
              {multiline ? 'Cmd/Ctrl+Enter salva · Esc cancela' : 'Enter salva · Esc cancela'}
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          aria-label={`Editar ${label || 'campo'}`}
          style={{
            width: '100%',
            textAlign: 'left',
            cursor: disabled ? 'not-allowed' : 'text',
            background: 'transparent',
            border: `1px dashed ${monitorTheme.border}`,
            borderRadius: 8,
            padding: '8px 10px',
            color: value ? monitorTheme.textPrimary : monitorTheme.textMuted,
            fontFamily: SANS,
            fontSize: 13,
            minHeight: multiline ? rows * 20 + 16 : 36,
            whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={(e) => {
            if (disabled) return
            e.currentTarget.style.borderColor = ACELERAI_BLUE
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = monitorTheme.border
          }}
        >
          {value || placeholder || 'Clique para editar'}
        </button>
      )}

      {error && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: DESTRUCTIVE,
            fontFamily: SANS,
          }}
        >
          {error}
        </div>
      )}
      {help && !error && (
        <div style={{ marginTop: 6, fontSize: 11, color: monitorTheme.textMuted }}>{help}</div>
      )}
    </div>
  )
}

function primaryBtn(disabled) {
  return {
    background: disabled ? `${ACELERAI_BLUE}66` : ACELERAI_BLUE,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: SANS,
  }
}
const ghostBtn = {
  background: 'transparent',
  color: monitorTheme.textPrimary,
  border: `1px solid ${monitorTheme.borderStrong}`,
  borderRadius: 8,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: SANS,
}
