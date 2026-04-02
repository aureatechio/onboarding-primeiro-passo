process.env.OMIE_APP_KEY = 'test_omie_key'
process.env.OMIE_APP_SECRET = 'test_omie_secret'
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test_supabase_key'
process.env.WEBHOOK_SECRET = 'test_webhook_secret'
process.env.NODE_ENV = 'test'

import { validateServicoWebhookPayload } from '../../src/validators/omieServico'

const validPayload = {
  compra_id: '550e8400-e29b-41d4-a716-446655440000',
  evento: 'servico.criar',
  timestamp: '2026-01-01T00:00:00Z',
  dados: {
    celebridade: 'John Doe',
    uf: 'SP',
    cidade: 'São Paulo',
    segmento: 'Digital',
    subsegmento: 'Influencer',
    vigencia: 12,
    valor: 5000,
  },
}

describe('validateServicoWebhookPayload', () => {
  it('aceita payload válido', () => {
    const result = validateServicoWebhookPayload(validPayload)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.dados.uf).toBe('SP')
  })

  it('transforma uf para uppercase', () => {
    const result = validateServicoWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, uf: 'sp' },
    })
    expect(result.success).toBe(true)
    expect(result.data!.dados.uf).toBe('SP')
  })

  it('rejeita vigencia inválida', () => {
    const result = validateServicoWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, vigencia: 5 },
    })
    expect(result.success).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'dados.vigencia' })])
    )
  })

  it('rejeita valor negativo', () => {
    const result = validateServicoWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, valor: -100 },
    })
    expect(result.success).toBe(false)
  })

  it('rejeita uf com mais de 2 caracteres', () => {
    const result = validateServicoWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, uf: 'SPP' },
    })
    expect(result.success).toBe(false)
  })

  it('aceita campos opcionais de tributação', () => {
    const result = validateServicoWebhookPayload({
      ...validPayload,
      dados: { ...validPayload.dados, cIdTrib: '1', cCodServMun: '123' },
    })
    expect(result.success).toBe(true)
    expect(result.data!.dados.cIdTrib).toBe('1')
  })
})
