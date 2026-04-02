import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_DATE_PRESET, getDateRange } from '@/lib/date-range'
import type { ContratosFilters, Contrato } from './useContratos'

export interface ContratosMetrics {
  total: number
  assinados: number
  aguardandoAssinatura: number
  vencendo30d: number
  valorTotalContratado: number
  comAditivo: number
}

interface UseContratosMetricsResult {
  data: ContratosMetrics
  loading: boolean
  error: string | null
  fetch: (filters?: ContratosFilters) => Promise<void>
}

const EMPTY_METRICS: ContratosMetrics = {
  total: 0,
  assinados: 0,
  aguardandoAssinatura: 0,
  vencendo30d: 0,
  valorTotalContratado: 0,
  comAditivo: 0,
}

export function useContratosMetrics(): UseContratosMetricsResult {
  const [data, setData] = useState<ContratosMetrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (filters?: ContratosFilters) => {
    setLoading(true)
    setError(null)

    let query = supabase.from('v_contratos').select(
      'valor_total, clicksign_status, vencimento_status, tem_aditivo, compra_created_at, checkout_status, vigencia_meses, aditivo_status, statusproducao, cliente_nome, cliente_razaosocial, celebridade_nome, compra_id'
    )

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

    const { data: result, error: err } = await query

    if (err) {
      setError(err.message)
      setData(EMPTY_METRICS)
      setLoading(false)
      return
    }

    const rows = (result ?? []) as Pick<
      Contrato,
      'valor_total' | 'clicksign_status' | 'vencimento_status' | 'tem_aditivo'
    >[]

    const metrics: ContratosMetrics = {
      total: rows.length,
      assinados: rows.filter((r) => r.clicksign_status === 'Assinado').length,
      aguardandoAssinatura: rows.filter(
        (r) => r.clicksign_status === 'Aguardando Assinatura'
      ).length,
      vencendo30d: rows.filter((r) => r.vencimento_status === 'vence_30d').length,
      valorTotalContratado: rows
        .filter((r) => r.clicksign_status === 'Assinado')
        .reduce((sum, r) => sum + Number(r.valor_total ?? 0), 0),
      comAditivo: rows.filter((r) => r.tem_aditivo).length,
    }

    setData(metrics)
    setLoading(false)
  }, [])

  return { data, loading, error, fetch }
}
