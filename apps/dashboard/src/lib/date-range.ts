/**
 * Shared date range presets and calculation utility.
 *
 * Special string presets:
 * - 'today'     → from start of today to now
 * - 'yesterday' → from start of yesterday to end of yesterday
 * - 'month'     → from 1st of current month to now
 * - 'lastMonth' → from 1st of previous month to 1st of current month (exclusive)
 * - 'all'       → no date filter (all time)
 *
 * Numeric values are treated as "last N days" (backwards from now).
 *
 * CustomDateRange: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } for user-selected ranges.
 */

export interface CustomDateRange {
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
}

export function isCustomDateRange(preset: DateRangePreset | undefined): preset is CustomDateRange {
  return typeof preset === 'object' && preset !== null && 'from' in preset && 'to' in preset
}

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'month'
  | 'lastMonth'
  | 'all'
  | number
  | CustomDateRange

export interface DateRangeResult {
  since?: string // ISO string — inclusive lower bound (omitted for 'all')
  until?: string // ISO string — exclusive upper bound (e.g. 'yesterday', 'lastMonth')
}

/**
 * Resolves a preset into { since, until? } ISO strings for Supabase queries.
 */
export function getDateRange(preset?: DateRangePreset): DateRangeResult {
  if (isCustomDateRange(preset)) {
    const since = new Date(preset.from + 'T00:00:00')
    const until = new Date(preset.to + 'T00:00:00')
    until.setDate(until.getDate() + 1)
    return { since: since.toISOString(), until: until.toISOString() }
  }

  const now = new Date()

  switch (preset) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { since: start.toISOString() }
    }

    case 'yesterday': {
      const start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)

      const end = new Date(now)
      end.setHours(0, 0, 0, 0)
      return { since: start.toISOString(), until: end.toISOString() }
    }

    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { since: start.toISOString() }
    }

    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), 1)
      end.setHours(0, 0, 0, 0)
      return { since: start.toISOString(), until: end.toISOString() }
    }

    case 'all':
      return {}

    default: {
      // Numeric — last N days (fallback: 1 = today)
      const days = typeof preset === 'number' ? preset : 1
      const since = new Date()
      since.setDate(since.getDate() - days)
      return { since: since.toISOString() }
    }
  }
}

/**
 * Standard date option presets used across dashboard pages.
 *
 * PAGE-LEVEL: each page picks from these or defines its own subset.
 */
export const DATE_PRESETS = {
  today: { value: 'today' as const, label: 'Hoje' },
  yesterday: { value: 'yesterday' as const, label: 'Ontem' },
  month: { value: 'month' as const, label: 'Mês atual' },
  lastMonth: { value: 'lastMonth' as const, label: 'Mês Anterior' },
  days7: { value: 7 as const, label: '7 dias' },
  days30: { value: 30 as const, label: '30 dias' },
  days90: { value: 90 as const, label: '90 dias' },
  all: { value: 'all' as const, label: 'Todo período' },
} as const

/** Default preset for Overview, Contratos and Tasks (Todo o período) */
export const DEFAULT_DATE_PRESET: DateRangePreset = 'all'
