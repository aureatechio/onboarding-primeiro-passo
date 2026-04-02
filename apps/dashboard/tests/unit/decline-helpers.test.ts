import { describe, expect, it } from 'vitest'

import {
  classifyDecline,
  SELLER_SCRIPTS,
  RETRY_POLICY_LABELS,
  SOURCE_LABELS,
  CONFIDENCE_LABELS,
  type DeclineClassification,
} from '../../src/lib/decline-helpers'

describe('classifyDecline', () => {
  describe('brand + provider code (high confidence)', () => {
    it('classifies Visa 51 as insufficient_funds', () => {
      const result = classifyDecline({
        brand: 'Visa',
        providerReturnCode: '51',
        providerReturnMessage: 'SALDO/LIMITE INSUFICIENTE',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.retryPolicy).toBe('user_retry_allowed')
      expect(result.source).toBe('provider_return_code')
      expect(result.confidence).toBe('high')
      expect(result.matchedCode).toBe('51')
    })

    it('classifies Elo 41 as card_blocked', () => {
      const result = classifyDecline({
        brand: 'Elo',
        providerReturnCode: '41',
        providerReturnMessage: 'CARTAO PERDIDO',
      })
      expect(result.category).toBe('card_blocked')
      expect(result.confidence).toBe('high')
    })

    it('classifies Mastercard 91 as issuer_unavailable', () => {
      const result = classifyDecline({
        brand: 'Mastercard',
        providerReturnCode: '91',
        providerReturnMessage: 'EMISSOR FORA DO AR',
      })
      expect(result.category).toBe('issuer_unavailable')
      expect(result.retryPolicy).toBe('user_retry_later')
      expect(result.confidence).toBe('high')
    })

    it('classifies Amex 200 + FRAUDE as suspected_fraud', () => {
      const result = classifyDecline({
        brand: 'American Express',
        providerReturnCode: '200',
        providerReturnMessage: 'FRAUDE CONFIRMADA',
      })
      expect(result.category).toBe('suspected_fraud')
      expect(result.confidence).toBe('high')
    })
  })

  describe('ambiguous codes by message (57, 62)', () => {
    it('disambiguates Elo 57 TRANSACAO NAO PERMITIDA vs FRAUDE', () => {
      const txNotAllowed = classifyDecline({
        brand: 'Elo',
        providerReturnCode: '57',
        providerReturnMessage: 'TRANSACAO NAO PERMITIDA PARA O CARTAO',
      })
      expect(txNotAllowed.category).toBe('transaction_not_allowed')

      const fraud = classifyDecline({
        brand: 'Elo',
        providerReturnCode: '57',
        providerReturnMessage: 'FRAUDE CONFIRMADA',
      })
      expect(fraud.category).toBe('suspected_fraud')
    })

    it('disambiguates Elo 62 BLOQUEIO vs CARTAO DOMESTICO', () => {
      const blocked = classifyDecline({
        brand: 'Elo',
        providerReturnCode: '62',
        providerReturnMessage: 'BLOQUEIO TEMPORARIO',
      })
      expect(blocked.category).toBe('card_blocked')

      const domestic = classifyDecline({
        brand: 'Elo',
        providerReturnCode: '62',
        providerReturnMessage: 'CARTAO DOMESTICO',
      })
      expect(domestic.category).toBe('transaction_not_allowed')
    })

    it('disambiguates Visa 62 variants', () => {
      const blocked = classifyDecline({
        brand: 'Visa',
        providerReturnCode: '62',
        providerReturnMessage: 'BLOQUEIO TEMPORARIO (EX: INADIMPLENCIA)',
      })
      expect(blocked.category).toBe('card_blocked')
    })

    it('disambiguates Mastercard 04 RECOLHER vs FRAUDE', () => {
      const recolher = classifyDecline({
        brand: 'Mastercard',
        providerReturnCode: '04',
        providerReturnMessage: 'RECOLHER CARTAO',
      })
      expect(recolher.category).toBe('card_blocked')

      const fraud = classifyDecline({
        brand: 'Mastercard',
        providerReturnCode: '04',
        providerReturnMessage: 'FRAUDE CONFIRMADA',
      })
      expect(fraud.category).toBe('suspected_fraud')
    })
  })

  describe('ReturnCode path (no brand or brand miss)', () => {
    it('classifies ReturnCode 70 as insufficient_funds', () => {
      const result = classifyDecline({
        returnCode: '70',
        returnMessage: 'LIMITE EXCEDIDO/SEM SALDO',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.source).toBe('return_code')
      expect(result.confidence).toBe('medium')
      expect(result.matchedCode).toBe('70')
    })

    it('classifies ReturnCode 98 as issuer_unavailable', () => {
      const result = classifyDecline({
        returnCode: '98',
        returnMessage: 'COMUNICACAO INDISPONIVEL',
      })
      expect(result.category).toBe('issuer_unavailable')
      expect(result.confidence).toBe('medium')
    })

    it('classifies ReturnCode BP900 as processing_error', () => {
      const result = classifyDecline({
        returnCode: 'BP900',
        returnMessage: 'FALHA NA OPERACAO',
      })
      expect(result.category).toBe('processing_error')
      expect(result.retryPolicy).toBe('retry_after_5m')
    })

    it('classifies ReturnCode 67 as card_blocked', () => {
      const result = classifyDecline({
        returnCode: '67',
        returnMessage: 'CARTAO BLOQUEADO PARA COMPRAS HOJE',
      })
      expect(result.category).toBe('card_blocked')
    })
  })

  describe('ReasonCode path', () => {
    it('classifies via reason_code when provider and return miss', () => {
      const result = classifyDecline({
        brand: 'UnknownCard',
        providerReturnCode: 'ZZZ',
        reasonCode: 'BN',
        reasonMessage: 'CARTAO OU CONTA BLOQUEADO',
      })
      expect(result.category).toBe('card_blocked')
      expect(result.source).toBe('reason_code')
      expect(result.confidence).toBe('medium')
    })
  })

  describe('fallback to unknown', () => {
    it('returns unknown for unrecognized provider code', () => {
      const result = classifyDecline({
        brand: 'Visa',
        providerReturnCode: 'XX',
      })
      expect(result.category).toBe('unknown')
      expect(result.source).toBe('fallback_unknown')
      expect(result.confidence).toBe('low')
      expect(result.matchedCode).toBeNull()
    })

    it('returns unknown for no inputs', () => {
      const result = classifyDecline({})
      expect(result.category).toBe('unknown')
      expect(result.confidence).toBe('low')
    })

    it('returns unknown for unsupported brand with no return code', () => {
      const result = classifyDecline({
        brand: 'Hipercard',
        providerReturnCode: '51',
      })
      expect(result.category).toBe('unknown')
    })
  })

  describe('Amex De/Para normalization', () => {
    it('normalizes FA to 100 and matches Amex rule', () => {
      const result = classifyDecline({
        brand: 'Amex',
        providerReturnCode: 'FA',
        providerReturnMessage: 'GENERICA',
      })
      expect(result.matchedCode).toBe('FA->100')
      expect(result.confidence).toBe('high')
      expect(result.source).toBe('provider_return_code')
    })

    it('normalizes A5 to 116 (insufficient_funds)', () => {
      const result = classifyDecline({
        brand: 'American Express',
        providerReturnCode: 'A5',
        providerReturnMessage: 'SALDO/LIMITE INSUFICIENTE',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.matchedCode).toBe('A5->116')
    })

    it('normalizes FD to 200 (card_blocked / suspected_fraud)', () => {
      const result = classifyDecline({
        brand: 'Amex',
        providerReturnCode: 'FD',
        providerReturnMessage: 'CARTAO ROUBADO',
      })
      expect(result.category).toBe('card_blocked')
      expect(result.matchedCode).toBe('FD->200')
    })

    it('normalizes AE to 911 (issuer_unavailable)', () => {
      const result = classifyDecline({
        brand: 'Amex',
        providerReturnCode: 'AE',
        providerReturnMessage: 'FALHA DO SISTEMA',
      })
      expect(result.category).toBe('issuer_unavailable')
      expect(result.matchedCode).toBe('AE->911')
    })

    it('normalizes via returnCode when providerReturnCode misses', () => {
      const result = classifyDecline({
        brand: 'Amex',
        providerReturnCode: 'ZZZZ',
        returnCode: 'BV',
        returnMessage: 'CARTAO VENCIDO',
      })
      expect(result.category).toBe('invalid_card_data')
      expect(result.matchedCode).toBe('BV->101')
    })
  })

  describe('brand normalization', () => {
    it.each([
      ['Visa', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['VISA', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['Mastercard', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['MASTERCARD', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['Master', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['Elo', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['ELO', '51', 'SALDO/LIMITE INSUFICIENTE'],
      ['Amex', '116', 'SALDO/LIMITE INSUFICIENTE'],
      ['American Express', '116', 'SALDO/LIMITE INSUFICIENTE'],
    ])('normalizes %s and finds insufficient_funds', (brand, code, message) => {
      const result = classifyDecline({
        brand,
        providerReturnCode: code,
        providerReturnMessage: message,
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.confidence).toBe('high')
    })
  })

  describe('numeric code normalization', () => {
    it('handles numeric input as providerReturnCode', () => {
      const result = classifyDecline({
        brand: 'Visa',
        providerReturnCode: 51,
        providerReturnMessage: 'SALDO/LIMITE INSUFICIENTE',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.matchedCode).toBe('51')
    })
  })

  describe('classification metadata integrity', () => {
    it('high confidence classifications include explanation with brand', () => {
      const result = classifyDecline({
        brand: 'Visa',
        providerReturnCode: '51',
        providerReturnMessage: 'SALDO/LIMITE INSUFICIENTE',
      })
      expect(result.explanation).toContain('visa')
      expect(result.explanation).toContain('51')
    })

    it('medium confidence classifications note missing brand', () => {
      const result = classifyDecline({
        returnCode: '70',
        returnMessage: 'LIMITE EXCEDIDO',
      })
      expect(result.explanation).toContain('sem bandeira')
    })

    it('low confidence explanation mentions no rule found', () => {
      const result = classifyDecline({})
      expect(result.explanation).toContain('Nenhuma regra')
    })
  })

  describe('label maps completeness', () => {
    it('SOURCE_LABELS covers all source types', () => {
      const sources = [
        'provider_return_code',
        'return_code',
        'reason_code',
        'parsed_error_message',
        'fallback_unknown',
      ] as const
      for (const s of sources) {
        expect(SOURCE_LABELS[s]).toBeTruthy()
      }
    })

    it('CONFIDENCE_LABELS covers all confidence levels', () => {
      const levels = ['high', 'medium', 'low'] as const
      for (const l of levels) {
        expect(CONFIDENCE_LABELS[l]).toBeTruthy()
      }
    })

    it('every category has a SELLER_SCRIPT', () => {
      const categories = [
        'invalid_card_data', 'insufficient_funds', 'card_blocked',
        'transaction_not_allowed', 'suspected_fraud', 'issuer_unavailable',
        'amount_or_installment_invalid', 'wrong_payment_method',
        'recurrence_suspended', 'auth_failed', 'merchant_error',
        'processing_error', 'three_ds_failed', 'unknown',
      ] as const
      for (const c of categories) {
        expect(SELLER_SCRIPTS[c]).toBeTruthy()
        expect(SELLER_SCRIPTS[c].title).toBeTruthy()
        expect(SELLER_SCRIPTS[c].whatToSay.length).toBeGreaterThan(0)
        expect(SELLER_SCRIPTS[c].whatsappTemplate).toBeTypeOf('function')
      }
    })

    it('every retryPolicy has a label', () => {
      const policies = [
        'no_retry', 'no_auto_retry', 'user_retry_allowed', 'user_retry_later',
        'retry_with_limit_4x_16d', 'retry_next_day_4x_16d',
        'retry_after_few_seconds', 'retry_after_1h', 'retry_after_5m',
        'retry_after_72h', 'retry_after_30d',
      ] as const
      for (const p of policies) {
        expect(RETRY_POLICY_LABELS[p]).toBeTruthy()
      }
    })
  })

  describe('precedence order', () => {
    it('prefers provider code over return code', () => {
      const result = classifyDecline({
        brand: 'Visa',
        providerReturnCode: '51',
        providerReturnMessage: 'SALDO/LIMITE INSUFICIENTE',
        returnCode: '91',
        returnMessage: 'EMISSOR FORA DO AR',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.source).toBe('provider_return_code')
    })

    it('falls to return code when provider code does not match brand', () => {
      const result = classifyDecline({
        brand: 'Visa',
        providerReturnCode: 'ZZZZZ',
        returnCode: '51',
        returnMessage: 'SALDO/LIMITE INSUFICIENTE',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.source).toBe('return_code')
    })

    it('falls to generic return code rules when brand misses both', () => {
      const result = classifyDecline({
        brand: 'UnknownBrand',
        providerReturnCode: '51',
        returnCode: '70',
        returnMessage: 'LIMITE EXCEDIDO',
      })
      expect(result.category).toBe('insufficient_funds')
      expect(result.source).toBe('return_code')
      expect(result.confidence).toBe('medium')
    })
  })
})
