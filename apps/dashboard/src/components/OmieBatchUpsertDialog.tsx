import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Play, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TransactionsFilters } from '@/hooks/useTransactions'
import { useOmieUpsertOsBatch } from '@/hooks/useOmieUpsertOsBatch'

type SelectionMode = 'page' | 'all_filtered'

interface OmieBatchUpsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: SelectionMode
  selectedIds: string[]
  selectedCount: number
  totalFilteredCount: number
  filters: TransactionsFilters
  onFinished?: () => void
}

export function OmieBatchUpsertDialog({
  open,
  onOpenChange,
  mode,
  selectedIds,
  selectedCount,
  totalFilteredCount,
  filters,
  onFinished,
}: OmieBatchUpsertDialogProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const batch = useOmieUpsertOsBatch()

  const overLimit = mode === 'all_filtered' && totalFilteredCount > batch.maxBatchIds
  const canStart = adminPassword.trim().length > 0 && selectedCount > 0 && !overLimit

  const selectionLabel = useMemo(() => {
    if (mode === 'all_filtered') {
      return `Todos os ${totalFilteredCount} resultados filtrados`
    }
    return `${selectedCount} transação(ões) selecionada(s) na página atual`
  }, [mode, selectedCount, totalFilteredCount])

  const formatDuration = (ms: number | null): string => {
    if (ms == null) return '—'
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const formatRate = (value: number | null): string => {
    if (value == null || !Number.isFinite(value)) return '—'
    return `${value.toFixed(1)} itens/min`
  }

  const handleStart = async () => {
    const success = await batch.start({
      mode,
      selectedIds,
      filters,
      totalFilteredCount,
      adminPassword,
    })
    if (success) onFinished?.()
  }

  const handleRetryFailed = async () => {
    const success = await batch.retryFailed(adminPassword)
    if (success) onFinished?.()
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAdminPassword('')
      batch.clear()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Upsert OS em massa
          </DialogTitle>
          <DialogDescription>
            Executa `omie-upsert-os` por compra, em lote controlado (blocos de 20 e concorrência 2).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Escopo</span>
              <span className="font-medium">{selectionLabel}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Limite por execução</span>
              <span className="font-medium">{batch.maxBatchIds} compras</span>
            </div>
          </div>

          {overLimit && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A seleção atual possui {totalFilteredCount} itens e excede o limite de {batch.maxBatchIds} por execução.
              Refine os filtros para reduzir o volume.
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="batch-admin-password" className="text-sm font-medium">
              Senha de admin
            </label>
            <PasswordInput
              id="batch-admin-password"
              placeholder="Digite a senha para confirmar"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              disabled={batch.loading || batch.running}
            />
          </div>

          {batch.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {batch.error}
            </div>
          )}

          {batch.summary && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Execução {batch.summary.status}
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-800">
                  <span>
                    Progresso: {batch.summary.processed_count}/{batch.requestedCount}
                  </span>
                  <span>{batch.progressPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full rounded bg-emerald-100">
                  <div
                    className="h-2 rounded bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, batch.progressPercent))}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-emerald-700 sm:grid-cols-3">
                <span>Processados: {batch.summary.processed_count}</span>
                <span>Sucesso: {batch.summary.success_count}</span>
                <span>Falha: {batch.summary.failed_count}</span>
                <span>Pendentes: {batch.summary.pending_count}</span>
                <span>Executando: {batch.summary.running_count}</span>
                <span>Pulados: {batch.summary.skipped_count}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-emerald-700 sm:grid-cols-3">
                <span>Tempo decorrido: {formatDuration(batch.elapsedMs)}</span>
                <span>ETA: {batch.etaMs == null ? '—' : formatDuration(batch.etaMs)}</span>
                <span>Velocidade: {formatRate(batch.throughputPerMin)}</span>
                <span>Restantes: {batch.remainingCount}</span>
                <span>
                  Atualizado há:{' '}
                  {batch.lastUpdatedAtMs
                    ? `${Math.max(0, Math.floor((Date.now() - batch.lastUpdatedAtMs) / 1000))}s`
                    : '—'}
                </span>
              </div>
            </div>
          )}

          {batch.items.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-2 text-left">Compra</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Tentativas</th>
                    <th className="px-2 py-2 text-left">Duração</th>
                    <th className="px-2 py-2 text-left">Correlação</th>
                    <th className="px-2 py-2 text-left">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-2 py-1 font-mono">{item.compra_id.slice(0, 8)}...</td>
                      <td className="px-2 py-1">{item.status}</td>
                      <td className="px-2 py-1">{item.attempts}</td>
                      <td className="px-2 py-1">{formatDuration(item.duration_ms)}</td>
                      <td className="px-2 py-1 font-mono">
                        {item.correlation_id ? `${item.correlation_id.slice(0, 12)}...` : '—'}
                      </td>
                      <td className="px-2 py-1">
                        {item.error_code ? `${item.error_code}${item.error_message ? `: ${item.error_message}` : ''}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={batch.loading || batch.running}>
            Fechar
          </Button>
          <Button
            variant="secondary"
            onClick={handleRetryFailed}
            disabled={batch.loading || batch.running || !adminPassword.trim() || !batch.summary || batch.summary.failed_count <= 0}
          >
            {batch.loading || batch.running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            Reprocessar falhas
          </Button>
          <Button onClick={handleStart} disabled={!canStart || batch.loading || batch.running}>
            {batch.loading || batch.running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {batch.running ? 'Processando...' : 'Iniciar lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
