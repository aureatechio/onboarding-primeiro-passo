import type { DateRangePreset } from '@/lib/date-range'

export type SplitType = 'dual_payment' | 'boleto_parcelado' | 'unknown'

export type SplitQueryStatus = 'pending' | 'partial' | 'completed' | 'cancelled' | 'stuck' | 'unknown'

export interface SplitMethodMetric {
  method: string
  total: number
  completed: number
  conversion_pct: number | null
}

export interface SplitErrorCodeMetric {
  error_code: string
  count: number
}

export interface SplitMetricsSummary {
  totalGroups: number
  completedGroups: number
  partialGroups: number
  pendingGroups: number
  inProgressGroups: number
  failedGroups: number
  completionRate: number | null
  partialRecoveryRate: number | null
  avgCompletionSeconds: number | null
  failureRate: number | null
  byMethod: SplitMethodMetric[]
  topErrorCodes: SplitErrorCodeMetric[]
  raw: Record<string, unknown>
}

export interface SplitGroupItem {
  groupId: string
  splitType: string | null
  status: string
  createdAt: string
  updatedAt: string
  valor: number
  sessoesTotal: number
  sessoesPagas: number
  tempoDesdeAtualizacaoMinutos: number | null
  isStuck: boolean
}

export interface SplitSessionItem {
  splitSessionId: string
  splitIndex: number | null
  compraId: string | null
  metodoPagamento: string | null
  status: string | null
  paymentId: string | null
  paymentStatus: number | null
  completedAt: string | null
  valor: number
  attempts: number
  gateway: string
  createdAt: string | null
  updatedAt: string | null
}

export interface SplitAuditEvent {
  eventAt: string
  eventType: string
  errorCode: string | null
  errorMessage: string | null
  functionName: string | null
  sessionId: string | null
  executionTimeMs: number | null
  metadata: Record<string, unknown> | null
}

export interface SplitGroupDetail {
  group: SplitGroupItem
  sessions: SplitSessionItem[]
  events: SplitAuditEvent[]
}

export interface SplitFilterParams {
  period: DateRangePreset
  splitType: 'all' | 'dual_payment' | 'boleto_parcelado'
  status: 'all' | 'pending' | 'partial' | 'completed' | 'cancelled' | 'stuck'
  method: string
  onlyStuck: boolean
  search: string
  orderBy: 'updated_at' | 'created_at' | 'status' | 'progress' | 'stuck'
}

export interface SplitQueryState {
  summary: SplitMetricsSummary | null
  groups: SplitGroupItem[]
  totalGroups: number
  page: number
  cursor: number
  pageSize: number
  loading: boolean
  error: string | null
  filters: SplitFilterParams
  selectedGroupId: string | null
  groupDetail: SplitGroupDetail | null
  detailLoading: boolean
  detailError: string | null
}
