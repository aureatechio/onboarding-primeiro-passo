import { describe, expect, it } from 'vitest'
import {
  getPaymentMethodLabel,
  getMethodBadgeClass,
  truncateText,
  formatVigencia,
} from '../../src/lib/payment-method'
import type { TransactionPipeline } from '../../src/hooks/useTransaction'

function makeTx(overrides: Partial<TransactionPipeline> = {}): TransactionPipeline {
  return {
    compra_id: 'test-id',
    cliente_id: null,
    compra_descricao: null,
    valor_total: 0,
    compra_numero_parcelas: null,
    compra_checkout_status: 'pending',
    vendaaprovada: null,
    compra_created_at: '',
    clicksign_envelope_id: null,
    clicksign_document_key: null,
    clicksign_status: null,
    clicksign_signed_document_url: null,
    clicksign_error_message: null,
    clicksign_signers: null,
    clicksign_metadata: null,
    data_envio_assinatura: null,
    data_assinatura_concluida: null,
    statusproducao: null,
    checkout_url: null,
    checkout_expires_at: null,
    vendedor_nome: null,
    vendedor_email: null,
    tipo_venda: null,
    segmento_nome: null,
    subsegmento_nome: null,
    celebridade_nome: null,
    session_id: null,
    checkout_session_status: null,
    metodo_pagamento: null,
    valor_centavos: null,
    parcelas: null,
    cliente_nome: null,
    cliente_documento: null,
    cliente_email: null,
    cliente_telefone: null,
    checkout_created_at: null,
    checkout_completed_at: null,
    payment_id: null,
    payment_status: null,
    payment_nsu: null,
    numero_proposta: null,
    nota_fiscal_id: null,
    nfe_status: null,
    nfe_numero: null,
    nfe_emitida_em: null,
    nfe_pdf_url: null,
    nfe_xml_url: null,
    nfe_created_at: null,
    nfe_updated_at: null,
    nfe_emissor: null,
    nf_omie_os_id: null,
    nfe_erro_mensagem: null,
    omie_sync_id: null,
    omie_status: null,
    omie_cliente_id: null,
    omie_servico_id: null,
    omie_os_id: null,
    omie_attempts: null,
    omie_last_error: null,
    omie_synced_at: null,
    omie_created_at: null,
    omie_cliente_payload: null,
    omie_servico_payload: null,
    omie_os_payload: null,
    pipeline_status: 'in_progress',
    current_stage: 'checkout',
    last_activity_at: null,
    lead_id: null,
    split_group_id: null,
    split_sessoes_pagas: null,
    split_total_sessoes: null,
    split_type: null,
    vigencia_meses: null,
    checkout_recorrencia_enabled: null,
    valor_parcela_recorrente_centavos: null,
    recorrencia_total_parcelas: null,
    ...overrides,
  }
}

describe('getPaymentMethodLabel', () => {
  it('returns Boleto parcelado when split_type is boleto_parcelado', () => {
    expect(
      getPaymentMethodLabel(makeTx({ split_group_id: 'abc', split_type: 'boleto_parcelado' }))
    ).toBe('Boleto parcelado')
  })

  it('returns 2 meios when split_type is dual_payment', () => {
    expect(
      getPaymentMethodLabel(makeTx({ split_group_id: 'abc', split_type: 'dual_payment' }))
    ).toBe('2 meios')
  })

  it('split_type takes priority over recorrente', () => {
    expect(
      getPaymentMethodLabel(
        makeTx({
          split_group_id: 'abc',
          split_type: 'dual_payment',
          checkout_recorrencia_enabled: true,
        })
      )
    ).toBe('2 meios')
  })

  it('returns Recorrente for cartao_recorrente method', () => {
    expect(
      getPaymentMethodLabel(makeTx({ metodo_pagamento: 'cartao_recorrente' }))
    ).toBe('Recorrente')
  })

  it('returns Recorrente when checkout_recorrencia_enabled is true', () => {
    expect(
      getPaymentMethodLabel(makeTx({ checkout_recorrencia_enabled: true }))
    ).toBe('Recorrente')
  })

  it('returns Cartão for cartao method', () => {
    expect(getPaymentMethodLabel(makeTx({ metodo_pagamento: 'cartao' }))).toBe('Cartão')
  })

  it('returns PIX for pix method', () => {
    expect(getPaymentMethodLabel(makeTx({ metodo_pagamento: 'pix' }))).toBe('PIX')
  })

  it('returns Boleto for boleto method', () => {
    expect(getPaymentMethodLabel(makeTx({ metodo_pagamento: 'boleto' }))).toBe('Boleto')
  })

  it('returns — when no method is set', () => {
    expect(getPaymentMethodLabel(makeTx())).toBe('—')
  })
})

describe('getMethodBadgeClass', () => {
  it('returns distinct classes for each label', () => {
    const labels = ['Cartão', 'PIX', 'Boleto', 'Recorrente', '2 meios', 'Boleto parcelado', '—'] as const
    const classes = labels.map((l) => getMethodBadgeClass(l))
    const unique = new Set(classes)
    expect(unique.size).toBe(labels.length)
  })

  it('returns zinc classes for unknown dash', () => {
    expect(getMethodBadgeClass('—')).toContain('zinc')
  })

  it('returns pink classes for 2 meios', () => {
    expect(getMethodBadgeClass('2 meios')).toContain('pink')
  })

  it('returns orange classes for boleto parcelado', () => {
    expect(getMethodBadgeClass('Boleto parcelado')).toContain('orange')
  })
})

describe('truncateText', () => {
  it('returns — for null', () => {
    expect(truncateText(null, 50)).toBe('—')
  })

  it('returns original text when shorter than limit', () => {
    expect(truncateText('Hello', 50)).toBe('Hello')
  })

  it('truncates text at limit with ellipsis', () => {
    const long = 'A'.repeat(60)
    const result = truncateText(long, 50)
    expect(result.length).toBe(51)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('formatVigencia', () => {
  it('returns — for null', () => {
    expect(formatVigencia(null)).toBe('—')
  })

  it('formats months', () => {
    expect(formatVigencia(3)).toBe('3 meses')
    expect(formatVigencia(12)).toBe('12 meses')
  })
})
