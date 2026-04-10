import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TYPE, designTokens } from '../../../theme/design-tokens'
import { monitorRadius, monitorTheme } from '../theme'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.3)',
}

const cardStyle = {
  background: '#fff',
  borderRadius: monitorRadius.xxl,
  padding: designTokens.space[11],
  maxWidth: 420,
  width: '90vw',
  boxShadow: designTokens.elevation.ctaLg,
  position: 'relative',
}

const closeButtonStyle = {
  position: 'absolute',
  top: 12,
  right: 12,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: monitorTheme.textMuted,
  padding: 4,
  borderRadius: monitorRadius.sm,
}

const exampleStyle = {
  ...TYPE.caption,
  color: monitorTheme.textSecondary,
  background: '#f8fafc',
  borderRadius: monitorRadius.md,
  padding: '8px 12px',
  marginBottom: 6,
  lineHeight: 1.5,
}

export default function FieldInfoModal({ open, onClose, title, description, examples }) {
  const cardRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  const handleOverlayClick = (e) => {
    if (cardRef.current && !cardRef.current.contains(e.target)) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            ref={cardRef}
            style={cardStyle}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <button type="button" onClick={onClose} style={closeButtonStyle} aria-label="Fechar">
              <X size={16} />
            </button>

            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, color: monitorTheme.textPrimary, marginBottom: 8, paddingRight: 24 }}>
              {title}
            </h3>

            {description && (
              <p style={{ ...TYPE.bodySmall, color: monitorTheme.textSecondary, lineHeight: 1.6, marginBottom: 12 }}>
                {description}
              </p>
            )}

            {examples && examples.length > 0 && (
              <div>
                <p style={{ ...TYPE.caption, fontWeight: 600, color: monitorTheme.textMuted, marginBottom: 6 }}>
                  Exemplos de uso:
                </p>
                {examples.map((ex, i) => (
                  <div key={i} style={exampleStyle}>{ex}</div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
