import { useState, useRef, useCallback, useLayoutEffect } from 'react'
import { COLORS } from '../../theme/colors'
import { PREVIEW_EXAMPLE_VALUES, TEMPLATE_VARIABLES } from './constants'

const VAR_DRAG_MIME = 'application/x-copy-editor-var'

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

function extractFunctionParams(fn) {
  const str = fn.toString()
  const match = str.match(/^\(?\s*([^)=]*?)\s*\)?(?:\s*=>)/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((p) => p.trim().replace(/\s*=\s*.*$/, ''))
    .filter(Boolean)
}

function hasTemplateVars(value) {
  return typeof value === 'string' && /\$\{(\w+)\}/.test(value)
}

function usedVariables(value) {
  if (typeof value !== 'string') return []
  const matches = value.match(/\$\{(\w+)\}/g) || []
  return [...new Set(matches.map((m) => m.slice(2, -1)))]
}

// ─── Segment helpers (string ↔ DOM) ────────────────────────────────────────

function parseSegments(str) {
  if (typeof str !== 'string' || !str) return []
  const segs = []
  const re = /\$\{(\w+)\}/g
  let last = 0
  let m
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) segs.push({ type: 'text', value: str.slice(last, m.index) })
    segs.push({ type: 'var', name: m[1] })
    last = m.index + m[0].length
  }
  if (last < str.length) segs.push({ type: 'text', value: str.slice(last) })
  return segs
}

function createChipNode(varName) {
  const wrap = document.createElement('span')
  wrap.className = 'var-chip'
  wrap.setAttribute('contenteditable', 'false')
  wrap.setAttribute('data-var', varName)
  wrap.setAttribute('draggable', 'true')

  const label = document.createElement('span')
  label.className = 'var-chip-label'
  label.textContent = '${' + varName + '}'
  wrap.appendChild(label)

  const x = document.createElement('span')
  x.className = 'var-chip-x'
  x.setAttribute('data-remove-chip', 'true')
  x.setAttribute('role', 'button')
  x.setAttribute('aria-label', 'Remover variável')
  x.textContent = '×'
  wrap.appendChild(x)

  return wrap
}

function populateFromString(root, str) {
  root.innerHTML = ''
  const segs = parseSegments(str)
  for (const seg of segs) {
    if (seg.type === 'text') {
      root.appendChild(document.createTextNode(seg.value))
    } else {
      root.appendChild(createChipNode(seg.name))
    }
  }
}

function serializeDom(root) {
  let out = ''
  for (const node of root.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList?.contains('var-chip')) {
        out += '${' + (node.getAttribute('data-var') || '') + '}'
      } else if (node.tagName === 'BR') {
        out += '\n'
      } else {
        out += serializeDom(node)
      }
    }
  }
  return out
}

function getCaretRangeFromPoint(x, y) {
  if (document.caretRangeFromPoint) {
    return document.caretRangeFromPoint(x, y)
  }
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y)
    if (!pos) return null
    const range = document.createRange()
    range.setStart(pos.offsetNode, pos.offset)
    range.collapse(true)
    return range
  }
  return null
}

function insertNodeAtRange(range, node) {
  range.deleteContents()
  range.insertNode(node)
  const after = document.createRange()
  after.setStartAfter(node)
  after.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(after)
}

// Caret rect that also works when the range sits between elements (no client rects).
function getCaretRect(range) {
  const rects = range.getClientRects()
  for (const r of rects) {
    if (r.width + r.height > 0) return r
  }
  const container = range.startContainer
  const offset = range.startOffset
  if (container.nodeType === Node.ELEMENT_NODE) {
    const child = container.childNodes[offset]
    if (child && child.getBoundingClientRect) {
      const r = child.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.left, bottom: r.bottom, width: 0, height: r.height }
    }
    const prev = container.childNodes[offset - 1]
    if (prev && prev.getBoundingClientRect) {
      const r = prev.getBoundingClientRect()
      return { left: r.right, top: r.top, right: r.right, bottom: r.bottom, width: 0, height: r.height }
    }
    if (container.getBoundingClientRect) {
      const r = container.getBoundingClientRect()
      return { left: r.left, top: r.top, right: r.left, bottom: r.bottom, width: 0, height: r.height }
    }
  }
  return null
}

// Snap a range out of any .var-chip it lands inside, using click X to pick side.
function normalizeRange(range, rootEl, clientX) {
  if (!range || !rootEl) return range
  const container = range.startContainer
  const el = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement
  const chip = el?.closest?.('.var-chip')
  if (!chip || !rootEl.contains(chip)) return range
  const rect = chip.getBoundingClientRect()
  const mid = rect.left + rect.width / 2
  const x = typeof clientX === 'number' ? clientX : (range.getClientRects()[0]?.left ?? mid)
  const snapped = document.createRange()
  if (x < mid) snapped.setStartBefore(chip)
  else snapped.setStartAfter(chip)
  snapped.collapse(true)
  return snapped
}

// ─── Component ─────────────────────────────────────────────────────────────

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
  const editorRef = useRef(null)
  const savedRangeRef = useRef(null)
  const indicatorRef = useRef(null)
  const pillInteractionRef = useRef(false)

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

  const syncFromDom = useCallback(() => {
    const root = editorRef.current
    if (!root) return
    setEditValue(serializeDom(root))
  }, [])

  // Populate the contentEditable root once when entering edit mode.
  useLayoutEffect(() => {
    if (!isEditing) return
    const root = editorRef.current
    if (!root) return
    populateFromString(root, editValue)
    root.focus()
    // Place caret at the end.
    const range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

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

  // Save selection while the editor has focus, normalizing out of atomic chips.
  const handleSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    let range = sel.getRangeAt(0)
    const root = editorRef.current
    if (!root || !root.contains(range.commonAncestorContainer)) return
    const normalized = normalizeRange(range, root)
    if (normalized !== range) {
      sel.removeAllRanges()
      sel.addRange(normalized)
      range = normalized
    }
    savedRangeRef.current = range.cloneRange()
  }, [])

  const insertVariableAtCaret = useCallback(
    (varName) => {
      const root = editorRef.current
      if (!root) return
      let range = savedRangeRef.current
      if (!range || !root.contains(range.commonAncestorContainer)) {
        range = document.createRange()
        range.selectNodeContents(root)
        range.collapse(false)
      }
      range = normalizeRange(range, root)
      const chip = createChipNode(varName)
      insertNodeAtRange(range, chip)
      savedRangeRef.current = window.getSelection().getRangeAt(0).cloneRange()
      syncFromDom()
      root.focus()
    },
    [syncFromDom]
  )

  const hideIndicator = useCallback(() => {
    if (indicatorRef.current) indicatorRef.current.style.display = 'none'
  }, [])

  const showIndicatorAtPoint = useCallback(
    (x, y) => {
      const root = editorRef.current
      if (!root) return false
      const rect = root.getBoundingClientRect()
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        if (indicatorRef.current) indicatorRef.current.style.display = 'none'
        return false
      }
      let range = getCaretRangeFromPoint(x, y)
      if (!range) {
        if (indicatorRef.current) indicatorRef.current.style.display = 'none'
        return false
      }
      range = normalizeRange(range, root, x)
      showIndicatorAtRange(range)
      return true
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const performDropAtPoint = useCallback(
    (x, y, varName) => {
      const root = editorRef.current
      if (!root) return false
      const rect = root.getBoundingClientRect()
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return false
      let range = getCaretRangeFromPoint(x, y)
      if (!range) return false
      range = normalizeRange(range, root, x)
      const chip = createChipNode(varName)
      insertNodeAtRange(range, chip)
      savedRangeRef.current = window.getSelection().getRangeAt(0).cloneRange()
      syncFromDom()
      root.focus()
      return true
    },
    [syncFromDom]
  )

  const showIndicatorAtRange = useCallback((range) => {
    const bar = indicatorRef.current
    const root = editorRef.current
    if (!bar || !root) return
    const wrapper = bar.parentElement
    if (!wrapper) return
    const rect = getCaretRect(range)
    if (!rect) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const height = rect.height || parseFloat(getComputedStyle(root).lineHeight) || 18
    bar.style.display = 'block'
    bar.style.left = rect.left - wrapperRect.left - 1 + 'px'
    bar.style.top = rect.top - wrapperRect.top + 'px'
    bar.style.height = height + 'px'
  }, [])

  const handleDrop = useCallback(
    (e) => {
      hideIndicator()
      const varName = e.dataTransfer.getData(VAR_DRAG_MIME)
      if (!varName) return
      e.preventDefault()
      const root = editorRef.current
      if (!root) return
      let range = getCaretRangeFromPoint(e.clientX, e.clientY)
      if (!range) return
      range = normalizeRange(range, root, e.clientX)
      // If the drag source is an existing chip in this editor, remove it first.
      const sel = window.getSelection()
      const draggedChip = root.querySelector(`.var-chip[data-dragging="true"]`)
      if (draggedChip) {
        draggedChip.remove()
      }
      const chip = createChipNode(varName)
      insertNodeAtRange(range, chip)
      savedRangeRef.current = sel.getRangeAt(0).cloneRange()
      syncFromDom()
      root.focus()
    },
    [hideIndicator, syncFromDom]
  )

  const handleDragOver = useCallback(
    (e) => {
      if (!e.dataTransfer.types.includes(VAR_DRAG_MIME)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      const root = editorRef.current
      if (!root) return
      let range = getCaretRangeFromPoint(e.clientX, e.clientY)
      if (!range) {
        hideIndicator()
        return
      }
      range = normalizeRange(range, root, e.clientX)
      showIndicatorAtRange(range)
    },
    [hideIndicator, showIndicatorAtRange]
  )

  const handleDragLeave = useCallback(
    (e) => {
      const next = e.relatedTarget
      const wrapper = indicatorRef.current?.parentElement
      if (wrapper && next && wrapper.contains(next)) return
      hideIndicator()
    },
    [hideIndicator]
  )

  // Click within the editor: handle chip X-button removal.
  const handleEditorMouseDown = useCallback(
    (e) => {
      const target = e.target
      if (target?.getAttribute && target.getAttribute('data-remove-chip') === 'true') {
        e.preventDefault()
        const chip = target.closest('.var-chip')
        if (chip) {
          chip.remove()
          syncFromDom()
          editorRef.current?.focus()
        }
      }
    },
    [syncFromDom]
  )

  // Dragging an existing chip: mark it so drop handler can remove original (move).
  const handleEditorDragStart = useCallback((e) => {
    const chip = e.target?.closest?.('.var-chip')
    if (!chip || !editorRef.current?.contains(chip)) return
    const varName = chip.getAttribute('data-var')
    if (!varName) return
    chip.setAttribute('data-dragging', 'true')
    e.dataTransfer.setData(VAR_DRAG_MIME, varName)
    e.dataTransfer.setData('text/plain', `\${${varName}}`)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleEditorDragEnd = useCallback(
    (e) => {
      hideIndicator()
      const chip = e.target?.closest?.('.var-chip')
      if (chip) chip.removeAttribute('data-dragging')
    },
    [hideIndicator]
  )

  // ─── Custom pointer-drag for pills (external → editor) ───────────────
  // Gives a live "hanging" chip that follows the mouse and tilts with motion.
  const startPillPointerDrag = useCallback(
    (varName, startEvent, pillEl) => {
      const pointerId = startEvent.pointerId
      const startX = startEvent.clientX
      const startY = startEvent.clientY
      pillInteractionRef.current = true

      let didDrag = false
      let ghost = null
      let raf = 0
      let currentAngle = 0
      let targetAngle = 0
      let lastX = startX
      let x = startX
      let y = startY

      const render = () => {
        // Gravity pulls target angle back to 0; current angle lerps to target.
        targetAngle *= 0.82
        currentAngle += (targetAngle - currentAngle) * 0.22
        if (ghost) {
          ghost.style.transform = `translate(${x - 24}px, ${y - 8}px) rotate(${currentAngle}deg)`
        }
        raf = requestAnimationFrame(render)
      }

      const beginDrag = () => {
        didDrag = true
        ghost = pillEl.cloneNode(true)
        ghost.classList.add('var-chip-drag-live')
        ghost.style.transform = `translate(${x - 24}px, ${y - 8}px) rotate(0deg)`
        document.body.appendChild(ghost)
        pillEl.setAttribute('data-dragging', 'true')
        raf = requestAnimationFrame(render)
      }

      const onMove = (e) => {
        if (!didDrag) {
          const moved = Math.hypot(e.clientX - startX, e.clientY - startY)
          if (moved < 4) return
          beginDrag()
        }
        const dx = e.clientX - lastX
        // Clamp swing angle target based on horizontal velocity.
        const add = Math.max(-28, Math.min(28, dx * 2.5))
        targetAngle = Math.max(-30, Math.min(30, targetAngle + add))
        lastX = e.clientX
        x = e.clientX
        y = e.clientY
        showIndicatorAtPoint(e.clientX, e.clientY)
      }

      const cleanup = () => {
        cancelAnimationFrame(raf)
        pillEl.removeEventListener('pointermove', onMove)
        pillEl.removeEventListener('pointerup', onUp)
        pillEl.removeEventListener('pointercancel', onCancel)
        try {
          pillEl.releasePointerCapture(pointerId)
        } catch {
          /* noop */
        }
        pillEl.removeAttribute('data-dragging')
        if (ghost) ghost.remove()
        hideIndicator()
        window.setTimeout(() => {
          pillInteractionRef.current = false
        }, 50)
      }

      const onUp = (e) => {
        if (!didDrag) {
          // Treat as a click: insert at saved caret.
          insertVariableAtCaret(varName)
          editorRef.current?.focus()
        } else {
          performDropAtPoint(e.clientX, e.clientY, varName)
        }
        cleanup()
      }

      const onCancel = () => {
        cleanup()
      }

      try {
        pillEl.setPointerCapture(pointerId)
      } catch {
        /* noop */
      }
      pillEl.addEventListener('pointermove', onMove)
      pillEl.addEventListener('pointerup', onUp)
      pillEl.addEventListener('pointercancel', onCancel)
    },
    [hideIndicator, insertVariableAtCaret, performDropAtPoint, showIndicatorAtPoint]
  )

  // Prevent blur when user clicks pills / X buttons / initiates a drag from a pill.
  const handleBlur = useCallback(
    (e) => {
      const next = e.relatedTarget
      if (next && next.closest?.('[data-editor-keep-focus="true"]')) return
      if (pillInteractionRef.current) return
      commit()
    },
    [commit]
  )

  // ─── Edit Mode ────────────────────────────────────────────────────────
  if (isEditing) {
    const editTypography = {
      fontFamily: style.fontFamily || "'Inter', sans-serif",
      fontSize: style.fontSize || 14,
      fontWeight: style.fontWeight || 400,
      lineHeight: style.lineHeight || 1.6,
      letterSpacing: style.letterSpacing || 'normal',
      textAlign: style.textAlign || 'left',
    }

    const editContainerStyle = {
      width: '100%',
      maxWidth: '100%',
      alignSelf: 'stretch',
      margin: style.margin || 0,
    }

    const editorStyle = {
      width: '100%',
      maxWidth: '100%',
      minHeight: multiline ? 60 : undefined,
      background: `${COLORS.card}`,
      border: `1.5px solid ${COLORS.accent}80`,
      borderRadius: 6,
      padding: '6px 8px',
      color: COLORS.text,
      ...editTypography,
      outline: 'none',
      boxShadow: `0 0 0 3px ${COLORS.accent}20`,
      display: 'block',
      margin: 0,
      boxSizing: 'border-box',
      whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
      overflowX: multiline ? 'hidden' : 'auto',
      wordBreak: multiline ? 'break-word' : 'normal',
      cursor: 'text',
    }

    const varsInUse = usedVariables(editValue)

    return (
      <div data-path={dataPath} style={editContainerStyle}>
        <div style={{ position: 'relative' }} onDragLeave={handleDragLeave}>
          <div
            ref={editorRef}
            className="var-rich-editor"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline={multiline}
            onInput={syncFromDom}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onKeyUp={handleSelection}
            onMouseUp={handleSelection}
            onMouseDown={handleEditorMouseDown}
            onDragStart={handleEditorDragStart}
            onDragEnd={handleEditorDragEnd}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            spellCheck={false}
            style={editorStyle}
          />
          <div ref={indicatorRef} className="var-drop-indicator" aria-hidden="true" />
        </div>
        <div
          data-editor-keep-focus="true"
          tabIndex={-1}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginTop: 6,
            marginBottom: 4,
          }}
          onMouseDown={() => {
            pillInteractionRef.current = true
          }}
        >
          {Object.entries(TEMPLATE_VARIABLES).map(([key, { label }]) => {
            const active = varsInUse.includes(key)
            return (
              <span
                key={key}
                className="var-chip-source"
                draggable={false}
                onPointerDown={(e) => {
                  if (e.button !== 0) return
                  e.preventDefault()
                  startPillPointerDrag(key, e, e.currentTarget)
                }}
                title="Arraste para dentro do texto ou clique para inserir no cursor"
                style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  background: active ? `${COLORS.accent}20` : `${COLORS.border}`,
                  color: active ? COLORS.accent : COLORS.textMuted,
                  border: `1px solid ${active ? COLORS.accent + '40' : 'transparent'}`,
                  borderRadius: 4,
                  padding: '2px 6px',
                  userSelect: 'none',
                }}
              >
                {'${' + label + '}'}
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── View Mode ────────────────────────────────────────────────────────
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
