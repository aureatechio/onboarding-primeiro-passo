import { Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDateShort } from '@/lib/mask'

interface AditivoIndicatorProps {
  temAditivo: boolean
  aditivoStatus: string | null
  aditivoSentAt: string | null
  aditivoSignedAt: string | null
  aditivoStorageUrl: string | null
}

const STATUS_STYLES: Record<string, string> = {
  Assinado: 'bg-emerald-50 text-emerald-700',
  'Aguardando Assinatura': 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
}

export function AditivoIndicator({
  temAditivo,
  aditivoStatus,
  aditivoSentAt,
  aditivoSignedAt,
  aditivoStorageUrl,
}: AditivoIndicatorProps) {
  if (!temAditivo) return <span className="text-muted-foreground">—</span>

  const label = aditivoStatus ?? 'Em analise'
  const statusClasses = STATUS_STYLES[label] ?? 'bg-zinc-100 text-zinc-600'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${statusClasses} border-0`}>
            <Paperclip className="h-3 w-3 mr-1" />
            {label === 'Aguardando Assinatura' ? 'Aguardando' : label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">
          <div className="space-y-1">
            <p>
              <strong>Status:</strong> {label}
            </p>
            <p>
              <strong>Envio:</strong> {formatDateShort(aditivoSentAt)}
            </p>
            <p>
              <strong>Assinatura:</strong> {formatDateShort(aditivoSignedAt)}
            </p>
            {aditivoStorageUrl ? (
              <a
                href={aditivoStorageUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Abrir PDF do aditivo
              </a>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
