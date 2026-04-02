/**
 * Monta URL do link de checkout conforme a versão global (checkout_config.checkout_version).
 * v1: mantém contrato legado `${checkout_base_url}?session=...`
 * v2: página multistep com contrato embutido em `/contrato-flow-v3.html` no mesmo host da base.
 */

export const CHECKOUT_VERSION_V1 = 'checkout_v1'
export const CHECKOUT_VERSION_V2 = 'checkout_v2'

export type CheckoutVersion = typeof CHECKOUT_VERSION_V1 | typeof CHECKOUT_VERSION_V2

export function normalizeCheckoutVersion(
  raw: string | null | undefined,
): CheckoutVersion {
  if (raw === CHECKOUT_VERSION_V2) return CHECKOUT_VERSION_V2
  return CHECKOUT_VERSION_V1
}

/**
 * @param checkoutBaseUrl URL base configurada (ex.: https://checkout.exemplo.com ou com path)
 * @param sessionId UUID da sessão
 * @param checkoutVersion checkout_v1 | checkout_v2 (null/undefined => v1)
 */
export function buildCheckoutSessionUrl(
  checkoutBaseUrl: string,
  sessionId: string,
  checkoutVersion?: string | null,
): string {
  const version = normalizeCheckoutVersion(checkoutVersion)
  if (version === CHECKOUT_VERSION_V2) {
    try {
      const u = new URL(checkoutBaseUrl.trim())
      u.pathname = '/contrato-flow-v3.html'
      u.search = ''
      u.searchParams.set('session', sessionId)
      return u.toString()
    } catch {
      const trimmed = checkoutBaseUrl.trim().replace(/\/+$/, '')
      return `${trimmed}/contrato-flow-v3.html?session=${encodeURIComponent(sessionId)}`
    }
  }
  return `${checkoutBaseUrl}?session=${sessionId}`
}
