import { describe, expect, it } from 'vitest'

import {
  getSplitStatusLabel,
  isBoletoParceladoSplit,
  isDualPaymentSplit,
} from '../../src/lib/split-status'

describe('split status helper', () => {
  it('returns null when split_group_id is missing', () => {
    expect(
      getSplitStatusLabel({
        split_group_id: null,
        split_type: 'boleto_parcelado',
        split_sessoes_pagas: 1,
        split_total_sessoes: 3,
      })
    ).toBeNull()
  })

  it('returns boleto parcelado label', () => {
    expect(
      getSplitStatusLabel({
        split_group_id: 'group-1',
        split_type: 'boleto_parcelado',
        split_sessoes_pagas: 1,
        split_total_sessoes: 3,
      })
    ).toBe('Boleto parcelado: 1/3 pagas')
  })

  it('returns dois meios label', () => {
    expect(
      getSplitStatusLabel({
        split_group_id: 'group-2',
        split_type: 'dois_meios',
        split_sessoes_pagas: 2,
        split_total_sessoes: 2,
      })
    ).toBe('2 meios: 2/2 pagas')
  })

  it('defaults null counts to zero', () => {
    expect(
      getSplitStatusLabel({
        split_group_id: 'group-3',
        split_type: 'dois_meios',
        split_sessoes_pagas: null,
        split_total_sessoes: null,
      })
    ).toBe('2 meios: 0/0 pagas')
  })

  it('recognizes boleto parcelado split type', () => {
    expect(isBoletoParceladoSplit('boleto_parcelado')).toBe(true)
    expect(isBoletoParceladoSplit('dual_payment')).toBe(false)
  })

  it('normalizes dual payment aliases', () => {
    expect(isDualPaymentSplit('dual_payment')).toBe(true)
    expect(isDualPaymentSplit('dois_meios')).toBe(true)
    expect(isDualPaymentSplit('boleto_parcelado')).toBe(false)
  })
})
