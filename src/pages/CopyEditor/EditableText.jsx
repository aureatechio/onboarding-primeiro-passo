import { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS } from '../../theme/colors'
import { PREVIEW_EXAMPLE_VALUES, TEMPLATE_VARIABLES } from './constants'

/**
 * Renderiza string template substituindo ${varName} por valores de exemplo.
 * Para funcoes, chama com valores de exemplo.
 */
function renderValue(value, exampleValues = PREVIEW_EXAMPLE_VALUES) {
  if (typeof value === 'function') {
    try {
      const params = extractFunctionParams(value)
      const args = params.map((p) => exampleValues[p] ?? p)
      return String(value(...args))
    } catch {
      return '[erro ao renderizar]'
    }
  }
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)\}/g, (_, key) => exampleValues[key] ?? `\${${key}}`)
  }
  return String(value ?? '')
}

/**
 * Extrai nomes de parametros de uma funcao.
 */
function extractFunctionParams(fn) {
  const str = fn.toString()
  const match = str.match(/^\(?\s*([^)=]*?)\s*\)?(?:\s*=>)/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((p) => p.trim().replace(/\s*=\s*.*$/, ''))
    .filter(Boolean)
}

/**
 * Verifica se o campo tem template variables (string com ${...}).
 */
function hasTemplateVars(value) {
  return typeof value === 'string' && /\$\{(\w+)\}/.test(value)
}

/**
 * Detecta quais variaveis de template estao em uso no valor.
 */
function usedVariables(value) {
  if (typeof value !== 'string') return []
  const matches = value.match(/\$\{(\w+)\}/g) || []
  return [...new Set(matches.map((m) => m.slice(2, -1)))]
}

/**
 * EditableText — Componente central do Preview-First Copy Editor.
 *
 * Renderiza texto visualmente como aparece no onboarding.
 * Click transforma em input/textarea para edicao inline.
 */
export default function EditableText({
  value,
  originalValue,
  path,
  etapaId,
  onUpdate,
  as: Tag = 'p',
  style = {},
  multiline = false,
  exampleValues = PREVIEW_EXAMPLE_VALUES,
  className,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef(null)

  const isFunction = typeof value === 'function'
  const isTemplate = hasTemplateVars(value)
  const isEditable = !isFunction

  const isDirty =
    originalValue !== undefined &&
    JSON.stringify(value) !== JSON.stringify(originalValue)

  const dataPath = etapaId && path ? `${etapaId}.${path.join('.')}` : undefined

  const handleClick = useCallback(() => {
    if (!isEditable) return
    setEditValue(typeof value === 'string' ? value : '')
    setIsEditing(true)
  }, [isEditable, value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (multiline && inputRef.current.tagName === 'TEXTAREA') {
        inputRef.current.style.height = 'auto'
        inputRef.current.style.height = inputRef.current.scrollHeight + 'px'
      }
    }
  }, [isEditing, multiline])

  const commit = useCallback(() => {
    setIsEditing(false)
    if (editValue !== value && onUpdate) {
      onUpdate(path, editValue)
    }
  }, [editValue, value, onUpdate, path])

  const cancel = useCallback(() => {
    setIsEditing(false)
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault()
        commit()
      }
    },
    [cancel, commit, multiline]
  )

  const insertVariable = useCallback(
    (varName) => {
      const input = inputRef.current
      if (!input) return
      const start = input.selectionStart
      const end = input.selectionEnd
      const before = editValue.slice(0, start)
      const after = editValue.slice(end)
      const inserted = `\${${varName}}`
      setEditValue(before + inserted + after)
      requestAnimationFrame(() => {
        input.selectionStart = input.selectionEnd = start + inserted.length
        input.focus()
      })
    },
    [editValue]
  )

  const handleTextareaInput = useCallback((e) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }, [])

  // ─── Edit Mode ──────────────────────────────────────────────────────────────
  if (isEditing) {
    const inputStyle = {
      ...style,
      width: '100%',
      background: `${COLORS.card}`,
      border: `1.5px solid ${COLORS.accent}80`,
      borderRadius: 6,
      padding: '6px 8px',
      color: COLORS.text,
      fontFamily: style.fontFamily || "'Inter', sans-serif",
      fontSize: style.fontSize || 14,
      fontWeight: style.fontWeight || 400,
      lineHeight: style.lineHeight || 1.6,
      outline: 'none',
      boxShadow: `0 0 0 3px ${COLORS.accent}20`,
      resize: 'none',
      display: 'block',
      margin: style.margin || 0,
      letterSpacing: style.letterSpacing || 'normal',
    }

    const varsInUse = usedVariables(editValue)
    const showVarPills = isTemplate || varsInUse.length > 0

    return (
      <div data-path={dataPath}>
        {multiline ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaInput}
            style={{ ...inputStyle, minHeight: 60 }}
            rows={2}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
        )}
        {showVarPills && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            {Object.entries(TEMPLATE_VARIABLES).map(([key, { label }]) => (
              <button
                key={key}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  insertVariable(key)
                }}
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  background: varsInUse.includes(key) ? `${COLORS.accent}20` : `${COLORS.border}`,
                  color: varsInUse.includes(key) ? COLORS.accent : COLORS.textMuted,
                  border: `1px solid ${varsInUse.includes(key) ? COLORS.accent + '40' : 'transparent'}`,
                  borderRadius: 4,
                  padding: '2px 6px',
                  cursor: 'pointer',
                }}
              >
                {'${' + label + '}'}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── View Mode ────────────────────────────────────────────────────────────
  const rendered = renderValue(value, exampleValues)

  const viewStyle = {
    ...style,
    cursor: isEditable ? 'pointer' : 'default',
    borderLeft: isDirty ? `2px solid ${COLORS.accent}` : '2px solid transparent',
    paddingLeft: isDirty ? 8 : (style.paddingLeft || 0) + 2,
    transition: 'border-color 0.2s, padding-left 0.2s, outline-color 0.2s',
    borderRadius: 3,
    position: 'relative',
  }

  return (
    <Tag
      data-path={dataPath}
      className={`editable-text ${className || ''}`}
      onClick={handleClick}
      style={viewStyle}
      title={
        isFunction
          ? 'Template function — edite em copy.js'
          : isTemplate
            ? 'Clique para editar (suporta ${variáveis})'
            : isEditable
              ? 'Clique para editar'
              : undefined
      }
    >
      {rendered}
      {isFunction && (
        <span
          style={{
            fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace",
            color: COLORS.textDim,
            marginLeft: 6,
            opacity: 0.7,
          }}
        >
          fn()
        </span>
      )}
    </Tag>
  )
}
