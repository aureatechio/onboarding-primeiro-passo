import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COLORS } from '../theme/colors'
import Icon from './Icon'

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

export default function ColorSwatch({
  value,
  onChange,
  onRemove,
  removable = false,
  badge,
  badgeColor,
}) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value || '#000000')
  const [hexError, setHexError] = useState(false)
  const popoverRef = useRef(null)
  const swatchRef = useRef(null)

  useEffect(() => {
    setHexInput(value || '#000000')
    setHexError(false)
  }, [value])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        swatchRef.current &&
        !swatchRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  const handlePickerChange = useCallback(
    (e) => {
      const color = e.target.value
      setHexInput(color)
      setHexError(false)
      onChange?.(color)
    },
    [onChange],
  )

  const handleHexInputChange = useCallback(
    (e) => {
      let val = e.target.value
      if (!val.startsWith('#')) val = '#' + val
      val = val.slice(0, 7)
      setHexInput(val)

      if (HEX_REGEX.test(val)) {
        setHexError(false)
        onChange?.(val)
      } else {
        setHexError(val.length === 7)
      }
    },
    [onChange],
  )

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        ref={swatchRef}
        role="button"
        tabIndex={0}
        aria-label={`Editar cor ${value}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(!open)
        }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: value || '#000000',
          border: `2px solid ${open ? COLORS.accent : COLORS.border}`,
          cursor: 'pointer',
          position: 'relative',
          transition: 'border-color 0.15s ease',
        }}
      >
        {removable && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            aria-label="Remover cor"
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              background: COLORS.danger,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              zIndex: 2,
            }}
          >
            <Icon name="x" size={10} color="#fff" strokeWidth={3} />
          </button>
        )}

        {badge && (
          <span
            style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '1px 5px',
              borderRadius: 4,
              background: badgeColor || COLORS.accent,
              color: COLORS.bg,
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 56,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 14,
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <input
              type="color"
              value={hexInput}
              onChange={handlePickerChange}
              style={{
                width: '100%',
                height: 120,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                background: 'transparent',
                padding: 2,
                cursor: 'pointer',
                marginBottom: 10,
                display: 'block',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  color: COLORS.textDim,
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                HEX
              </span>
              <input
                type="text"
                value={hexInput}
                onChange={handleHexInputChange}
                maxLength={7}
                spellCheck={false}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: `1px solid ${hexError ? COLORS.danger : COLORS.border}`,
                  background: COLORS.inputBg,
                  color: COLORS.text,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none',
                }}
              />
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: value || '#000000',
                  border: `1px solid ${COLORS.border}`,
                  flexShrink: 0,
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: '100%',
                padding: '8px 0',
                borderRadius: 8,
                border: 'none',
                background: COLORS.accent,
                color: COLORS.bg,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirmar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
