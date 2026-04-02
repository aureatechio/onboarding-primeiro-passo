import { useEffect, useRef, useCallback, useState } from 'react'
import { createLogger, isAbortError, ServiceError } from '@aurea/shared'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type RefreshFn = () => void

const dashboardHooksLogger = createLogger({
  level: 'info',
  nodeEnv: import.meta.env.MODE === 'test' ? 'test' : 'production',
})

function normalizeRealtimeErrorMessage(error: unknown): string {
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

  return 'Erro de realtime'
}

/**
 * Subscribes to realtime changes on pipeline tables filtered by compra_id.
 * Calls `onUpdate` whenever any of the 4 tables change.
 */
export function useRealtimeTransaction(
  compraId: string | null,
  onUpdate: RefreshFn
) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!compraId) return

    const channel = supabase
      .channel(`pipeline:${compraId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `compra_id=eq.${compraId}`,
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'compras',
          filter: `id=eq.${compraId}`,
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clicksign_webhooks',
          filter: `compra_id=eq.${compraId}`,
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notas_fiscais',
          filter: `compra_id=eq.${compraId}`,
        },
        onUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'omie_sync',
          filter: `compra_id=eq.${compraId}`,
        },
        onUpdate
      )
      .subscribe((status, err) => {
        if (err) {
          dashboardHooksLogger.error(
            {
              compraId,
              status,
              error: err,
              message: normalizeRealtimeErrorMessage(err),
            },
            'Supabase realtime transaction subscription error'
          )
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [compraId, onUpdate])
}

/**
 * Subscribes to realtime changes across all pipeline tables (overview mode).
 * Uses debounce to avoid rapid re-renders.
 */
export function useRealtimeOverview(onUpdate: RefreshFn) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedUpdate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onUpdate, 1000)
  }, [onUpdate])

  useEffect(() => {
    const channel = supabase
      .channel('pipeline:overview')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checkout_sessions' },
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'compras' },
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clicksign_webhooks' },
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notas_fiscais' },
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'omie_sync' },
        debouncedUpdate
      )
      .subscribe((status, err) => {
        if (err) {
          dashboardHooksLogger.error(
            {
              status,
              error: err,
              message: normalizeRealtimeErrorMessage(err),
            },
            'Supabase realtime overview subscription error'
          )
        }
      })

    channelRef.current = channel

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [debouncedUpdate])
}

/**
 * Subscribes to realtime changes relevant for contracts overview.
 * Uses debounce to avoid rapid re-renders.
 */
export function useRealtimeContratos(onUpdate: RefreshFn) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedUpdate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onUpdate, 1000)
  }, [onUpdate])

  useEffect(() => {
    const channel = supabase
      .channel('contratos:overview')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'compras' },
        debouncedUpdate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clicksign_webhooks' },
        debouncedUpdate
      )
      .subscribe((status, err) => {
        if (err) {
          dashboardHooksLogger.error(
            {
              status,
              error: err,
              message: normalizeRealtimeErrorMessage(err),
            },
            'Supabase realtime contracts subscription error'
          )
        }
      })

    channelRef.current = channel

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [debouncedUpdate])
}

/**
 * Connection status indicator for realtime.
 */
export function useRealtimeStatus() {
  const [connected, setConnected] = useState(true)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let isUnmounted = false
    let channel: RealtimeChannel | null = null
    let reconnectAttempts = 0

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const subscribe = () => {
      if (isUnmounted) return

      channel = supabase.channel('status-check')
      channel.subscribe((status, err) => {
        if (isUnmounted) return

        if (err) {
          const normalizedError = normalizeRealtimeErrorMessage(err)
          dashboardHooksLogger.error(
            { status, error: err, message: normalizedError },
            'Supabase realtime status subscription error'
          )
        }

        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0
          setConnected(true)
          return
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnected(false)
          clearReconnectTimer()

          // Backoff curto para recuperar quedas intermitentes no websocket em produção.
          const delayMs = Math.min(8000, 1000 * 2 ** reconnectAttempts)
          reconnectAttempts += 1

          reconnectTimerRef.current = setTimeout(() => {
            if (isUnmounted) return

            if (channel) {
              channel.unsubscribe()
            }
            subscribe()
          }, delayMs)
        }
      })
    }

    subscribe()

    return () => {
      isUnmounted = true
      clearReconnectTimer()

      if (channel) {
        channel.unsubscribe()
      }
    }
  }, [])

  return connected
}

