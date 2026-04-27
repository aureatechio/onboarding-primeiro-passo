import { dashboardRadius, dashboardTheme } from '../../theme/dashboard-tokens'

const TONES = {
  success: {
    bg: dashboardTheme.successBg,
    border: dashboardTheme.successBorder,
    color: dashboardTheme.successText,
    role: 'status',
  },
  error: {
    bg: dashboardTheme.dangerBg,
    border: dashboardTheme.dangerBorder,
    color: dashboardTheme.dangerTextStrong,
    role: 'alert',
  },
  warning: {
    bg: dashboardTheme.warningBg,
    border: dashboardTheme.warningBorder,
    color: dashboardTheme.warningText,
    role: 'alert',
  },
  info: {
    bg: dashboardTheme.infoBg,
    border: dashboardTheme.infoBorder,
    color: dashboardTheme.infoText,
    role: 'status',
  },
}

export default function InlineNotice({ tone = 'info', children, style, role }) {
  const config = TONES[tone] || TONES.info
  return (
    <div
      role={role || config.role}
      aria-live={tone === 'error' || tone === 'warning' ? 'assertive' : 'polite'}
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: dashboardRadius.md,
        color: config.color,
        padding: 12,
        fontSize: 12,
        lineHeight: 1.5,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
