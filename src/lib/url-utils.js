const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
]

export function stripTrackingParams(rawUrl) {
  if (!rawUrl) return rawUrl
  try {
    const url = new URL(rawUrl)
    TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param))
    return url.toString()
  } catch {
    return rawUrl
  }
}
