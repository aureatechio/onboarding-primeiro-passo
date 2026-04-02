import { AlertCircle, CheckCircle2, Clock3, Layers3, Loader2 } from 'lucide-react'
import { STATUS_META } from '../constants'
import { monitorTheme, monitorRadius } from '../theme'

export default function StatusBadge({ status }) {
  const paletteByStatus = {
    pending: { bg: monitorTheme.pendingBg, color: monitorTheme.pendingText, icon: Clock3 },
    processing: { bg: monitorTheme.processingBg, color: monitorTheme.processingText, icon: Loader2 },
    completed: { bg: monitorTheme.completedBg, color: monitorTheme.completedText, icon: CheckCircle2 },
    partial: { bg: monitorTheme.pendingBg, color: monitorTheme.pendingText, icon: AlertCircle },
    failed: { bg: monitorTheme.failedBg, color: monitorTheme.failedText, icon: AlertCircle },
  }

  const metadata = STATUS_META[status] || { label: 'Sem job' }
  const palette = paletteByStatus[status] || {
    bg: monitorTheme.neutralBadgeBg,
    color: monitorTheme.neutralBadgeText,
    icon: Layers3,
  }

  const Icon = palette.icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: palette.bg,
        color: palette.color,
        borderRadius: monitorRadius.pill,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <Icon size={14} className={status === 'processing' ? 'animate-spin' : ''} />
      {metadata.label}
    </span>
  )
}
