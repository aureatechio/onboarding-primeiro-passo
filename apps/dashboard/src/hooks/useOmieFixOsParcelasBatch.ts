import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_DATE_PRESET, getDateRange } from '@/lib/date-range'
import type { TransactionsFilters } from '@/hooks/useTransactions'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SERVICE_ROLE_KEY =
  (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined) ?? ''

const MAX_BATCH_IDS = 100
const DEFAULT_CONCURRENCY = 2
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type BatchItemStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'manual_required'
type BatchRunStatus = 'pending' | 'running' | 'completed' | 'failed'
type FixExecutionMode = 'dry_run' | 'execute'
type SelectionMode = 'page' | 'all_filtered'

export interface OmieFixOsParcelasBatchItem {
  id: string
  compra_id: string
  status: BatchItemStatus
  attempts: number
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  error_code: string | null
  error_message: string | null
  correlation_id: string | null
  result_reason: string | null
  result_action: string | null
  result_strategy: string | null
  result_before: unknown
  result_after: unknown
}

export interface OmieFixOsParcelasBatchSummary {
  status: BatchRunStatus
  pending_count: number
  running_count: number
  processed_count: number
  success_count: number
  failed_count: number
  skipped_count: number
  manual_required_count: number
}

export interface OmieFixOsParcelasBatchRun {
  id: string
  mode: FixExecutionMode
  status: BatchRunStatus
  requested_count: number
  processed_count: number
  success_count: number
  failed_count: number
  skipped_count: number
  manual_required_count: number
  created_at: string
  started_at: string | null
  finished_at: string | null
}

interface StartBatchParams {
  mode: SelectionMode
  executionMode: FixExecutionMode
  selectedIds: string[]
  filters: TransactionsFilters
  totalFilteredCount: number
  adminPassword: string
  sourceRunId?: string | null
}

interface UseOmieFixOsParcelasBatchReturn {
  loading: boolean
  running: boolean
  error: string | null
  run: OmieFixOsParcelasBatchRun | null
  summary: OmieFixOsParcelasBatchSummary | null
  items: OmieFixOsParcelasBatchItem[]
  requestedCount: number
  remainingCount: number
  progressPercent: number
  elapsedMs: number
  etaMs: number | null
  throughputPerMin: number | null
  lastUpdatedAtMs: number | null
  start: (params: StartBatchParams) => Promise<string | null>
  retryFailed: (adminPassword: string) => Promise<string | null>
  clear: () => void
  maxBatchIds: number
}

const normalizeBearerToken = (token: string) =>
  token.trim().replace(/^Bearer\s+/i, '')

const isLikelyJwt = (token: string): boolean => {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}

const UPSERT_BEARER_KEY = normalizeBearerToken(SERVICE_ROLE_KEY)

function resolveAdaptiveChunkSize(requestedCount: number): number {
  if (requestedCount <= 10) return 1
  if (requestedCount <= 30) return 2
  return 5
}

function mapBatchError(code?: string, message?: string): string {
  switch (code) {
    case 'ADMIN_PASSWORD_INVALID':
      return 'Senha administrativa inválida.'
    case 'UNAUTHORIZED':
      return 'Credencial interna inválida para executar o lote.'
    case 'BATCH_LIMIT_EXCEEDED':
      return message ?? `Lote excede o limite de ${MAX_BATCH_IDS} compras.`
    case 'NO_FAILED_ITEMS':
      return 'Não há itens com falha para reprocessar.'
    case 'RUN_NOT_FOUND':
      return 'Execução em lote não encontrada.'
    default:
      return message ?? 'Falha ao executar lote de consolidação de parcelas OS.'
  }
}

function applyTransactionsFiltersToIdsQuery(filters: TransactionsFilters) {
  const { since, until } = getDateRange(filters.dateRange ?? DEFAULT_DATE_PRESET)
  let next = supabase
    .from('v_transaction_pipeline')
    .select('compra_id', { count: 'exact' })
    .order('last_activity_at', { ascending: false, nullsFirst: false })

  if (since) next = next.gte('compra_created_at', since)
  if (until) next = next.lt('compra_created_at', until)

  if (filters.pipelineStatus && filters.pipelineStatus !== 'all') {
    next = next.eq('pipeline_status', filters.pipelineStatus)
  }

  if (filters.currentStage && filters.currentStage !== 'all') {
    next = next.eq('current_stage', filters.currentStage)
  }

  if (filters.search) {
    const s = filters.search.trim()
    if (UUID_REGEX.test(s)) {
      next = next.eq('compra_id', s)
    } else {
      next = next.ilike('cliente_nome', `%${s}%`)
    }
  }

  if (filters.vendedor && filters.vendedor !== 'all') {
    if (filters.vendedor === '__none__') {
      next = next.is('vendedor_nome', null)
    } else {
      next = next.eq('vendedor_nome', filters.vendedor)
    }
  }

  if (filters.celebridade && filters.celebridade !== 'all') {
    if (filters.celebridade === '__none__') {
      next = next.filter('clicksign_metadata->>celebridade', 'is', null)
    } else {
      next = next.filter(
        'clicksign_metadata->>celebridade',
        'eq',
        filters.celebridade
      )
    }
  }

  if (filters.contractStatus && filters.contractStatus !== 'all') {
    switch (filters.contractStatus) {
      case 'signed':
        next = next.eq('clicksign_status', 'Assinado')
        break
      case 'waiting':
        next = next.eq('clicksign_status', 'Aguardando Assinatura')
        break
      case 'error':
        next = next.eq('clicksign_status', 'error')
        break
      case 'none':
        next = next.is('clicksign_status', null)
        break
    }
  }

  if (filters.eligible) {
    if (!filters.paymentStatus || filters.paymentStatus === 'all') {
      next = next.eq('checkout_session_status', 'completed')
    }
    if (!filters.contractStatus || filters.contractStatus === 'all') {
      next = next.eq('clicksign_status', 'Assinado')
    }
  }

  if (filters.paymentStatus && filters.paymentStatus !== 'all') {
    next = next.eq('checkout_session_status', filters.paymentStatus)
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    switch (filters.paymentMethod) {
      case 'split':
        next = next.not('split_group_id', 'is', null)
        break
      case 'boleto_parcelado':
        next = next.not('split_group_id', 'is', null)
        next = next.eq('split_type', 'boleto_parcelado')
        break
      case 'cartao_recorrente':
        next = next.eq('metodo_pagamento', 'cartao_recorrente')
        break
      default:
        next = next.eq('metodo_pagamento', filters.paymentMethod)
        break
    }
  }

  if (filters.split === 'yes') {
    next = next.not('split_group_id', 'is', null)
  }
  if (filters.split === 'no') {
    next = next.is('split_group_id', null)
  }

  if (filters.nfeStatus && filters.nfeStatus !== 'all') {
    switch (filters.nfeStatus) {
      case 'Issued':
        next = next.eq('nfe_status', 'Issued')
        break
      case 'in_progress':
        next = next.or(
          'nfe_status.in.(Created,Processing,awaiting_nfse),nfe_request_status.eq.requested'
        )
        break
      case 'awaiting':
        next = next.eq('nfe_status', 'awaiting_nfse')
        break
      case 'Error':
        next = next.or(
          'nfe_status.eq.Error,nfe_status.eq.Cancelled,nfe_request_status.eq.failed'
        )
        break
      case 'none':
        next = next
          .is('nfe_status', null)
          .or('nfe_request_status.is.null,nfe_request_status.eq.pending')
        break
    }
  }

  if (filters.omieStatus && filters.omieStatus !== 'all') {
    switch (filters.omieStatus) {
      case 'synced':
        next = next.eq('omie_status', 'synced')
        break
      case 'in_progress':
        next = next.in('omie_status', ['pending', 'processing'])
        break
      case 'failed':
        next = next.eq('omie_status', 'failed')
        break
      case 'none':
        next = next.is('omie_status', null)
        break
    }
  }

  const amountExact = Number.isFinite(filters.amountExact)
    ? filters.amountExact
    : undefined
  const amountMin =
    amountExact === undefined && Number.isFinite(filters.amountMin)
      ? filters.amountMin
      : undefined
  const amountMax =
    amountExact === undefined && Number.isFinite(filters.amountMax)
      ? filters.amountMax
      : undefined

  if (amountExact !== undefined) {
    next = next.eq('valor_total', amountExact)
  } else {
    if (amountMin !== undefined) {
      next = next.gte('valor_total', amountMin)
    }
    if (amountMax !== undefined) {
      next = next.lte('valor_total', amountMax)
    }
  }

  return next
}

async function resolveCompraIdsForAllFiltered(
  filters: TransactionsFilters
): Promise<{ ids: string[]; total: number }> {
  const query = applyTransactionsFiltersToIdsQuery(filters)
  const { data, error, count } = await query.range(0, MAX_BATCH_IDS - 1)
  if (error) {
    throw new Error(`Falha ao resolver compras filtradas: ${error.message}`)
  }
  return {
    ids: ((data ?? []) as Array<{ compra_id: string }>).map((row) => row.compra_id),
    total: count ?? 0,
  }
}

export function useOmieFixOsParcelasBatch(): UseOmieFixOsParcelasBatchReturn {
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<OmieFixOsParcelasBatchRun | null>(null)
  const [summary, setSummary] = useState<OmieFixOsParcelasBatchSummary | null>(null)
  const [items, setItems] = useState<OmieFixOsParcelasBatchItem[]>([])
  const [executionStartedAtMs, setExecutionStartedAtMs] = useState<number | null>(
    null
  )
  const [lastUpdatedAtMs, setLastUpdatedAtMs] = useState<number | null>(null)
  const [nowTickMs, setNowTickMs] = useState<number>(Date.now())

  const clear = useCallback(() => {
    setLoading(false)
    setRunning(false)
    setError(null)
    setRun(null)
    setSummary(null)
    setItems([])
    setExecutionStartedAtMs(null)
    setLastUpdatedAtMs(null)
    setNowTickMs(Date.now())
  }, [])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setNowTickMs(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  const callBatch = useCallback(
    async (
      adminPassword: string,
      payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> => {
      if (!SUPABASE_URL || !UPSERT_BEARER_KEY) {
        throw new Error('Configuração interna ausente para executar batch OMIE.')
      }
      if (!isLikelyJwt(UPSERT_BEARER_KEY)) {
        throw new Error(
          'Credencial interna inválida. Configure VITE_SUPABASE_SERVICE_ROLE_KEY com JWT válido.'
        )
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/omie-fix-os-parcelas-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${UPSERT_BEARER_KEY}`,
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify(payload),
        }
      )
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >
      if (!response.ok) {
        const code = typeof data.code === 'string' ? data.code : undefined
        const message =
          typeof data.message === 'string' ? data.message : undefined
        throw new Error(mapBatchError(code, message))
      }
      return data
    },
    []
  )

  const runProcessLoop = useCallback(
    async (
      runId: string,
      adminPassword: string,
      requestedCountForRun: number
    ): Promise<void> => {
      setRunning(true)
      const loopStartedAt = Date.now()
      setExecutionStartedAtMs(loopStartedAt)
      setLastUpdatedAtMs(loopStartedAt)
      const adaptiveChunkSize = resolveAdaptiveChunkSize(requestedCountForRun)

      while (true) {
        const processRes = await callBatch(adminPassword, {
          action: 'process',
          run_id: runId,
          chunk_size: adaptiveChunkSize,
          concurrency: DEFAULT_CONCURRENCY,
        })
        const status = String(processRes.status ?? '')
        const pendingCount = Number(processRes.pending_count ?? 0)
        const runningCount = Number(processRes.running_count ?? 0)
        setSummary({
          status: (status || 'running') as BatchRunStatus,
          pending_count: pendingCount,
          running_count: runningCount,
          processed_count: Number(processRes.processed_count ?? 0),
          success_count: Number(processRes.success_count ?? 0),
          failed_count: Number(processRes.failed_count ?? 0),
          skipped_count: Number(processRes.skipped_count ?? 0),
          manual_required_count: Number(
            processRes.manual_required_count ?? 0
          ),
        })

        const statusRes = await callBatch(adminPassword, {
          action: 'status',
          run_id: runId,
          limit: 50,
          offset: 0,
        })
        const runPayload = (statusRes.run ?? null) as OmieFixOsParcelasBatchRun | null
        const summaryPayload =
          (statusRes.summary ?? null) as OmieFixOsParcelasBatchSummary | null
        const itemsPayload = (statusRes.items ?? []) as OmieFixOsParcelasBatchItem[]
        if (runPayload) setRun(runPayload)
        if (summaryPayload) setSummary(summaryPayload)
        setItems(itemsPayload)
        setLastUpdatedAtMs(Date.now())

        const isDone =
          (summaryPayload?.pending_count ?? pendingCount) <= 0 &&
          (summaryPayload?.running_count ?? runningCount) <= 0 &&
          (summaryPayload?.status ?? status) === 'completed'
        if (isDone) break
      }
      setRunning(false)
    },
    [callBatch]
  )

  const start = useCallback(
    async (params: StartBatchParams): Promise<string | null> => {
      setLoading(true)
      setError(null)
      setItems([])
      setSummary(null)
      try {
        const adminPassword = params.adminPassword.trim()
        let resolvedIds = params.selectedIds

        if (params.mode === 'all_filtered') {
          if (params.totalFilteredCount > MAX_BATCH_IDS) {
            throw new Error(
              `A seleção filtrada possui ${params.totalFilteredCount} itens. O limite atual é ${MAX_BATCH_IDS} por execução.`
            )
          }
          const { ids, total } = await resolveCompraIdsForAllFiltered(
            params.filters
          )
          if (total > MAX_BATCH_IDS) {
            throw new Error(
              `A seleção filtrada excede ${MAX_BATCH_IDS} itens.`
            )
          }
          resolvedIds = ids
        }

        const payload = await callBatch(adminPassword, {
          action: 'start',
          mode: params.executionMode,
          source_run_id: params.sourceRunId ?? undefined,
          compra_ids: resolvedIds,
          chunk_size: resolveAdaptiveChunkSize(resolvedIds.length),
          concurrency: DEFAULT_CONCURRENCY,
        })
        const runId = String(payload.run_id)
        setRun({
          id: runId,
          mode: params.executionMode,
          status: 'pending',
          requested_count: resolvedIds.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          skipped_count: 0,
          manual_required_count: 0,
          created_at: new Date().toISOString(),
          started_at: null,
          finished_at: null,
        })

        await runProcessLoop(runId, adminPassword, resolvedIds.length)
        setLoading(false)
        return runId
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao iniciar lote.')
        setRunning(false)
        setLoading(false)
        setExecutionStartedAtMs(null)
        return null
      }
    },
    [callBatch, runProcessLoop]
  )

  const retryFailed = useCallback(
    async (adminPassword: string): Promise<string | null> => {
      if (!run?.id) return null
      setLoading(true)
      setError(null)
      try {
        const retryRequestedEstimate = Math.max(1, run.failed_count ?? 1)
        const response = await callBatch(adminPassword.trim(), {
          action: 'retry-failed',
          run_id: run.id,
          chunk_size: resolveAdaptiveChunkSize(retryRequestedEstimate),
          concurrency: DEFAULT_CONCURRENCY,
        })
        const retryRunId = String(response.run_id)
        const retryRequestedCount = Number(response.requested_count ?? 0)
        const retryMode =
          response.mode === 'execute' ? 'execute' : ('dry_run' as FixExecutionMode)

        setRun({
          id: retryRunId,
          mode: retryMode,
          status: 'pending',
          requested_count: retryRequestedCount,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          skipped_count: 0,
          manual_required_count: 0,
          created_at: new Date().toISOString(),
          started_at: null,
          finished_at: null,
        })
        setItems([])
        setSummary(null)
        await runProcessLoop(
          retryRunId,
          adminPassword.trim(),
          retryRequestedCount
        )
        setLoading(false)
        return retryRunId
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao reprocessar falhas.')
        setLoading(false)
        setExecutionStartedAtMs(null)
        return null
      }
    },
    [callBatch, run?.id, run?.failed_count, runProcessLoop]
  )

  const requestedCount = useMemo(() => {
    if (run?.requested_count != null) return run.requested_count
    if (!summary) return 0
    return (
      summary.processed_count +
      summary.pending_count +
      summary.running_count
    )
  }, [run?.requested_count, summary])

  const remainingCount = useMemo(() => {
    if (!summary) return 0
    return Math.max(0, summary.pending_count + summary.running_count)
  }, [summary])

  const progressPercent = useMemo(() => {
    if (!summary || requestedCount <= 0) return 0
    return Math.min(
      100,
      Math.max(0, (summary.processed_count / requestedCount) * 100)
    )
  }, [summary, requestedCount])

  const elapsedMs = useMemo(() => {
    if (!executionStartedAtMs) return 0
    return Math.max(0, nowTickMs - executionStartedAtMs)
  }, [executionStartedAtMs, nowTickMs])

  const throughputPerMin = useMemo(() => {
    if (!summary) return null
    if (elapsedMs < 1000) return null
    if (summary.processed_count <= 0) return null
    const perSecond = summary.processed_count / (elapsedMs / 1000)
    return perSecond * 60
  }, [summary, elapsedMs])

  const etaMs = useMemo(() => {
    if (!summary) return null
    if (remainingCount <= 0) return 0
    if (!throughputPerMin || throughputPerMin <= 0) return null
    const perSecond = throughputPerMin / 60
    return Math.round((remainingCount / perSecond) * 1000)
  }, [summary, remainingCount, throughputPerMin])

  return useMemo(
    () => ({
      loading,
      running,
      error,
      run,
      summary,
      items,
      requestedCount,
      remainingCount,
      progressPercent,
      elapsedMs,
      etaMs,
      throughputPerMin,
      lastUpdatedAtMs,
      start,
      retryFailed,
      clear,
      maxBatchIds: MAX_BATCH_IDS,
    }),
    [
      loading,
      running,
      error,
      run,
      summary,
      items,
      requestedCount,
      remainingCount,
      progressPercent,
      elapsedMs,
      etaMs,
      throughputPerMin,
      lastUpdatedAtMs,
      start,
      retryFailed,
      clear,
    ]
  )
}

export type { SelectionMode, FixExecutionMode }
