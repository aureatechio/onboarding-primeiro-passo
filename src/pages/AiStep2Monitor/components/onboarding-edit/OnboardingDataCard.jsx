import { useState } from 'react'
import { monitorTheme } from '../../theme'

const ACELERAI_BLUE = monitorTheme.actionPrimaryBg

export default function OnboardingDataCard({ title, description, children, actions }) {
  const [hover, setHover] = useState(false)

  return (
    <section
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: monitorTheme.cardMutedBg,
        border: `1px solid ${hover ? ACELERAI_BLUE : monitorTheme.border}`,
        borderRadius: 12,
        padding: 20,
        boxShadow: hover ? `0 0 0 1px ${ACELERAI_BLUE}33, 0 0 24px -6px ${ACELERAI_BLUE}66` : 'none',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: description ? 6 : 16,
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: monitorTheme.textPrimary,
              }}
            >
              {title}
            </h3>
          )}
          {actions}
        </header>
      )}
      {description && (
        <p
          style={{
            margin: '0 0 16px',
            fontSize: 12,
            color: monitorTheme.textSecondary,
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {children}
    </section>
  )
}
