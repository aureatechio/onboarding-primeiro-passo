import { describe, expect, it } from 'vitest'

import {
  getPaymentStatusLabel,
  getPaymentStatusTooltip,
} from '../../src/lib/payment-status'

describe('payment status helpers', () => {
  it('returns labels for mapped codes', () => {
    const expected = new Map<number, string>([
      [0, 'Não finalizado'],
      [1, 'Autorizado'],
      [2, 'Pagamento confirmado'],
      [3, 'Negado'],
      [10, 'Cancelado'],
      [11, 'Estornado'],
      [12, 'Pendente'],
      [13, 'Abortado'],
      [20, 'Agendado'],
    ])

    expected.forEach((label, code) => {
      expect(getPaymentStatusLabel(code)).toBe(label)
    })
  })

  it('returns fallback labels for unknown and null codes', () => {
    expect(getPaymentStatusLabel(99)).toBe('Status 99')
    expect(getPaymentStatusLabel(null)).toBe('—')
  })

  it('returns tooltip text for mapped/unmapped/null status codes', () => {
    expect(getPaymentStatusTooltip(2)).toBe(
      'Pagamento confirmado (código Cielo: 2)'
    )
    expect(getPaymentStatusTooltip(99)).toBe(
      'Status não mapeado (código Cielo: 99)'
    )
    expect(getPaymentStatusTooltip(null)).toBe('')
  })
})
