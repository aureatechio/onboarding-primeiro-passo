import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

function createQueryBuilder(resolveValue: { data: unknown; error: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (v: unknown) => void) => void
  } = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
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

  for (const key of ['select', 'gte', 'lt', 'eq', 'not', 'ilike', 'filter', 'in', 'is', 'or']) {
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

import { useTransactionSum } from '../../src/hooks/useTransactionSum'
import { supabase } from '@/lib/supabase'

describe('useTransactionSum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBuilder = createQueryBuilder({ data: [], error: null })
  })

  it('queries only active transactions view', async () => {
    const { result } = renderHook(() => useTransactionSum())

    await act(() => result.current.fetch())

    expect(supabase.from).toHaveBeenCalledWith('v_transaction_pipeline_active')
  })

  it('sums valor_total from filtered rows', async () => {
    mockBuilder = createQueryBuilder({
      data: [{ valor_total: '10.50' }, { valor_total: 5 }, { valor_total: null }],
      error: null,
    })

    const { result } = renderHook(() => useTransactionSum())
    await act(() => result.current.fetch())

    expect(result.current.sumValorTotal).toBe(15.5)
    expect(result.current.error).toBeNull()
  })
})
