import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { dashboardRadius, dashboardTheme } from '../../theme/dashboard-tokens'
import DashboardButton from './DashboardButton'

export default function DashboardModal({
  isOpen = true,
  title,
  children,
  onClose,
  closeDisabled = false,
  maxWidth = 480,
  labelledBy,
  initialFocusRef,
  style,
}) {
  const generatedId = useId()
  const titleId = labelledBy || `${generatedId}-title`
  const panelRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    previousFocusRef.current = document.activeElement
    const target = initialFocusRef?.current || panelRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    window.setTimeout(() => target?.focus?.(), 0)

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !closeDisabled) {
        event.preventDefault()
        onClose?.()
      }
      if (event.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [closeDisabled, initialFocusRef, isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabled) onClose?.()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: dashboardTheme.modalOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth,
          background: dashboardTheme.surface,
          border: `1px solid ${dashboardTheme.border}`,
          borderRadius: dashboardRadius.xl,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          ...style,
        }}
      >
        {title ? (
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '16px 20px',
              borderBottom: `1px solid ${dashboardTheme.border}`,
            }}
          >
            <h2 id={titleId} style={{ margin: 0, color: dashboardTheme.textPrimary, fontSize: 16, fontWeight: 800 }}>
              {title}
            </h2>
            {!closeDisabled ? (
              <DashboardButton variant="icon" size="sm" onClick={onClose} aria-label="Fechar">
                <X size={14} aria-hidden="true" />
              </DashboardButton>
            ) : null}
          </header>
        ) : null}
        {children}
      </section>
    </div>
  )
}
