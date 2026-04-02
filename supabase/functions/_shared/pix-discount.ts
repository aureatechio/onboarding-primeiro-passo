export interface PixDiscountInput {
  metodoPagamento?: string | null
  valorOriginalCentavos: number
  pixDiscountPercent?: number | null
  pixDiscountMinValueCentavos?: number | null
}

export interface PixDiscountResult {
  eligible: boolean
  descontoCentavos: number
  valorComDescontoCentavos: number
  descontoPercentual: number | null
}

export const DEFAULT_PIX_DISCOUNT_MIN_VALUE_CENTS = 100000

export function calculatePixDiscount(input: PixDiscountInput): PixDiscountResult {
  const metodoPagamento = input.metodoPagamento
  if (metodoPagamento !== 'pix') {
    return {
      eligible: false,
      descontoCentavos: 0,
      valorComDescontoCentavos: input.valorOriginalCentavos,
      descontoPercentual: null,
    }
  }

  const valorOriginalCentavos = input.valorOriginalCentavos
  const pixDiscountPercent = Number(input.pixDiscountPercent ?? 0)
  const pixDiscountMinValueCentavos = Number(
    input.pixDiscountMinValueCentavos ?? DEFAULT_PIX_DISCOUNT_MIN_VALUE_CENTS,
  )

  if (
    !Number.isFinite(pixDiscountPercent)
    || pixDiscountPercent <= 0
    || !Number.isFinite(valorOriginalCentavos)
    || valorOriginalCentavos < pixDiscountMinValueCentavos
  ) {
    return {
      eligible: false,
      descontoCentavos: 0,
      valorComDescontoCentavos: valorOriginalCentavos,
      descontoPercentual: null,
    }
  }

  const descontoCentavos = Math.floor((valorOriginalCentavos * pixDiscountPercent) / 100)

  return {
    eligible: true,
    descontoCentavos,
    valorComDescontoCentavos: valorOriginalCentavos - descontoCentavos,
    descontoPercentual: pixDiscountPercent,
  }
}
