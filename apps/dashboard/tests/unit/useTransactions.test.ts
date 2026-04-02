import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Mocks ---

function createQueryBuilder(resolveValue: { data: unknown; error: unknown; count: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then: (resolve: (v: unknown) => void) => void } = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => resolve(resolveValue),
  }
  for (const key of ['select', 'order', 'range', 'gte', 'lte', 'lt', 'eq', 'not', 'ilike', 'filter', 'in', 'is', 'or']) {
    builder[key] = vi.fn(() => builder)
  }
  return builder
}

let mockBuilder: ReturnType<typeof createQueryBuilder>

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockBuilder),
  },
}))

vi.mock('@aurea/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  isAbortError: () => false,
  ServiceError: class ServiceError extends Error {},
}))

import { useTransactions } from '../../src/hooks/useTransactions'
import { supabase } from '@/lib/supabase'

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
  })

  it('has correct initial state', () => {
    const { result } = renderHook(() => useTransactions())
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.total).toBe(0)
    expect(result.current.page).toBe(0)
    expect(result.current.pageSize).toBe(25)
  })

  it('fetches data successfully', async () => {
    const mockRow = { compra_id: '123', cliente_nome: 'Test' }
    mockBuilder = createQueryBuilder({ data: [mockRow], error: null, count: 1 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch())

    expect(supabase.from).toHaveBeenCalledWith('v_transaction_pipeline_active')
    expect(result.current.data).toEqual([mockRow])
    expect(result.current.total).toBe(1)
    expect(result.current.loading).toBe(false)
  })

  it('handles errors', async () => {
    mockBuilder = createQueryBuilder({ data: null, error: { message: 'DB error' }, count: null })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch())

    expect(result.current.error).toBe('DB error')
    expect(result.current.data).toEqual([])
  })

  it('paginates correctly', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({}, 2))

    expect(result.current.page).toBe(2)
    expect(mockBuilder.range).toHaveBeenCalledWith(50, 74)
  })

  it('uses eq for UUID search', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ search: uuid }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('compra_id', uuid)
  })

  it('uses eq for UUID search without hyphens', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    const compactUuid = 'A1B2C3D4E5F67890ABCDEF1234567890'

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ search: compactUuid }))

    expect(mockBuilder.eq).toHaveBeenCalledWith(
      'compra_id',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    )
  })

  it('uses fallback OR search for compact hex IDs', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    const compactHex = '919e6802c39f4a81977d6e893'

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ search: compactHex }))

    expect(mockBuilder.or).toHaveBeenCalledWith(
      'cliente_nome.ilike.%919e6802c39f4a81977d6e893%,numero_proposta.ilike.%919e6802c39f4a81977d6e893%,cliente_documento.ilike.%919e6802c39f4a81977d6e893%,cliente_documento.ilike.%9196802394819776893%'
    )
  })

  it('uses or search for cliente_nome, numero_proposta and cliente_documento', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ search: 'João' }))

    expect(mockBuilder.or).toHaveBeenCalledWith(
      'cliente_nome.ilike.%João%,numero_proposta.ilike.%João%,cliente_documento.ilike.%João%'
    )
  })

  it('includes digits-only cliente_documento clause for formatted CPF/CNPJ', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ search: '123.456.789-00' }))

    expect(mockBuilder.or).toHaveBeenCalledWith(
      'cliente_nome.ilike.%123.456.789-00%,numero_proposta.ilike.%123.456.789-00%,cliente_documento.ilike.%123.456.789-00%,cliente_documento.ilike.%12345678900%'
    )
  })

  it('applies contractStatus signed filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ contractStatus: 'signed' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('clicksign_status', 'Assinado')
  })

  it('applies contractStatus waiting filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ contractStatus: 'waiting' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('clicksign_status', 'Aguardando Assinatura')
  })

  it('applies contractStatus error filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ contractStatus: 'error' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('clicksign_status', 'error')
  })

  it('applies contractStatus none filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ contractStatus: 'none' }))

    expect(mockBuilder.is).toHaveBeenCalledWith('clicksign_status', null)
  })

  it('applies paymentStatus filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ paymentStatus: 'completed' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('checkout_session_status', 'completed')
  })

  it('applies vendedor exact filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ vendedor: 'Marcos' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('vendedor_nome', 'Marcos')
  })

  it('applies vendedor none filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ vendedor: '__none__' }))

    expect(mockBuilder.is).toHaveBeenCalledWith('vendedor_nome', null)
  })

  it('applies hasAgency filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ hasAgency: true }))

    expect(mockBuilder.not).toHaveBeenCalledWith('agencia_nome', 'is', null)
    expect(mockBuilder.not).toHaveBeenCalledWith('agencia_nome', 'eq', '')
    expect(mockBuilder.not).toHaveBeenCalledWith('agencia_nome', 'eq', 'Aceleraí')
  })

  it('applies agency filter by name', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ agency: 'HIKS MARKETING LTDA' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('agencia_nome', 'HIKS MARKETING LTDA')
  })

  it('applies hasAgency and agency filters together', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() =>
      result.current.fetch({ hasAgency: true, agency: 'HIKS MARKETING LTDA' })
    )

    expect(mockBuilder.not).toHaveBeenCalledWith('agencia_nome', 'is', null)
    expect(mockBuilder.not).toHaveBeenCalledWith('agencia_nome', 'eq', '')
    expect(mockBuilder.eq).toHaveBeenCalledWith('agencia_nome', 'HIKS MARKETING LTDA')
  })

  it('does not apply vendedor filter when all is selected', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ vendedor: 'all' }))

    expect(mockBuilder.eq).not.toHaveBeenCalledWith('vendedor_nome', expect.anything())
    expect(mockBuilder.is).not.toHaveBeenCalledWith('vendedor_nome', null)
  })

  it('applies celebridade exact filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ celebridade: 'Anitta' }))

    expect(mockBuilder.filter).toHaveBeenCalledWith(
      'clicksign_metadata->>celebridade',
      'eq',
      'Anitta'
    )
  })

  it('applies celebridade none filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ celebridade: '__none__' }))

    expect(mockBuilder.filter).toHaveBeenCalledWith(
      'clicksign_metadata->>celebridade',
      'is',
      null
    )
  })

  it('does not apply celebridade filter when all is selected', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ celebridade: 'all' }))

    expect(mockBuilder.filter).not.toHaveBeenCalledWith(
      'clicksign_metadata->>celebridade',
      expect.anything(),
      expect.anything()
    )
  })

  it('applies nfeStatus Issued filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ nfeStatus: 'Issued' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('nfe_status', 'Issued')
  })

  it('applies nfeStatus in_progress filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ nfeStatus: 'in_progress' }))

    expect(mockBuilder.or).toHaveBeenCalledWith(
      'nfe_status.in.(Created,Processing,awaiting_nfse),nfe_request_status.eq.requested'
    )
  })

  it('applies nfeStatus Error filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ nfeStatus: 'Error' }))

    expect(mockBuilder.or).toHaveBeenCalledWith(
      'nfe_status.eq.Error,nfe_status.eq.Cancelled,nfe_request_status.eq.failed'
    )
  })

  it('applies nfeStatus none filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ nfeStatus: 'none' }))

    expect(mockBuilder.is).toHaveBeenCalledWith('nfe_status', null)
    expect(mockBuilder.or).toHaveBeenCalledWith(
      'nfe_request_status.is.null,nfe_request_status.eq.pending'
    )
  })

  it('applies omieStatus synced filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ omieStatus: 'synced' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('omie_status', 'synced')
  })

  it('applies omieStatus in_progress filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ omieStatus: 'in_progress' }))

    expect(mockBuilder.in).toHaveBeenCalledWith('omie_status', ['pending', 'processing'])
  })

  it('applies omieStatus failed filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ omieStatus: 'failed' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('omie_status', 'failed')
  })

  it('applies omieStatus none filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ omieStatus: 'none' }))

    expect(mockBuilder.is).toHaveBeenCalledWith('omie_status', null)
  })

  it('applies paymentMethod split filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ paymentMethod: 'split' }))

    expect(mockBuilder.not).toHaveBeenCalledWith('split_group_id', 'is', null)
  })

  it('applies paymentMethod boleto_parcelado filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ paymentMethod: 'boleto_parcelado' }))

    expect(mockBuilder.not).toHaveBeenCalledWith('split_group_id', 'is', null)
    expect(mockBuilder.eq).toHaveBeenCalledWith('split_type', 'boleto_parcelado')
  })

  it('applies paymentMethod cartao_recorrente filter', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ paymentMethod: 'cartao_recorrente' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('metodo_pagamento', 'cartao_recorrente')
  })

  it('applies paymentMethod boleto filter (default)', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ paymentMethod: 'boleto' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('metodo_pagamento', 'boleto')
  })

  it('applies eligible filter as signed OR paid when no explicit status filters', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ eligible: true }))

    expect(mockBuilder.or).toHaveBeenCalledWith(
      'clicksign_status.eq.Assinado,checkout_session_status.eq.completed'
    )
  })

  it('eligible does not override explicit paymentStatus', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ eligible: true, paymentStatus: 'pending' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('checkout_session_status', 'pending')
    expect(mockBuilder.or).not.toHaveBeenCalledWith(
      'clicksign_status.eq.Assinado,checkout_session_status.eq.completed'
    )
  })

  it('eligible does not override explicit contractStatus', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ eligible: true, contractStatus: 'waiting' }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('clicksign_status', 'Aguardando Assinatura')
    expect(mockBuilder.or).not.toHaveBeenCalledWith(
      'clicksign_status.eq.Assinado,checkout_session_status.eq.completed'
    )
  })

  it('orders by compra_created_at by default (sortBy undefined)', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch())

    expect(mockBuilder.order).toHaveBeenCalledWith('compra_created_at', {
      ascending: false,
      nullsFirst: false,
    })
  })

  it('orders by last_activity_at when sortBy is updated_at', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ sortBy: 'updated_at' }))

    expect(mockBuilder.order).toHaveBeenCalledWith('last_activity_at', {
      ascending: false,
      nullsFirst: false,
    })
  })

  it('orders by compra_created_at when sortBy is created_at', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ sortBy: 'created_at' }))

    expect(mockBuilder.order).toHaveBeenCalledWith('compra_created_at', {
      ascending: false,
      nullsFirst: false,
    })
  })

  it('orders ascending when sortDir is asc (updated_at)', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ sortBy: 'updated_at', sortDir: 'asc' }))

    expect(mockBuilder.order).toHaveBeenCalledWith('last_activity_at', {
      ascending: true,
      nullsFirst: false,
    })
  })

  it('orders ascending when sortDir is asc (created_at)', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ sortBy: 'created_at', sortDir: 'asc' }))

    expect(mockBuilder.order).toHaveBeenCalledWith('compra_created_at', {
      ascending: true,
      nullsFirst: false,
    })
  })

  it('orders descending when sortDir is explicitly desc', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ sortBy: 'updated_at', sortDir: 'desc' }))

    expect(mockBuilder.order).toHaveBeenCalledWith('last_activity_at', {
      ascending: false,
      nullsFirst: false,
    })
  })

  it('applies exact amount filter when amountExact is set', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ amountExact: 1500 }))

    expect(mockBuilder.eq).toHaveBeenCalledWith('valor_total', 1500)
    expect(mockBuilder.gte).not.toHaveBeenCalledWith('valor_total', expect.any(Number))
    expect(mockBuilder.lte).not.toHaveBeenCalledWith('valor_total', expect.any(Number))
  })

  it('applies amount range with min and max', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ amountMin: 1000, amountMax: 2000 }))

    expect(mockBuilder.gte).toHaveBeenCalledWith('valor_total', 1000)
    expect(mockBuilder.lte).toHaveBeenCalledWith('valor_total', 2000)
  })

  it('applies only min amount when only amountMin is set', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ amountMin: 999.9 }))

    expect(mockBuilder.gte).toHaveBeenCalledWith('valor_total', 999.9)
    expect(mockBuilder.lte).not.toHaveBeenCalledWith('valor_total', expect.any(Number))
  })

  it('applies only max amount when only amountMax is set', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() => result.current.fetch({ amountMax: 3000 }))

    expect(mockBuilder.lte).toHaveBeenCalledWith('valor_total', 3000)
    expect(mockBuilder.gte).not.toHaveBeenCalledWith('valor_total', expect.any(Number))
  })

  it('gives precedence to amountExact over range filters', async () => {
    mockBuilder = createQueryBuilder({ data: [], error: null, count: 0 })

    const { result } = renderHook(() => useTransactions())
    await act(() =>
      result.current.fetch({ amountExact: 1800, amountMin: 1000, amountMax: 2000 })
    )

    expect(mockBuilder.eq).toHaveBeenCalledWith('valor_total', 1800)
    expect(mockBuilder.gte).not.toHaveBeenCalledWith('valor_total', 1000)
    expect(mockBuilder.lte).not.toHaveBeenCalledWith('valor_total', 2000)
  })
})
