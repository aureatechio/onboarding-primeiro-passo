import { HEALTH_COLORS } from '@/lib/constants'

interface ContractHealthDotProps {
  status: string | null | undefined
}

export function ContractHealthDot({ status }: ContractHealthDotProps) {
  type HealthKey = keyof typeof HEALTH_COLORS

  const key: HealthKey =
    status && status in HEALTH_COLORS ? (status as HealthKey) : 'inativo'
  const config = HEALTH_COLORS[key] ?? { dot: 'bg-zinc-400', label: 'Inativo' }

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.dot}`} />
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  )
}
