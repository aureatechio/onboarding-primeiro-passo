import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface TimelineEvent {
  compra_id: string
  event_at: string
  stage: string
  event: string
  source: string | null
  error_code: string | null
  error_message: string | null
  execution_time_ms: number | null
  detail: Record<string, unknown> | null
}

interface UseTransactionTimelineResult {
  events: TimelineEvent[]
  loading: boolean
  error: string | null
  fetch: (compraId: string) => Promise<void>
}

export function useTransactionTimeline(): UseTransactionTimelineResult {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (compraId: string) => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('v_transaction_timeline')
      .select('*')
      .eq('compra_id', compraId)
      .order('event_at', { ascending: false })
      .limit(200)

    if (err) {
      setError(err.message)
    } else {
      setEvents((data as TimelineEvent[]) ?? [])
    }

    setLoading(false)
  }, [])

  return { events, loading, error, fetch }
}
