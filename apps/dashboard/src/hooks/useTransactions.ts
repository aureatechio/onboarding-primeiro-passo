import { useState, useCallback } from 'react'
import { createLogger, isAbortError, ServiceError } from '@aurea/shared'
import { supabase } from '@/lib/supabase'
import { DEFAULT_DATE_PRESET, getDateRange, type DateRangePreset } from '@/lib/date-range'
import type { TransactionPipeline } from './useTransaction'

export type SortDateField = 'updated_at' | 'created_at'
export type SortDateDirection = 'asc' | 'desc'

const SORT_FIELD_MAP: Record<SortDateField, string> = {
  updated_at: 'last_activity_at',
  created_at: 'compra_created_at',
}

export interface TransactionsFilters {
  pipelineStatus?: string
  currentStage?: string
  dateRange?: DateRangePreset
  search?: string
  vendedor?: string // 'all' | '__none__' | exact value
  agency?: string // 'all' | exact value
  hasAgency?: boolean
  celebridade?: string // 'all' | '__none__' | exact value
  contractStatus?: string // 'all' | 'signed' | 'waiting' | 'error' | 'none'
  paymentStatus?: string // 'all' | 'completed' | 'pending' | 'processing' | 'expired' | 'failed' | 'cancelled'
  paymentMethod?: string // 'all' | 'boleto' | 'pix' | 'cartao' | 'cartao_recorrente' | 'boleto_parcelado' | 'split'
  split?: 'yes' | 'no' // 'all' | 'yes' | 'no'
  eligible?: boolean
  nfeStatus?: string // 'all' | 'Issued' | 'in_progress' | 'Error' | 'none'
  omieStatus?: string // 'all' | 'synced' | 'in_progress' | 'failed' | 'none'
  sortBy?: SortDateField
  sortDir?: SortDateDirection
  amountExact?: number
  amountMin?: number
  amountMax?: number
}

const DEFAULT_PAGE_SIZE = 25
const ACTIVE_TRANSACTIONS_VIEW = 'v_transaction_pipeline_active'
const EXCLUDED_AGENCY_NAME = 'Aceleraí'

const dashboardHooksLogger = createLogger({
  level: 'info',
  nodeEnv: import.meta.env.MODE === 'test' ? 'test' : 'production',
})

function normalizeErrorMessage(error: unknown): string {
  if (isAbortError(error)) {
    return 'Requisição cancelada'
  }

  if (error instanceof ServiceError) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message
  }

  return 'Erro ao carregar transações'
}

function normalizeSearchTerm(value: string): string {
  return value.replaceAll(',', ' ').trim()
}

const UUID_WITH_HYPHENS_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UUID_HEX_32_RE = /^[0-9a-f]{32}$/i

function normalizeUuidSearch(value: string): string | null {
  if (UUID_WITH_HYPHENS_RE.test(value)) {
    return value
  }

  if (!UUID_HEX_32_RE.test(value)) {
    return null
  }

  const compact = value.toLowerCase()
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
}

interface UseTransactionsResult {
  data: TransactionPipeline[]
  loading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  fetch: (filters?: TransactionsFilters, page?: number, pageSize?: number) => Promise<void>
}

function resolveAmountFilters(filters?: TransactionsFilters): {
  amountExact?: number
  amountMin?: number
  amountMax?: number
} {
  const amountExact = filters?.amountExact
  const amountMin = filters?.amountMin
  const amountMax = filters?.amountMax

  // Rule: exact amount always takes precedence over range.
  if (Number.isFinite(amountExact)) {
    return { amountExact }
  }

  return {
    amountMin: Number.isFinite(amountMin) ? amountMin : undefined,
    amountMax: Number.isFinite(amountMax) ? amountMax : undefined,
  }
}

export function useTransactions(): UseTransactionsResult {
  const [data, setData] = useState<TransactionPipeline[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [currentPageSize, setCurrentPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetch = useCallback(
    async (filters?: TransactionsFilters, pageNum = 0, pageSize?: number) => {
      const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE
      setLoading(true)
      setError(null)
      setPage(pageNum)
      setCurrentPageSize(effectivePageSize)

      const from = pageNum * effectivePageSize
      const to = from + effectivePageSize - 1

      const sortColumn = SORT_FIELD_MAP[filters?.sortBy ?? 'created_at']
      const ascending = (filters?.sortDir ?? 'desc') === 'asc'

      let query = supabase
        .from(ACTIVE_TRANSACTIONS_VIEW)
        .select('*', { count: 'exact' })
        .order(sortColumn, { ascending, nullsFirst: false })
        .range(from, to)

      // Apply date range filter
      const { since, until } = getDateRange(filters?.dateRange ?? DEFAULT_DATE_PRESET)
      if (since) {
        query = query.gte('compra_created_at', since)
      }
      if (until) {
        query = query.lt('compra_created_at', until)
      }

      if (filters?.pipelineStatus && filters.pipelineStatus !== 'all') {
        query = query.eq('pipeline_status', filters.pipelineStatus)
      }

      if (filters?.currentStage && filters.currentStage !== 'all') {
        query = query.eq('current_stage', filters.currentStage)
      }

      if (filters?.search) {
        // Search by compra_id (UUID) OR textual fields (cliente/proposta/documento)
        const s = normalizeSearchTerm(filters.search)
        const digitsOnly = s.replace(/\D/g, '')
        const normalizedUuid = normalizeUuidSearch(s)
        if (normalizedUuid) {
          query = query.eq('compra_id', normalizedUuid)
        } else {
          const searchClauses = [
            `cliente_nome.ilike.%${s}%`,
            `numero_proposta.ilike.%${s}%`,
            `cliente_documento.ilike.%${s}%`,
          ]
          if (digitsOnly && digitsOnly !== s) {
            searchClauses.push(`cliente_documento.ilike.%${digitsOnly}%`)
          }
          query = query.or(searchClauses.join(','))
        }
      }

      if (filters?.vendedor && filters.vendedor !== 'all') {
        if (filters.vendedor === '__none__') {
          query = query.is('vendedor_nome', null)
        } else {
          query = query.eq('vendedor_nome', filters.vendedor)
        }
      }

      if (filters?.hasAgency) {
        query = query
          .not('agencia_nome', 'is', null)
          .not('agencia_nome', 'eq', '')
          .not('agencia_nome', 'eq', EXCLUDED_AGENCY_NAME)
      }

      if (filters?.agency && filters.agency !== 'all') {
        query = query.eq('agencia_nome', filters.agency)
      }

      if (filters?.celebridade && filters.celebridade !== 'all') {
        if (filters.celebridade === '__none__') {
          query = query.filter('clicksign_metadata->>celebridade', 'is', null)
        } else {
          query = query.filter(
            'clicksign_metadata->>celebridade',
            'eq',
            filters.celebridade
          )
        }
      }

      if (filters?.contractStatus && filters.contractStatus !== 'all') {
        switch (filters.contractStatus) {
          case 'signed':
            query = query.eq('clicksign_status', 'Assinado')
            break
          case 'waiting':
            query = query.eq('clicksign_status', 'Aguardando Assinatura')
            break
          case 'error':
            query = query.eq('clicksign_status', 'error')
            break
          case 'none':
            query = query.is('clicksign_status', null)
            break
        }
      }

      if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
        query = query.eq(
          'checkout_session_status',
          filters.paymentStatus
        )
      }

      if (filters?.eligible) {
        const hasExplicitPaymentStatus =
          !!filters.paymentStatus && filters.paymentStatus !== 'all'
        const hasExplicitContractStatus =
          !!filters.contractStatus && filters.contractStatus !== 'all'

        if (!hasExplicitPaymentStatus && !hasExplicitContractStatus) {
          query = query.or(
            'clicksign_status.eq.Assinado,checkout_session_status.eq.completed'
          )
        }
      }

      if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
        switch (filters.paymentMethod) {
          case 'split':
            query = query.not('split_group_id', 'is', null)
            break
          case 'boleto_parcelado':
            query = query.not('split_group_id', 'is', null)
            query = query.eq('split_type', 'boleto_parcelado')
            break
          case 'cartao_recorrente':
            query = query.eq('metodo_pagamento', 'cartao_recorrente')
            break
          default:
            // boleto, pix, cartao
            query = query.eq('metodo_pagamento', filters.paymentMethod)
        }
      }

      if (filters?.split === 'yes') {
        query = query.not('split_group_id', 'is', null)
      }

      if (filters?.split === 'no') {
        query = query.is('split_group_id', null)
      }

      if (filters?.nfeStatus && filters.nfeStatus !== 'all') {
        switch (filters.nfeStatus) {
          case 'Issued':
            query = query.eq('nfe_status', 'Issued')
            break
          case 'in_progress':
            query = query.or(
              'nfe_status.in.(Created,Processing,awaiting_nfse),nfe_request_status.eq.requested'
            )
            break
          case 'awaiting':
            query = query.eq('nfe_status', 'awaiting_nfse')
            break
          case 'Error':
            query = query.or(
              'nfe_status.eq.Error,nfe_status.eq.Cancelled,nfe_request_status.eq.failed'
            )
            break
          case 'none':
            query = query.is('nfe_status', null).or(
              'nfe_request_status.is.null,nfe_request_status.eq.pending'
            )
            break
        }
      }

      if (filters?.omieStatus && filters.omieStatus !== 'all') {
        switch (filters.omieStatus) {
          case 'synced':
            query = query.eq('omie_status', 'synced')
            break
          case 'in_progress':
            query = query.in('omie_status', ['pending', 'processing'])
            break
          case 'failed':
            query = query.eq('omie_status', 'failed')
            break
          case 'none':
            query = query.is('omie_status', null)
            break
        }
      }

      const { amountExact, amountMin, amountMax } = resolveAmountFilters(filters)
      if (amountExact !== undefined) {
        query = query.eq('valor_total', amountExact)
      } else {
        if (amountMin !== undefined) {
          query = query.gte('valor_total', amountMin)
        }
        if (amountMax !== undefined) {
          query = query.lte('valor_total', amountMax)
        }
      }

      const { data: result, error: err, count } = await query

      if (err) {
        const normalizedError = normalizeErrorMessage(err)
        dashboardHooksLogger.error(
          {
            error: err,
            filters,
            page: pageNum,
          },
          'Supabase query failed in useTransactions'
        )
        setError(normalizedError)
      } else {
        setData((result as TransactionPipeline[]) ?? [])
        setTotal(count ?? 0)
      }

      setLoading(false)
    },
    []
  )

  return { data, loading, error, total, page, pageSize: currentPageSize, fetch }
}
