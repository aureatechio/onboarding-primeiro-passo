import { TYPE, designTokens } from '../../../theme/design-tokens'
import { monitorTheme } from '../theme'

export default function DataRow({ label, value, mono = false }) {
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
          fontFamily: mono ? designTokens.fontFamily.mono : designTokens.fontFamily.primary,
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...TYPE.bodySmall,
          color: monitorTheme.textPrimary,
          wordBreak: 'break-word',
          fontFamily: mono ? designTokens.fontFamily.mono : designTokens.fontFamily.primary,
        }}
      >
        {value || '-'}
      </div>
    </div>
  )
}
