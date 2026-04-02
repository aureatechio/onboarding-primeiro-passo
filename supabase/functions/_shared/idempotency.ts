import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

interface IdempotencyLogLookupParams {
  checkoutSessionId: string
  source: string
  eventType: string
}

interface IdempotencyLogSaveParams extends IdempotencyLogLookupParams {
  payload: Record<string, unknown>
  responseStatus: number
  responseBody: Record<string, unknown>
}

interface IdempotencySlotClaimResult {
  claimed: boolean
  replay?: { status: number; body: Record<string, unknown> } | null
  isProcessing: boolean
}

export function extractIdempotencyKey(req: Request, payloadKey?: string | null): string | null {
  const headerKey = req.headers.get('x-idempotency-key')?.trim()
  const key = headerKey || payloadKey?.trim()
  return key && key.length >= 8 ? key : null
}

export function buildIdempotencyEventType(prefix: string, key: string): string {
  return `${prefix}:${key}`
}

export async function findIdempotencyReplay(
  supabase: SupabaseClient,
  params: IdempotencyLogLookupParams,
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from('checkout_webhooks_log')
    .select('response_status, response_body')
    .eq('checkout_session_id', params.checkoutSessionId)
    .eq('direction', 'incoming')
    .eq('source', params.source)
    .eq('event_type', params.eventType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.response_body || !data?.response_status) {
    return null
  }

  try {
    const parsedBody = typeof data.response_body === 'string'
      ? JSON.parse(data.response_body)
      : data.response_body
    return {
      status: Number(data.response_status),
      body: parsedBody as Record<string, unknown>,
    }
  } catch {
    return null
  }
}

export async function claimIdempotencySlot(
  supabase: SupabaseClient,
  params: IdempotencyLogLookupParams,
): Promise<IdempotencySlotClaimResult> {
  const insertPayload = {
    checkout_session_id: params.checkoutSessionId,
    direction: 'incoming',
    source: params.source,
    event_type: params.eventType,
    payload: {},
    response_status: 0,
    response_body: null,
    processing_status: 'processing',
  }

  const { count } = await supabase
    .from('checkout_webhooks_log')
    .insert(insertPayload, {
      count: 'exact',
      ignoreDuplicates: true,
    })

  if ((count ?? 0) > 0) {
    return {
      claimed: true,
      isProcessing: false,
    }
  }

  const { data, error } = await supabase
    .from('checkout_webhooks_log')
    .select('processing_status, response_status, response_body')
    .eq('checkout_session_id', params.checkoutSessionId)
    .eq('direction', 'incoming')
    .eq('source', params.source)
    .eq('event_type', params.eventType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return {
      claimed: false,
      replay: null,
      isProcessing: false,
    }
  }

  const isProcessing = data.processing_status === 'processing'
  let replay: { status: number; body: Record<string, unknown> } | null = null

  if (!isProcessing && data.response_status && data.response_body !== null && data.response_body !== undefined) {
    try {
      const parsedBody = typeof data.response_body === 'string'
        ? JSON.parse(data.response_body)
        : data.response_body

      replay = {
        status: Number(data.response_status),
        body: parsedBody as Record<string, unknown>,
      }
    } catch {
      replay = null
    }
  }

  return {
    claimed: false,
    replay,
    isProcessing,
  }
}

export async function saveIdempotencyReplay(
  supabase: SupabaseClient,
  params: IdempotencyLogSaveParams,
): Promise<void> {
  await supabase
    .from('checkout_webhooks_log')
    .insert({
      checkout_session_id: params.checkoutSessionId,
      direction: 'incoming',
      source: params.source,
      event_type: params.eventType,
      payload: params.payload,
      response_status: params.responseStatus,
      response_body: JSON.stringify(params.responseBody),
    })
}

export async function finalizeIdempotencySlot(
  supabase: SupabaseClient,
  params: IdempotencyLogSaveParams,
): Promise<void> {
  await supabase
    .from('checkout_webhooks_log')
    .update({
      response_status: params.responseStatus,
      response_body: JSON.stringify(params.responseBody),
      payload: params.payload,
      processing_status: 'completed',
    })
    .eq('checkout_session_id', params.checkoutSessionId)
    .eq('direction', 'incoming')
    .eq('source', params.source)
    .eq('event_type', params.eventType)
}
