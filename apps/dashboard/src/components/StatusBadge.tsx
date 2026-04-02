import { Badge } from '@/components/ui/badge'
import { STATUS_COLORS } from '@/lib/constants'

interface StatusBadgeProps {
  status: string | null | undefined
  label?: string
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status ?? 'pending'
  const colors = STATUS_COLORS[key] ?? STATUS_COLORS.pending!
  const displayLabel = label ?? key.replace(/_/g, ' ')

  return (
    <Badge variant="outline" className={`${colors.bg} ${colors.text} border-0`}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {displayLabel}
    </Badge>
  )
}
