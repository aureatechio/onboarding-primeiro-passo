export const toDate = (value?: string | null): Date | null => {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/').map((item) => Number(item))
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatDateDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export const startOfDay = (date: Date): Date => {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) {
      remaining -= 1
    }
  }
  return result
}

/**
 * Calculates the billing forecast date (dDtPrevisao) for OMIE OS.
 * Rule: payment date + 1 business day.
 * Uses `dataPrevisao` override if provided, otherwise `dataVenda` (payment date),
 * and falls back to current date.
 */
export const calcPrevisaoFaturamento = (
  dataPrevisao: string | undefined,
  dataVenda: string | undefined
): { previsao: string; primeiraParcelaDate: Date } => {
  const payloadBaseDate = toDate(dataPrevisao) ?? toDate(dataVenda) ?? new Date()
  const primeiraParcelaDate = addBusinessDays(startOfDay(payloadBaseDate), 1)
  return {
    previsao: formatDateDDMMYYYY(primeiraParcelaDate),
    primeiraParcelaDate,
  }
}
