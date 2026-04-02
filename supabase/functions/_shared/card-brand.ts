const CANONICAL_CARD_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Diners', 'JCB'] as const

const BRAND_ALIAS_MAP: Record<string, (typeof CANONICAL_CARD_BRANDS)[number]> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  master: 'Mastercard',
  elo: 'Elo',
  amex: 'Amex',
  americanexpress: 'Amex',
  hipercard: 'Hipercard',
  hiper: 'Hipercard',
  diners: 'Diners',
  dinersclub: 'Diners',
  jcb: 'JCB',
}

function compactBrand(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function normalizeCardBrand(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null
  const compact = compactBrand(raw)
  return BRAND_ALIAS_MAP[compact] ?? null
}

/**
 * Braspag espera enum específico para algumas bandeiras.
 * Ex.: Mastercard deve ser serializado como "Master".
 */
export function toGatewayCardBrand(raw?: string | null): string | null {
  const canonical = normalizeCardBrand(raw)
  if (!canonical) return null

  if (canonical === 'Mastercard') return 'Master'
  return canonical
}

export function isSupportedCardBrand(raw?: string | null): boolean {
  return normalizeCardBrand(raw) !== null
}

export function listCanonicalCardBrands(): readonly string[] {
  return CANONICAL_CARD_BRANDS
}
