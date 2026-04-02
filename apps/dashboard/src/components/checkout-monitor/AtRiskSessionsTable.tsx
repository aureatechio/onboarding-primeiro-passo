import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useManualReconcile } from '@/hooks/useManualReconcile'
import type { PendingSessionSla } from '@/lib/checkout-monitor'
import {
  getSlaBadgeStyle,
  formatMinutesAgo,
  MONITOR_HELP_TEXTS,
} from '@/lib/checkout-monitor'
import { InfoDialog } from './InfoDialog'

interface AtRiskSessionsTableProps {
  sessions: PendingSessionSla[]
}

const PAGE_SIZE = 10

function methodLabel(method: string): string {
  const m = method?.toLowerCase()
  if (m === 'pix') return 'PIX'
  if (m === 'cartao_recorrente') return 'Cartão Recorrente'
  if (m === 'cartao' || m === 'credit_card') return 'Cartão'
  if (m === 'boleto') return 'Boleto'
  return method || '—'
}

export function AtRiskSessionsTable({ sessions }: AtRiskSessionsTableProps) {
  const reconcile = useManualReconcile()
  const [adminPassword, setAdminPassword] = useState('')
  const [page, setPage] = useState(0)

  const atRisk = sessions.filter((s) => s.sla_bucket !== 'ok')
  const totalPages = Math.max(1, Math.ceil(atRisk.length / PAGE_SIZE))
  const paginated = atRisk.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => {
    setPage(0)
  }, [atRisk.length])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-sm">
              Sessões em risco ({atRisk.length})
            </CardTitle>
            <InfoDialog title="Sessões em risco">
              <p>{MONITOR_HELP_TEXTS.atRiskSessions}</p>
            </InfoDialog>
          </div>
          {atRisk.length > 0 && (
            <div className="flex items-center gap-2">
              <InfoDialog title="Senha admin">
                <p>{MONITOR_HELP_TEXTS.adminPassword}</p>
              </InfoDialog>
              <Input
                type="password"
                placeholder="Senha admin"
                className="w-40 text-xs"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {atRisk.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma sessão em risco no momento.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Session ID
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Método
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Tempo pendente
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      SLA
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        Ação
                        <InfoDialog title="Reconciliar">
                          <p>{MONITOR_HELP_TEXTS.reconcileButton}</p>
                        </InfoDialog>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((session) => {
                    const sla = getSlaBadgeStyle(session.sla_bucket)
                    const isLoading =
                      reconcile.loadingBySession[session.session_id] ?? false
                    const error =
                      reconcile.errorBySession[session.session_id] ?? null
                    const feedback =
                      reconcile.feedbackBySession[session.session_id] ?? null
                    const cooldown = reconcile.getCooldownSeconds(
                      session.session_id
                    )

                    return (
                      <tr
                        key={session.session_id}
                        className="border-b hover:bg-muted/25"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {session.session_id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          {methodLabel(session.metodo_pagamento)}
                        </td>
                        <td className="px-4 py-3">{session.status}</td>
                        <td className="px-4 py-3">
                          {formatMinutesAgo(session.pending_age_minutes)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={sla.className}>
                            {sla.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                isLoading ||
                                cooldown > 0 ||
                                !reconcile.isEligible(
                                  session.status,
                                  session.payment_id
                                )
                              }
                              onClick={() =>
                                void reconcile.reconcile({
                                  sessionId: session.session_id,
                                  compraId: session.compra_id,
                                  statusBefore: session.status,
                                  paymentId: session.payment_id,
                                  adminPassword,
                                })
                              }
                            >
                              {isLoading
                                ? 'Reconciliando...'
                                : cooldown > 0
                                  ? `Aguarde ${cooldown}s`
                                  : 'Reconciliar'}
                            </Button>
                            {error && (
                              <span className="text-xs text-red-600">
                                {error}
                              </span>
                            )}
                            {feedback && (
                              <span
                                className={`text-xs ${feedback.kind === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}
                              >
                                {feedback.message}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
