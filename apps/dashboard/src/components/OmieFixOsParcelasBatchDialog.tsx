import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  RotateCw,
} from 'lucide-react'
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
import {
  useOmieFixOsParcelasBatch,
  type FixExecutionMode,
} from '@/hooks/useOmieFixOsParcelasBatch'

type SelectionMode = 'page' | 'all_filtered'

interface OmieFixOsParcelasBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: SelectionMode
  selectedIds: string[]
  selectedCount: number
  totalFilteredCount: number
  filters: TransactionsFilters
  onFinished?: () => void
}

export function OmieFixOsParcelasBatchDialog({
  open,
  onOpenChange,
  mode,
  selectedIds,
  selectedCount,
  totalFilteredCount,
  filters,
  onFinished,
}: OmieFixOsParcelasBatchDialogProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const [dryRunCompletedRunId, setDryRunCompletedRunId] = useState<string | null>(
    null
  )
  const [lastExecutionMode, setLastExecutionMode] =
    useState<FixExecutionMode>('dry_run')
  const batch = useOmieFixOsParcelasBatch()

  const overLimit = mode === 'all_filtered' && totalFilteredCount > batch.maxBatchIds
  const canStartDryRun =
    adminPassword.trim().length > 0 && selectedCount > 0 && !overLimit
  const canStartExecute =
    canStartDryRun && !!dryRunCompletedRunId && !batch.running && !batch.loading

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

  const formatActionLabel = (action: string | null): string => {
    if (!action) return '—'
    if (action === 'consolidate_os_parcelas') return 'Consolidar parcelas'
    if (action.startsWith('fallback:')) {
      const fallback = action.slice('fallback:'.length)
      if (fallback === 'without_cCodIntOS') return 'Fallback sem cCodIntOS'
      if (fallback === 'recovered_nCodOS') return 'Fallback com nCodOS recuperado'
    }
    return action
  }

  const formatReasonLabel = (reason: string | null): string => {
    switch (reason) {
      case 'dry_run_preview':
        return 'Prévia validada'
      case 'consolidated':
        return 'Consolidado com sucesso'
      case 'omie_consultar_os_redundant':
        return 'OMIE bloqueou por consumo redundante'
      case 'omie_consultar_os_failed':
        return 'Falha ao consultar OS na OMIE'
      case 'omie_alterar_os_failed':
        return 'Falha ao alterar OS na OMIE'
      case 'missing_omie_os_id':
        return 'Sem vínculo OS na compra'
      case 'not_eligible':
        return 'Compra não elegível'
      case 'already_consolidated':
        return 'Parcelas já consolidadas'
      default:
        return reason ?? '—'
    }
  }

  const formatErrorLabel = (code: string | null, message: string | null): string => {
    if (!code && !message) return '—'
    if (code === 'OMIE_REDUNDANT_CONSUMPTION') {
      return 'A OMIE aplicou janela de bloqueio temporária (REDUNDANT). Reprocessar após aguardar.'
    }
    if (code === 'OMIE_ALTER_IDENTIFIER_MISSING') {
      return 'OMIE rejeitou identificadores da OS; fallback automático foi tentado.'
    }
    if (message && /consumo redundante|REDUNDANT/i.test(message)) {
      return 'Consumo redundante da OMIE; aguarde e reprocese.'
    }
    if (message && /Tag \[nCodOS\] ou \[cCodIntOS\]/i.test(message)) {
      return 'Contrato AlterarOS rejeitado por identificador ausente.'
    }
    return code ? `${code}${message ? `: ${message}` : ''}` : (message ?? '—')
  }

  const handleStart = async (executionMode: FixExecutionMode) => {
    setLastExecutionMode(executionMode)
    const runId = await batch.start({
      mode,
      executionMode,
      selectedIds,
      filters,
      totalFilteredCount,
      adminPassword,
      sourceRunId: executionMode === 'execute' ? dryRunCompletedRunId : null,
    })
    if (runId && executionMode === 'dry_run') {
      setDryRunCompletedRunId(runId)
    }
    if (runId) onFinished?.()
  }

  const handleRetryFailed = async () => {
    const runId = await batch.retryFailed(adminPassword)
    if (runId) onFinished?.()
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setAdminPassword('')
      setDryRunCompletedRunId(null)
      setLastExecutionMode('dry_run')
      batch.clear()
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Consolidar Parcelas da OS em massa
          </DialogTitle>
          <DialogDescription>
            Fluxo obrigatório: primeiro `dry_run`, depois `execute`.
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
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Última etapa</span>
              <span className="font-medium">
                {lastExecutionMode === 'execute' ? 'Execute' : 'Dry-run'}
              </span>
            </div>
          </div>

          {overLimit && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A seleção atual possui {totalFilteredCount} itens e excede o limite de{' '}
              {batch.maxBatchIds} por execução. Refine os filtros.
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="fix-os-parcelas-batch-admin-password"
              className="text-sm font-medium"
            >
              Senha de admin
            </label>
            <PasswordInput
              id="fix-os-parcelas-batch-admin-password"
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
                Execução {batch.summary.status} ({batch.run?.mode ?? lastExecutionMode})
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
                    style={{
                      width: `${Math.min(100, Math.max(0, batch.progressPercent))}%`,
                    }}
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-emerald-700 sm:grid-cols-4">
                <span>Processados: {batch.summary.processed_count}</span>
                <span>Sucesso: {batch.summary.success_count}</span>
                <span>Falha: {batch.summary.failed_count}</span>
                <span>Pulados: {batch.summary.skipped_count}</span>
                <span>Manual: {batch.summary.manual_required_count}</span>
                <span>Pendentes: {batch.summary.pending_count}</span>
                <span>Executando: {batch.summary.running_count}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-emerald-700 sm:grid-cols-3">
                <span>Tempo: {formatDuration(batch.elapsedMs)}</span>
                <span>ETA: {batch.etaMs == null ? '—' : formatDuration(batch.etaMs)}</span>
                <span>Velocidade: {formatRate(batch.throughputPerMin)}</span>
                <span>Restantes: {batch.remainingCount}</span>
                <span>
                  Atualizado há:{' '}
                  {batch.lastUpdatedAtMs
                    ? `${Math.max(
                        0,
                        Math.floor((Date.now() - batch.lastUpdatedAtMs) / 1000)
                      )}s`
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
                    <th className="px-2 py-2 text-left">Estratégia</th>
                    <th className="px-2 py-2 text-left">Ação</th>
                    <th className="px-2 py-2 text-left">Motivo</th>
                    <th className="px-2 py-2 text-left">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-2 py-1 font-mono">
                        {item.compra_id.slice(0, 8)}...
                      </td>
                      <td className="px-2 py-1">{item.status}</td>
                      <td className="px-2 py-1">{item.attempts}</td>
                      <td className="px-2 py-1">
                        {formatDuration(item.duration_ms)}
                      </td>
                      <td className="px-2 py-1">{item.result_strategy ?? '—'}</td>
                      <td className="px-2 py-1">
                        {formatActionLabel(item.result_action)}
                      </td>
                      <td className="px-2 py-1">
                        {formatReasonLabel(item.result_reason)}
                      </td>
                      <td className="px-2 py-1">
                        {formatErrorLabel(item.error_code, item.error_message)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={batch.loading || batch.running}
          >
            Fechar
          </Button>
          <Button
            variant="secondary"
            onClick={handleRetryFailed}
            disabled={
              batch.loading ||
              batch.running ||
              !adminPassword.trim() ||
              !batch.summary ||
              batch.summary.failed_count <= 0
            }
          >
            {batch.loading || batch.running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            Reprocessar falhas
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleStart('dry_run')}
            disabled={!canStartDryRun || batch.loading || batch.running}
          >
            {batch.loading || (batch.running && lastExecutionMode === 'dry_run') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Rodar dry-run
          </Button>
          <Button
            onClick={() => handleStart('execute')}
            disabled={!canStartExecute}
          >
            {batch.loading || (batch.running && lastExecutionMode === 'execute') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Executar consolidação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
