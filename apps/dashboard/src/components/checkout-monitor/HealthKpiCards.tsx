import { Card, CardContent } from '@/components/ui/card'
import type { CheckoutHealthKpis } from '@/lib/checkout-monitor'
import { MONITOR_HELP_TEXTS } from '@/lib/checkout-monitor'
import { InfoDialog } from './InfoDialog'

interface HealthKpiCardsProps {
  kpis: CheckoutHealthKpis | null
}

export function HealthKpiCards({ kpis }: HealthKpiCardsProps) {
  const pendingNow = kpis?.pendingSessions ?? 0
  const processingNow = kpis?.processingSessions ?? 0
  const successRate = kpis?.successRate != null ? `${kpis.successRate}%` : '—'
  const failureRate = kpis?.failureRate != null ? `${kpis.failureRate}%` : '—'
  const slaWarning = kpis?.slaWarningCount ?? 0
  const slaCritical = kpis?.slaCriticalCount ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <InfoDialog title="Pendentes">
              <p>{MONITOR_HELP_TEXTS.pendingSessions}</p>
            </InfoDialog>
          </div>
          <p className="text-2xl font-bold">{pendingNow}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">Processando</p>
            <InfoDialog title="Processando">
              <p>{MONITOR_HELP_TEXTS.processingSessions}</p>
            </InfoDialog>
          </div>
          <p className="text-2xl font-bold">{processingNow}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">Sucesso 24h</p>
            <InfoDialog title="Taxa de sucesso (24h)">
              <p>{MONITOR_HELP_TEXTS.successRate24h}</p>
            </InfoDialog>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{successRate}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">Falha 24h</p>
            <InfoDialog title="Taxa de falha (24h)">
              <p>{MONITOR_HELP_TEXTS.failureRate24h}</p>
            </InfoDialog>
          </div>
          <p className="text-2xl font-bold text-red-600">{failureRate}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">SLA Atenção</p>
            <InfoDialog title="SLA Atenção (> 15 min)">
              <p>{MONITOR_HELP_TEXTS.slaWarning}</p>
            </InfoDialog>
          </div>
          <p className="text-2xl font-bold text-amber-600">{slaWarning}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-1">
            <p className="text-sm text-muted-foreground">SLA Crítico</p>
            <InfoDialog title="SLA Crítico (> 30 min)">
              <p>{MONITOR_HELP_TEXTS.slaCritical}</p>
            </InfoDialog>
          </div>
          <p
            className={`text-2xl font-bold text-red-600 ${slaCritical > 0 ? 'animate-pulse' : ''}`}
          >
            {slaCritical}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
