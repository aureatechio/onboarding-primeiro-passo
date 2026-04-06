import { useRef, useCallback } from 'react'
import { TYPE } from '../../theme/design-tokens'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'
import { FIELD_TYPES, TEMPLATE_VARIABLES, UI } from './constants'

const brand = monitorTheme.brand
const focusShadow = `0 0 0 2px ${brand}33`

// ─── Shared input styles ─────────────────────────────────────────────────────

function inputStyle(isDirty, extra = {}) {
  return {
    width: '100%',
    background: '#FFFFFF',
    border: `1px solid ${isDirty ? brand : monitorTheme.border}`,
    borderRadius: monitorRadius.md,
    padding: '8px 12px',
    ...TYPE.body,
    color: monitorTheme.textPrimary,
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    ...extra,
  }
}

// ─── Label ───────────────────────────────────────────────────────────────────

function FieldLabel({ label, isDirty }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <span style={{ ...TYPE.label, color: monitorTheme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
        {label}
      </span>
      {isDirty && (
        <span style={{ color: brand, fontSize: 10, lineHeight: 1 }} title="Editado">
          {UI.fieldDirtyDot}
        </span>
      )}
    </div>
  )
}

// ─── STRING ──────────────────────────────────────────────────────────────────

function StringField({ value, onChange, isDirty }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle(isDirty)}
      onFocus={(e) => { e.target.style.borderColor = brand; e.target.style.boxShadow = focusShadow }}
      onBlur={(e) => { e.target.style.borderColor = isDirty ? brand : monitorTheme.border; e.target.style.boxShadow = '' }}
    />
  )
}

// ─── TEXTAREA ────────────────────────────────────────────────────────────────

function TextareaField({ value, onChange, isDirty }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={Math.max(3, Math.ceil((value ?? '').length / 80))}
      style={inputStyle(isDirty, { resize: 'vertical', minHeight: 72 })}
      onFocus={(e) => { e.target.style.borderColor = brand; e.target.style.boxShadow = focusShadow }}
      onBlur={(e) => { e.target.style.borderColor = isDirty ? brand : monitorTheme.border; e.target.style.boxShadow = '' }}
    />
  )
}

// ─── TEMPLATE ────────────────────────────────────────────────────────────────

function TemplateField({ value, onChange, isDirty, variables = [] }) {
  const textareaRef = useRef(null)

  const insertVariable = useCallback((varName) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const current = value ?? ''
    const insert = `\${${varName}}`
    const next = current.slice(0, start) + insert + current.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + insert.length, start + insert.length)
    })
  }, [value, onChange])

  const availableVars = variables.length > 0
    ? variables
    : Object.keys(TEMPLATE_VARIABLES)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        ref={textareaRef}
        value={typeof value === 'function' ? '[função — edite em copy.js]' : (value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(3, Math.ceil((typeof value === 'string' ? value : '').length / 80))}
        style={inputStyle(isDirty, { resize: 'vertical', minHeight: 72, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 })}
        onFocus={(e) => { e.target.style.borderColor = brand; e.target.style.boxShadow = focusShadow }}
        onBlur={(e) => { e.target.style.borderColor = isDirty ? brand : monitorTheme.border; e.target.style.boxShadow = '' }}
        readOnly={typeof value === 'function'}
      />
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ ...TYPE.caption, color: monitorTheme.textMuted, fontSize: 11 }}>
          {UI.templateVarsLabel}
        </span>
        {availableVars.map((varName) => (
          <button
            key={varName}
            type="button"
            onClick={() => insertVariable(varName)}
            style={{
              padding: '2px 8px',
              background: `${brand}14`,
              color: brand,
              border: `1px solid ${brand}44`,
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { e.target.style.background = `${brand}28` }}
            onMouseLeave={(e) => { e.target.style.background = `${brand}14` }}
            title={`Inserir \${${varName}}`}
          >
            {varName}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── STRING_ARRAY ─────────────────────────────────────────────────────────────

function StringArrayField({ value, onChange, isDirty }) {
  const items = Array.isArray(value) ? value : []

  const updateItem = (i, val) => {
    const next = [...items]
    next[i] = val
    onChange(next)
  }

  const removeItem = (i) => {
    onChange(items.filter((_, idx) => idx !== i))
  }

  const addItem = () => {
    onChange([...items, ''])
  }

  const moveUp = (i) => {
    if (i === 0) return
    const next = [...items]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  const moveDown = (i) => {
    if (i === items.length - 1) return
    const next = [...items]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              type="button"
              onClick={() => moveUp(i)}
              disabled={i === 0}
              style={arrowBtnStyle(i === 0)}
              title="Mover para cima"
            >
              {UI.moveUp}
            </button>
            <button
              type="button"
              onClick={() => moveDown(i)}
              disabled={i === items.length - 1}
              style={arrowBtnStyle(i === items.length - 1)}
              title="Mover para baixo"
            >
              {UI.moveDown}
            </button>
          </div>
          <input
            type="text"
            value={item ?? ''}
            onChange={(e) => updateItem(i, e.target.value)}
            style={{ ...inputStyle(isDirty), flex: 1 }}
            onFocus={(e) => { e.target.style.borderColor = brand; e.target.style.boxShadow = focusShadow }}
            onBlur={(e) => { e.target.style.borderColor = isDirty ? brand : monitorTheme.border; e.target.style.boxShadow = '' }}
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            style={removeBtnStyle()}
            title="Remover item"
          >
            {UI.removeItem}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        style={{
          alignSelf: 'flex-start',
          padding: '6px 12px',
          background: 'transparent',
          color: brand,
          border: `1px solid ${brand}44`,
          borderRadius: monitorRadius.md,
          fontSize: 12,
          cursor: 'pointer',
          transition: 'background 0.1s',
          fontFamily: "'Inter', sans-serif",
        }}
        onMouseEnter={(e) => { e.target.style.background = `${brand}14` }}
        onMouseLeave={(e) => { e.target.style.background = 'transparent' }}
      >
        {UI.addItem}
      </button>
    </div>
  )
}

// ─── OBJECT_ARRAY ─────────────────────────────────────────────────────────────

function ObjectArrayField({ value, onChange, isDirty }) {
  const items = Array.isArray(value) ? value : []

  const updateItem = (i, field, val) => {
    const next = items.map((item, idx) =>
      idx === i ? { ...item, [field]: val } : item
    )
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => {
        const fields = Object.keys(item).filter((k) => typeof item[k] === 'string')
        return (
          <div
            key={i}
            style={{
              background: monitorTheme.cardMutedBg,
              border: `1px solid ${isDirty ? brand : monitorTheme.border}`,
              borderRadius: monitorRadius.lg,
              padding: '12px 14px',
            }}
          >
            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginBottom: 10, fontSize: 11, textTransform: 'uppercase' }}>
              {UI.objectArrayItem} {i + 1}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fields.map((field) => (
                <div key={field}>
                  <FieldLabel label={field} isDirty={false} />
                  {(item[field] ?? '').length > 80 ? (
                    <TextareaField
                      value={item[field]}
                      onChange={(val) => updateItem(i, field, val)}
                      isDirty={false}
                    />
                  ) : (
                    <StringField
                      value={item[field]}
                      onChange={(val) => updateItem(i, field, val)}
                      isDirty={false}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── NESTED_OBJECT ────────────────────────────────────────────────────────────

function NestedObjectField({ value, onChange, isDirty }) {
  if (!value || typeof value !== 'object') return null
  const fields = Object.keys(value).filter((k) => typeof value[k] === 'string')

  return (
    <div
      style={{
        background: monitorTheme.cardMutedBg,
        border: `1px solid ${isDirty ? brand : monitorTheme.border}`,
        borderRadius: monitorRadius.lg,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {fields.map((field) => (
        <div key={field}>
          <FieldLabel label={field} isDirty={false} />
          {(value[field] ?? '').length > 80 ? (
            <TextareaField
              value={value[field]}
              onChange={(val) => onChange({ ...value, [field]: val })}
              isDirty={false}
            />
          ) : (
            <StringField
              value={value[field]}
              onChange={(val) => onChange({ ...value, [field]: val })}
              isDirty={false}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Shared button styles ────────────────────────────────────────────────────

function arrowBtnStyle(disabled) {
  return {
    width: 22,
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: `1px solid ${monitorTheme.border}`,
    borderRadius: 4,
    color: disabled ? monitorTheme.textMuted : monitorTheme.textSecondary,
    fontSize: 9,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: 0,
  }
}

function removeBtnStyle() {
  return {
    width: 28,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: `1px solid ${monitorTheme.border}`,
    borderRadius: monitorRadius.md,
    color: monitorTheme.textMuted,
    fontSize: 14,
    cursor: 'pointer',
    flexShrink: 0,
  }
}

// ─── Main FieldEditor ─────────────────────────────────────────────────────────

export default function FieldEditor({ type, value, onChange, label, variables, isDirty = false }) {
  return (
    <div>
      <FieldLabel label={label} isDirty={isDirty} />
      {type === FIELD_TYPES.STRING && (
        <StringField value={value} onChange={onChange} isDirty={isDirty} />
      )}
      {type === FIELD_TYPES.TEXTAREA && (
        <TextareaField value={value} onChange={onChange} isDirty={isDirty} />
      )}
      {type === FIELD_TYPES.TEMPLATE && (
        <TemplateField value={value} onChange={onChange} isDirty={isDirty} variables={variables} />
      )}
      {type === FIELD_TYPES.STRING_ARRAY && (
        <StringArrayField value={value} onChange={onChange} isDirty={isDirty} />
      )}
      {type === FIELD_TYPES.OBJECT_ARRAY && (
        <ObjectArrayField value={value} onChange={onChange} isDirty={isDirty} />
      )}
      {type === FIELD_TYPES.NESTED_OBJECT && (
        <NestedObjectField value={value} onChange={onChange} isDirty={isDirty} />
      )}
    </div>
  )
}
