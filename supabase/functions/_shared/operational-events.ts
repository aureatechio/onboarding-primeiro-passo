/**
 * Webhook JSON para n8n / automações operacionais (separado de alertas de saúde / WhatsApp).
 * Env: OPERATIONAL_EVENTS_WEBHOOK_URL — ausente = no-op.
 */

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import {
  FALLBACK_CELEBRIDADE,
  FALLBACK_VENDEDOR,
  fetchCompraIdFromSessionId,
  fetchCompraOperacionalLabels,
} from './operational-events-labels.ts'
import {
  buildOperationalWhatsAppMessage,
  formatCentavosBRL,
  shortUuid,
  truncateOperationalError,
  type WhatsAppMessageContext,
} from './operational-events-message.ts'

export const OPERATIONAL_EVENT_TYPES = {
  CHECKOUT_SESSION_CREATED: 'checkout.session_created',
  CHECKOUT_SESSION_EXPIRED: 'checkout.session_expired',
  CONTRACT_SIGNED: 'contract.signed',
  PAYMENT_SUCCEEDED: 'checkout.payment_succeeded',
  PAYMENT_FAILED: 'checkout.payment_failed',
  OMIE_INTEGRATION_SYNCED: 'omie.integration_synced',
  OMIE_INTEGRATION_FAILED: 'omie.integration_failed',
} as const

export type OperationalEventType =
  (typeof OPERATIONAL_EVENT_TYPES)[keyof typeof OPERATIONAL_EVENT_TYPES]

export interface OperationalEventPayload {
  event_type: OperationalEventType | string
  occurred_at: string
  /** Texto pronto para WhatsApp (vendedor + celebridade + contexto). */
  message: string
  compra_id?: string
  session_id?: string
  source?: string
  /** Chave opcional para dedupe no n8n (ex. payment_ok:sessionUuid) */
  dedupe_key?: string
  metadata?: Record<string, unknown>
}

const WEBHOOK_ENV = 'OPERATIONAL_EVENTS_WEBHOOK_URL'
const FETCH_TIMEOUT_MS = 8000

function redactMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase()
    if (
      key.includes('token') ||
      key.includes('secret') ||
      key.includes('password') ||
      key.includes('authorization')
    ) {
      out[k] = '[redacted]'
      continue
    }
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactMetadata(v as Record<string, unknown>)
      continue
    }
    out[k] = v
  }
  return out
}

export function buildOperationalEventPayload(
  input: Omit<OperationalEventPayload, 'occurred_at'> & { occurred_at?: string }
): OperationalEventPayload {
  const occurred_at = input.occurred_at ?? new Date().toISOString()
  const metadata =
    input.metadata && Object.keys(input.metadata).length > 0
      ? redactMetadata(input.metadata)
      : undefined
  return {
    event_type: input.event_type,
    occurred_at,
    message: input.message,
    ...(input.compra_id && { compra_id: input.compra_id }),
    ...(input.session_id && { session_id: input.session_id }),
    ...(input.source && { source: input.source }),
    ...(input.dedupe_key && { dedupe_key: input.dedupe_key }),
    ...(metadata && { metadata }),
  }
}

function postToOperationalWebhook(payload: OperationalEventPayload): void {
  const url = Deno.env.get(WEBHOOK_ENV)?.trim()
  if (!url) return

  const body = JSON.stringify(payload)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: controller.signal,
  })
    .then((res) => {
      clearTimeout(timeoutId)
      if (!res.ok) {
        console.error(
          `[OPERATIONAL_EVENT] ${payload.event_type} webhook HTTP ${res.status} compra_id=${payload.compra_id ?? 'n/a'}`
        )
        return
      }
      console.log(`[OPERATIONAL_EVENT] ${payload.event_type} sent`)
    })
    .catch((e) => {
      clearTimeout(timeoutId)
      const msg = e instanceof Error ? e.message : String(e)
      console.error(
        `[OPERATIONAL_EVENT] ${payload.event_type} fetch error: ${msg} compra_id=${payload.compra_id ?? 'n/a'}`
      )
    })
}

/**
 * Emissão direta (já com message montada). Fire-and-forget.
 */
export function emitOperationalEvent(
  input: Omit<OperationalEventPayload, 'occurred_at'> & { occurred_at?: string }
): void {
  postToOperationalWebhook(buildOperationalEventPayload(input))
}

export type OperationalLabelOverrides = {
  vendedor_nome: string
  celebridade_nome: string
}

export type EmitOperationalEventEnrichedInput = Omit<
  OperationalEventPayload,
  'occurred_at' | 'message'
> & {
  occurred_at?: string
  /** Quando já conhecidos (ex.: omie-orchestrator), evita SELECT extra. */
  label_overrides?: OperationalLabelOverrides
}

function metaString(meta: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = meta?.[key]
  if (v === undefined || v === null) return undefined
  return String(v)
}

function buildCtxFromEnrichedInput(
  input: EmitOperationalEventEnrichedInput,
  labels: { vendedor_nome: string; celebridade_nome: string },
  resolvedCompraId: string | undefined
): WhatsAppMessageContext {
  const meta = input.metadata
  const compraFull = resolvedCompraId ?? input.compra_id
  const errFromMeta =
    metaString(meta, 'last_error') ||
    metaString(meta, 'error') ||
    metaString(meta, 'message')

  return {
    vendedor_nome: labels.vendedor_nome,
    celebridade_nome: labels.celebridade_nome,
    compra_id_short: shortUuid(compraFull),
    session_id_short: input.session_id ? shortUuid(input.session_id) : undefined,
    metodo_pagamento: metaString(meta, 'metodo_pagamento'),
    valor_reais: formatCentavosBRL(meta?.valor_centavos),
    payment_id: metaString(meta, 'payment_id'),
    event_name: metaString(meta, 'event_name'),
    omie_os_id: metaString(meta, 'omie_os_id') ?? undefined,
    nf_numero: metaString(meta, 'nf_numero') ?? undefined,
    failure_code: metaString(meta, 'code') ?? undefined,
    last_error:
      input.event_type === 'checkout.payment_failed' || input.event_type === 'omie.integration_failed'
        ? errFromMeta
        : undefined,
  }
}

/**
 * Resolve vendedor/celebridade, monta message e envia. Não bloqueia o caller (IIFE async).
 */
export function emitOperationalEventEnriched(
  supabase: SupabaseClient,
  input: EmitOperationalEventEnrichedInput
): void {
  void (async () => {
    try {
      let compraId = input.compra_id ?? null
      if (!compraId && input.session_id) {
        compraId = await fetchCompraIdFromSessionId(supabase, input.session_id)
      }

      let labels: { vendedor_nome: string; celebridade_nome: string }
      if (input.label_overrides) {
        labels = {
          vendedor_nome: input.label_overrides.vendedor_nome.trim() || FALLBACK_VENDEDOR,
          celebridade_nome: input.label_overrides.celebridade_nome.trim() || FALLBACK_CELEBRIDADE,
        }
      } else if (compraId) {
        labels = await fetchCompraOperacionalLabels(supabase, compraId)
      } else {
        labels = { vendedor_nome: FALLBACK_VENDEDOR, celebridade_nome: FALLBACK_CELEBRIDADE }
      }

      const ctx = buildCtxFromEnrichedInput(input, labels, compraId ?? undefined)
      if (
        input.event_type === 'omie.integration_failed' &&
        (!ctx.last_error || ctx.last_error === '—')
      ) {
        ctx.last_error = truncateOperationalError(
          metaString(input.metadata, 'last_error') ||
            metaString(input.metadata, 'error') ||
            'Falha na integração'
        )
      }
      const message = buildOperationalWhatsAppMessage(input.event_type, ctx)

      postToOperationalWebhook(
        buildOperationalEventPayload({
          ...input,
          compra_id: compraId ?? input.compra_id,
          message,
        })
      )
    } catch (e) {
      console.error(
        '[OPERATIONAL_EVENT_ENRICHED]',
        input.event_type,
        e instanceof Error ? e.message : String(e)
      )
    }
  })()
}

export { FALLBACK_CELEBRIDADE, FALLBACK_VENDEDOR, fetchCompraOperacionalLabels }
