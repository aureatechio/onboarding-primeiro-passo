import { useState } from 'react'
import { formatCentsToCurrency, formatDate } from '@/lib/mask'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import type { SplitSessionItem } from '@/types/split-metrics'
import { useManualReconcile } from '@/hooks/useManualReconcile'

interface SplitGroupSessionListProps {
  sessions: SplitSessionItem[]
  loading?: boolean
}

function formatMethodLabel(method: string | null): string {
  if (!method) return '—'
  const normalized = method.toLowerCase()
  if (normalized === 'pix') return 'PIX'
  if (normalized === 'cartao_recorrente') return 'Cartão Recorrente'
  if (normalized.includes('cartao') || normalized.includes('card')) return 'Cartão'
  if (normalized.includes('boleto')) return 'Boleto'
  return method
}

function normalizeSessionStatus(status: string | null): string {
  if (!status) return '—'
  const value = status.toLowerCase().replace(/_/g, ' ')
  return value
}

function sessionStatusBadge(status: string | null) {
  if (!status) {
    return {
      label: '—',
      variant: 'outline' as const,
      className: 'text-muted-foreground',
    }
  }

  const normalized = status.toLowerCase()
  if (normalized === 'completed' || normalized === 'pago') {
    return {
      label: 'Concluído',
      variant: 'outline' as const,
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }
  }
  if (normalized === 'cancelled' || normalized === 'recusado') {
    return {
      label: 'Erro',
      variant: 'outline' as const,
      className: 'bg-red-50 text-red-700 border-red-200',
    }
  }
  if (normalized === 'partial' || normalized === 'parcial') {
    return {
      label: 'Parcial',
      variant: 'outline' as const,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }

  return {
    label: normalizeSessionStatus(status),
    variant: 'outline' as const,
    className: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  }
}

export function SplitGroupSessionList({
  sessions,
  loading,
}: SplitGroupSessionListProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const {
    isEligible,
    reconcile,
    loadingBySession,
    errorBySession,
    feedbackBySession,
    resultBySession,
    getCooldownSeconds,
  } = useManualReconcile()

  if (loading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Carregando sessões...
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma sessão para este grupo.
      </div>
    )
  }

  const rows = [...sessions].sort((a, b) => {
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-md border border-dashed p-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-muted-foreground">
          Ação manual por sessão. Informe a senha de admin para habilitar reconciliação.
        </div>
        <PasswordInput
          value={adminPassword}
          onChange={(event) => setAdminPassword(event.target.value)}
          placeholder="Senha de admin"
          className="h-8 w-full text-xs md:w-56"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
            <th className="w-24 px-3 py-2 text-left font-medium text-muted-foreground">
              Sessão
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">
              Método
            </th>
            <th className="w-28 px-3 py-2 text-left font-medium text-muted-foreground">
              Status
            </th>
            <th className="w-28 px-3 py-2 text-right font-medium text-muted-foreground">
              Valor
            </th>
            <th className="w-24 px-3 py-2 text-right font-medium text-muted-foreground">
              Tent.
            </th>
            <th className="w-40 px-3 py-2 text-left font-medium text-muted-foreground">
              Gateway
            </th>
            <th className="w-40 px-3 py-2 text-right font-medium text-muted-foreground">
              Atualizado
            </th>
            <th className="w-60 px-3 py-2 text-right font-medium text-muted-foreground">
              Ações
            </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => {
            const result = resultBySession[session.splitSessionId]
            const effectiveStatus = result?.status ?? session.status
            const effectivePaymentStatus =
              result?.payment_status ?? session.paymentStatus
            const effectiveCompletedAt = result?.completed_at ?? session.completedAt
            const badge = sessionStatusBadge(effectiveStatus)
            const labelIndex =
              session.splitIndex == null ? '' : `#${session.splitIndex}`
            const eligible = isEligible(effectiveStatus, session.paymentId)
            const loadingSession = loadingBySession[session.splitSessionId] === true
            const cooldownSeconds = getCooldownSeconds(session.splitSessionId)
            const feedback = feedbackBySession[session.splitSessionId]
            const error = errorBySession[session.splitSessionId]

              return (
                <tr key={session.splitSessionId} className="border-b">
                <td className="px-3 py-2 font-mono text-xs">
                  {labelIndex || session.splitSessionId.slice(0, 8)}
                </td>
                <td className="px-3 py-2">{formatMethodLabel(session.metodoPagamento)}</td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={badge.className}
                  >
                    {badge.label}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCentsToCurrency(session.valor)}
                </td>
                <td className="px-3 py-2 text-right">{session.attempts}</td>
                <td className="px-3 py-2">{session.gateway}</td>
                <td className="px-3 py-2 text-right">
                  {session.updatedAt ? formatDate(session.updatedAt) : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      size="sm"
                      onClick={() =>
                        void reconcile({
                          sessionId: session.splitSessionId,
                          compraId: session.compraId,
                          statusBefore: effectiveStatus,
                          paymentId: session.paymentId,
                          adminPassword,
                        })
                      }
                      disabled={
                        !eligible ||
                        !adminPassword.trim() ||
                        loadingSession ||
                        cooldownSeconds > 0
                      }
                    >
                      {loadingSession
                        ? 'Reconciliando...'
                        : cooldownSeconds > 0
                          ? `Aguarde ${cooldownSeconds}s`
                          : 'Reconciliar'}
                    </Button>
                    {!eligible && (
                      <span className="text-[10px] text-muted-foreground">
                        Exige pending/processing + payment_id
                      </span>
                    )}
                    {effectivePaymentStatus != null && (
                      <span className="text-[10px] text-muted-foreground">
                        Status Cielo: {effectivePaymentStatus}
                      </span>
                    )}
                    {effectiveCompletedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        Pago em {formatDate(effectiveCompletedAt)}
                      </span>
                    )}
                    {feedback && (
                      <span
                        className={
                          feedback.kind === 'success'
                            ? 'text-[10px] text-emerald-700'
                            : 'text-[10px] text-amber-700'
                        }
                      >
                        {feedback.message}
                      </span>
                    )}
                    {error && <span className="text-[10px] text-red-700">{error}</span>}
                  </div>
                </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
