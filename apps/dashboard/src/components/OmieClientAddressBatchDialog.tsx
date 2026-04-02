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
import type { ClientsFilters } from '@/hooks/useClients'
import { useOmieBackfillClientAddressBatch } from '@/hooks/useOmieBackfillClientAddressBatch'

type SelectionMode = 'page' | 'all_filtered'
type ExecutionMode = 'dry_run' | 'execute'

interface OmieClientAddressBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: SelectionMode
  selectedIds: string[]
  selectedCount: number
  totalFilteredCount: number
  filters: ClientsFilters
  onFinished?: () => void
}

export function OmieClientAddressBatchDialog({
  open,
  onOpenChange,
  mode,
  selectedIds,
  selectedCount,
  totalFilteredCount,
  filters,
  onFinished,
}: OmieClientAddressBatchDialogProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('dry_run')
  const batch = useOmieBackfillClientAddressBatch()

  const overLimit = mode === 'all_filtered' && totalFilteredCount > batch.maxBatchIds
  const canStart = adminPassword.trim().length > 0 && selectedCount > 0 && !overLimit

  const selectionLabel = useMemo(() => {
    if (mode === 'all_filtered') {
      return `Todos os ${totalFilteredCount} clientes filtrados`
    }
    return `${selectedCount} cliente(s) selecionado(s) na página atual`
  }, [mode, selectedCount, totalFilteredCount])

  const handleStart = async () => {
    const success = await batch.start({
      mode,
      selectedIds,
      filters,
      totalFilteredCount,
      adminPassword,
      executionMode,
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
      setExecutionMode('dry_run')
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
            Backfill de endereço em massa
          </DialogTitle>
          <DialogDescription>
            Executa `omie-backfill-client-address` em lote para clientes selecionados.
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
              <span className="font-medium">{batch.maxBatchIds} clientes</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Modo</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={executionMode === 'dry_run' ? 'default' : 'outline'}
                onClick={() => setExecutionMode('dry_run')}
                disabled={batch.loading || batch.running}
              >
                Dry run
              </Button>
              <Button
                type="button"
                variant={executionMode === 'execute' ? 'default' : 'outline'}
                onClick={() => setExecutionMode('execute')}
                disabled={batch.loading || batch.running}
              >
                Execute
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="client-batch-admin-password" className="text-sm font-medium">
              Senha de admin
            </label>
            <PasswordInput
              id="client-batch-admin-password"
              placeholder="Digite a senha para confirmar"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              disabled={batch.loading || batch.running}
            />
          </div>

          {overLimit && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A seleção atual possui {totalFilteredCount} itens e excede o limite de {batch.maxBatchIds} por execução.
              Refine os filtros para reduzir o volume.
            </div>
          )}

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
              <div className="mt-2 grid grid-cols-2 gap-2 text-emerald-700 sm:grid-cols-3">
                <span>Processados: {batch.summary.processed_count}</span>
                <span>Sucesso: {batch.summary.success_count}</span>
                <span>Falha: {batch.summary.failed_count}</span>
                <span>Pendentes: {batch.summary.pending_count}</span>
                <span>Executando: {batch.summary.running_count}</span>
                <span>Manual: {batch.summary.manual_required_count}</span>
              </div>
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
