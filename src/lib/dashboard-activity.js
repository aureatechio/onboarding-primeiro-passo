import { adminFetch } from './admin-edge'

const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000

let lastActivityAt = 0

function currentDashboardPath() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}

export async function recordDashboardActivity(event = 'activity', { path, force = false } = {}) {
  const nextPath = path || currentDashboardPath()
  const now = Date.now()

  if (event === 'activity' && !force && now - lastActivityAt < ACTIVITY_THROTTLE_MS) {
    return null
  }

  if (event === 'activity') {
    lastActivityAt = now
  }

  try {
    return await adminFetch('record-dashboard-activity', {
      method: 'POST',
      body: { event, path: nextPath },
    })
  } catch (err) {
    if (event === 'activity') {
      lastActivityAt = 0
    }
    console.warn('[dashboard-activity] failed:', err?.message)
    return null
  }
}
