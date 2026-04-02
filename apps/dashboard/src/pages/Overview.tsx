import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  MoreHorizontal,
  Trash2,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ArrowDown,
  ArrowUp,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { FilterDropdown, type FilterOption } from '@/components/FilterDropdown'
import { ExportButton } from '@/components/ExportButton'
import { MiniPipelineStepper } from '@/components/MiniPipelineStepper'
import { DeleteTransactionDialog } from '@/components/DeleteTransactionDialog'
import { OmieBatchUpsertDialog } from '@/components/OmieBatchUpsertDialog'
import { OmieFixOsParcelasBatchDialog } from '@/components/OmieFixOsParcelasBatchDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useTransactions,
  type TransactionsFilters,
  type SortDateField,
  type SortDateDirection,
} from '@/hooks/useTransactions'
import { useTransactionSum } from '@/hooks/useTransactionSum'
import { useRealtimeOverview } from '@/hooks/useRealtime'
import { useSplitMethodsMap } from '@/hooks/useSplitMethodsMap'
import { formatCurrency, timeAgo } from '@/lib/mask'
import { DEFAULT_DATE_PRESET, isCustomDateRange, type DateRangePreset } from '@/lib/date-range'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import {
  getPaymentMethodLabel,
  getMethodBadgeClass,
  truncateText,
  formatVigencia,
} from '@/lib/payment-method'
import { supabase } from '@/lib/supabase'

const ACTIVE_TRANSACTIONS_VIEW = 'v_transaction_pipeline_active'

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Pago' },
  { value: 'pending', label: 'Pendente' },
  { value: 'processing', label: 'Em processamento' },
  { value: 'expired', label: 'Expirado' },
  { value: 'failed', label: 'Falhou' },
  { value: 'cancelled', label: 'Cancelado' },
]

const CONTRACT_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'signed', label: 'Assinado' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'error', label: 'Erro' },
  { value: 'none', label: 'Sem contrato' },
]

const NFE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'Issued', label: 'Emitida' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'awaiting', label: 'Aguardando NFS-e' },
  { value: 'Error', label: 'Erro' },
  { value: 'none', label: 'Sem nota fiscal' },
]

const OMIE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'synced', label: 'Sincronizado' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'failed', label: 'Falhou' },
  { value: 'none', label: 'Sem integração' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'boleto_parcelado', label: 'Boleto parcelado' },
  { value: 'cartao_recorrente', label: 'Recorrente' },
  { value: 'split', label: 'Pagamento em grupo' },
]

const SPLIT_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Nao' },
]

const ALL_OPTION: FilterOption = { value: 'all', label: 'Todos' }
const NONE_VENDEDOR_OPTION: FilterOption = {
  value: '__none__',
  label: 'Sem vendedor',
}
const NONE_CELEBRIDADE_OPTION: FilterOption = {
  value: '__none__',
  label: 'Sem celebridade',
}

const DATE_PRESET_VALUES = new Set(['today', 'yesterday', 'month', 'lastMonth', 'all'])
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const EXCLUDED_AGENCY_NAME = 'Aceleraí'

function parseDateRangeParams(searchParams: URLSearchParams): DateRangePreset {
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (from && YMD_RE.test(from)) {
    return { from, to: to && YMD_RE.test(to) ? to : from }
  }

  const value = searchParams.get('period')
  if (!value) return DEFAULT_DATE_PRESET
  if (DATE_PRESET_VALUES.has(value)) {
    return value as DateRangePreset
  }
  if (/^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
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

function normalizeAgencyName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function isExcludedAgency(value: string | null | undefined): boolean {
  if (!value) return false
  return normalizeAgencyName(value) === normalizeAgencyName(EXCLUDED_AGENCY_NAME)
}

function parseSplitParam(value: string | null): 'yes' | 'no' | undefined {
  if (value === '1' || value === 'yes') return 'yes'
  if (value === '0' || value === 'no') return 'no'
  return undefined
}

function parseAmountParam(value: string | null): number | undefined {
  if (!value) return undefined
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return undefined
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return parsed
}

function formatAmountParam(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value) || value < 0) return null
  return Number(value.toFixed(2)).toString()
}

function normalizeAmountFilters(filters: TransactionsFilters): TransactionsFilters {
  if (filters.amountExact !== undefined) {
    return {
      ...filters,
      amountMin: undefined,
      amountMax: undefined,
    }
  }
  return filters
}

const SORT_DATE_VALUES = new Set<SortDateField>(['updated_at', 'created_at'])

function parseSortDateParam(value: string | null): SortDateField {
  if (value && SORT_DATE_VALUES.has(value as SortDateField)) {
    return value as SortDateField
  }
  return 'created_at'
}

const SORT_DIR_VALUES = new Set<SortDateDirection>(['asc', 'desc'])

function parseSortDirParam(value: string | null): SortDateDirection {
  if (value && SORT_DIR_VALUES.has(value as SortDateDirection)) {
    return value as SortDateDirection
  }
  return 'desc'
}

export function OverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const txs = useTransactions()
  const sum = useTransactionSum()
  const amountExactParam = parseAmountParam(searchParams.get('amount'))
  const amountMinParam = parseAmountParam(searchParams.get('amountMin'))
  const amountMaxParam = parseAmountParam(searchParams.get('amountMax'))
  const [filters, setFilters] = useState<TransactionsFilters>(() =>
    normalizeAmountFilters({
    paymentStatus: parseOptionalFilterParam(searchParams.get('pay')),
    contractStatus: parseOptionalFilterParam(searchParams.get('contract')),
    nfeStatus: parseOptionalFilterParam(searchParams.get('nfe')),
    omieStatus: parseOptionalFilterParam(searchParams.get('omie')),
    paymentMethod: parseOptionalFilterParam(searchParams.get('method')),
    split: parseSplitParam(searchParams.get('split')),
    eligible: searchParams.get('eligible') === '1',
    hasAgency: searchParams.get('withAgency') === '1',
    agency: (() => {
      const agencyParam = parseOptionalFilterParam(searchParams.get('agency'))
      return isExcludedAgency(agencyParam) ? undefined : agencyParam
    })(),
    dateRange: parseDateRangeParams(searchParams),
    vendedor: parseOptionalFilterParam(searchParams.get('seller')),
    celebridade: parseOptionalFilterParam(searchParams.get('celebrity')),
    search: parseOptionalFilterParam(searchParams.get('q')),
    sortBy: parseSortDateParam(searchParams.get('sortDate')),
    sortDir: parseSortDirParam(searchParams.get('sortDir')),
    amountExact: amountExactParam,
    amountMin: amountMinParam,
      amountMax: amountMaxParam,
    })
  )
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [amountExactInput, setAmountExactInput] = useState(
    searchParams.get('amount') ?? ''
  )
  const [amountMinInput, setAmountMinInput] = useState(
    searchParams.get('amountMin') ?? ''
  )
  const [amountMaxInput, setAmountMaxInput] = useState(
    searchParams.get('amountMax') ?? ''
  )
  const [page, setPage] = useState(() => parsePageParam(searchParams.get('page')))
  const [vendedorOptions, setVendedorOptions] = useState<FilterOption[]>([
    ALL_OPTION,
    NONE_VENDEDOR_OPTION,
  ])
  const [celebridadeOptions, setCelebridadeOptions] = useState<FilterOption[]>([
    ALL_OPTION,
    NONE_CELEBRIDADE_OPTION,
  ])
  const [agencyOptions, setAgencyOptions] = useState<FilterOption[]>([ALL_OPTION])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState<'page' | 'all_filtered'>('page')
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [fixOsParcelasBatchDialogOpen, setFixOsParcelasBatchDialogOpen] = useState(false)
  const [pageSize, setPageSize] = useState(25)
  const [deleteTarget, setDeleteTarget] = useState<{
    compraId: string
    clienteNome: string | null
  } | null>(null)

  // Advanced filters: auto-open if any advanced filter is active via URL
  const hasAdvancedFilterActive =
    !!filters.nfeStatus || !!filters.omieStatus || !!filters.split || !!filters.celebridade
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedFilterActive)

  const advancedActiveCount = [
    filters.nfeStatus,
    filters.omieStatus,
    filters.split,
    filters.celebridade,
  ].filter(Boolean).length

  const loadData = useCallback(
    (pageNum = page) => {
      txs.fetch(filters, pageNum, pageSize)
      sum.fetch(filters)
    },
    [txs, sum, filters, page, pageSize]
  )

  // Initial load
  useEffect(() => {
    loadData(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  // Clear selection when filters change. Keep global selection through pagination.
  useEffect(() => {
    setSelectedIds(new Set())
    setSelectionMode('page')
    setLastSelectedId(null)
  }, [filters])

  // Realtime refresh
  useRealtimeOverview(useCallback(() => loadData(page), [loadData, page]))

  useEffect(() => {
    const nextParams = new URLSearchParams()
    if (filters.paymentStatus) nextParams.set('pay', filters.paymentStatus)
    if (filters.contractStatus) nextParams.set('contract', filters.contractStatus)
    if (filters.nfeStatus) nextParams.set('nfe', filters.nfeStatus)
    if (filters.omieStatus) nextParams.set('omie', filters.omieStatus)
    if (filters.paymentMethod) nextParams.set('method', filters.paymentMethod)
    if (filters.split) nextParams.set('split', filters.split)
    if (filters.eligible) nextParams.set('eligible', '1')
    if (filters.hasAgency) nextParams.set('withAgency', '1')
    if (filters.agency) nextParams.set('agency', filters.agency)
    if (filters.vendedor) nextParams.set('seller', filters.vendedor)
    if (filters.celebridade) nextParams.set('celebrity', filters.celebridade)
    if (filters.search) nextParams.set('q', filters.search)
    const amountExactParam = formatAmountParam(filters.amountExact)
    const amountMinParam = formatAmountParam(filters.amountMin)
    const amountMaxParam = formatAmountParam(filters.amountMax)
    if (amountExactParam) {
      nextParams.set('amount', amountExactParam)
    } else {
      if (amountMinParam) nextParams.set('amountMin', amountMinParam)
      if (amountMaxParam) nextParams.set('amountMax', amountMaxParam)
    }
    if (filters.sortBy && filters.sortBy !== 'created_at') {
      nextParams.set('sortDate', filters.sortBy)
    }
    if (filters.sortDir && filters.sortDir !== 'desc') {
      nextParams.set('sortDir', filters.sortDir)
    }
    if (filters.dateRange !== undefined && filters.dateRange !== DEFAULT_DATE_PRESET) {
      if (isCustomDateRange(filters.dateRange)) {
        nextParams.set('from', filters.dateRange.from)
        nextParams.set('to', filters.dateRange.to)
      } else {
        nextParams.set('period', String(filters.dateRange))
      }
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

  const handleSearch = () => {
    setFilters((f) => ({
      ...f,
      search: search.trim() || undefined,
    }))
    setPage(0)
  }

  const loadDropdownOptions = useCallback(async () => {
    const { data, error } = await supabase
      .from(ACTIVE_TRANSACTIONS_VIEW)
      .select('vendedor_nome,clicksign_metadata,agencia_nome')

    if (error || !data) return

    const vendedores = new Set<string>()
    const celebridades = new Set<string>()
    const agencies = new Set<string>()

    for (const row of data as Array<{
      vendedor_nome: string | null
      clicksign_metadata: Record<string, unknown> | null
      agencia_nome: string | null
    }>) {
      const vendedor = row.vendedor_nome?.trim()
      if (vendedor) vendedores.add(vendedor)

      const agency = row.agencia_nome?.trim()
      if (agency && !isExcludedAgency(agency)) agencies.add(agency)

      const celebridade = String(row.clicksign_metadata?.celebridade ?? '').trim()
      if (celebridade) celebridades.add(celebridade)
    }

    const compareLabel = (a: string, b: string) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })

    setVendedorOptions([
      ALL_OPTION,
      NONE_VENDEDOR_OPTION,
      ...Array.from(vendedores)
        .sort(compareLabel)
        .map((value) => ({ value, label: value })),
    ])

    setCelebridadeOptions([
      ALL_OPTION,
      NONE_CELEBRIDADE_OPTION,
      ...Array.from(celebridades)
        .sort(compareLabel)
        .map((value) => ({ value, label: value })),
    ])

    setAgencyOptions([
      ALL_OPTION,
      ...Array.from(agencies)
        .sort(compareLabel)
        .map((value) => ({ value, label: value })),
    ])
  }, [])

  useEffect(() => {
    loadDropdownOptions()
  }, [loadDropdownOptions])

  const splitGroupIds = useMemo(
    () =>
      txs.data
        .map((tx) => tx.split_group_id)
        .filter((id): id is string => id != null),
    [txs.data]
  )
  const splitMethodsMap = useSplitMethodsMap(splitGroupIds)

  const hasActiveFilters =
    !!filters.paymentStatus ||
    !!filters.contractStatus ||
    !!filters.nfeStatus ||
    !!filters.omieStatus ||
    !!filters.paymentMethod ||
    !!filters.split ||
    !!filters.eligible ||
    !!filters.hasAgency ||
    !!filters.agency ||
    (filters.dateRange !== undefined && filters.dateRange !== DEFAULT_DATE_PRESET) ||
    !!filters.search ||
    !!filters.vendedor ||
    !!filters.celebridade ||
    filters.amountExact !== undefined ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined ||
    (!!filters.sortBy && filters.sortBy !== 'created_at') ||
    (!!filters.sortDir && filters.sortDir !== 'desc') ||
    search.trim() !== ''

  const handleClearFilters = () => {
    setFilters({ dateRange: DEFAULT_DATE_PRESET, sortBy: 'created_at', sortDir: 'desc' })
    setSearch('')
    setAmountExactInput('')
    setAmountMinInput('')
    setAmountMaxInput('')
    setPage(0)
    setAdvancedOpen(false)
  }

  const applyAmountFilters = useCallback(() => {
    setFilters((f) => {
      const next = normalizeAmountFilters({
        ...f,
        amountExact: parseAmountParam(amountExactInput),
        amountMin: parseAmountParam(amountMinInput),
        amountMax: parseAmountParam(amountMaxInput),
      })
      return next
    })
    setPage(0)
  }, [amountExactInput, amountMinInput, amountMaxInput])

  // --- Selection logic ---
  const allPageIds = useMemo(() => txs.data.map((tx) => tx.compra_id), [txs.data])

  const selectedCount = selectionMode === 'all_filtered' ? txs.total : selectedIds.size

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
    txs.total > 0 &&
    allPageIds.length > 0 &&
    allPageIds.every((id) => selectedIds.has(id)) &&
    txs.total > allPageIds.length

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

  const handleToggleRow = (compraId: string, shiftKey = false) => {
    if (selectionMode === 'all_filtered') {
      const pageWithoutCurrent = allPageIds.filter((id) => id !== compraId)
      setSelectedIds(new Set(pageWithoutCurrent))
      setSelectionMode('page')
      setLastSelectedId(compraId)
      return
    }

    setSelectedIds((prev) => {
      const next = new Set(prev)

      if (shiftKey && lastSelectedId) {
        const startIndex = allPageIds.indexOf(lastSelectedId)
        const endIndex = allPageIds.indexOf(compraId)

        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] =
            startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
          const rangeIds = allPageIds.slice(from, to + 1)
          const shouldSelectRange = !prev.has(compraId)

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

      if (next.has(compraId)) {
        next.delete(compraId)
      } else {
        next.add(compraId)
      }
      return next
    })

    setLastSelectedId(compraId)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode('page')
    setLastSelectedId(null)
  }

  // Stats
  const stats = {
    total: txs.total,
    completed: txs.data.filter((t) => t.pipeline_status === 'completed').length,
    errors: txs.data.filter((t) => t.pipeline_status === 'error').length,
    inProgress: txs.data.filter((t) => t.pipeline_status === 'in_progress').length,
  }

  return (
    <div className="space-y-3">
      {/* Header + KPI strip */}
      <TooltipProvider>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Pipeline Overview</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(page)}
              disabled={txs.loading}
              className="h-7 px-2"
            >
              <RefreshCw
                className={`h-3 w-3 ${txs.loading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          {/* Inline KPIs */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 border-l-2 border-l-primary pl-2">
                  <Banknote className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-lg font-bold">
                    {sum.loading ? '—' : formatCurrency(sum.sumValorTotal)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total de vendas no período filtrado</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="hidden h-5 sm:block" />

            <div className="flex items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="font-semibold text-foreground">{stats.total}</span> transações
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total de transações no período filtrado</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-semibold text-foreground">{stats.completed}</span> concluídos
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pipeline completo nesta página</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`flex items-center gap-1 ${stats.errors > 0 ? 'text-red-600' : ''}`}
                  >
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="font-semibold text-foreground">{stats.errors}</span> erros
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Erros no pipeline nesta página</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span className="font-semibold text-foreground">{stats.inProgress}</span> em andamento
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Em processamento nesta página</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </TooltipProvider>

      {/* Search + Filters card */}
      <Card className="px-4 py-3">
        {/* Search + primary filters row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, cliente, proposta ou CPF/CNPJ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-8 pl-8 text-sm w-full sm:w-56"
            />
          </div>
          <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
            <div className="w-full sm:w-[130px]">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Valor exato"
                value={amountExactInput}
                onChange={(event) => setAmountExactInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyAmountFilters()}
                className="h-8 text-sm"
              />
            </div>
            <div className="w-[104px]">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Min."
                value={amountMinInput}
                onChange={(event) => setAmountMinInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyAmountFilters()}
                className="h-8 text-sm"
                disabled={parseAmountParam(amountExactInput) !== undefined}
              />
            </div>
            <div className="w-[104px]">
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Max."
                value={amountMaxInput}
                onChange={(event) => setAmountMaxInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && applyAmountFilters()}
                className="h-8 text-sm"
                disabled={parseAmountParam(amountExactInput) !== undefined}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={applyAmountFilters}
              className="h-8 px-2.5 text-xs"
            >
              Aplicar valor
            </Button>
          </div>

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          <DateRangeFilter
            value={filters.dateRange ?? DEFAULT_DATE_PRESET}
            isActive={
              filters.dateRange !== undefined && filters.dateRange !== DEFAULT_DATE_PRESET
            }
            onChange={(preset) => {
              setFilters((f) => ({ ...f, dateRange: preset }))
              setPage(0)
            }}
          />
          <FilterDropdown
            label="Pagamento"
            value={filters.paymentStatus ?? 'all'}
            options={PAYMENT_OPTIONS}
            isActive={!!filters.paymentStatus}
            onChange={(v) => {
              setFilters((f) => ({
                ...f,
                paymentStatus: v === 'all' ? undefined : v,
              }))
              setPage(0)
            }}
          />
          <FilterDropdown
            label="Contrato"
            value={filters.contractStatus ?? 'all'}
            options={CONTRACT_OPTIONS}
            isActive={!!filters.contractStatus}
            onChange={(v) => {
              setFilters((f) => ({
                ...f,
                contractStatus: v === 'all' ? undefined : v,
              }))
              setPage(0)
            }}
          />
          <FilterDropdown
            label="Forma pgto"
            value={filters.paymentMethod ?? 'all'}
            options={PAYMENT_METHOD_OPTIONS}
            isActive={!!filters.paymentMethod}
            onChange={(v) => {
              setFilters((f) => ({
                ...f,
                paymentMethod: v === 'all' ? undefined : v,
              }))
              setPage(0)
            }}
          />
          <FilterDropdown
            label="Vendedor"
            value={filters.vendedor ?? 'all'}
            options={vendedorOptions}
            isActive={!!filters.vendedor}
            onChange={(v) => {
              setFilters((f) => ({
                ...f,
                vendedor: v === 'all' ? undefined : v,
              }))
              setPage(0)
            }}
          />
          <FilterDropdown
            label="Agência"
            value={filters.agency ?? 'all'}
            options={agencyOptions}
            isActive={!!filters.agency}
            onChange={(v) => {
              setFilters((f) => ({
                ...f,
                agency: v === 'all' || isExcludedAgency(v) ? undefined : v,
              }))
              setPage(0)
            }}
          />

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={!!filters.eligible}
              onCheckedChange={(checked) => {
                setFilters((f) => ({ ...f, eligible: checked === true }))
                setPage(0)
              }}
            />
            <span className={`text-sm ${filters.eligible ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
              Elegíveis
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <Checkbox
              checked={!!filters.hasAgency}
              onCheckedChange={(checked) => {
                setFilters((f) => ({ ...f, hasAgency: checked === true }))
                setPage(0)
              }}
            />
            <span
              className={`text-sm ${filters.hasAgency ? 'font-medium text-primary' : 'text-muted-foreground'}`}
            >
              Com agência
            </span>
          </label>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Advanced filters (collapsible) */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 gap-1 px-2 text-xs text-muted-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {advancedActiveCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {advancedActiveCount}
                </Badge>
              )}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 flex flex-wrap items-end gap-3 border-t pt-2">
              <FilterDropdown
                label="NFS-e"
                value={filters.nfeStatus ?? 'all'}
                options={NFE_OPTIONS}
                isActive={!!filters.nfeStatus}
                onChange={(v) => {
                  setFilters((f) => ({
                    ...f,
                    nfeStatus: v === 'all' ? undefined : v,
                  }))
                  setPage(0)
                }}
              />
              <FilterDropdown
                label="OMIE"
                value={filters.omieStatus ?? 'all'}
                options={OMIE_OPTIONS}
                isActive={!!filters.omieStatus}
                onChange={(v) => {
                  setFilters((f) => ({
                    ...f,
                    omieStatus: v === 'all' ? undefined : v,
                  }))
                  setPage(0)
                }}
              />
              <FilterDropdown
                label="Grupo de pagamento"
                value={filters.split ?? 'all'}
                options={SPLIT_OPTIONS}
                isActive={!!filters.split}
                onChange={(v) => {
                  setFilters((f) => ({
                    ...f,
                    split: v === 'all' ? undefined : (v as 'yes' | 'no'),
                  }))
                  setPage(0)
                }}
              />
              <FilterDropdown
                label="Celebridade"
                value={filters.celebridade ?? 'all'}
                options={celebridadeOptions}
                isActive={!!filters.celebridade}
                onChange={(v) => {
                  setFilters((f) => ({
                    ...f,
                    celebridade: v === 'all' ? undefined : v,
                  }))
                  setPage(0)
                }}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedCount} selecionada{selectedCount > 1 ? 's' : ''}
          </span>
          <Separator orientation="vertical" className="h-5" />
          {selectionMode !== 'all_filtered' && (
            <ExportButton
              listName="transactions"
              selectedIds={Array.from(selectedIds)}
              filters={{
                paymentStatus: filters.paymentStatus ?? 'all',
                contractStatus: filters.contractStatus ?? 'all',
                nfeStatus: filters.nfeStatus ?? 'all',
                omieStatus: filters.omieStatus ?? 'all',
                paymentMethod: filters.paymentMethod ?? 'all',
                split: filters.split ?? 'all',
                eligible: filters.eligible ? 'yes' : 'all',
                hasAgency: filters.hasAgency ? 'yes' : 'all',
                agency: filters.agency ?? 'all',
                dateRange: filters.dateRange,
                search: filters.search,
                vendedor: filters.vendedor ?? 'all',
                celebridade: filters.celebridade ?? 'all',
                amountExact: filters.amountExact ?? 'all',
                amountMin: filters.amountMin ?? 'all',
                amountMax: filters.amountMax ?? 'all',
              }}
              meta={{
                totalCount: txs.total,
                exportedCount: selectedCount,
                page: txs.page,
                pageSize: txs.pageSize,
              }}
              disabled={txs.loading}
              selectedCount={selectedCount}
            />
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setBatchDialogOpen(true)}
            disabled={txs.loading}
          >
            Upsert OS em massa ({selectedCount})
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFixOsParcelasBatchDialogOpen(true)}
            disabled={txs.loading}
          >
            Consolidar Parcelas OS OMIE ({selectedCount})
          </Button>
        </div>
      )}

      {/* Error state */}
      {txs.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{txs.error}</CardContent>
        </Card>
      )}

      {/* Table */}
      <TooltipProvider>
      <Card>
        <CardHeader className="pb-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-sm">
              Transações ({txs.total} encontradas)
            </CardTitle>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-primary">
                  {selectionMode === 'all_filtered'
                    ? `Todos os ${selectedCount} resultados filtrados`
                    : `${selectedCount} selecionada${selectedCount > 1 ? 's' : ''}`}
                </span>
                {canSelectAllFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectionMode('all_filtered')}
                    className="h-6 px-2 text-xs text-primary"
                  >
                    Selecionar todos os {txs.total} resultados
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
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-2 pt-1 text-xs text-muted-foreground sm:hidden">
            Deslize horizontalmente para ver todas as colunas.
          </div>
          <div className="overflow-x-auto pb-1">
            <table className="w-full min-w-[1320px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky top-0 z-10 w-10 px-3 py-3 bg-muted/50">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={handleToggleAll}
                      aria-label="Selecionar todas as transações"
                    />
                  </th>
                  <th className="sticky top-0 z-10 min-w-[200px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Cliente
                  </th>
                  <th className="sticky top-0 z-10 min-w-[140px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Vendedor
                  </th>
                  <th className="sticky top-0 z-10 min-w-[140px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Celebridade
                  </th>
                  <th className="sticky top-0 z-10 min-w-[100px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Valor
                  </th>
                  <th className="sticky top-0 z-10 min-w-[80px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Vigência
                  </th>
                  <th className="sticky top-0 z-10 min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Forma pgto
                  </th>
                  <th className="sticky top-0 z-10 min-w-[220px] px-4 py-3 text-left font-medium text-muted-foreground bg-muted/50">
                    Pipeline
                  </th>
                  <th className="sticky top-0 z-10 min-w-[130px] px-4 py-3 text-right font-medium text-muted-foreground bg-muted/50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {filters.sortBy === 'created_at' ? 'Criado' : 'Atualizado'}
                          {filters.sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setFilters((f) => ({ ...f, sortBy: 'updated_at', sortDir: 'desc' }))
                            setPage(0)
                          }}
                        >
                          {filters.sortBy !== 'created_at' && filters.sortDir !== 'asc' ? (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          ) : (
                            <span className="w-[20px]" />
                          )}
                          Atualização — mais recente
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFilters((f) => ({ ...f, sortBy: 'updated_at', sortDir: 'asc' }))
                            setPage(0)
                          }}
                        >
                          {filters.sortBy !== 'created_at' && filters.sortDir === 'asc' ? (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          ) : (
                            <span className="w-[20px]" />
                          )}
                          Atualização — mais antigo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setFilters((f) => ({ ...f, sortBy: 'created_at', sortDir: 'desc' }))
                            setPage(0)
                          }}
                        >
                          {filters.sortBy === 'created_at' && filters.sortDir !== 'asc' ? (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          ) : (
                            <span className="w-[20px]" />
                          )}
                          Criação — mais recente
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setFilters((f) => ({ ...f, sortBy: 'created_at', sortDir: 'asc' }))
                            setPage(0)
                          }}
                        >
                          {filters.sortBy === 'created_at' && filters.sortDir === 'asc' ? (
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                          ) : (
                            <span className="w-[20px]" />
                          )}
                          Criação — mais antigo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="sticky top-0 z-10 w-12 px-2 py-3 bg-muted/50" />
                </tr>
              </thead>
              <tbody>
                {txs.data.map((tx) => {
                  const isSelected = selectedIds.has(tx.compra_id)
                  return (
                    <tr
                      key={tx.compra_id}
                      className={`border-b cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/5 hover:bg-primary/10'
                          : 'hover:bg-muted/30'
                      }`}
                    >
                      <td
                        className="w-10 px-3 py-2.5 md:py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleRow(tx.compra_id, e.shiftKey)
                          }}
                          aria-label={`Selecionar transação ${tx.compra_id.slice(0, 8)}`}
                        />
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {tx.cliente_nome && tx.cliente_nome.length > 50 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="font-medium max-w-[200px] truncate">
                                  {truncateText(tx.cliente_nome, 50)}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{tx.cliente_nome}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="font-medium">{tx.cliente_nome ?? '—'}</div>
                          )}
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {tx.compra_id.slice(0, 8)}...
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {tx.vendedor_nome ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {tx.celebridade_nome ??
                            (tx.clicksign_metadata as Record<string, string> | null)
                              ?.celebridade ??
                            '—'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {formatCurrency(tx.valor_total)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {formatVigencia(tx.vigencia_meses)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {(() => {
                            const label = getPaymentMethodLabel(tx)
                            const badgeCls = getMethodBadgeClass(label)
                            if (label === '—') return <span className="text-muted-foreground">—</span>
                            if (label === '2 meios' && tx.split_group_id) {
                              const methods = splitMethodsMap[tx.split_group_id]
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className={`cursor-default gap-1 ${badgeCls}`}
                                    >
                                      {label}
                                      <Info className="h-3 w-3 opacity-60" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{methods ?? 'Carregando...'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            }
                            return (
                              <Badge variant="outline" className={badgeCls}>
                                {label}
                              </Badge>
                            )
                          })()}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 md:px-4 md:py-3">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          <MiniPipelineStepper data={tx} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <Link to={`/transaction/${tx.compra_id}`} className="block">
                          {timeAgo(
                            filters.sortBy === 'created_at'
                              ? tx.compra_created_at
                              : tx.last_activity_at
                          )}
                        </Link>
                      </td>
                      <td
                        className="w-12 px-2 py-2.5 md:py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Ações</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  compraId: tx.compra_id,
                                  clienteNome: tx.cliente_nome,
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Deletar transação
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
                {txs.data.length === 0 && !txs.loading && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Nenhuma transação encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Página {txs.page + 1} de {Math.max(1, Math.ceil(txs.total / txs.pageSize))}
              </span>
              <select
                className="h-7 rounded-md border bg-background px-2 text-xs"
                value={pageSize}
                onChange={(event) => {
                  const newSize = Number(event.target.value)
                  setPageSize(newSize)
                  setPage(0)
                  setSelectedIds(new Set())
                  setSelectionMode('page')
                  setLastSelectedId(null)
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
                size="sm"
                disabled={txs.page === 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(txs.page + 1) * txs.pageSize >= txs.total}
                onClick={() => setPage((prev) => prev + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </TooltipProvider>

      {/* Delete transaction dialog */}
      {deleteTarget && (
        <DeleteTransactionDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
          }}
          compraId={deleteTarget.compraId}
          clienteNome={deleteTarget.clienteNome}
          onDeleted={() => {
            setDeleteTarget(null)
            loadData(page)
          }}
        />
      )}

      <OmieBatchUpsertDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        mode={selectionMode}
        selectedIds={Array.from(selectedIds)}
        selectedCount={selectedCount}
        totalFilteredCount={txs.total}
        filters={filters}
        onFinished={() => loadData(page)}
      />
      <OmieFixOsParcelasBatchDialog
        open={fixOsParcelasBatchDialogOpen}
        onOpenChange={setFixOsParcelasBatchDialogOpen}
        mode={selectionMode}
        selectedIds={Array.from(selectedIds)}
        selectedCount={selectedCount}
        totalFilteredCount={txs.total}
        filters={filters}
        onFinished={() => loadData(page)}
      />
    </div>
  )
}
