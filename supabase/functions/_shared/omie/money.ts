const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export const parseMoneyToCentavos = (value: unknown): number | undefined => {
  const parsed = toNumber(value)
  if (parsed === undefined || parsed <= 0) return undefined

  if (Number.isInteger(parsed)) {
    return parsed
  }

  return Math.round(parsed * 100)
}

/**
 * Converts a value that is ALWAYS in reais (BRL) to centavos.
 * Unlike `parseMoneyToCentavos`, this function never assumes that an integer
 * value is already in centavos — it always multiplies by 100.
 *
 * Use this when the source field is a monetary amount stored in reais
 * (e.g. `compras.valor_total`), where a value like `15870` means R$15.870,00
 * and NOT 158,70 centavos.
 */
export const parseReaisToCentavos = (value: unknown): number | undefined => {
  const parsed = toNumber(value)
  if (parsed === undefined || parsed <= 0) return undefined
  return Math.round(parsed * 100)
}

export const centavosToReais = (centavos: number): number => {
  if (!Number.isFinite(centavos)) return 0
  return Math.round(centavos) / 100
}

type SessionWithCentavos = {
  valor_centavos: number | null
}

const sumPaidSessionsCentavos = (
  paidSessions: SessionWithCentavos[] | null | undefined
): number => {
  if (!Array.isArray(paidSessions) || paidSessions.length === 0) return 0

  return paidSessions.reduce((sum, session) => {
    const raw = session?.valor_centavos
    if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return sum
    return sum + Math.round(raw)
  }, 0)
}

export const resolveValorTotalCentavos = (
  compraValorTotal: unknown,
  paidSessions: SessionWithCentavos[] | null | undefined
): number | undefined => {
  const paidTotalCentavos = sumPaidSessionsCentavos(paidSessions)
  if (paidTotalCentavos > 0) return paidTotalCentavos
  return parseReaisToCentavos(compraValorTotal)
}

/**
 * Variante com suporte a split_type.
 * Para boleto_parcelado: usa compra.valor_total (contrato completo), ignorando
 * a soma de sessões paidas (que reflete apenas a 1ª parcela já paga).
 * Para todos os outros casos: comportamento idêntico a resolveValorTotalCentavos.
 */
export const resolveValorTotalCentavosForSplit = (
  compraValorTotal: unknown,
  paidSessions: SessionWithCentavos[] | null | undefined,
  splitType: string | null | undefined
): number | undefined => {
  if (splitType === 'boleto_parcelado') {
    return parseReaisToCentavos(compraValorTotal)
  }
  return resolveValorTotalCentavos(compraValorTotal, paidSessions)
}
