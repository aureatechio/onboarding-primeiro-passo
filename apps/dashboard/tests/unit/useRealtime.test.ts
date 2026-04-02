import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Channel mock ---

type SubscribeCallback = (status: string, err?: Error) => void

function createChannelMock() {
  let subscribeCb: SubscribeCallback | null = null
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((cb?: SubscribeCallback) => {
      subscribeCb = cb ?? null
      return channel
    }),
    unsubscribe: vi.fn(),
    _triggerSubscribe(status: string, err?: Error) {
      subscribeCb?.(status, err)
    },
  }
  return channel
}

let mockChannel: ReturnType<typeof createChannelMock>
const mockChannelFn = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (...args: unknown[]) => mockChannelFn(...args),
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

import {
  useRealtimeTransaction,
  useRealtimeOverview,
  useRealtimeStatus,
} from '../../src/hooks/useRealtime'

describe('useRealtimeTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel = createChannelMock()
    mockChannelFn.mockReturnValue(mockChannel)
  })

  it('does nothing when compraId is null', () => {
    renderHook(() => useRealtimeTransaction(null, vi.fn()))
    expect(mockChannelFn).not.toHaveBeenCalled()
  })

  it('subscribes with correct channel name', () => {
    renderHook(() => useRealtimeTransaction('abc-123', vi.fn()))
    expect(mockChannelFn).toHaveBeenCalledWith('pipeline:abc-123')
  })

  it('registers 6 table listeners', () => {
    renderHook(() => useRealtimeTransaction('abc-123', vi.fn()))
    expect(mockChannel.on).toHaveBeenCalledTimes(6)
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeTransaction('abc-123', vi.fn()))
    unmount()
    expect(mockChannel.unsubscribe).toHaveBeenCalled()
  })
})

describe('useRealtimeOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel = createChannelMock()
    mockChannelFn.mockReturnValue(mockChannel)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('subscribes to pipeline:overview', () => {
    renderHook(() => useRealtimeOverview(vi.fn()))
    expect(mockChannelFn).toHaveBeenCalledWith('pipeline:overview')
  })

  it('debounces onUpdate', () => {
    vi.useFakeTimers()
    const onUpdate = vi.fn()

    renderHook(() => useRealtimeOverview(onUpdate))

    // Get the callback passed to .on()
    const onCall = mockChannel.on.mock.calls[0]
    const callback = onCall[2] as () => void

    // Trigger twice rapidly
    callback()
    callback()

    // Advance past debounce
    vi.advanceTimersByTime(1000)

    expect(onUpdate).toHaveBeenCalledTimes(1)
  })
})

describe('useRealtimeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChannel = createChannelMock()
    mockChannelFn.mockReturnValue(mockChannel)
  })

  it('returns true initially', () => {
    const { result } = renderHook(() => useRealtimeStatus())
    expect(result.current).toBe(true)
  })

  it('updates to false on non-SUBSCRIBED status', () => {
    const { result } = renderHook(() => useRealtimeStatus())
    act(() => {
      mockChannel._triggerSubscribe('CHANNEL_ERROR')
    })
    expect(result.current).toBe(false)
  })

  it('updates to true on SUBSCRIBED status', () => {
    const { result } = renderHook(() => useRealtimeStatus())
    act(() => {
      mockChannel._triggerSubscribe('CHANNEL_ERROR')
    })
    act(() => {
      mockChannel._triggerSubscribe('SUBSCRIBED')
    })
    expect(result.current).toBe(true)
  })
})
