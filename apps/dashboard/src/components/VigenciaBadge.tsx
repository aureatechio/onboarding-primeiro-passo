import { Badge } from '@/components/ui/badge'

interface VigenciaBadgeProps {
  fimdireitouso: string | null | undefined
}

export function VigenciaBadge({ fimdireitouso }: VigenciaBadgeProps) {
  if (!fimdireitouso) {
    return (
      <Badge variant="outline" className="bg-zinc-100 text-zinc-500 border-0">
        Sem data
      </Badge>
    )
  }

  const dueDate = new Date(fimdireitouso)
  if (isNaN(dueDate.getTime())) {
    return (
      <Badge variant="outline" className="bg-zinc-100 text-zinc-500 border-0">
        Sem data
      </Badge>
    )
  }

  const now = new Date()
  const diffMs = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-0">
        Vencido
      </Badge>
    )
  }

  if (diffDays <= 60) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-0">
        Vence em {diffDays}d
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-0">
      Vigente
    </Badge>
  )
}
