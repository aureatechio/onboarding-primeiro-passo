import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Paperclip,
  Banknote,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterDropdown } from '@/components/FilterDropdown'
import { StatusBadge } from '@/components/StatusBadge'
import { ColumnToggle, type ToggleColumn } from '@/components/ColumnToggle'
import { VigenciaBadge } from '@/components/VigenciaBadge'
import { AditivoIndicator } from '@/components/AditivoIndicator'
import { ContractHealthDot } from '@/components/ContractHealthDot'
import { useContratos, type ContratosFilters } from '@/hooks/useContratos'
import { useContratosMetrics } from '@/hooks/useContratosMetrics'
import { useRealtimeContratos } from '@/hooks/useRealtime'
import {
  CHECKOUT_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  PRODUCAO_STATUS_LABELS,
} from '@/lib/constants'
import {
  DEFAULT_DATE_PRESET,
  type DateRangePreset,
} from '@/lib/date-range'
import { formatCurrency, formatDateShort } from '@/lib/mask'

const SIGNATURE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'Assinado', label: 'Assinado' },
  { value: 'Aguardando Assinatura', label: 'Aguardando' },
  { value: 'Cancelado', label: 'Cancelado' },
  { value: 'error', label: 'Erro' },
  { value: 'none', label: 'Sem contrato' },
]

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'aguardando_pagamento', label: 'Aguardando' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'expirado', label: 'Expirado' },
  { value: 'parcialmente_pago', label: 'Parcial' },
]

const VIGENCIA_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '9', label: '9 meses' },
  { value: '12', label: '12 meses' },
]

const VENCIMENTO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'vigente', label: 'Vigente' },
  { value: 'vence_30d', label: 'Vence em 30d' },
  { value: 'vence_60d', label: 'Vence em 60d' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'sem_data', label: 'Sem data' },
]

const ADITIVO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'com_aditivo', label: 'Com aditivo' },
  { value: 'sem_aditivo', label: 'Sem aditivo' },
  { value: 'pendente', label: 'Aditivo pendente' },
  { value: 'assinado', label: 'Aditivo assinado' },
]

const PRODUCAO_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'Aguardando Assinatura', label: 'Aguard. Assinatura' },
  { value: 'Aguardando Inicio', label: 'Aguard. Inicio' },
  { value: 'Onbording', label: 'Onboarding' },
  { value: 'Criação', label: 'Criacao' },
  { value: 'Produção', label: 'Producao' },
  { value: 'Delivery', label: 'Delivery' },
  { value: 'Entregue', label: 'Entregue' },
  { value: 'Arquivado', label: 'Arquivado' },
]

const DATE_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'month', label: 'Mes atual' },
  { value: 'lastMonth', label: 'Mês Anterior' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: 'all', label: 'Todo periodo' },
]

const OPTIONAL_COLUMNS: ToggleColumn[] = [
  { key: 'aditivo', label: 'Aditivo' },
  { key: 'producao', label: 'Producao' },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'regiao', label: 'Regiao' },
  { key: 'dataEnvio', label: 'Data envio' },
  { key: 'dataAssinatura', label: 'Data assinatura' },
  { key: 'saude', label: 'Saude' },
]

const DEFAULT_OPTIONAL_COLUMNS: Record<string, boolean> = {
  aditivo: true,
  producao: true,
  vendedor: false,
  regiao: false,
  dataEnvio: false,
  dataAssinatura: false,
  saude: false,
}

const COLUMN_STORAGE_KEY = 'dashboard-contratos-columns-v1'
const DATE_PRESET_VALUES = new Set(['today', 'yesterday', 'month', 'lastMonth', 'all'])

function loadStoredColumns(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY)
    if (!raw) return DEFAULT_OPTIONAL_COLUMNS
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return { ...DEFAULT_OPTIONAL_COLUMNS, ...parsed }
  } catch {
    return DEFAULT_OPTIONAL_COLUMNS
  }
}

function signatureBadgeStatus(status: string | null): string {
  if (status === 'Assinado') return 'completed'
  if (status === 'Aguardando Assinatura') return 'in_progress'
  if (status === 'Cancelado' || status === 'error') return 'error'
  return 'pending'
}

function paymentBadgeStatus(status: string | null): string {
  if (status === 'pago') return 'completed'
  if (status === 'aguardando_pagamento' || status === 'parcialmente_pago') return 'in_progress'
  if (status === 'recusado' || status === 'cancelado' || status === 'expirado') return 'error'
  return 'pending'
}

function parseDateRangeParam(value: string | null): DateRangePreset {
  if (!value) return DEFAULT_DATE_PRESET
  if (DATE_PRESET_VALUES.has(value)) return value as DateRangePreset
  if (/^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_DATE_PRESET
}

function parsePageParam(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

function parseOptionalFilterParam(value: string | null): string | undefined {
  if (!value || value === 'all') return undefined
  return value
}

export function ContratosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const contratos = useContratos()
  const metrics = useContratosMetrics()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [filters, setFilters] = useState<ContratosFilters>({
    assinaturaStatus: parseOptionalFilterParam(searchParams.get('sign')),
    pagamentoStatus: parseOptionalFilterParam(searchParams.get('pay')),
    vigencia: parseOptionalFilterParam(searchParams.get('term')),
    vencimento: parseOptionalFilterParam(searchParams.get('due')),
    aditivo: parseOptionalFilterParam(searchParams.get('add')),
    producao: parseOptionalFilterParam(searchParams.get('prod')),
    dateRange: parseDateRangeParam(searchParams.get('period')),
    search: parseOptionalFilterParam(searchParams.get('q')),
  })
  const [page, setPage] = useState(() => parsePageParam(searchParams.get('page')))
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    () => loadStoredColumns()
  )

  const loadData = useCallback(
    (pageNum = page) => {
      contratos.fetch(filters, pageNum)
      metrics.fetch(filters)
    },
    [contratos, metrics, filters, page]
  )

  useEffect(() => {
    loadData(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  useRealtimeContratos(useCallback(() => loadData(page), [loadData, page]))

  useEffect(() => {
    const nextParams = new URLSearchParams()
    if (filters.assinaturaStatus) nextParams.set('sign', filters.assinaturaStatus)
    if (filters.pagamentoStatus) nextParams.set('pay', filters.pagamentoStatus)
    if (filters.vigencia) nextParams.set('term', filters.vigencia)
    if (filters.vencimento) nextParams.set('due', filters.vencimento)
    if (filters.aditivo) nextParams.set('add', filters.aditivo)
    if (filters.producao) nextParams.set('prod', filters.producao)
    if (filters.search) nextParams.set('q', filters.search)
    if (
      filters.dateRange !== undefined &&
      filters.dateRange !== DEFAULT_DATE_PRESET
    ) {
      nextParams.set('period', String(filters.dateRange))
    }
    if (page > 0) {
      nextParams.set('page', String(page))
    }

    const current = searchParams.toString()
    const next = nextParams.toString()
    if (current !== next) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [filters, page, searchParams, setSearchParams])

  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const hasActiveFilters =
    !!filters.assinaturaStatus ||
    !!filters.pagamentoStatus ||
    !!filters.vigencia ||
    !!filters.vencimento ||
    !!filters.aditivo ||
    !!filters.producao ||
    (filters.dateRange !== undefined && filters.dateRange !== DEFAULT_DATE_PRESET) ||
    !!filters.search ||
    search.trim() !== ''

  const handleClearFilters = () => {
    setFilters({ dateRange: DEFAULT_DATE_PRESET })
    setSearch('')
    setPage(0)
  }

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: search.trim() || undefined }))
    setPage(0)
  }

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((prev) => ({ ...prev, [columnKey]: !prev[columnKey] }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Contratos</h2>
          <p className="text-sm text-muted-foreground">
            Lista dedicada de contratos com vigencia, pagamento e aditivos
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(page)}
          disabled={contratos.loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${contratos.loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Banknote className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">
                {metrics.loading ? '—' : formatCurrency(metrics.data.valorTotalContratado)}
              </p>
              <p className="text-xs text-muted-foreground">Valor contratado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">
                {metrics.loading ? '—' : metrics.data.assinados}
              </p>
              <p className="text-xs text-muted-foreground">Assinados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">
                {metrics.loading ? '—' : metrics.data.aguardandoAssinatura}
              </p>
              <p className="text-xs text-muted-foreground">Aguardando assinatura</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">
                {metrics.loading ? '—' : metrics.data.vencendo30d}
              </p>
              <p className="text-xs text-muted-foreground">Vencendo em 30d</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Paperclip className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {metrics.loading ? '—' : metrics.data.comAditivo}
              </p>
              <p className="text-xs text-muted-foreground">Com aditivo</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterDropdown
          label="Assinatura"
          value={filters.assinaturaStatus ?? 'all'}
          options={SIGNATURE_OPTIONS}
          onChange={(v) => {
            setFilters((f) => ({ ...f, assinaturaStatus: v === 'all' ? undefined : v }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Pagamento"
          value={filters.pagamentoStatus ?? 'all'}
          options={PAYMENT_OPTIONS}
          onChange={(v) => {
            setFilters((f) => ({ ...f, pagamentoStatus: v === 'all' ? undefined : v }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Vigencia"
          value={filters.vigencia ?? 'all'}
          options={VIGENCIA_OPTIONS}
          onChange={(v) => {
            setFilters((f) => ({ ...f, vigencia: v === 'all' ? undefined : v }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Vencimento"
          value={filters.vencimento ?? 'all'}
          options={VENCIMENTO_OPTIONS}
          onChange={(v) => {
            setFilters((f) => ({ ...f, vencimento: v === 'all' ? undefined : v }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Aditivo"
          value={filters.aditivo ?? 'all'}
          options={ADITIVO_OPTIONS}
          onChange={(v) => {
            setFilters((f) => ({ ...f, aditivo: v === 'all' ? undefined : v }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Producao"
          value={filters.producao ?? 'all'}
          options={PRODUCAO_OPTIONS}
          onChange={(v) => {
            setFilters((f) => ({ ...f, producao: v === 'all' ? undefined : v }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Periodo"
          value={String(filters.dateRange ?? DEFAULT_DATE_PRESET)}
          options={DATE_OPTIONS}
          onChange={(v) => {
            const preset: DateRangePreset = /^\d+$/.test(v)
              ? parseInt(v, 10)
              : (v as DateRangePreset)
            setFilters((f) => ({ ...f, dateRange: preset }))
            setPage(0)
          }}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center md:ml-auto">
          <ColumnToggle
            columns={OPTIONAL_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
          />
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar filtros
            </Button>
          )}
          <Input
            placeholder="Buscar compra_id, cliente ou celebridade..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            className="w-full text-sm sm:w-72 lg:w-80"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Buscar
          </Button>
        </div>
      </div>

      {contratos.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{contratos.error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Contratos ({contratos.total} encontrados)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-2 pt-1 text-xs text-muted-foreground sm:hidden">
            Deslize horizontalmente para ver todas as colunas.
          </div>
          <div className="overflow-x-auto pb-1">
            <table className="w-full min-w-[1400px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky top-0 z-10 min-w-[230px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Cliente</th>
                  <th className="sticky top-0 z-10 min-w-[160px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Celebridade</th>
                  <th className="sticky top-0 z-10 min-w-[120px] px-4 py-3 text-right font-medium text-muted-foreground bg-muted/50">Valor</th>
                  <th className="sticky top-0 z-10 min-w-[90px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Vigencia</th>
                  <th className="sticky top-0 z-10 min-w-[150px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Assinatura</th>
                  <th className="sticky top-0 z-10 min-w-[140px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Pagamento</th>
                  <th className="sticky top-0 z-10 min-w-[140px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Vencimento</th>
                  {visibleColumns.aditivo && (
                    <th className="sticky top-0 z-10 min-w-[140px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Aditivo</th>
                  )}
                  {visibleColumns.producao && (
                    <th className="sticky top-0 z-10 min-w-[130px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Producao</th>
                  )}
                  {visibleColumns.vendedor && (
                    <th className="sticky top-0 z-10 min-w-[160px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Vendedor</th>
                  )}
                  {visibleColumns.regiao && (
                    <th className="sticky top-0 z-10 min-w-[140px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Regiao</th>
                  )}
                  {visibleColumns.dataEnvio && (
                    <th className="sticky top-0 z-10 min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Data envio</th>
                  )}
                  {visibleColumns.dataAssinatura && (
                    <th className="sticky top-0 z-10 min-w-[120px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Data assinatura</th>
                  )}
                  {visibleColumns.saude && (
                    <th className="sticky top-0 z-10 min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">Saude</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {contratos.data.map((item) => (
                  <tr key={item.compra_id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <div className="font-medium">
                        {item.cliente_nome ?? item.cliente_razaosocial ?? '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {item.compra_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.celebridade_nome ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.valor_total)}</td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      {item.vigencia_meses != null ? `${item.vigencia_meses}m` : '—'}
                    </td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <StatusBadge
                        status={signatureBadgeStatus(item.clicksign_status)}
                        label={item.clicksign_status ? (CONTRACT_STATUS_LABELS[item.clicksign_status] ?? item.clicksign_status) : 'Sem contrato'}
                      />
                    </td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <StatusBadge
                        status={paymentBadgeStatus(item.checkout_status)}
                        label={item.checkout_status ? (CHECKOUT_STATUS_LABELS[item.checkout_status] ?? item.checkout_status) : '—'}
                      />
                    </td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <div className="space-y-1">
                        <div>{formatDateShort(item.fimdireitouso)}</div>
                        <VigenciaBadge fimdireitouso={item.fimdireitouso} />
                      </div>
                    </td>
                    {visibleColumns.aditivo && (
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <AditivoIndicator
                          temAditivo={item.tem_aditivo}
                          aditivoStatus={item.aditivo_status}
                          aditivoSentAt={item.aditivo_sent_at}
                          aditivoSignedAt={item.aditivo_signed_at}
                          aditivoStorageUrl={item.aditivo_storage_url}
                        />
                      </td>
                    )}
                    {visibleColumns.producao && (
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <StatusBadge
                          status="in_progress"
                          label={
                            item.statusproducao
                              ? PRODUCAO_STATUS_LABELS[item.statusproducao] ?? item.statusproducao
                              : '—'
                          }
                        />
                      </td>
                    )}
                    {visibleColumns.vendedor && (
                      <td className="px-4 py-3 text-muted-foreground">{item.vendedor_nome ?? '—'}</td>
                    )}
                    {visibleColumns.regiao && (
                      <td className="px-4 py-3 text-muted-foreground">{item.regiaocomprada ?? '—'}</td>
                    )}
                    {visibleColumns.dataEnvio && (
                      <td className="px-3 py-2.5 md:px-4 md:py-3">{formatDateShort(item.data_envio_assinatura)}</td>
                    )}
                    {visibleColumns.dataAssinatura && (
                      <td className="px-3 py-2.5 md:px-4 md:py-3">{formatDateShort(item.data_assinatura_concluida)}</td>
                    )}
                    {visibleColumns.saude && (
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <ContractHealthDot status={item.saude_contrato} />
                      </td>
                    )}
                  </tr>
                ))}
                {contratos.data.length === 0 && !contratos.loading && (
                  <tr>
                    <td
                      colSpan={7 + Object.values(visibleColumns).filter(Boolean).length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nenhum contrato encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {contratos.total > contratos.pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Pagina {contratos.page + 1} de{' '}
                {Math.ceil(contratos.total / contratos.pageSize)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={contratos.page === 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(contratos.page + 1) * contratos.pageSize >= contratos.total}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


