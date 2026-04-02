import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterDropdown } from '@/components/FilterDropdown'
import { StatusBadge } from '@/components/StatusBadge'
import { useTransactionTasks, type TaskFilters } from '@/hooks/useTransactionTasks'
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/types/tasks'
import { DEFAULT_DATE_PRESET, getDateRange, type DateRangePreset } from '@/lib/date-range'
import { formatDate } from '@/lib/mask'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'todo', label: TASK_STATUS_LABELS.todo },
  { value: 'in_progress', label: TASK_STATUS_LABELS.in_progress },
  { value: 'done', label: TASK_STATUS_LABELS.done },
  { value: 'blocked', label: TASK_STATUS_LABELS.blocked },
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'low', label: TASK_PRIORITY_LABELS.low },
  { value: 'medium', label: TASK_PRIORITY_LABELS.medium },
  { value: 'high', label: TASK_PRIORITY_LABELS.high },
]

const DATE_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'month', label: 'Mês atual' },
  { value: 'lastMonth', label: 'Mês Anterior' },
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: 'all', label: 'Todo período' },
]

const DATE_PRESET_VALUES = new Set(['today', 'yesterday', 'month', 'lastMonth', 'all'])

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

function parseSelectParam<T extends string>(value: string | null): T | 'all' {
  if (!value || value === 'all') return 'all'
  return value as T
}

function parseOptionalFilterParam(value: string | null): string | undefined {
  if (!value || value === 'all') return undefined
  return value
}

function statusBadgeVariant(status: TaskStatus): 'completed' | 'in_progress' | 'error' | 'pending' {
  if (status === 'done') return 'completed'
  if (status === 'in_progress') return 'in_progress'
  if (status === 'blocked') return 'error'
  return 'pending'
}

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tasks = useTransactionTasks()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [filters, setFilters] = useState<{
    status: TaskStatus | 'all'
    priority: TaskPriority | 'all'
    dateRange: DateRangePreset
    search?: string
  }>({
    status: parseSelectParam<TaskStatus>(searchParams.get('status')),
    priority: parseSelectParam<TaskPriority>(searchParams.get('prio')),
    dateRange: parseDateRangeParam(searchParams.get('period')),
    search: parseOptionalFilterParam(searchParams.get('q')),
  })
  const [page, setPage] = useState(() => parsePageParam(searchParams.get('page')))

  const loadData = useCallback(
    (pageNum = page) => {
      const range = getDateRange(filters.dateRange)
      const queryFilters: TaskFilters = {
        status: filters.status,
        priority: filters.priority,
        search: filters.search,
        dateFrom: range.since,
        dateTo: range.until,
      }
      tasks.fetchAll(queryFilters, pageNum)
    },
    [filters, tasks, page]
  )

  useEffect(() => {
    loadData(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page])

  useEffect(() => {
    const nextParams = new URLSearchParams()
    if (filters.status !== 'all') nextParams.set('status', filters.status)
    if (filters.priority !== 'all') nextParams.set('prio', filters.priority)
    if (filters.search) nextParams.set('q', filters.search)
    if (filters.dateRange !== DEFAULT_DATE_PRESET) {
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

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: search.trim() || undefined }))
    setPage(0)
  }

  const clearFilters = () => {
    setSearch('')
    setFilters({
      status: 'all',
      priority: 'all',
      dateRange: DEFAULT_DATE_PRESET,
      search: undefined,
    })
    setPage(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tarefas</h2>
          <p className="text-sm text-muted-foreground">
            Gestão operacional de tarefas vinculadas às transações
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData(page)} disabled={tasks.loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${tasks.loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FilterDropdown
          label="Status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setFilters((prev) => ({ ...prev, status: value as TaskStatus | 'all' }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Prioridade"
          value={filters.priority}
          options={PRIORITY_OPTIONS}
          onChange={(value) => {
            setFilters((prev) => ({ ...prev, priority: value as TaskPriority | 'all' }))
            setPage(0)
          }}
        />
        <FilterDropdown
          label="Período"
          value={String(filters.dateRange)}
          options={DATE_OPTIONS}
          onChange={(value) => {
            const preset: DateRangePreset = /^\d+$/.test(value)
              ? Number.parseInt(value, 10)
              : (value as DateRangePreset)
            setFilters((prev) => ({ ...prev, dateRange: preset }))
            setPage(0)
          }}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center md:ml-auto">
          <Input
            placeholder="Buscar por título, responsável ou compra_id..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            className="w-full sm:w-72 lg:w-80"
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            Buscar
          </Button>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar
          </Button>
        </div>
      </div>

      {tasks.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 text-sm text-red-700">{tasks.error}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm">Tarefas ({tasks.total} encontradas)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 pb-2 pt-1 text-xs text-muted-foreground sm:hidden">
            Deslize horizontalmente para ver todas as colunas.
          </div>
          <div className="overflow-x-auto pb-1">
            <table className="w-full min-w-[980px] text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Prioridade</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Responsável</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Atualizado</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Transação</th>
                </tr>
              </thead>
              <tbody>
                {tasks.tasks.map((task) => (
                  <tr key={task.id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <div className="font-medium">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <select
                        value={task.status}
                        onChange={(event) =>
                          tasks.updateStatus(task.id, event.target.value as TaskStatus)
                        }
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                        disabled={tasks.updating}
                      >
                        <option value="todo">{TASK_STATUS_LABELS.todo}</option>
                        <option value="in_progress">{TASK_STATUS_LABELS.in_progress}</option>
                        <option value="done">{TASK_STATUS_LABELS.done}</option>
                        <option value="blocked">{TASK_STATUS_LABELS.blocked}</option>
                      </select>
                      <div className="mt-1">
                        <StatusBadge
                          status={statusBadgeVariant(task.status)}
                          label={TASK_STATUS_LABELS[task.status]}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">{TASK_PRIORITY_LABELS[task.priority]}</td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">{task.assignee_text ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(task.updated_at)}
                    </td>
                    <td className="px-3 py-2.5 md:px-4 md:py-3">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/transaction/${task.compra_id}`}>
                          <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Abrir</span>
                          <span className="sr-only sm:hidden">Abrir transacao</span>
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {tasks.tasks.length === 0 && !tasks.loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma tarefa encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {tasks.total > tasks.pageSize && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Página {tasks.page + 1} de {Math.ceil(tasks.total / tasks.pageSize)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tasks.page === 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(tasks.page + 1) * tasks.pageSize >= tasks.total}
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


