import { formatDateDDMMYYYY, toDate, startOfDay } from './date-utils.ts'
import { roundTo2 } from './canonical-os-payload.ts'

// ----- OMIE payment method constants -----

const MEIO_PAGAMENTO_MAP: Record<string, { meio_pagamento: string; tipo_documento: string }> = {
  cartao: { meio_pagamento: '03', tipo_documento: 'CRC' },
  credit_card: { meio_pagamento: '03', tipo_documento: 'CRC' },
  credito: { meio_pagamento: '03', tipo_documento: 'CRC' },
  pix: { meio_pagamento: '17', tipo_documento: 'PIX' },
  boleto: { meio_pagamento: '15', tipo_documento: 'BOL' },
}

export const resolveMeioPagamento = (
  metodo?: string | null
): { meio_pagamento: string; tipo_documento: string } | undefined => {
  if (!metodo) return undefined
  const normalized = metodo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const exact = MEIO_PAGAMENTO_MAP[normalized]
  if (exact) return exact
  for (const [key, value] of Object.entries(MEIO_PAGAMENTO_MAP)) {
    if (normalized.includes(key)) return value
  }
  return undefined
}

// ----- Checkout session types -----

export type PaidCheckoutSession = {
  metodo_pagamento: string | null
  valor_centavos: number | null
  parcelas: number | null
  split_group_id: string | null
  split_index: number | null
  boleto_vencimento: string | null
  completed_at: string | null
  updated_at: string | null
  payment_id: string | null
  payment_response: Record<string, unknown> | null
}

// ----- OMIE parcela line -----

export type OmieParcelaLine = {
  nParcela: number
  nValor: number
  nPercentual: number
  dDtVenc: string
  meio_pagamento?: string
  tipo_documento?: string
  nsu?: string
}

export type ParcelasBuilderResult = {
  parcelas: OmieParcelaLine[]
  nQtdeParc: number
  cCodParc: '999'
}

// ----- Helpers -----

const resolvePaymentPayload = (
  pr: Record<string, unknown> | null
): Record<string, unknown> | undefined => {
  if (!pr) return undefined
  return ((pr.Payment ?? pr) as Record<string, unknown>) ?? undefined
}

const resolveNsuFromSession = (session: PaidCheckoutSession): string | undefined => {
  const pp = resolvePaymentPayload(session.payment_response)
  if (!pp) return session.payment_id ?? undefined

  const nsu = pp.Nsu ? String(pp.Nsu) : pp.ProofOfSale ? String(pp.ProofOfSale) : null
  if (nsu) return nsu
  const payId = pp.PaymentId ? String(pp.PaymentId) : null
  return payId ?? session.payment_id ?? undefined
}

const resolveVencimento = (
  session: PaidCheckoutSession,
  parcelaIndex: number,
  baseDate: Date
): string => {
  if (parcelaIndex === 0 && session.boleto_vencimento) {
    const parsed = toDate(session.boleto_vencimento)
    if (parsed) return formatDateDDMMYYYY(parsed)
  }

  const ref =
    session.completed_at ?? session.updated_at ?? session.boleto_vencimento
  const refDate = toDate(ref)
  const base = refDate ? startOfDay(refDate) : baseDate

  if (parcelaIndex === 0) return formatDateDDMMYYYY(base)

  const offset = new Date(base)
  offset.setDate(offset.getDate() + parcelaIndex * 30)
  return formatDateDDMMYYYY(offset)
}

// ----- Main builder -----

const isBoletoParcelado = (session: PaidCheckoutSession): boolean => {
  if (!session.parcelas || session.parcelas <= 1) return false
  const meioPag = resolveMeioPagamento(session.metodo_pagamento)
  return meioPag?.tipo_documento === 'BOL'
}

/**
 * Builds the OMIE `Parcelas` array from real paid checkout sessions,
 * mirroring each payment method, value, and due date.
 *
 * Canonical expansion rule (based on real receipt timing):
 * - PIX, cartão (any installments) and boleto 1x → always 1 line (received upfront).
 * - Boleto parcelado (parcelas > 1) → expands into N lines with 30-day spacing.
 *
 * Returns `null` when no sessions are available (caller should use legacy logic).
 */
export const buildParcelasFromSessions = (
  sessions: PaidCheckoutSession[],
  valorTotalCentavos: number
): ParcelasBuilderResult | null => {
  if (!sessions.length) return null

  const lines: OmieParcelaLine[] = []
  const valorTotalReais = roundTo2(valorTotalCentavos / 100)
  const fallbackBase = startOfDay(new Date())

  const sorted = [...sessions].sort((a, b) => {
    const ia = a.split_index ?? 999
    const ib = b.split_index ?? 999
    if (ia !== ib) return ia - ib
    const ta = a.completed_at ?? a.updated_at ?? ''
    const tb = b.completed_at ?? b.updated_at ?? ''
    return ta.localeCompare(tb)
  })

  for (const session of sorted) {
    const meioPag = resolveMeioPagamento(session.metodo_pagamento)
    const sessionParcelas = isBoletoParcelado(session) ? session.parcelas! : 1
    const sessionValorCentavos = session.valor_centavos ?? 0
    const sessionValorReais = roundTo2(sessionValorCentavos / 100)
    const nsu = resolveNsuFromSession(session)

    if (sessionParcelas === 1) {
      lines.push({
        nParcela: 0, // renumbered later
        nValor: sessionValorReais,
        nPercentual: 0, // recalculated later
        dDtVenc: resolveVencimento(session, 0, fallbackBase),
        ...(meioPag ? { meio_pagamento: meioPag.meio_pagamento, tipo_documento: meioPag.tipo_documento } : {}),
        ...(nsu ? { nsu } : {}),
      })
    } else {
      const valorParcelaReais = roundTo2(sessionValorReais / sessionParcelas)
      let acumulado = 0

      for (let i = 0; i < sessionParcelas; i++) {
        const isLast = i === sessionParcelas - 1
        const valor = isLast ? roundTo2(sessionValorReais - acumulado) : valorParcelaReais
        acumulado = roundTo2(acumulado + valor)

        lines.push({
          nParcela: 0,
          nValor: valor,
          nPercentual: 0,
          dDtVenc: resolveVencimento(session, i, fallbackBase),
          ...(meioPag ? { meio_pagamento: meioPag.meio_pagamento, tipo_documento: meioPag.tipo_documento } : {}),
          ...(nsu ? { nsu } : {}),
        })
      }
    }
  }

  if (lines.length === 0) return null

  // Renumber parcels and calculate percentages
  let percentualAcumulado = 0
  let valorAcumulado = 0
  for (let i = 0; i < lines.length; i++) {
    const isLast = i === lines.length - 1
    lines[i].nParcela = i + 1

    // Adjust last line to absorb rounding diff
    if (isLast) {
      lines[i].nValor = roundTo2(valorTotalReais - valorAcumulado)
      lines[i].nPercentual = roundTo2(100 - percentualAcumulado)
    } else {
      const pct = valorTotalReais > 0
        ? roundTo2((lines[i].nValor / valorTotalReais) * 100)
        : roundTo2(100 / lines.length)
      lines[i].nPercentual = pct
      percentualAcumulado = roundTo2(percentualAcumulado + pct)
      valorAcumulado = roundTo2(valorAcumulado + lines[i].nValor)
    }
  }

  return {
    parcelas: lines,
    nQtdeParc: lines.length,
    cCodParc: '999',
  }
}

// ----- Select columns needed from checkout_sessions -----

export const PARCELAS_SESSION_COLUMNS =
  'metodo_pagamento, valor_centavos, parcelas, split_group_id, split_index, boleto_vencimento, completed_at, updated_at, payment_id, payment_response' as const
