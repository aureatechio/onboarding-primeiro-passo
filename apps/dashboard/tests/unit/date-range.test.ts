import { describe, expect, it, vi, afterEach } from 'vitest'
import { getDateRange } from '../../src/lib/date-range'

describe('getDateRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function pin(iso: string) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(iso))
  }

  it('returns start of today for "today" preset', () => {
    pin('2026-02-19T12:00:00.000Z')
    const result = getDateRange('today')
    expect(result.since).toBeDefined()
    expect(result.until).toBeUndefined()
    const d = new Date(result.since!)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getDate()).toBe(new Date('2026-02-19T12:00:00.000Z').getDate())
  })

  it('returns start of yesterday to start of today for "yesterday"', () => {
    pin('2026-02-19T12:00:00.000Z')
    const result = getDateRange('yesterday')
    expect(result.since).toBeDefined()
    expect(result.until).toBeDefined()
    const since = new Date(result.since!)
    const until = new Date(result.until!)
    expect(since.getHours()).toBe(0)
    expect(until.getHours()).toBe(0)
    expect(until.getTime() - since.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('returns 1st of current month for "month" preset', () => {
    pin('2026-02-19T12:00:00.000Z')
    const result = getDateRange('month')
    expect(result.since).toBeDefined()
    expect(result.until).toBeUndefined()
    const d = new Date(result.since!)
    expect(d.getMonth()).toBe(1) // February
    expect(d.getDate()).toBe(1)
  })

  it('returns empty object for "all" preset', () => {
    const result = getDateRange('all')
    expect(result).toEqual({})
  })

  it('returns N days ago for numeric preset (7)', () => {
    pin('2026-02-19T12:00:00.000Z')
    const result = getDateRange(7)
    expect(result.since).toBeDefined()
    expect(result.until).toBeUndefined()
    const since = new Date(result.since!)
    const now = new Date('2026-02-19T12:00:00.000Z')
    const diffDays = (now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeCloseTo(7, 0)
  })

  it('returns N days ago for numeric preset (30)', () => {
    pin('2026-02-19T12:00:00.000Z')
    const result = getDateRange(30)
    expect(result.since).toBeDefined()
    const since = new Date(result.since!)
    const now = new Date('2026-02-19T12:00:00.000Z')
    const diffDays = (now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeCloseTo(30, 0)
  })

  it('defaults to 1 day ago when preset is undefined', () => {
    pin('2026-02-19T12:00:00.000Z')
    const result = getDateRange(undefined)
    expect(result.since).toBeDefined()
    const since = new Date(result.since!)
    const now = new Date('2026-02-19T12:00:00.000Z')
    const diffDays = (now.getTime() - since.getTime()) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeCloseTo(1, 0)
  })
})
