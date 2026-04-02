import { AlertCircle, RefreshCw, CircleCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsToCurrency, formatDate } from '@/lib/mask'
import { getSplitStatusForTable, getSplitTypeLabel, isSplitStuck } from '@/lib/split-status'
import type { SplitGroupDetail } from '@/types/split-metrics'
import { SplitGroupSessionList } from './SplitGroupSessionList'

interface SplitGroupDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading: boolean
  error: string | null
  detail: SplitGroupDetail | null
  onRefresh?: () => void
}

const STUCK_THRESHOLD_MINUTES = 120

const EVENT_LABELS: Record<string, string> = {
  PAYMENT_STARTED: 'Pagamento iniciado',
  PAYMENT_PROCESSING: 'Pagamento em processamento',
  PAYMENT_RETRY: 'Nova tentativa',
  PAYMENT_SUCCESS: 'Pagamento aprovado',
  PAYMENT_ERROR: 'Falha no pagamento',
  MANUAL_RECONCILE: 'Reconciliação manual',
  WEBHOOK_RECEIVED: 'Webhook recebido',
  SESSION_CREATED: 'Sessão criada',
  CHECKOUT_UPDATED: 'Checkout atualizado',
}

const ERROR_CODE_HINT: Record<string, string> = {
  '05': 'Transação não autorizada',
  '51': 'Saldo/limite insuficiente',
  '57': 'Transação não permitida',
  '62': 'Transação bloqueada temporariamente',
  '91': 'Emissor fora do ar',
  '96': 'Falha de sistema',
}

function formatEventLabel(type: string, code: string | null): string {
  const base = EVENT_LABELS[type] ?? type.replace(/_/g, ' ')
  const normalized = (code || '').trim()
  return normalized ? `${base} (${normalized})` : base
}

function formatEventHint(errorCode: string | null): string | null {
  if (!errorCode) return null
  return ERROR_CODE_HINT[errorCode] ?? 'Consulte o log para detalhes adicionais'
}

function splitStatusBadge(status: string, isStuck: boolean) {
  if (isStuck) {
    return {
      label: 'Em risco',
      className: 'bg-red-50 text-red-700 border-red-200',
    }
  }

  const resolved = getSplitStatusForTable(status)
  if (resolved.variant === 'success') {
    return {
      label: resolved.label,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (resolved.variant === 'warning') {
    return {
      label: resolved.label,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }
  if (resolved.variant === 'destructive') {
    return {
      label: resolved.label,
      className: 'bg-red-50 text-red-700 border-red-200',
    }
  }

  return {
    label: resolved.label,
    className: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  }
}

function formatRelativeMinutes(minutes: number | null): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

export function SplitGroupDetailDrawer({
  open,
  onOpenChange,
  loading,
  error,
  detail,
  onRefresh,
}: SplitGroupDetailDrawerProps) {
  const group = detail?.group
  const sessions = detail?.sessions ?? []
  const events = detail?.events ?? []

  const isStuck = group
    ? isSplitStuck(group.status, group.updatedAt, STUCK_THRESHOLD_MINUTES)
    : false

  const progress = group
    ? group.sessoesTotal > 0
      ? Math.round((group.sessoesPagas / group.sessoesTotal) * 100)
      : 0
    : 0

  const badge = group
    ? splitStatusBadge(group.status, isStuck)
    : { label: '—', className: 'bg-zinc-50 text-zinc-700 border-zinc-200' }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-5xl overflow-hidden gap-4 sm:h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Detalhe do Grupo</span>
            {group && (
              <Badge variant="outline" className={badge.className}>
                {badge.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {group ? (
              <span className="font-mono text-xs text-muted-foreground">
                ID: {group.groupId}
              </span>
            ) : (
              'Selecione um grupo para visualizar o detalhe.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden gap-4 lg:flex-row">
          <div className="w-full space-y-4 overflow-y-auto pr-1 sm:pr-2">
            {loading && (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Carregando detalhe...
                </CardContent>
              </Card>
            )}

            {error && (
              <Card>
                <CardContent className="py-3 text-sm text-red-700 bg-red-50 border-red-200">
                  {error}
                </CardContent>
              </Card>
            )}

            {!group && !loading && !error && (
              <Card>
                <CardContent className="py-3 text-sm text-muted-foreground">
                  Nenhum grupo selecionado.
                </CardContent>
              </Card>
            )}

            {group && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Informações do grupo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between border-b border-dashed pb-1">
                      <span className="text-muted-foreground">Tipo</span>
                      <span>{getSplitTypeLabel(group.splitType)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed pb-1">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{group.status}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed pb-1">
                      <span className="text-muted-foreground">Sessões</span>
                      <span className="font-medium">
                        {group.sessoesPagas}/{group.sessoesTotal}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed pb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed pb-1">
                      <span className="text-muted-foreground">Valor</span>
                      <span className="font-medium">{formatCentsToCurrency(group.valor)}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dashed pb-1">
                      <span className="text-muted-foreground">Atualizado</span>
                      <span className="font-medium">
                        {group.updatedAt ? formatDate(group.updatedAt) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-muted-foreground">Sem atualização há</span>
                      <span className="font-medium">
                        {formatRelativeMinutes(group.tempoDesdeAtualizacaoMinutos)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sessões</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SplitGroupSessionList sessions={sessions} loading={loading} />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Eventos</CardTitle>
                    {onRefresh && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Atualizar
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Nenhum evento registrado.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {events.map((event, index) => {
                          const hint = formatEventHint(event.errorCode)
                          const hasError = !!event.errorCode || !!event.errorMessage
                          return (
                            <div
                              key={`${event.eventAt}-${event.eventType}-${index}`}
                              className="rounded-md border border-border p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {hasError ? (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <CircleCheck className="h-4 w-4 text-emerald-600" />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium">
                                      {formatEventLabel(event.eventType, event.errorCode)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {event.sessionId
                                        ? `Sessão ${event.sessionId.slice(0, 8)}…`
                                        : 'Sistema'}
                                      {event.functionName ? ` • ${event.functionName}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {event.eventAt ? formatDate(event.eventAt) : '—'}
                                </p>
                              </div>

                              {(hint || event.errorMessage) && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {hint ?? event.errorMessage}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

