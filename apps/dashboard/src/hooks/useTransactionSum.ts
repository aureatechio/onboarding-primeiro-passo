import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_DATE_PRESET, getDateRange } from '@/lib/date-range'
import type { TransactionsFilters } from './useTransactions'

interface UseTransactionSumResult {
  sumValorTotal: number
  loading: boolean
  error: string | null
  fetch: (filters?: TransactionsFilters) => Promise<void>
}
const ACTIVE_TRANSACTIONS_VIEW = 'v_transaction_pipeline_active'
const EXCLUDED_AGENCY_NAME = 'Aceleraí'

function resolveAmountFilters(filters?: TransactionsFilters): {
  amountExact?: number
  amountMin?: number
  amountMax?: number
} {
  const amountExact = filters?.amountExact
  const amountMin = filters?.amountMin
  const amountMax = filters?.amountMax

  if (Number.isFinite(amountExact)) {
    return { amountExact }
  }

  return {
    amountMin: Number.isFinite(amountMin) ? amountMin : undefined,
    amountMax: Number.isFinite(amountMax) ? amountMax : undefined,
  }
}

/**
 * Fetches the sum of sales (valor_total) for the pipeline with the same filters
 * as the Overview page. Used by the "Soma das vendas (R$)" card.
 * Call fetch(filters) whenever filters change (e.g. alongside useTransactions fetch).
 */
export function useTransactionSum(): UseTransactionSumResult {
  const [sumValorTotal, setSumValorTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (filters?: TransactionsFilters) => {
    setLoading(true)
    setError(null)

    const { since, until } = getDateRange(filters?.dateRange ?? DEFAULT_DATE_PRESET)

    let query = supabase.from(ACTIVE_TRANSACTIONS_VIEW).select('valor_total')
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
    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      query = query.eq('checkout_session_status', filters.paymentStatus)
    }
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      switch (filters.paymentMethod) {
        case 'split':
          query = query.not('split_group_id', 'is', null)
          break
        case 'boleto_parcelado':
          query = query.not('split_group_id', 'is', null).eq('split_type', 'boleto_parcelado')
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
    if (filters?.search) {
      const s = filters.search.trim()
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
        query = query.eq('compra_id', s)
      } else {
        query = query.ilike('cliente_nome', `%${s}%`)
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

    if (filters?.eligible) {
      if (!filters.paymentStatus || filters.paymentStatus === 'all') {
        query = query.eq('checkout_session_status', 'completed')
      }
      if (!filters.contractStatus || filters.contractStatus === 'all') {
        query = query.eq('clicksign_status', 'Assinado')
      }
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

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      const sum = (data ?? []).reduce(
        (acc, row) => acc + (Number(row.valor_total) || 0),
        0
      )
      setSumValorTotal(sum)
    }

    setLoading(false)
  }, [])

  return { sumValorTotal, loading, error, fetch }
}
