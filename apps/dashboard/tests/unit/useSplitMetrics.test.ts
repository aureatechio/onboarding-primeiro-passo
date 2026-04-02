import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/supabase', () => {
  const mockRpc = vi.fn()
  return {
    supabase: {
      rpc: mockRpc,
    },
    __mockRpc: mockRpc,
  }
})

import { useSplitMetrics } from '../../src/hooks/useSplitMetrics'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockRpc: ReturnType<typeof vi.fn>

describe('useSplitMetrics', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/lib/supabase') as unknown as { __mockRpc: ReturnType<typeof vi.fn> }
    mockRpc = mod.__mockRpc
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('has correct initial state', () => {
    const { result } = renderHook(() => useSplitMetrics())
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('fetches and normalises data successfully', async () => {
    const raw = {
      since: '2026-01-01T00:00:00.000Z',
      until: '2026-02-19T00:00:00.000Z',
      total_splits: '10',
      completed_splits: '5',
      partial_splits: '2',
      pending_splits: '3',
      cancelled_splits: '0',
      conversion_pct: '50.5',
      partial_recovery_pct: null,
      avg_completion_seconds: '120.5',
      by_method: [{ method: 'credit', total: 10, completed: 5, conversion_pct: 50 }],
      top_error_codes: [{ error_code: 'E01', count: 3 }],
    }
    mockRpc.mockResolvedValueOnce({ data: raw, error: null })

    const { result } = renderHook(() => useSplitMetrics())
    await act(() => result.current.fetch())

    expect(result.current.data).not.toBeNull()
    expect(result.current.data!.total_splits).toBe(10)
    expect(result.current.data!.conversion_pct).toBe(50.5)
    expect(result.current.data!.partial_recovery_pct).toBeNull()
    expect(result.current.data!.avg_completion_seconds).toBe(120.5)
    expect(result.current.data!.by_method).toHaveLength(1)
    expect(result.current.data!.top_error_codes).toHaveLength(1)
  })

  it('handles null result', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSplitMetrics())
    await act(() => result.current.fetch())

    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('handles errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC failed' } })

    const { result } = renderHook(() => useSplitMetrics())
    await act(() => result.current.fetch())

    expect(result.current.error).toBe('RPC failed')
    expect(result.current.data).toBeNull()
  })

  it('forwards date range parameters', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-19T12:00:00.000Z'))
    mockRpc.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSplitMetrics())
    await act(() => result.current.fetch(7))

    expect(mockRpc).toHaveBeenCalledWith('get_split_metrics', expect.objectContaining({
      p_since: expect.any(String),
      p_until: expect.any(String),
    }))

    const call = mockRpc.mock.calls[0][1]
    const since = new Date(call.p_since)
    const now = new Date('2026-02-19T12:00:00.000Z')
    const diffDays = (now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeCloseTo(7, 0)
  })
})
