import { describe, expect, it, vi, afterEach } from 'vitest'

import {
  applyCepMask,
  applyCnpjMask,
  applyCpfMask,
  applyPhoneMask,
  formatCentsToCurrency,
  formatCurrency,
  formatDate,
  formatDocument,
  maskDocument,
  maskEmail,
  timeAgo,
} from '../../src/lib/mask'

describe('mask helpers', () => {
  it('masks CPF and CNPJ documents', () => {
    expect(maskDocument('12345678945')).toBe('123.***.***-45')
    expect(maskDocument('12345678000199')).toBe('12.***.***/****-99')
  })

  it('handles null/undefined and unknown document format', () => {
    expect(maskDocument(null as unknown as string)).toBe('—')
    expect(maskDocument(undefined as unknown as string)).toBe('—')
    expect(maskDocument('123456')).toBe('123456')
  })

  it('applies progressive input masks', () => {
    expect(applyCpfMask('12345678901')).toBe('123.456.789-01')
    expect(applyCnpjMask('12345678000199')).toBe('12.345.678/0001-99')
    expect(applyCepMask('12345678')).toBe('12345-678')
    expect(applyPhoneMask('11987654321')).toBe('(11) 98765-4321')
  })

  it('formats CPF/CNPJ without masking', () => {
    expect(formatDocument('12345678901')).toBe('123.456.789-01')
    expect(formatDocument('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('masks email and handles invalid/null values', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com')
    expect(maskEmail('invalid-email')).toBe('invalid-email')
    expect(maskEmail(null)).toBe('—')
  })

  it('formats currency values', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56')
    expect(formatCentsToCurrency(123456)).toBe('R$ 1.234,56')
    expect(formatCurrency(null)).toBe('—')
    expect(formatCentsToCurrency(null)).toBe('—')
  })

  it('formats dates and handles invalid/null values', () => {
    expect(formatDate('2026-01-02T03:04:05.000Z')).not.toBe('—')
    expect(formatDate('invalid')).toBe('—')
    expect(formatDate(null)).toBe('—')
  })

  it('returns relative time labels', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'))

    expect(timeAgo('2026-01-01T11:59:45.000Z')).toBe('agora')
    expect(timeAgo('2026-01-01T11:50:00.000Z')).toBe('há 10 min')
    expect(timeAgo('2026-01-01T10:00:00.000Z')).toBe('há 2h')
    expect(timeAgo('2025-12-30T12:00:00.000Z')).toBe('há 2d')
  })
})

afterEach(() => {
  vi.useRealTimers()
})
