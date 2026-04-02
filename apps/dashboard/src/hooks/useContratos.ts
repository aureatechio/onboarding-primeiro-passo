import { useState, useCallback } from 'react'
import { createLogger, isAbortError, ServiceError } from '@aurea/shared'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_DATE_PRESET,
  getDateRange,
  type DateRangePreset,
} from '@/lib/date-range'
import type { ClicksignSigner } from './useTransaction'

export interface Contrato {
  compra_id: string
  cliente_id: string | null
  lead_id: string | null
  cliente_nome: string | null
  cliente_razaosocial: string | null
  cliente_documento: string | null
  celebridade_id: string | null
  celebridade_nome: string | null
  vendedor_nome: string | null
  valor_total: number
  vigencia_meses: number | null
  tempoocomprado: string | null
  regiaocomprada: string | null
  clicksign_status: string | null
  clicksign_envelope_id: string | null
  clicksign_signers: ClicksignSigner[] | null
  clicksign_metadata: Record<string, unknown> | null
  data_envio_assinatura: string | null
  data_assinatura_concluida: string | null
  fimdireitouso: string | null
  checkout_status: string | null
  statusproducao: string | null
  statuscompra: string | null
  vendaaprovada: boolean | null
  aditivo_status: string | null
  aditivo_sent_at: string | null
  aditivo_signed_at: string | null
  aditivo_storage_url: string | null
  tem_aditivo: boolean
  vencimento_status: string | null
  saude_contrato: string | null
  compra_created_at: string
}

export interface ContratosFilters {
  assinaturaStatus?: string
  pagamentoStatus?: string
  vigencia?: string
  vencimento?: string
  aditivo?: string
  producao?: string
  dateRange?: DateRangePreset
  search?: string
}

interface UseContratosResult {
  data: Contrato[]
  loading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  fetch: (filters?: ContratosFilters, page?: number) => Promise<void>
}

const PAGE_SIZE = 25

const dashboardHooksLogger = createLogger({
  level: 'info',
  nodeEnv: import.meta.env.MODE === 'test' ? 'test' : 'production',
})

function normalizeErrorMessage(error: unknown): string {
  if (isAbortError(error)) {
    return 'Requisicao cancelada'
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

  return 'Erro ao carregar contratos'
}

export function useContratos(): UseContratosResult {
  const [data, setData] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const fetch = useCallback(async (filters?: ContratosFilters, pageNum = 0) => {
    setLoading(true)
    setError(null)
    setPage(pageNum)

    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('v_contratos')
      .select('*', { count: 'exact' })
      .order('fimdireitouso', { ascending: true, nullsFirst: false })
      .order('compra_created_at', { ascending: false, nullsFirst: false })
      .range(from, to)

    const { since, until } = getDateRange(filters?.dateRange ?? DEFAULT_DATE_PRESET)
    if (since) {
      query = query.gte('compra_created_at', since)
    }
    if (until) {
      query = query.lt('compra_created_at', until)
    }

    if (filters?.assinaturaStatus && filters.assinaturaStatus !== 'all') {
      if (filters.assinaturaStatus === 'none') {
        query = query.is('clicksign_status', null)
      } else {
        query = query.eq('clicksign_status', filters.assinaturaStatus)
      }
    }

    if (filters?.pagamentoStatus && filters.pagamentoStatus !== 'all') {
      query = query.eq('checkout_status', filters.pagamentoStatus)
    }

    if (filters?.vigencia && filters.vigencia !== 'all') {
      const vigenciaValue = Number(filters.vigencia)
      if (Number.isFinite(vigenciaValue)) {
        query = query.eq('vigencia_meses', vigenciaValue)
      }
    }

    if (filters?.vencimento && filters.vencimento !== 'all') {
      query = query.eq('vencimento_status', filters.vencimento)
    }

    if (filters?.aditivo && filters.aditivo !== 'all') {
      switch (filters.aditivo) {
        case 'com_aditivo':
          query = query.eq('tem_aditivo', true)
          break
        case 'sem_aditivo':
          query = query.eq('tem_aditivo', false)
          break
        case 'pendente':
          query = query.eq('aditivo_status', 'Aguardando Assinatura')
          break
        case 'assinado':
          query = query.eq('aditivo_status', 'Assinado')
          break
      }
    }

    if (filters?.producao && filters.producao !== 'all') {
      query = query.eq('statusproducao', filters.producao)
    }

    if (filters?.search) {
      const s = filters.search.trim()
      if (s.length > 0) {
        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            s
          )
        ) {
          query = query.eq('compra_id', s)
        } else {
          query = query.or(
            `cliente_nome.ilike.%${s}%,cliente_razaosocial.ilike.%${s}%,celebridade_nome.ilike.%${s}%`
          )
        }
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
        'Supabase query failed in useContratos'
      )
      setError(normalizedError)
      setData([])
      setTotal(0)
    } else {
      setData((result as Contrato[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [])

  return { data, loading, error, total, page, pageSize: PAGE_SIZE, fetch }
}
