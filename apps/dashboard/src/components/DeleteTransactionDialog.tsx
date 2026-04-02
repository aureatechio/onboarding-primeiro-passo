import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Checkbox } from '@/components/ui/checkbox'
import { useDeleteTransaction } from '@/hooks/useDeleteTransaction'

interface DeleteTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  compraId: string
  clienteNome: string | null
  onDeleted: () => void
}

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  compraId,
  clienteNome,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const [password, setPassword] = useState('')
  const [deleteLead, setDeleteLead] = useState(false)
  const [deleteCliente, setDeleteCliente] = useState(false)
  const { loading, error, result, deleteTransaction, reset } =
    useDeleteTransaction()

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setPassword('')
      setDeleteLead(false)
      setDeleteCliente(false)
      reset()
    }
  }, [open, reset])

  const handleDelete = async () => {
    const success = await deleteTransaction(compraId, password, {
      lead: deleteLead,
      cliente: deleteCliente,
    })
    if (success) {
      // Don't close immediately — show results first
    }
  }

  const handleClose = () => {
    if (result) {
      onDeleted()
    }
    onOpenChange(false)
  }

  const totalDeleted = result?.deleted
    ?.filter((d) => d.registros_afetados > 0)
    .reduce((sum, d) => sum + d.registros_afetados, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deletar transação
          </DialogTitle>
          <DialogDescription>
            Esta ação é <strong className="text-foreground">irreversível</strong>
            . A proposta e dados relacionados serão removidos. Lead e cliente só
            serão excluídos se você marcar explicitamente abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Transaction info */}
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{clienteNome ?? '—'}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Compra ID</span>
              <span className="font-mono text-xs">{compraId}</span>
            </div>
          </div>

          {/* Success result */}
          {result && (
            <div className="space-y-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Transação deletada com sucesso
                </div>
                <div className="text-xs text-emerald-600">
                  {totalDeleted} registro{totalDeleted !== 1 ? 's' : ''} removido
                  {totalDeleted !== 1 ? 's' : ''} de{' '}
                  {result.deleted.filter((d) => d.registros_afetados > 0).length}{' '}
                  tabela
                  {result.deleted.filter((d) => d.registros_afetados > 0)
                    .length !== 1
                    ? 's'
                    : ''}
                </div>
                <div className="mt-1 max-h-32 overflow-y-auto">
                  <table className="w-full text-xs">
                    <tbody>
                      {result.deleted
                        .filter((d) => d.registros_afetados > 0)
                        .map((d) => (
                          <tr
                            key={d.tabela}
                            className="border-t border-emerald-100"
                          >
                            <td className="py-1 font-mono text-emerald-700">
                              {d.tabela}
                            </td>
                            <td className="py-1 text-right text-emerald-600">
                              {d.registros_afetados}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
                  <div className="text-xs font-medium text-amber-800">
                    Itens preservados por segurança
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.warnings.map((warning) => (
                      <li key={warning} className="text-xs text-amber-700">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-1 max-h-20 overflow-y-auto">
                <div className="text-[11px] text-muted-foreground">
                  Preservados: {result.preserved?.join(', ') || 'nenhum'}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Password input (only before deletion) */}
          {!result && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Se não marcado, lead/cliente serão preservados.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={deleteLead}
                      onCheckedChange={(checked) => setDeleteLead(checked === true)}
                      disabled={loading}
                      aria-label="Excluir lead vinculado"
                    />
                    Excluir lead vinculado
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={deleteCliente}
                      onCheckedChange={(checked) =>
                        setDeleteCliente(checked === true)
                      }
                      disabled={loading}
                      aria-label="Excluir cliente vinculado"
                    />
                    Excluir cliente vinculado
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="delete-password"
                  className="text-sm font-medium text-foreground"
                >
                  Senha de admin
                </label>
                <PasswordInput
                  id="delete-password"
                  placeholder="Digite a senha para confirmar"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password && !loading) {
                      handleDelete()
                    }
                  }}
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <Button variant="outline" onClick={handleClose}>
              Fechar
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!password || loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Deletando...' : 'Deletar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
