import { useEffect, useMemo, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useServerExport,
  type ExportFormat,
  type ExportListName,
  type ExportMeta,
} from '@/hooks/useServerExport'

interface ExportButtonProps {
  listName: ExportListName
  selectedIds: string[]
  filters?: Record<string, unknown>
  meta: ExportMeta
  disabled?: boolean
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  /** Number of selected items */
  selectedCount?: number
}

export function ExportButton({
  listName,
  selectedIds,
  filters,
  meta,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  selectedCount = 0,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('json')
  const { loading, error, exportData, reset } = useServerExport()

  const isDisabled = disabled || selectedIds.length === 0
  const exportLabel = selectedCount > 0
    ? `Exportar (${selectedCount})`
    : 'Exportar'
  const exportTitle = isDisabled
    ? selectedIds.length === 0
      ? 'Selecione ao menos um item para exportar'
      : 'Exportação desabilitada'
    : selectedCount > 0
      ? `Exportar ${selectedCount} itens selecionados`
      : 'Exportar itens selecionados'

  const selectionText = useMemo(
    () => `${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''} selecionado${selectedIds.length > 1 ? 's' : ''}`,
    [selectedIds.length]
  )

  useEffect(() => {
    if (!open) {
      setFormat('json')
      reset()
    }
  }, [open, reset])

  const handleConfirmExport = async () => {
    const success = await exportData({
      listName,
      format,
      selectedIds,
      filters,
      meta,
    })

    if (success) {
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        title={exportTitle}
      >
        <Download className="h-3.5 w-3.5 mr-1.5" />
        {exportLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Exportar dados</DialogTitle>
            <DialogDescription>
              Escolha o formato para exportar os itens selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lista</span>
                <span className="font-medium">{listName}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Seleção</span>
                <span className="font-medium">{selectionText}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Formato</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={format === 'json' ? 'default' : 'outline'}
                  onClick={() => setFormat('json')}
                  disabled={loading}
                >
                  JSON
                </Button>
                <Button
                  type="button"
                  variant={format === 'csv' ? 'default' : 'outline'}
                  onClick={() => setFormat('csv')}
                  disabled={loading}
                >
                  CSV
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmExport}
              disabled={loading || selectedIds.length === 0}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Exportando...' : `Exportar ${format.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
