import { designTokens } from '../../../theme/design-tokens'
import { monitorTheme } from '../theme'

const MONO = `'JetBrains Mono', 'Fira Mono', monospace`
const SANS = `'Inter', system-ui, sans-serif`

export default function DataRow({
  label,
  value,
  mono = false,
  editable = false,
  onChange,
  multiline = false,
}) {
  const fontFamily = mono ? MONO : SANS

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px minmax(0,1fr)',
        gap: 12,
        alignItems: 'start',
        padding: '7px 8px',
        borderRadius: 6,
        marginLeft: -8,
        marginRight: -8,
        borderBottom: `1px solid ${monitorTheme.borderSoft}`,
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(240,246,252,0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: monitorTheme.textMuted,
          fontFamily: MONO,
          paddingTop: 1,
          userSelect: 'none',
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.55,
          color: monitorTheme.textPrimary,
          wordBreak: 'break-word',
          fontFamily,
        }}
      >
        {editable ? (
          multiline ? (
            <textarea
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              rows={3}
              style={{
                fontSize: 13,
                color: monitorTheme.textPrimary,
                background: monitorTheme.cardMutedBg,
                border: `1px solid ${monitorTheme.borderStrong}`,
                borderRadius: 6,
                padding: '6px 8px',
                width: '100%',
                fontFamily,
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.55,
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = monitorTheme.brand)}
              onBlur={(e) => (e.target.style.borderColor = monitorTheme.borderStrong)}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              style={{
                fontSize: 13,
                color: monitorTheme.textPrimary,
                background: monitorTheme.cardMutedBg,
                border: `1px solid ${monitorTheme.borderStrong}`,
                borderRadius: 6,
                padding: '5px 8px',
                width: '100%',
                fontFamily,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = monitorTheme.brand)}
              onBlur={(e) => (e.target.style.borderColor = monitorTheme.borderStrong)}
            />
          )
        ) : (
          <span style={{ color: value ? monitorTheme.textPrimary : monitorTheme.textMuted }}>
            {value || '—'}
          </span>
        )}
      </div>
    </div>
  )
}
