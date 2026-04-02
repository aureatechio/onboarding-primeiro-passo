import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isSplitStuck, normalizeSplitStatus } from '@/lib/split-status'
import type {
  SplitAuditEvent,
  SplitGroupDetail,
  SplitGroupItem,
  SplitSessionItem,
} from '@/types/split-metrics'

const STUCK_THRESHOLD_MINUTES = 120

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return fallback
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function normalizeGroupItem(raw: Record<string, unknown>): SplitGroupItem {
  const status = normalizeSplitStatus(asString(raw.status_atual, 'unknown'))
  const updatedAt = asString(raw.updated_at)
  return {
    groupId: asString(raw.group_id),
    splitType: asString(raw.split_type, 'unknown'),
    status,
    createdAt: asString(raw.created_at),
    updatedAt,
    valor: toNumber(raw.valor, 0),
    sessoesTotal: toNumber(raw.sessoes_total, 0),
    sessoesPagas: toNumber(raw.sessoes_pagas, 0),
    tempoDesdeAtualizacaoMinutos:
      raw.tempo_desde_atualizacao == null ? null : toNumber(raw.tempo_desde_atualizacao, 0),
    isStuck:
      raw.is_stuck === true || isSplitStuck(status, updatedAt, STUCK_THRESHOLD_MINUTES),
  }
}

function normalizeSession(raw: Record<string, unknown>): SplitSessionItem {
  return {
    splitSessionId: asString(raw.split_session_id),
    splitIndex: raw.split_index == null ? null : toNumber(raw.split_index, 0),
    compraId: raw.compra_id == null ? null : asString(raw.compra_id),
    metodoPagamento: raw.metodo_pagamento == null ? null : asString(raw.metodo_pagamento),
    status: raw.status == null ? null : asString(raw.status),
    paymentId: raw.payment_id == null ? null : asString(raw.payment_id),
    paymentStatus: typeof raw.payment_status === 'number' ? raw.payment_status : null,
    completedAt: raw.completed_at == null ? null : asString(raw.completed_at),
    valor: toNumber(raw.valor, 0),
    attempts: toNumber(raw.attempts, 0),
    gateway: raw.gateway == null ? '' : asString(raw.gateway),
    createdAt: raw.created_at == null ? null : asString(raw.created_at),
    updatedAt: raw.updated_at == null ? null : asString(raw.updated_at),
  }
}

function normalizeAuditEvent(raw: Record<string, unknown>): SplitAuditEvent {
  return {
    eventAt: asString(raw.event_at),
    eventType: asString(raw.event_type, 'Evento'),
    errorCode: raw.error_code == null ? null : asString(raw.error_code),
    errorMessage: raw.error_message == null ? null : asString(raw.error_message),
    functionName: raw.function_name == null ? null : asString(raw.function_name),
    sessionId: raw.session_id == null ? null : asString(raw.session_id),
    executionTimeMs:
      raw.execution_time_ms == null ? null : toNumber(raw.execution_time_ms, 0),
    metadata: raw.metadata == null ? null : (raw.metadata as Record<string, unknown>),
  }
}

interface UseSplitGroupDetailResult {
  detail: SplitGroupDetail | null
  loading: boolean
  error: string | null
  load: (groupId: string) => Promise<void>
}

export function useSplitGroupDetail(): UseSplitGroupDetailResult {
  const [detail, setDetail] = useState<SplitGroupDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (groupId: string) => {
    setLoading(true)
    setError(null)

    const [detailRes, eventsRes] = await Promise.allSettled([
      supabase.rpc('get_split_group_detail', { p_split_group_id: groupId }),
      supabase.rpc('get_split_group_events', { p_split_group_id: groupId, p_limit: 80 }),
    ])

    const errors: string[] = []
    let group: SplitGroupItem | null = null
    let sessions: SplitSessionItem[] = []
    let events: SplitAuditEvent[] = []

    if (detailRes.status === 'fulfilled') {
      const { data, error: err } = detailRes.value as {
        data: { group?: Record<string, unknown> | null; sessions?: unknown } | null
        error: { message: string } | null
      }
      if (err) {
        errors.push(err.message)
      } else if (data?.group && typeof data.group === 'object') {
        group = normalizeGroupItem(data.group)
        sessions = Array.isArray(data.sessions)
          ? (data.sessions as Record<string, unknown>[]).map(normalizeSession)
          : []
      } else {
        errors.push('Grupo não encontrado')
      }
    } else {
      errors.push(detailRes.reason instanceof Error ? detailRes.reason.message : 'Erro ao carregar grupo')
    }

    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.splitSessionId)
      const { data: enrichData, error: enrichErr } = await supabase
        .from('checkout_sessions')
        .select('id, compra_id, payment_id, payment_status, completed_at, status')
        .in('id', sessionIds)

      if (!enrichErr && Array.isArray(enrichData) && enrichData.length > 0) {
        const byId = new Map(
          enrichData.map((row) => [
            asString((row as Record<string, unknown>).id),
            row as Record<string, unknown>,
          ]),
        )
        sessions = sessions.map((s) => {
          const extra = byId.get(s.splitSessionId)
          if (!extra) return s
          return {
            ...s,
            compraId: extra.compra_id == null ? s.compraId : asString(extra.compra_id),
            paymentId: extra.payment_id == null ? s.paymentId : asString(extra.payment_id),
            paymentStatus:
              typeof extra.payment_status === 'number' ? extra.payment_status : s.paymentStatus,
            completedAt: extra.completed_at == null ? s.completedAt : asString(extra.completed_at),
            status: extra.status == null ? s.status : asString(extra.status),
          }
        })
      }
    }

    if (eventsRes.status === 'fulfilled') {
      const { data, error: err } = eventsRes.value as {
        data: unknown
        error: { message: string } | null
      }
      if (!err && Array.isArray(data)) {
        events = data
          .map((row) => normalizeAuditEvent(row as Record<string, unknown>))
          .sort((a, b) => (a.eventAt === b.eventAt ? 0 : a.eventAt > b.eventAt ? -1 : 1))
      }
    }

    if (!group) {
      setDetail(null)
      setError(errors[0] ?? 'Não foi possível carregar o detalhe do grupo')
    } else {
      setDetail({
        group: {
          ...group,
          isStuck: isSplitStuck(group.status, group.updatedAt, STUCK_THRESHOLD_MINUTES),
        },
        sessions,
        events,
      })
      setError(errors.length > 0 ? errors.join(' • ') : null)
    }

    setLoading(false)
  }, [])

  return { detail, loading, error, load }
}
