import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AuditAlert } from '@/lib/checkout-monitor'
import {
  getAlertSeverity,
  getAlertLabel,
  getAlertBadgeStyle,
  MONITOR_HELP_TEXTS,
} from '@/lib/checkout-monitor'
import { InfoDialog } from './InfoDialog'
import { timeAgo } from '@/lib/mask'

interface AlertsTimelineProps {
  alerts: AuditAlert[]
}

export function AlertsTimeline({ alerts }: AlertsTimelineProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm">
            Alertas recentes ({alerts.length})
          </CardTitle>
          <InfoDialog title="Alertas recentes">
            <p>{MONITOR_HELP_TEXTS.alertsTimeline}</p>
          </InfoDialog>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum alerta registrado.
          </p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alerts.map((alert) => {
              const severity = getAlertSeverity(alert.event_type)
              const badgeClass = getAlertBadgeStyle(severity)

              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Badge variant="outline" className={`shrink-0 ${badgeClass}`}>
                    {severity === 'critical'
                      ? 'Crítico'
                      : severity === 'warning'
                        ? 'Atenção'
                        : 'Info'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {getAlertLabel(alert.event_type)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.function_name}
                      {alert.metadata && typeof alert.metadata === 'object'
                        ? ` • ${JSON.stringify(alert.metadata).slice(0, 120)}`
                        : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(alert.created_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
