import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { FilterDropdown } from '@/components/FilterDropdown'
import { useSplitMetrics } from '@/hooks/useSplitMetrics'
import { getDateRange, type DateRangePreset } from '@/lib/date-range'
import { getSplitTypeLabel } from '@/lib/split-status'
import { formatCentsToCurrency, formatDate } from '@/lib/mask'
import { supabase } from '@/lib/supabase'
import { SplitGroupDetailDrawer } from '@/components/split/SplitGroupDetailDrawer'
import type { SplitFilterParams } from '@/types/split-metrics'

const DATE_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'month', label: 'Mês atual' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Todo período' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'stuck', label: 'Em risco' },
]

const SPLIT_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos tipos' },
  { value: 'dual_payment', label: '2 meios' },
  { value: 'boleto_parcelado', label: 'Boleto parcelado' },
]

const ORDER_OPTIONS = [
  { value: 'updated_at', label: 'Atualização' },
  { value: 'created_at', label: 'Criação' },
  { value: 'status', label: 'Status' },
  { value: 'progress', label: 'Progresso' },
  { value: 'stuck', label: 'Risco' },
]

const DATE_PRESET_VALUES = new Set(['today', 'yesterday', 'month', 'lastMonth', 'all'])
const SPLIT_TYPE_VALUES = new Set(['all', 'dual_payment', 'boleto_parcelado'])
const STATUS_VALUES = new Set([
  'all',
  'pending',
  'partial',
  'completed',
  'cancelled',
  'stuck',
])
const ORDER_VALUES = new Set(['updated_at', 'created_at', 'status', 'progress', 'stuck'])

function parseDateRangeParam(value: string | null): DateRangePreset {
  if (!value) return 7
  if (DATE_PRESET_VALUES.has(value)) return value as DateRangePreset
  if (/^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 7
}

function parsePageParam(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

function toDateRangeLabel(value: string): string {
  const option = DATE_OPTIONS.find((opt) => opt.value === value)
  return option ? option.label : value
}

function formatDurationMinutes(value: number | null): string {
  if (value == null) return '—'
  if (value < 60) return `${Math.round(value)} min`
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  return `${hours}h ${minutes}m`
}

function methodLabel(method: string): string {
  const normalized = method.toLowerCase()
  if (normalized === 'pix') return 'PIX'
  if (normalized === 'credit_card' || normalized === 'cartao') return 'Cartão'
  if (normalized === 'boleto') return 'Boleto'
  return normalized || 'Outro'
}

export function SplitMetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const metrics = useSplitMetrics()
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false)

  useEffect(() => {
    if (hydratedFromUrl) return

    const period = parseDateRangeParam(searchParams.get('period'))
    const splitTypeRaw = searchParams.get('type')
    const statusRaw = searchParams.get('status')
    const methodRaw = searchParams.get('method')
    const sortRaw = searchParams.get('sort')
    const searchRaw = searchParams.get('q') ?? ''
    const onlyStuck = searchParams.get('stuck') === '1'
    const pageFromUrl = parsePageParam(searchParams.get('page'))

    const splitType = SPLIT_TYPE_VALUES.has(splitTypeRaw ?? '')
      ? (splitTypeRaw as SplitFilterParams['splitType'])
      : 'all'
    const status = STATUS_VALUES.has(statusRaw ?? '')
      ? (statusRaw as SplitFilterParams['status'])
      : 'all'
    const orderBy = ORDER_VALUES.has(sortRaw ?? '')
      ? (sortRaw as SplitFilterParams['orderBy'])
      : 'updated_at'
    const method = methodRaw && methodRaw !== 'all' ? methodRaw : 'all'

    const hasNonDefaultState =
      period !== 7 ||
      splitType !== 'all' ||
      status !== 'all' ||
      method !== 'all' ||
      orderBy !== 'updated_at' ||
      onlyStuck ||
      searchRaw.trim().length > 0 ||
      pageFromUrl > 0

    setSearchText(searchRaw)
    if (hasNonDefaultState) {
      void metrics.fetch(
        {
          period,
          splitType,
          status,
          method,
          orderBy,
          onlyStuck,
          search: searchRaw,
        },
        pageFromUrl,
        metrics.pageSize
      )
    }

    setHydratedFromUrl(true)
  }, [hydratedFromUrl, metrics, searchParams])

  useEffect(() => {
    if (!hydratedFromUrl) return

    const nextParams = new URLSearchParams()
    if (metrics.filters.period !== 7) nextParams.set('period', String(metrics.filters.period))
    if (metrics.filters.splitType !== 'all') nextParams.set('type', metrics.filters.splitType)
    if (metrics.filters.status !== 'all') nextParams.set('status', metrics.filters.status)
    if (metrics.filters.method !== 'all') nextParams.set('method', metrics.filters.method)
    if (metrics.filters.orderBy !== 'updated_at') nextParams.set('sort', metrics.filters.orderBy)
    if (metrics.filters.onlyStuck) nextParams.set('stuck', '1')
    if (metrics.filters.search.trim().length > 0) {
      nextParams.set('q', metrics.filters.search.trim())
    }
    if (metrics.page > 0) nextParams.set('page', String(metrics.page))

    const current = searchParams.toString()
    const next = nextParams.toString()
    if (current !== next) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [hydratedFromUrl, metrics.filters, metrics.page, searchParams, setSearchParams])

  const methodOptions = useMemo(() => {
    if (!metrics.summary) {
      return [{ value: 'all', label: 'Todos' }]
    }

    const options = new Map<string, string>()
    metrics.summary.byMethod.forEach((entry) => {
      if (entry.method) {
        options.set(entry.method, methodLabel(entry.method))
      }
    })

    const sorted = [...options.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }))

    return [{ value: 'all', label: 'Todos os métodos' }, ...sorted]
  }, [metrics.summary])

  const hasActiveFilters = useMemo(() => {
    return (
      metrics.filters.status !== 'all' ||
      metrics.filters.splitType !== 'all' ||
      metrics.filters.search.trim().length > 0 ||
      metrics.filters.method !== 'all' ||
      metrics.filters.onlyStuck ||
      metrics.filters.orderBy !== 'updated_at' ||
      metrics.filters.period !== 7
    )
  }, [metrics.filters])

  const summary = metrics.summary
  const totalGroups = summary?.totalGroups ?? 0
  const completionRate = summary?.completionRate == null ? '—' : `${summary.completionRate}%`
  const failureRate = summary?.failureRate == null ? '—' : `${summary.failureRate}%`
  const avgCompletion =
    summary?.avgCompletionSeconds == null ? '—' : `${Math.round(summary.avgCompletionSeconds)}s`
  const partialGroups = summary?.partialGroups ?? 0
  const stuckCount = metrics.groups.filter((group) => group.isStuck).length

  const period = metrics.filters.period
  const periodRangeLabel = toDateRangeLabel(String(period))

  const { since, until } = getDateRange(period)
  const staleWindow = Math.max(0, 120)
  const pageTotal = Math.max(1, Math.ceil(metrics.totalGroups / metrics.pageSize))

  const clearFilters = useCallback(() => {
    setSearchText('')
    void metrics.setFilters({
      period: 7,
      splitType: 'all',
      status: 'all',
      method: 'all',
      onlyStuck: false,
      search: '',
      orderBy: 'updated_at',
    })
  }, [metrics])

  const applySearch = useCallback(() => {
    void metrics.setFilters({ search: searchText })
  }, [metrics, searchText])

  const handlePeriodChange = useCallback(
    (value: string) => {
      const nextPeriod: DateRangePreset = /^\d+$/.test(value)
        ? parseInt(value, 10)
        : (value as DateRangePreset)
      void metrics.setFilters({ period: nextPeriod })
    },
    [metrics]
  )

  const handleSort = useCallback(
    (orderBy: 'updated_at' | 'created_at' | 'status' | 'progress' | 'stuck') => {
      void metrics.setFilters({ orderBy })
    },
    [metrics]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      void metrics.setPage(page)
    },
    [metrics]
  )

  const selectedGroupId = metrics.selectedGroupId

  // Realtime: atualiza listagem e detalhe ativo em mudanças relevantes.
  useEffect(() => {
    const channel = supabase
      .channel('split-metrics:dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkout_split_groups' },
        () => {
          void metrics.refetch()
          if (selectedGroupId) {
            void metrics.loadGroupDetail(selectedGroupId)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkout_audit_log' },
        () => {
          void metrics.refetch()
          if (selectedGroupId) {
            void metrics.loadGroupDetail(selectedGroupId)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [metrics.refetch, metrics.loadGroupDetail, selectedGroupId])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Monitoramento Split e Parcelado</h2>
          <p className="text-sm text-muted-foreground">
            Visão operacional de grupos de 2 meios e boleto parcelado no período atual.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void metrics.refetch()}
            disabled={metrics.loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${metrics.loading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Janela selecionada: {periodRangeLabel}
        {since ? ` • a partir de ${formatDate(since)}` : ''}
        {until ? ` até ${formatDate(until)}` : ''}
      </p>

      {metrics.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">
            {metrics.error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Total de grupos</p>
            <p className="text-2xl font-bold">{totalGroups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Conclusão</p>
            <p className="text-2xl font-bold">{completionRate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Falhas</p>
            <p className="text-2xl font-bold">{failureRate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Tempo médio</p>
            <p className="text-lg font-bold">{avgCompletion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Parciais</p>
            <p className="text-lg font-bold">{partialGroups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Em risco</p>
            <p className="text-lg font-bold">{stuckCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterDropdown
          label="Período"
          value={String(metrics.filters.period)}
          options={DATE_OPTIONS}
          onChange={handlePeriodChange}
        />
        <FilterDropdown
          label="Tipo"
          value={metrics.filters.splitType}
          options={SPLIT_TYPE_OPTIONS}
          onChange={(value) => {
            void metrics.setFilters({
              splitType: value as 'all' | 'dual_payment' | 'boleto_parcelado',
            })
          }}
        />
        <FilterDropdown
          label="Status"
          value={metrics.filters.status}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            void metrics.setFilters({ status: value as SplitFilterParams['status'] })
          }}
        />
        <FilterDropdown
          label="Método"
          value={metrics.filters.method}
          options={methodOptions}
          onChange={(value) => void metrics.setFilters({ method: value })}
        />
        <FilterDropdown
          label="Ordenar"
          value={metrics.filters.orderBy}
          options={ORDER_OPTIONS}
          onChange={(value) =>
            handleSort(value as 'updated_at' | 'created_at' | 'status' | 'progress' | 'stuck')
          }
        />

        <label className="inline-flex w-full items-center gap-2 text-sm sm:w-auto md:ml-auto">
          <Switch
            checked={metrics.filters.onlyStuck}
            onCheckedChange={(checked) => void metrics.setFilters({ onlyStuck: checked })}
          />
          Apenas em risco
        </label>

        <div className="flex gap-2 items-center">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            className="w-full text-sm sm:w-64 lg:w-80"
            placeholder="Buscar por grupo"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
          <Button size="sm" variant="outline" onClick={applySearch}>
            Buscar
          </Button>
        </div>

        <div
          className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground"
          title={`Janela atual: ${staleWindow} minutos para risco`}
        >
          <Filter className="h-3.5 w-3.5" />
          Risco: {'>'}
          {staleWindow}min sem atualização
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Grupos de split ({metrics.totalGroups})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-2 pt-1 text-xs text-muted-foreground sm:hidden">
            Deslize horizontalmente para ver todas as colunas.
          </div>
          <div className="overflow-x-auto pb-1">
            <table className="w-full min-w-[1100px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Grupo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Sessões
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Progresso</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Atualização
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Risco
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {metrics.groups.map((group) => {
                  const status = metrics.getStatusBadge(group.status, group.isStuck)
                  const progress = metrics.toProgress(group)
                  const tempo = formatDurationMinutes(group.tempoDesdeAtualizacaoMinutos)
                  const statusStyle =
                    status.variant === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : status.variant === 'warning'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : status.variant === 'destructive'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : status.variant === 'outline'
                            ? 'bg-zinc-50 text-zinc-700 border-zinc-200'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200'

                  return (
                    <tr
                      key={group.groupId}
                      className={`border-b hover:bg-muted/25 ${
                        selectedGroupId === group.groupId ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{group.groupId}</td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">{getSplitTypeLabel(group.splitType)}</td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <Badge variant="outline" className={statusStyle}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <p className="font-medium">
                          {group.sessoesPagas}/{group.sessoesTotal}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.tempoDesdeAtualizacaoMinutos == null ? '' : `Atualizado há ${tempo}`}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">{progress}%</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {group.updatedAt ? formatDate(group.updatedAt) : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatCentsToCurrency(group.valor)}
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        {group.isStuck ? (
                          <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">
                            Em risco
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void metrics.loadGroupDetail(group.groupId)}
                        >
                          Detalhe
                        </Button>
                      </td>
                    </tr>
                  )
                })}

                {metrics.groups.length === 0 && !metrics.loading && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nenhum grupo encontrado para os filtros atuais.
                    </td>
                  </tr>
                )}
                {metrics.loading && metrics.groups.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Carregando grupos...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {metrics.totalGroups > metrics.pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Página {metrics.page + 1} de {pageTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(metrics.page - 1)}
                  disabled={metrics.page <= 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(metrics.page + 1)}
                  disabled={(metrics.page + 1) * metrics.pageSize >= metrics.totalGroups}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SplitGroupDetailDrawer
        open={Boolean(selectedGroupId)}
        onOpenChange={(open) => {
          if (!open) metrics.clearGroupDetail()
        }}
        loading={metrics.detailLoading}
        error={metrics.detailError}
        detail={metrics.groupDetail}
        onRefresh={
          selectedGroupId
            ? () => void metrics.loadGroupDetail(selectedGroupId)
            : undefined
        }
      />
    </div>
  )
}


