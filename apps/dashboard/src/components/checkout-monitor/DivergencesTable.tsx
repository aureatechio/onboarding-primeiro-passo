import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StatusDivergence } from '@/lib/checkout-monitor'
import { getDivergenceLabel, MONITOR_HELP_TEXTS } from '@/lib/checkout-monitor'
import { timeAgo } from '@/lib/mask'
import { InfoDialog } from './InfoDialog'

interface DivergencesTableProps {
  divergences: StatusDivergence[]
}

const PAGE_SIZE = 10

export function DivergencesTable({ divergences }: DivergencesTableProps) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(divergences.length / PAGE_SIZE))
  const paginated = divergences.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  )

  useEffect(() => {
    setPage(0)
  }, [divergences.length])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm">
            Divergências session/compra ({divergences.length})
          </CardTitle>
          <InfoDialog title="Divergências session/compra">
            <p>{MONITOR_HELP_TEXTS.divergencesTable}</p>
          </InfoDialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {divergences.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma divergência detectada.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Compra ID
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status Compra
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status Sessão
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Divergência
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Atualização
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((d) => (
                    <tr
                      key={`${d.compra_id}-${d.session_id}`}
                      className="border-b hover:bg-muted/25"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {d.compra_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">{d.compra_checkout_status}</td>
                      <td className="px-4 py-3">{d.session_status}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            d.divergence_type ===
                            'session_completed_but_compra_not_paid'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {getDivergenceLabel(d.divergence_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {timeAgo(d.session_updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/transaction/${d.compra_id}`}
                          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Ver transação
                        </Link>
                      </td>
                    </tr>
                  ))}
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
