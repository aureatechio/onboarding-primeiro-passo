/**
 * Pure logic for building a unified payment timeline from checkout sessions.
 * Entry payments (PIX, cartao avulso) + carnê parcels merged into a single
 * ordered list with global numbering.
 */

export interface RawTimelineSession {
  id: string
  split_index: number | null
  split_group_id: string | null
  metodo_pagamento: string | null
  status: string
  valor_centavos: number
  payment_id: string | null
  payment_status: number | null
  completed_at: string | null
  created_at: string
}

const EXCLUDED_STATUSES = ['split_created', 'failed', 'cancelled']

export function isRelevantSession(s: RawTimelineSession): boolean {
  if (s.status === 'split_created') return false

  if (s.split_group_id && s.split_index == null) return false

  if (
    !s.split_group_id &&
    EXCLUDED_STATUSES.includes(s.status) &&
    !s.payment_id
  ) {
    return false
  }

  if (
    !s.split_group_id &&
    s.status === 'expired' &&
    !s.payment_id
  ) {
    return false
  }

  return true
}

export function sortTimelineSessions<T extends RawTimelineSession>(a: T, b: T): number {
  const aIsEntry = !a.split_group_id
  const bIsEntry = !b.split_group_id

  if (aIsEntry && !bIsEntry) return -1
  if (!aIsEntry && bIsEntry) return 1

  if (aIsEntry && bIsEntry) {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  }

  const aIdx = a.split_index ?? Number.MAX_SAFE_INTEGER
  const bIdx = b.split_index ?? Number.MAX_SAFE_INTEGER
  if (aIdx !== bIdx) return aIdx - bIdx

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

export function buildTimeline<T extends RawTimelineSession>(
  sessions: T[],
): (T & { displayIndex: number })[] {
  const filtered = sessions.filter(isRelevantSession)
  filtered.sort(sortTimelineSessions)
  return filtered.map((s, i) => ({ ...s, displayIndex: i + 1 }))
}
