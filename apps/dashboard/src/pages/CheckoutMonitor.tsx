import { RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCheckoutMonitor } from '@/hooks/useCheckoutMonitor'
import { HealthKpiCards } from '@/components/checkout-monitor/HealthKpiCards'
import { StatusDistributionChart } from '@/components/checkout-monitor/StatusDistributionChart'
import { AtRiskSessionsTable } from '@/components/checkout-monitor/AtRiskSessionsTable'
import { DivergencesTable } from '@/components/checkout-monitor/DivergencesTable'
import { AlertsTimeline } from '@/components/checkout-monitor/AlertsTimeline'
import { GlossaryDialog } from '@/components/checkout-monitor/GlossaryDialog'
import { InfoDialog } from '@/components/checkout-monitor/InfoDialog'
import { formatMinutesAgo, MONITOR_HELP_TEXTS } from '@/lib/checkout-monitor'

export function CheckoutMonitorPage() {
  const monitor = useCheckoutMonitor()

  const lastUpdatedLabel = monitor.lastUpdated
    ? `Atualizado ${formatMinutesAgo(
        (Date.now() - monitor.lastUpdated.getTime()) / 60_000
      )} atrás`
    : ''

  const avgCompletion =
    monitor.kpis?.avgCompletionSeconds != null
      ? monitor.kpis.avgCompletionSeconds < 60
        ? `${monitor.kpis.avgCompletionSeconds}s`
        : `${Math.round(monitor.kpis.avgCompletionSeconds / 60)} min`
      : '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Checkout Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Saúde operacional do checkout em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdatedLabel && (
            <span className="text-xs text-muted-foreground">
              {lastUpdatedLabel}
            </span>
          )}
          <GlossaryDialog />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void monitor.refetch()}
            disabled={monitor.loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${monitor.loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {monitor.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">
            {monitor.error}
          </CardContent>
        </Card>
      )}

      <HealthKpiCards kpis={monitor.kpis} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Total sessões 24h</p>
              <InfoDialog title="Total de sessões (24h)">
                <p>{MONITOR_HELP_TEXTS.totalSessions24h}</p>
              </InfoDialog>
            </div>
            <p className="text-2xl font-bold">
              {monitor.kpis?.totalLast24h ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Tempo médio conclusão</p>
              <InfoDialog title="Tempo médio de conclusão">
                <p>{MONITOR_HELP_TEXTS.avgCompletion}</p>
              </InfoDialog>
            </div>
            <p className="text-2xl font-bold">{avgCompletion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Divergências</p>
              <InfoDialog title="Divergências session/compra">
                <p>{MONITOR_HELP_TEXTS.divergences}</p>
              </InfoDialog>
            </div>
            <p
              className={`text-2xl font-bold ${
                (monitor.kpis?.divergenceCount ?? 0) > 0
                  ? 'text-amber-600'
                  : ''
              }`}
            >
              {monitor.kpis?.divergenceCount ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <StatusDistributionChart
        distribution={monitor.statusDistribution}
        webhookSignal={monitor.webhookSignal}
      />

      <AtRiskSessionsTable sessions={monitor.pendingSessions} />

      <DivergencesTable divergences={monitor.divergences} />

      <AlertsTimeline alerts={monitor.alerts} />
    </div>
  )
}
