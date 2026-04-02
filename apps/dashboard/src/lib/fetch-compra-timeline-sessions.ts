import { supabase } from '@/lib/supabase'
import type { RawTimelineSession } from '@/lib/payment-timeline'

const FIELDS = [
  'id',
  'split_index',
  'split_group_id',
  'metodo_pagamento',
  'status',
  'valor_centavos',
  'payment_id',
  'payment_status',
  'boleto_url',
  'boleto_barcode',
  'boleto_digitable_line',
  'boleto_vencimento',
  'boleto_number',
  'completed_at',
  'created_at',
  'updated_at',
].join(', ')

type QueryResult = { data: unknown[] | null; error: { message: string } | null }

/**
 * Loads checkout_sessions rows needed to build the unified payment timeline
 * (entries without split_group_id + sessions in the split group).
 */
export async function fetchRawSessionsForCompraTimeline(
  compraId: string,
  splitGroupId: string | null,
): Promise<{ data: RawTimelineSession[]; error: string | null }> {
  let effectiveSplitGroupId = splitGroupId

  if (!effectiveSplitGroupId) {
    const { data: latestSplitSession, error: splitLookupError } = await supabase
      .from('checkout_sessions')
      .select('split_group_id')
      .eq('compra_id', compraId)
      .not('split_group_id', 'is', null)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (splitLookupError) {
      return { data: [], error: splitLookupError.message }
    }

    effectiveSplitGroupId = latestSplitSession?.split_group_id ?? null
  }

  const entryQuery = supabase
    .from('checkout_sessions')
    .select(FIELDS)
    .eq('compra_id', compraId)
    .is('split_group_id', null)
    .order('created_at', { ascending: true })

  const promises: Promise<QueryResult>[] = [entryQuery as unknown as Promise<QueryResult>]

  if (effectiveSplitGroupId) {
    const groupQuery = supabase
      .from('checkout_sessions')
      .select(FIELDS)
      .eq('split_group_id', effectiveSplitGroupId)
      .order('split_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    promises.push(groupQuery as unknown as Promise<QueryResult>)
  }

  const results = await Promise.all(promises)
  const firstError = results.find((r) => r.error)
  if (firstError?.error) {
    return { data: [], error: firstError.error.message }
  }

  const allRaw = results.flatMap((r) => (r.data as RawTimelineSession[]) ?? [])
  return { data: allRaw, error: null }
}
