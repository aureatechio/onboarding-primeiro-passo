import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DEFAULT_PAGE_SIZE = 25
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ClientsFilters {
  search?: string
  addressStatus?: 'complete' | 'partial' | 'missing'
  state?: string
  city?: string
}

export interface ClientBackfillRow {
  cliente_id: string
  nome: string | null
  razaosocial: string | null
  nome_fantasia: string | null
  email: string | null
  cpf: string | null
  cnpj: string | null
  cidade_resolvida: string | null
  estado_resolvido: string | null
  cep_resolvido: string | null
  endereco_resolvido: string | null
  numero_resolvido: string | null
  bairro_resolvido: string | null
  complemento_resolvido: string | null
  updated_at: string | null
  compras_count: number | null
  last_purchase_at: string | null
  address_status: 'complete' | 'partial' | 'missing'
  missing_count: number
}

interface UseClientsResult {
  data: ClientBackfillRow[]
  loading: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  fetch: (filters?: ClientsFilters, page?: number, pageSize?: number) => Promise<void>
}

export async function resolveClienteIdsForAllFiltered(
  filters: ClientsFilters,
  limit: number
): Promise<{ ids: string[]; total: number }> {
  let query = supabase
    .from('v_omie_clientes_backfill')
    .select('cliente_id', { count: 'exact' })
    .order('updated_at', { ascending: false, nullsFirst: false })

  if (filters.addressStatus) {
    query = query.eq('address_status', filters.addressStatus)
  }
  if (filters.state) {
    query = query.eq('estado_resolvido', filters.state)
  }
  if (filters.city) {
    query = query.eq('cidade_resolvida', filters.city)
  }
  if (filters.search) {
    const s = filters.search.trim()
    if (UUID_REGEX.test(s)) {
      query = query.eq('cliente_id', s)
    } else {
      query = query.or(
        `nome.ilike.%${s}%,razaosocial.ilike.%${s}%,nome_fantasia.ilike.%${s}%,email.ilike.%${s}%,cpf.ilike.%${s}%,cnpj.ilike.%${s}%`
      )
    }
  }

  const { data, error, count } = await query.range(0, limit - 1)
  if (error) {
    throw new Error(`Falha ao resolver clientes filtrados: ${error.message}`)
  }
  return {
    ids: ((data ?? []) as Array<{ cliente_id: string }>).map((row) => row.cliente_id),
    total: count ?? 0,
  }
}

export function useClients(): UseClientsResult {
  const [data, setData] = useState<ClientBackfillRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [currentPageSize, setCurrentPageSize] = useState(DEFAULT_PAGE_SIZE)

  const fetch = useCallback(async (filters?: ClientsFilters, pageNum = 0, pageSize?: number) => {
    const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE
    setLoading(true)
    setError(null)
    setPage(pageNum)
    setCurrentPageSize(effectivePageSize)

    const from = pageNum * effectivePageSize
    const to = from + effectivePageSize - 1

    let query = supabase
      .from('v_omie_clientes_backfill')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (filters?.addressStatus) {
      query = query.eq('address_status', filters.addressStatus)
    }
    if (filters?.state) {
      query = query.eq('estado_resolvido', filters.state)
    }
    if (filters?.city) {
      query = query.eq('cidade_resolvida', filters.city)
    }
    if (filters?.search) {
      const s = filters.search.trim()
      if (UUID_REGEX.test(s)) {
        query = query.eq('cliente_id', s)
      } else {
        query = query.or(
          `nome.ilike.%${s}%,razaosocial.ilike.%${s}%,nome_fantasia.ilike.%${s}%,email.ilike.%${s}%,cpf.ilike.%${s}%,cnpj.ilike.%${s}%`
        )
      }
    }

    const { data: result, error: err, count } = await query
    if (err) {
      setError(err.message)
      setData([])
      setTotal(0)
    } else {
      setData((result as ClientBackfillRow[]) ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [])

  return { data, loading, error, total, page, pageSize: currentPageSize, fetch }
}
