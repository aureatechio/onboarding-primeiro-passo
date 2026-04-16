import { TYPE, designTokens } from '../../../theme/design-tokens'
import { monitorTheme } from '../theme'

export default function DataRow({
  label,
  value,
  mono = false,
  editable = false,
  onChange,
  multiline = false,
}) {
  const fontFamily = mono ? designTokens.fontFamily.mono : designTokens.fontFamily.primary

  const inputStyle = {
    ...TYPE.bodySmall,
    color: monitorTheme.textPrimary,
    background: monitorTheme.cardMutedBg,
    border: `1px solid ${monitorTheme.border}`,
    borderRadius: 6,
    padding: '4px 8px',
    width: '100%',
    fontFamily,
    resize: multiline ? 'vertical' : 'none',
    boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px minmax(0,1fr)',
        gap: 10,
        alignItems: 'start',
        padding: '8px 0',
        borderBottom: `1px solid ${monitorTheme.borderSoft}`,
      }}
    >
      <div
        style={{
          ...TYPE.caption,
          color: monitorTheme.textMuted,
          fontFamily,
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...TYPE.bodySmall,
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
              style={inputStyle}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange?.(e.target.value)}
              style={inputStyle}
            />
          )
        ) : (
          value || '-'
        )}
      </div>
    </div>
  )
}
