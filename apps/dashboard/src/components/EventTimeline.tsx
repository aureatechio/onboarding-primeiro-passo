import { useState } from 'react'
import { AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/mask'
import { STAGE_LABELS, EVENT_DESCRIPTIONS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DeclineAssistantModal } from '@/components/DeclineAssistantModal'
import type { TimelineEvent } from '@/hooks/useTransactionTimeline'

function EventIcon({ hasError }: { hasError: boolean }) {
  if (hasError) return <AlertCircle className="h-4 w-4 text-red-500" />
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
}

type SelectedError = {
  errorCode: string
  errorMessage: string
  compraId: string
  stage: string
}

interface EventTimelineProps {
  events: TimelineEvent[]
  loading?: boolean
}

export function EventTimeline({ events, loading }: EventTimelineProps) {
  const [selectedError, setSelectedError] = useState<SelectedError | null>(null)
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Clock className="mr-2 h-4 w-4 animate-spin" />
        Carregando timeline...
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Nenhum evento registrado.
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-border" />

      {events.map((event, i) => {
        const hasError = !!event.error_code
        return (
          <div
            key={`${event.event_at}-${event.event}-${i}`}
            className="relative flex items-start gap-4 py-2 pl-0"
          >
            {/* Dot */}
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background border">
              <EventIcon hasError={hasError} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                {EVENT_DESCRIPTIONS[event.event] ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm font-medium cursor-help border-b border-dashed border-muted-foreground/40">
                        {event.event}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      {EVENT_DESCRIPTIONS[event.event]}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-sm font-medium">{event.event}</span>
                )}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {STAGE_LABELS[event.stage] ?? event.stage}
                </Badge>
                {event.source && (
                  <span className="text-[10px] text-muted-foreground">
                    {event.source}
                  </span>
                )}
                {event.execution_time_ms != null && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Zap className="h-2.5 w-2.5" />
                    {event.execution_time_ms}ms
                  </span>
                )}
              </div>

              {hasError && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedError({
                      errorCode: event.error_code!,
                      errorMessage: event.error_message ?? '',
                      compraId: event.compra_id,
                      stage: event.stage,
                    })
                  }
                  className={cn(
                    'mt-1 w-full rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 text-left',
                    'hover:bg-red-100 hover:border-red-300 transition-colors cursor-pointer',
                  )}
                >
                  <span className="font-medium">{event.error_code}</span>
                  {event.error_message && `: ${event.error_message}`}
                </button>
              )}

              <span className="text-[10px] text-muted-foreground">
                {formatDate(event.event_at)}
              </span>
            </div>
          </div>
        )
      })}

      <DeclineAssistantModal
        open={!!selectedError}
        onOpenChange={() => setSelectedError(null)}
        errorCode={selectedError?.errorCode ?? ''}
        errorMessage={selectedError?.errorMessage ?? ''}
        compraId={selectedError?.compraId ?? ''}
        stage={selectedError?.stage ?? 'checkout'}
      />
    </div>
  )
}
