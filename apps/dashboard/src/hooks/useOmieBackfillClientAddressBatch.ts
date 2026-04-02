import { useCallback, useMemo, useState } from 'react'
import { resolveClienteIdsForAllFiltered, type ClientsFilters } from '@/hooks/useClients'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SERVICE_ROLE_KEY = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined) ?? ''
const MAX_BATCH_IDS = 100
const DEFAULT_CONCURRENCY = 2
const DEFAULT_CHUNK_SIZE = 20

type BatchRunStatus = 'pending' | 'running' | 'completed' | 'failed'
type BatchItemStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'manual_required'

export interface ClientAddressBatchRun {
  id: string
  status: BatchRunStatus
  requested_count: number
  processed_count: number
  success_count: number
  failed_count: number
  skipped_count: number
  manual_required_count: number
  created_at: string
}

export interface ClientAddressBatchSummary {
  status: BatchRunStatus
  pending_count: number
  running_count: number
  processed_count: number
  success_count: number
  failed_count: number
  skipped_count: number
  manual_required_count: number
}

export interface ClientAddressBatchItem {
  id: string
  cliente_id: string
  status: BatchItemStatus
  attempts: number
  duration_ms: number | null
  error_code: string | null
  error_message: string | null
  correlation_id: string | null
}

type SelectionMode = 'page' | 'all_filtered'
type ExecutionMode = 'dry_run' | 'execute'

interface StartBatchParams {
  mode: SelectionMode
  selectedIds: string[]
  filters: ClientsFilters
  totalFilteredCount: number
  adminPassword: string
  executionMode: ExecutionMode
}

interface UseOmieBackfillClientAddressBatchReturn {
  loading: boolean
  running: boolean
  error: string | null
  run: ClientAddressBatchRun | null
  summary: ClientAddressBatchSummary | null
  items: ClientAddressBatchItem[]
  start: (params: StartBatchParams) => Promise<boolean>
  retryFailed: (adminPassword: string) => Promise<boolean>
  clear: () => void
  maxBatchIds: number
}

const normalizeBearerToken = (token: string) => token.trim().replace(/^Bearer\s+/i, '')
const BATCH_BEARER_KEY = normalizeBearerToken(SERVICE_ROLE_KEY)

function mapBatchError(code?: string, message?: string): string {
  switch (code) {
    case 'ADMIN_PASSWORD_INVALID':
      return 'Senha administrativa inválida.'
    case 'UNAUTHORIZED':
      return 'Credencial interna inválida para executar o lote.'
    case 'BATCH_LIMIT_EXCEEDED':
      return message ?? `Lote excede o limite de ${MAX_BATCH_IDS} clientes.`
    case 'NO_FAILED_ITEMS':
      return 'Não há itens com falha para reprocessar.'
    case 'RUN_NOT_FOUND':
      return 'Execução em lote não encontrada.'
    default:
      return message ?? 'Falha ao executar lote de backfill de clientes.'
  }
}

export function useOmieBackfillClientAddressBatch(): UseOmieBackfillClientAddressBatchReturn {
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<ClientAddressBatchRun | null>(null)
  const [summary, setSummary] = useState<ClientAddressBatchSummary | null>(null)
  const [items, setItems] = useState<ClientAddressBatchItem[]>([])

  const clear = useCallback(() => {
    setLoading(false)
    setRunning(false)
    setError(null)
    setRun(null)
    setSummary(null)
    setItems([])
  }, [])

  const callBatch = useCallback(
    async (adminPassword: string, payload: Record<string, unknown>) => {
      if (!SUPABASE_URL || !BATCH_BEARER_KEY) {
        throw new Error('Configuração interna ausente para executar batch OMIE.')
      }
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/omie-backfill-client-address-batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BATCH_BEARER_KEY}`,
            'x-admin-password': adminPassword,
          },
          body: JSON.stringify(payload),
        }
      )
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        const code = typeof data.code === 'string' ? data.code : undefined
        const message = typeof data.message === 'string' ? data.message : undefined
        throw new Error(mapBatchError(code, message))
      }
      return data
    },
    []
  )

  const runProcessLoop = useCallback(
    async (runId: string, adminPassword: string): Promise<void> => {
      setRunning(true)
      while (true) {
        const processRes = await callBatch(adminPassword, {
          action: 'process',
          run_id: runId,
          chunk_size: DEFAULT_CHUNK_SIZE,
          concurrency: DEFAULT_CONCURRENCY,
        })

        const statusRes = await callBatch(adminPassword, {
          action: 'status',
          run_id: runId,
          limit: 20,
          offset: 0,
        })

        if (statusRes.run) setRun(statusRes.run as ClientAddressBatchRun)
        if (statusRes.summary) setSummary(statusRes.summary as ClientAddressBatchSummary)
        setItems((statusRes.items as ClientAddressBatchItem[]) ?? [])

        const pendingCount = Number(processRes.pending_count ?? 0)
        const runningCount = Number(processRes.running_count ?? 0)
        const status = String(processRes.status ?? '')
        const isDone = pendingCount <= 0 && runningCount <= 0 && status === 'completed'
        if (isDone) break
      }
      setRunning(false)
    },
    [callBatch]
  )

  const start = useCallback(
    async (params: StartBatchParams): Promise<boolean> => {
      setLoading(true)
      setError(null)
      setSummary(null)
      setItems([])

      try {
        const adminPassword = params.adminPassword.trim()
        let resolvedIds = params.selectedIds

        if (params.mode === 'all_filtered') {
          if (params.totalFilteredCount > MAX_BATCH_IDS) {
            throw new Error(
              `A seleção filtrada possui ${params.totalFilteredCount} itens. O limite atual é ${MAX_BATCH_IDS}.`
            )
          }
          const { ids, total } = await resolveClienteIdsForAllFiltered(
            params.filters,
            MAX_BATCH_IDS
          )
          if (total > MAX_BATCH_IDS) {
            throw new Error(`A seleção filtrada excede ${MAX_BATCH_IDS} itens.`)
          }
          resolvedIds = ids
        }

        const payload = await callBatch(adminPassword, {
          action: 'start',
          mode: params.executionMode,
          cliente_ids: resolvedIds,
          chunk_size: DEFAULT_CHUNK_SIZE,
          concurrency: DEFAULT_CONCURRENCY,
        })

        const runId = String(payload.run_id)
        setRun({
          id: runId,
          status: 'pending',
          requested_count: resolvedIds.length,
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          skipped_count: 0,
          manual_required_count: 0,
          created_at: new Date().toISOString(),
        })

        await runProcessLoop(runId, adminPassword)
        setLoading(false)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao iniciar lote de clientes.')
        setLoading(false)
        setRunning(false)
        return false
      }
    },
    [callBatch, runProcessLoop]
  )

  const retryFailed = useCallback(
    async (adminPassword: string): Promise<boolean> => {
      if (!run?.id) return false
      setLoading(true)
      setError(null)
      try {
        const response = await callBatch(adminPassword.trim(), {
          action: 'retry-failed',
          run_id: run.id,
        })
        const retryRunId = String(response.run_id)
        setRun({
          id: retryRunId,
          status: 'pending',
          requested_count: Number(response.requested_count ?? 0),
          processed_count: 0,
          success_count: 0,
          failed_count: 0,
          skipped_count: 0,
          manual_required_count: 0,
          created_at: new Date().toISOString(),
        })
        setItems([])
        setSummary(null)
        await runProcessLoop(retryRunId, adminPassword.trim())
        setLoading(false)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao reprocessar falhas.')
        setLoading(false)
        return false
      }
    },
    [callBatch, run?.id, runProcessLoop]
  )

  return useMemo(
    () => ({
      loading,
      running,
      error,
      run,
      summary,
      items,
      start,
      retryFailed,
      clear,
      maxBatchIds: MAX_BATCH_IDS,
    }),
    [loading, running, error, run, summary, items, start, retryFailed, clear]
  )
}

export type { SelectionMode, ExecutionMode }
