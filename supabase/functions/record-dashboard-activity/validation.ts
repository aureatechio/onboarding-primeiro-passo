export const VALID_DASHBOARD_ACTIVITY_EVENTS = ['login', 'activity'] as const
export type DashboardActivityEvent = (typeof VALID_DASHBOARD_ACTIVITY_EVENTS)[number]

export function parseDashboardActivityEvent(value: unknown): DashboardActivityEvent | null {
  const normalized = String(value ?? '').trim()
  return VALID_DASHBOARD_ACTIVITY_EVENTS.includes(normalized as DashboardActivityEvent)
    ? (normalized as DashboardActivityEvent)
    : null
}

export function parseDashboardPath(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  if (!normalized.startsWith('/')) return null
  return normalized.slice(0, 500)
}

export function sanitizeUserAgent(value: string | null): string | null {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  return normalized.slice(0, 500)
}
