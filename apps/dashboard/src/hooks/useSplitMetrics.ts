import { useCallback, useEffect, useRef, useState } from 'react'
import { createLogger, isAbortError, ServiceError } from '@aurea/shared'
import { supabase } from '@/lib/supabase'
import { getDateRange, type DateRangePreset } from '@/lib/date-range'
import {
  getSplitStatusForTable,
  isSplitStuck,
  normalizeSplitStatus,
} from '@/lib/split-status'
import type {
  SplitAuditEvent,
  SplitGroupDetail,
  SplitGroupItem,
  SplitMethodMetric,
  SplitMetricsSummary,
  SplitQueryState,
  SplitSessionItem,
  SplitFilterParams,
  SplitErrorCodeMetric,
} from '@/types/split-metrics'
import type { PostgrestError } from '@supabase/supabase-js'

type RpcSummaryResponse = Record<string, unknown>
type RpcGroupListItem = Record<string, unknown>
type RpcGroupListResponse = {
  items?: unknown
  total?: unknown
}
type RpcGroupDetailResponse = {
  group?: Record<string, unknown> | null
  sessions?: unknown
}

const REFRESH_INTERVAL_MS = 30_000
const STUCK_THRESHOLD_MINUTES = 120
const DEFAULT_PAGE_SIZE = 50
const DEFAULT_PERIOD: DateRangePreset = 7

const logger = createLogger({
  level: 'info',
  nodeEnv: import.meta.env.MODE === 'test' ? 'test' : 'production',
})

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return fallback
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function normalizeErrorMessage(error: unknown): string {
  if (isAbortError(error)) {
    return 'Requisição cancelada'
  }

  if (error instanceof ServiceError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  const hasMessage =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'

  if (hasMessage) {
    return (error as { message: string }).message
  }

  return 'Erro de comunicação com o servidor'
}

function roundPercent(value: number): number {
  return Number(value.toFixed(2))
}

function toProgress(paid = 0, total = 0): number {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((paid / total) * 100)))
}

function normalizeSplitType(value: unknown): string | null {
  const normalized = asString(value, '').trim()
  if (!normalized || normalized === 'all') return null
  return normalized
}

function normalizeMethodName(method: unknown): string | null {
  const value = asString(method, '').trim().toLowerCase()
  if (!value || value === 'all' || value === 'outro') {
    return null
  }
  return value
}

function parseSummary(raw: RpcSummaryResponse | null): SplitMetricsSummary {
  const totalGroups = toNumber(
    raw?.total_groups ?? raw?.total_splits ?? raw?.total ?? raw?.count,
    0
  )
  const completed = toNumber(raw?.completed_groups ?? raw?.completed_splits, 0)
  const partial = toNumber(raw?.partial_groups ?? raw?.partial_splits, 0)
  const pending = toNumber(raw?.pending_groups ?? raw?.pending_splits, 0)
  const inProgress = toNumber(raw?.in_progress ?? raw?.in_progress_splits, 0)
  const failed = toNumber(raw?.failed_groups ?? raw?.failed_splits, 0)

  return {
    totalGroups,
    completedGroups: completed,
    partialGroups: partial,
    pendingGroups: pending,
    inProgressGroups: inProgress,
    failedGroups: failed,
    completionRate:
      raw?.conversion_pct == null ? null : roundPercent(toNumber(raw.conversion_pct, 0)),
    partialRecoveryRate:
      raw?.partial_recovery_pct == null
        ? null
        : roundPercent(toNumber(raw.partial_recovery_pct, 0)),
    avgCompletionSeconds:
      raw?.avg_completion_seconds == null
        ? null
        : roundPercent(toNumber(raw.avg_completion_seconds, 0)),
    failureRate:
      raw?.failure_pct == null ? null : roundPercent(toNumber(raw.failure_pct, 0)),
    byMethod: normalizeMethodMetrics(raw?.by_method),
    topErrorCodes: normalizeErrorCodeMetrics(raw?.top_error_codes),
    raw: raw ?? {},
  }
}

function normalizeMethodMetrics(methods: unknown): SplitMethodMetric[] {
  if (!Array.isArray(methods)) return []
  return methods.map((entry) => {
    const row = entry as Record<string, unknown>
    return {
      method: asString(row.method, 'outro'),
      total: toNumber(row.total, 0),
      completed: toNumber(row.completed, 0),
      conversion_pct:
        row.conversion_pct == null
          ? null
          : roundPercent(toNumber(row.conversion_pct, 0)),
    }
  })
}

function normalizeErrorCodeMetrics(rows: unknown): SplitErrorCodeMetric[] {
  if (!Array.isArray(rows)) return []
  return rows.map((entry) => {
    const row = entry as Record<string, unknown>
    return {
      error_code: asString(row.error_code, 'desconhecido'),
      count: toNumber(row.count, 0),
    }
  })
}

function normalizeGroupItem(raw: RpcGroupListItem): SplitGroupItem {
  const status = normalizeSplitStatus(asString(raw.status_atual, 'unknown'))
  const updatedAt = asString(raw.updated_at)
  return {
    groupId: asString(raw.group_id),
    splitType: asString(raw.split_type, 'unknown'),
    status,
    createdAt: asString(raw.created_at),
    updatedAt,
    valor: toNumber(raw.valor, 0),
    sessoesTotal: toNumber(raw.sessoes_total, 0),
    sessoesPagas: toNumber(raw.sessoes_pagas, 0),
    tempoDesdeAtualizacaoMinutos:
      raw.tempo_desde_atualizacao == null || raw.tempo_desde_atualizacao === undefined
        ? null
        : toNumber(raw.tempo_desde_atualizacao, 0),
    isStuck:
      raw.is_stuck === true ||
      isSplitStuck(status, updatedAt, STUCK_THRESHOLD_MINUTES),
  }
}

function normalizeSession(raw: Record<string, unknown>): SplitSessionItem {
  return {
    splitSessionId: asString(raw.split_session_id),
    splitIndex: raw.split_index == null ? null : toNumber(raw.split_index, 0),
    compraId: raw.compra_id == null ? null : asString(raw.compra_id),
    metodoPagamento: raw.metodo_pagamento == null ? null : asString(raw.metodo_pagamento),
    status: raw.status == null ? null : asString(raw.status),
    paymentId: raw.payment_id == null ? null : asString(raw.payment_id),
    paymentStatus:
      typeof raw.payment_status === 'number' ? raw.payment_status : null,
    completedAt: raw.completed_at == null ? null : asString(raw.completed_at),
    valor: toNumber(raw.valor, 0),
    attempts: toNumber(raw.attempts, 0),
    gateway: raw.gateway == null ? '' : asString(raw.gateway),
    createdAt: raw.created_at == null ? null : asString(raw.created_at),
    updatedAt: raw.updated_at == null ? null : asString(raw.updated_at),
  }
}

function normalizeAuditEvent(raw: Record<string, unknown>): SplitAuditEvent {
  return {
    eventAt: asString(raw.event_at),
    eventType: asString(raw.event_type, 'Evento'),
    errorCode: raw.error_code == null ? null : asString(raw.error_code),
    errorMessage: raw.error_message == null ? null : asString(raw.error_message),
    functionName: raw.function_name == null ? null : asString(raw.function_name),
    sessionId: raw.session_id == null ? null : asString(raw.session_id),
    executionTimeMs:
      raw.execution_time_ms == null ? null : toNumber(raw.execution_time_ms, 0),
    metadata: raw.metadata == null ? null : (raw.metadata as Record<string, unknown>),
  }
}

function normalizeGroupDetail(
  raw: RpcGroupDetailResponse | null
): { group: SplitGroupItem; sessions: SplitSessionItem[] } | null {
  if (!raw || !raw.group || typeof raw.group !== 'object') return null

  const group = normalizeGroupItem(raw.group as RpcGroupListItem)
  const sessions = Array.isArray(raw.sessions)
    ? (raw.sessions as Record<string, unknown>[]).map(normalizeSession)
    : []

  return { group, sessions }
}

function statusBadge(status: string, stuck: boolean) {
  if (stuck) {
    return {
      label: 'Em risco',
      variant: 'destructive' as const,
    }
  }

  return getSplitStatusForTable(status)
}

const defaultFilters: SplitFilterParams = {
  period: DEFAULT_PERIOD,
  splitType: 'all',
  status: 'all',
  method: 'all',
  onlyStuck: false,
  search: '',
  orderBy: 'updated_at',
}

const defaultState: SplitQueryState = {
  summary: null,
  groups: [],
  totalGroups: 0,
  page: 0,
  cursor: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  loading: false,
  error: null,
  filters: { ...defaultFilters },
  selectedGroupId: null,
  groupDetail: null,
  detailLoading: false,
  detailError: null,
}

export function useSplitMetrics() {
  const [state, setState] = useState<SplitQueryState>({ ...defaultState })
  const stateRef = useRef<SplitQueryState>(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const fetchData = useCallback(
    async (
      filters: SplitFilterParams = stateRef.current.filters,
      page = stateRef.current.page,
      pageSize = stateRef.current.pageSize
    ) => {
      const period = filters.period ?? DEFAULT_PERIOD
      const { since, until } = getDateRange(period)
      const safePage = Math.max(0, Math.floor(page))
      const safePageSize = Math.max(1, Math.floor(pageSize))
      const offset = safePage * safePageSize

      const splitType = normalizeSplitType(filters.splitType)
      const rawStatus = filters.status ?? 'all'
      const status = rawStatus === 'all' || rawStatus === 'stuck' ? null : rawStatus
      const onlyStuck = filters.onlyStuck || rawStatus === 'stuck'
      const method = normalizeMethodName(filters.method)
      const search = filters.search.trim() ? filters.search.trim() : null
      const orderBy = filters.orderBy || 'updated_at'

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        filters,
        page: safePage,
        cursor: offset,
        pageSize: safePageSize,
      }))

      const listParams = {
        p_since: since ?? null,
        p_until: until ?? null,
        p_split_type: splitType,
        p_status: status,
        p_method: method,
        p_search: search,
        p_only_stuck: onlyStuck,
        p_limit: safePageSize,
        p_offset: offset,
        p_order_by: orderBy,
      }
      const summaryParams = {
        p_since: since ?? null,
        p_until: until ?? null,
        p_split_type: splitType,
      }

      const [summaryResponse, listResponse] = await Promise.allSettled([
        supabase.rpc('get_split_metrics', summaryParams),
        supabase.rpc('get_split_group_list', listParams),
      ])

      const errors: string[] = []
      let summary = stateRef.current.summary
      let groups = stateRef.current.groups
      let totalGroups = stateRef.current.totalGroups

      if (summaryResponse.status === 'fulfilled') {
        const { data, error } = summaryResponse.value as {
          data: RpcSummaryResponse | null
          error: PostgrestError | null
        }
        if (error) {
          errors.push(error.message)
          logger.error({ context: 'get_split_metrics', error, period }, 'Falha na consulta de métricas')
        } else if (data) {
          summary = parseSummary(data)
        } else {
          summary = parseSummary({})
        }
      } else {
        const msg = normalizeErrorMessage(summaryResponse.reason)
        errors.push(msg)
        logger.error(
          { context: 'get_split_metrics', error: summaryResponse.reason, period },
          'Falha na consulta de métricas (promise)'
        )
      }

      if (listResponse.status === 'fulfilled') {
        const { data, error } = listResponse.value as {
          data: RpcGroupListResponse | null
          error: PostgrestError | null
        }
        if (error) {
          errors.push(error.message)
          logger.error({ context: 'get_split_group_list', error }, 'Falha na consulta de grupos')
        } else if (data) {
          const responseData = data as { items?: unknown; total?: unknown }
          const rows = Array.isArray(responseData.items)
            ? (responseData.items as RpcGroupListItem[])
            : []
          groups = rows.map(normalizeGroupItem)
          totalGroups = toNumber(responseData.total, 0)
        } else {
          groups = []
          totalGroups = 0
        }
      } else {
        const msg = normalizeErrorMessage(listResponse.reason)
        errors.push(msg)
        logger.error(
          { context: 'get_split_group_list', error: listResponse.reason },
          'Falha na consulta de grupos (promise)'
        )
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        summary,
        groups,
        totalGroups,
        error: errors.length > 0 ? errors.join(' • ') : null,
        filters,
        page: safePage,
        cursor: offset,
        pageSize: safePageSize,
      }))
    },
    []
  )

  const loadGroupDetail = useCallback(async (groupId: string) => {
    setState((prev) => ({
      ...prev,
      selectedGroupId: groupId,
      detailLoading: true,
      detailError: null,
    }))

    const [detailResponse, eventsResponse] = await Promise.allSettled([
      supabase.rpc('get_split_group_detail', {
        p_split_group_id: groupId,
      }),
      supabase.rpc('get_split_group_events', {
        p_split_group_id: groupId,
        p_limit: 80,
      }),
    ])

    const errors: string[] = []
    let group: SplitGroupItem | null = null
    let sessions: SplitSessionItem[] = []
    let events: SplitAuditEvent[] = []

    if (detailResponse.status === 'fulfilled') {
      const { data, error } = detailResponse.value as {
        data: RpcGroupDetailResponse | null
        error: PostgrestError | null
      }
      if (error) {
        errors.push(error.message)
        logger.error(
          { context: 'get_split_group_detail', error, groupId },
          'Falha no detalhe do grupo'
        )
      } else if (data) {
        const normalized = normalizeGroupDetail(data)
        if (normalized) {
          group = normalized.group
          sessions = normalized.sessions
        } else {
          errors.push('Grupo não encontrado')
        }
      } else {
        errors.push('Grupo não encontrado')
      }
    } else {
      const msg = normalizeErrorMessage(detailResponse.reason)
      errors.push(msg)
      logger.error(
        { context: 'get_split_group_detail', error: detailResponse.reason, groupId },
        'Detalhe do grupo falhou'
      )
    }

    if (sessions.length > 0) {
      const sessionIds = sessions.map((session) => session.splitSessionId)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('checkout_sessions')
        .select('id, compra_id, payment_id, payment_status, completed_at, status')
        .in('id', sessionIds)

      if (sessionsError) {
        errors.push(sessionsError.message)
        logger.error(
          { context: 'checkout_sessions_detail_enrichment', error: sessionsError, groupId },
          'Falha ao enriquecer sessões do split'
        )
      } else if (Array.isArray(sessionsData) && sessionsData.length > 0) {
        const byId = new Map(
          sessionsData.map((row) => [
            asString((row as Record<string, unknown>).id),
            row as Record<string, unknown>,
          ])
        )

        sessions = sessions.map((session) => {
          const extra = byId.get(session.splitSessionId)
          if (!extra) return session
          return {
            ...session,
            compraId:
              extra.compra_id == null ? session.compraId : asString(extra.compra_id),
            paymentId:
              extra.payment_id == null ? session.paymentId : asString(extra.payment_id),
            paymentStatus:
              typeof extra.payment_status === 'number'
                ? extra.payment_status
                : session.paymentStatus,
            completedAt:
              extra.completed_at == null ? session.completedAt : asString(extra.completed_at),
            status: extra.status == null ? session.status : asString(extra.status),
          }
        })
      }
    }

    if (eventsResponse.status === 'fulfilled') {
      const { data, error } = eventsResponse.value as {
        data: unknown
        error: PostgrestError | null
      }
      if (error) {
        errors.push(error.message)
        logger.error(
          { context: 'get_split_group_events', error, groupId },
          'Falha na consulta de eventos'
        )
      } else if (Array.isArray(data)) {
        events = data
          .map((row) => normalizeAuditEvent(row as Record<string, unknown>))
          .sort((a, b) => {
            if (a.eventAt === b.eventAt) return 0
            return a.eventAt > b.eventAt ? -1 : 1
          })
      }
    } else {
      const msg = normalizeErrorMessage(eventsResponse.reason)
      errors.push(msg)
      logger.error(
        { context: 'get_split_group_events', error: eventsResponse.reason, groupId },
        'Consulta de eventos falhou (promise)'
      )
    }

    if (!group) {
      setState((prev) => ({
        ...prev,
        detailLoading: false,
        detailError: errors[0] ?? 'Não foi possível carregar o detalhe do grupo',
        groupDetail: null,
      }))
      return
    }

    const detail: SplitGroupDetail = {
      group: {
        ...group,
        isStuck: isSplitStuck(group.status, group.updatedAt, STUCK_THRESHOLD_MINUTES),
      },
      sessions,
      events,
    }

    setState((prev) => ({
      ...prev,
      detailLoading: false,
      detailError: errors.length > 0 ? errors.join(' • ') : null,
      groupDetail: detail,
    }))
  }, [])

  const clearGroupDetail = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedGroupId: null,
      groupDetail: null,
      detailLoading: false,
      detailError: null,
    }))
  }, [])

  const setFilters = useCallback(
    async (patch: Partial<SplitFilterParams>) => {
      const nextFilters = { ...stateRef.current.filters, ...patch }
      await fetchData(nextFilters, 0, stateRef.current.pageSize)
    },
    [fetchData]
  )

  const setPage = useCallback(
    async (page: number) => {
      await fetchData(stateRef.current.filters, page, stateRef.current.pageSize)
    },
    [fetchData]
  )

  const setPageSize = useCallback(
    async (pageSize: number) => {
      await fetchData(stateRef.current.filters, 0, pageSize)
    },
    [fetchData]
  )

  const fetch = useCallback(
    async (
      patch: Partial<SplitFilterParams> = {},
      page = stateRef.current.page,
      pageSize = stateRef.current.pageSize
    ) => {
      const nextFilters = { ...stateRef.current.filters, ...patch }
      await fetchData(nextFilters, page, pageSize)
    },
    [fetchData]
  )

  const refetch = useCallback(async () => {
    await fetchData(
      stateRef.current.filters,
      stateRef.current.page,
      stateRef.current.pageSize
    )
  }, [fetchData])

  const refresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  useEffect(() => {
    void refetch()
  }, [refetch])

  useEffect(() => {
    const timer = setInterval(() => {
      void refetch()
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refetch])

  return {
    ...state,
    fetch,
    refresh,
    refetch,
    setFilters,
    setPage,
    setPageSize,
    loadGroupDetail,
    clearGroupDetail,
    getStatusBadge: statusBadge,
    toProgress: (item: SplitGroupItem) => toProgress(item.sessoesPagas, item.sessoesTotal),
  }
}
