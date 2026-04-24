import { useState } from 'react'
import { monitorTheme } from '../../theme'

export default function ReadOnlyBadge({ reason }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      tabIndex={0}
      aria-label={`Campo somente leitura: ${reason}`}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(139,148,158,0.15)',
          color: monitorTheme.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'help',
        }}
      >
        READ-ONLY
      </span>
      {hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 20,
            background: '#000',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 6,
            fontSize: 11,
            maxWidth: 260,
            lineHeight: 1.4,
            whiteSpace: 'normal',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {reason}
        </span>
      )}
    </span>
  )
}
