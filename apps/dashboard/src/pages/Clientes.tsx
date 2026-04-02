import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordInput } from '@/components/ui/password-input'
import { OmieClientAddressBatchDialog } from '@/components/OmieClientAddressBatchDialog'
import { useClients, type ClientsFilters } from '@/hooks/useClients'
import { useOmieBackfillClientAddress } from '@/hooks/useOmieBackfillClientAddress'

type SelectionMode = 'page' | 'all_filtered'

const initialFilters: ClientsFilters = {
  search: '',
  addressStatus: undefined,
  state: '',
  city: '',
}

const formatDate = (value: string | null): string => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR')
}

const badgeByAddressStatus: Record<string, string> = {
  complete: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  missing: 'bg-red-100 text-red-700',
}

export function ClientesPage() {
  const [filters, setFilters] = useState<ClientsFilters>(initialFilters)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('page')
  const [adminPassword, setAdminPassword] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [runningClientId, setRunningClientId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(25)

  const clients = useClients()
  const singleBackfill = useOmieBackfillClientAddress()

  useEffect(() => {
    void clients.fetch(filters, 0, pageSize)
  }, [])

  const totalPages = useMemo(() => {
    if (clients.total <= 0) return 1
    return Math.max(1, Math.ceil(clients.total / clients.pageSize))
  }, [clients.total, clients.pageSize])

  const allPageIds = useMemo(
    () => clients.data.map((row) => row.cliente_id),
    [clients.data]
  )

  const selectedCount =
    selectionMode === 'all_filtered' ? clients.total : selectedIds.size

  const allSelected =
    selectionMode === 'all_filtered'
      ? allPageIds.length > 0
      : allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id))
  const someSelected =
    selectionMode === 'all_filtered'
      ? false
      : allPageIds.some((id) => selectedIds.has(id)) && !allSelected
  const canSelectAllFiltered =
    selectionMode !== 'all_filtered' &&
    clients.total > 0 &&
    allPageIds.length > 0 &&
    allPageIds.every((id) => selectedIds.has(id)) &&
    clients.total > allPageIds.length

  const handleSearch = async () => {
    setSelectedIds(new Set())
    setSelectionMode('page')
    setLastSelectedId(null)
    await clients.fetch(filters, 0, pageSize)
  }

  const handleResetFilters = async () => {
    setFilters(initialFilters)
    setSelectedIds(new Set())
    setSelectionMode('page')
    setLastSelectedId(null)
    await clients.fetch(initialFilters, 0, pageSize)
  }

  const handleToggleAll = () => {
    if (selectionMode === 'all_filtered') {
      setSelectionMode('page')
      setSelectedIds(new Set())
      setLastSelectedId(null)
      return
    }

    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of allPageIds) {
          next.delete(id)
        }
        return next
      })
      setSelectionMode('page')
      setLastSelectedId(null)
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const id of allPageIds) {
          next.add(id)
        }
        return next
      })
      setSelectionMode('page')
      setLastSelectedId(allPageIds[allPageIds.length - 1] ?? null)
    }
  }

  const handleToggleRow = (clienteId: string, shiftKey = false) => {
    if (selectionMode === 'all_filtered') {
      const pageWithoutCurrent = allPageIds.filter((id) => id !== clienteId)
      setSelectedIds(new Set(pageWithoutCurrent))
      setSelectionMode('page')
      setLastSelectedId(clienteId)
      return
    }

    setSelectedIds((prev) => {
      const next = new Set(prev)

      if (shiftKey && lastSelectedId) {
        const startIndex = allPageIds.indexOf(lastSelectedId)
        const endIndex = allPageIds.indexOf(clienteId)

        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] =
            startIndex < endIndex
              ? [startIndex, endIndex]
              : [endIndex, startIndex]
          const rangeIds = allPageIds.slice(from, to + 1)
          const shouldSelectRange = !prev.has(clienteId)

          for (const rangeId of rangeIds) {
            if (shouldSelectRange) {
              next.add(rangeId)
            } else {
              next.delete(rangeId)
            }
          }
          return next
        }
      }

      if (next.has(clienteId)) {
        next.delete(clienteId)
      } else {
        next.add(clienteId)
      }
      return next
    })

    setLastSelectedId(clienteId)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode('page')
    setLastSelectedId(null)
  }

  const openBatch = (mode: SelectionMode) => {
    setFeedback(null)
    setSelectionMode(mode)
    setBatchDialogOpen(true)
  }

  const runSingle = async (clienteId: string) => {
    setFeedback(null)
    setRunningClientId(clienteId)
    const result = await singleBackfill.execute({
      clienteId,
      adminPassword,
      mode: 'execute',
    })
    if (result.success) {
      setFeedback('Upsert de cliente executado com sucesso.')
      await clients.fetch(filters, clients.page, pageSize)
    } else {
      setFeedback(result.errorMessage ?? 'Falha ao executar backfill unitário.')
    }
    setRunningClientId(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Clientes OMIE - Backfill de Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input
              placeholder="Buscar por nome, email, CPF/CNPJ ou ID"
              value={filters.search ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={filters.addressStatus ?? 'all'}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  addressStatus:
                    event.target.value === 'all'
                      ? undefined
                      : (event.target.value as ClientsFilters['addressStatus']),
                }))
              }
            >
              <option value="all">Status endereço: todos</option>
              <option value="complete">Completo</option>
              <option value="partial">Parcial</option>
              <option value="missing">Ausente</option>
            </select>
            <Input
              placeholder="UF (ex: SP)"
              value={filters.state ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  state: event.target.value.toUpperCase().slice(0, 2),
                }))
              }
            />
            <Input
              placeholder="Cidade"
              value={filters.city ?? ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, city: event.target.value }))
              }
            />
            <PasswordInput
              placeholder="Senha admin"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSearch} disabled={clients.loading}>
              {clients.loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Aplicar filtros
            </Button>
            <Button variant="outline" onClick={handleResetFilters} disabled={clients.loading}>
              Limpar filtros
            </Button>
            <Button
              variant="secondary"
              onClick={() => openBatch('page')}
              disabled={selectedCount <= 0 || !adminPassword.trim()}
            >
              Lote (selecionados)
            </Button>
            <Button
              variant="secondary"
              onClick={() => openBatch('all_filtered')}
              disabled={clients.total <= 0 || !adminPassword.trim()}
            >
              Lote (todos filtrados)
            </Button>
            <Button
              variant="ghost"
              onClick={() => void clients.fetch(filters, clients.page, pageSize)}
              disabled={clients.loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {clients.total} clientes encontrados • {selectedCount} selecionado(s)
            </span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={handleToggleAll}
                aria-label="Selecionar todos os clientes da página"
              />
              <span>Selecionar página</span>
            </div>
          </div>

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-primary">
                {selectionMode === 'all_filtered'
                  ? `Todos os ${selectedCount} resultados filtrados`
                  : `${selectedCount} selecionado(s)`}
              </span>
              {canSelectAllFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectionMode('all_filtered')}
                  className="h-6 px-2 text-xs text-primary"
                >
                  Selecionar todos os {clients.total} resultados
                </Button>
              )}
              {selectionMode === 'all_filtered' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectionMode('page')
                    setSelectedIds(new Set(allPageIds))
                  }}
                  className="h-6 px-2 text-xs text-primary"
                >
                  Selecionar apenas esta página
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </div>
          )}

          {feedback && (
            <div
              className={`rounded-md border p-3 text-sm ${
                feedback.startsWith('Upsert de cliente executado com sucesso')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {feedback}
            </div>
          )}

          {clients.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {clients.error}
            </div>
          )}

          <div className="overflow-auto rounded-md border">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 py-2 text-left">Sel.</th>
                  <th className="px-2 py-2 text-left">Cliente</th>
                  <th className="px-2 py-2 text-left">Documento</th>
                  <th className="px-2 py-2 text-left">Localização</th>
                  <th className="px-2 py-2 text-left">Status Endereço</th>
                  <th className="px-2 py-2 text-left">Compras</th>
                  <th className="px-2 py-2 text-left">Atualizado em</th>
                  <th className="px-2 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.data.map((row) => {
                  const displayName = row.razaosocial ?? row.nome_fantasia ?? row.nome ?? '—'
                  return (
                    <tr key={row.cliente_id} className="border-t">
                      <td className="px-2 py-2">
                        <Checkbox
                          checked={selectedIds.has(row.cliente_id)}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleToggleRow(row.cliente_id, event.shiftKey)
                          }}
                          aria-label={`Selecionar cliente ${row.cliente_id.slice(0, 8)}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground">{row.email ?? '—'}</div>
                      </td>
                      <td className="px-2 py-2">{row.cnpj ?? row.cpf ?? '—'}</td>
                      <td className="px-2 py-2">
                        {row.cidade_resolvida ?? '—'} / {row.estado_resolvido ?? '—'}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${badgeByAddressStatus[row.address_status] ?? 'bg-gray-100 text-gray-700'}`}
                        >
                          {row.address_status} ({row.missing_count})
                        </span>
                      </td>
                      <td className="px-2 py-2">{row.compras_count ?? 0}</td>
                      <td className="px-2 py-2">{formatDate(row.updated_at)}</td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void runSingle(row.cliente_id)}
                          disabled={
                            !adminPassword.trim() ||
                            singleBackfill.loading ||
                            runningClientId === row.cliente_id
                          }
                        >
                          {runningClientId === row.cliente_id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Wrench className="mr-2 h-4 w-4" />
                          )}
                          Upsert
                        </Button>
                      </td>
                    </tr>
                  )
                })}

                {!clients.loading && clients.data.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Página {clients.page + 1} de {totalPages}
              </span>
              <select
                className="h-8 rounded-md border bg-background px-2 text-sm"
                value={pageSize}
                onChange={(event) => {
                  const newSize = Number(event.target.value)
                  setPageSize(newSize)
                  setSelectedIds(new Set())
                  setSelectionMode('page')
                  setLastSelectedId(null)
                  void clients.fetch(filters, 0, newSize)
                }}
              >
                <option value={25}>25 linhas</option>
                <option value={50}>50 linhas</option>
                <option value={100}>100 linhas</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={clients.page <= 0 || clients.loading}
                onClick={() =>
                  void clients.fetch(filters, Math.max(0, clients.page - 1), pageSize)
                }
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={clients.page + 1 >= totalPages || clients.loading}
                onClick={() => void clients.fetch(filters, clients.page + 1, pageSize)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <OmieClientAddressBatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        mode={selectionMode}
        selectedIds={[...selectedIds]}
        selectedCount={selectedCount}
        totalFilteredCount={clients.total}
        filters={filters}
        onFinished={() => void clients.fetch(filters, clients.page, pageSize)}
      />
    </div>
  )
}
