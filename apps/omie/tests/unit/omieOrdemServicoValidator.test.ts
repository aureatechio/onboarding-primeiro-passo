process.env.OMIE_APP_KEY = 'test_omie_key'
process.env.OMIE_APP_SECRET = 'test_omie_secret'
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test_supabase_key'
process.env.WEBHOOK_SECRET = 'test_webhook_secret'
process.env.NODE_ENV = 'test'

import { validateOsWebhookPayload } from '../../src/validators/omieOrdemServico'

const validPayload = {
  compra_id: '550e8400-e29b-41d4-a716-446655440000',
  evento: 'ordem_servico.criar',
  timestamp: '2026-01-01T00:00:00Z',
  dados: {
    cliente_omie_id: 12345,
    email: 'test@example.com',
    cidade_prestacao_servico: 'São Paulo (SP)',
    forma_pagamento: '000',
    quantidade_parcelas: 1,
    servicos_prestados: [{ nCodServico: 100 }],
  },
}

describe('validateOsWebhookPayload', () => {
  it('aceita payload válido', () => {
    const result = validateOsWebhookPayload(validPayload)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.compra_id).toBe(validPayload.compra_id)
  })

  it('rejeita compra_id inválido', () => {
    const result = validateOsWebhookPayload({ ...validPayload, compra_id: 'not-uuid' })
    expect(result.success).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'compra_id' })])
    )
  })

  it('rejeita sem servicos_prestados', () => {
    const result = validateOsWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, servicos_prestados: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejeita email inválido', () => {
    const result = validateOsWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, email: 'not-email' },
    })
    expect(result.success).toBe(false)
  })

  it('aceita campos opcionais ausentes', () => {
    const { data_previsao, nf_numero, ...requiredDados } = validPayload.dados
    const result = validateOsWebhookPayload({
      ...validPayload,
      dados: requiredDados,
    })
    expect(result.success).toBe(true)
  })

  it('aplica defaults para env_boleto, env_pix, etc', () => {
    const result = validateOsWebhookPayload(validPayload)
    expect(result.data!.dados.env_boleto).toBe('N')
    expect(result.data!.dados.env_pix).toBe('N')
  })
})
