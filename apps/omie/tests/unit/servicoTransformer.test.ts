process.env.OMIE_APP_KEY = 'test_omie_key'
process.env.OMIE_APP_SECRET = 'test_omie_secret'
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test_supabase_key'
process.env.WEBHOOK_SECRET = 'test_webhook_secret'
process.env.NODE_ENV = 'test'

import { toOmieServico } from '../../src/transformers/servicoTransformer'
import type { ServicoWebhookPayload } from '../../src/validators/omieServico'

const makePayload = (
  overrides: Partial<ServicoWebhookPayload['dados']> = {}
): ServicoWebhookPayload => ({
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
    ...overrides,
  },
})

describe('toOmieServico', () => {
  it('transforma payload em formato OMIE', () => {
    const result = toOmieServico(makePayload(), 'SEQ-001')

    expect(result.intIncluir.cCodIntServ).toBe('SEQ-001')
    expect(result.cabecalho.cCodigo).toBe('SEQ-001')
    expect(result.cabecalho.nPrecoUnit).toBe(5000)
    expect(result.descricao.cDescrCompleta).toContain('John Doe')
    expect(result.descricao.cDescrCompleta).toContain('UF: SP')
    expect(result.descricao.cDescrCompleta).toContain('12 meses')
  })

  it('trunca descrição do cabeçalho para 100 caracteres', () => {
    const result = toOmieServico(
      makePayload({
        celebridade: 'A'.repeat(80),
        segmento: 'B'.repeat(30),
      }),
      'SEQ-002'
    )

    expect(result.cabecalho.cDescricao.length).toBeLessThanOrEqual(100)
    expect(result.descricao.cDescrCompleta.length).toBeGreaterThan(100)
  })

  it('usa campos opcionais de tributação quando fornecidos', () => {
    const result = toOmieServico(
      makePayload({ cIdTrib: 'TRIB1', cCodServMun: 'MUN1' }),
      'SEQ-003'
    )

    expect(result.cabecalho.cIdTrib).toBe('TRIB1')
    expect(result.cabecalho.cCodServMun).toBe('MUN1')
  })

  it('usa string vazia para campos opcionais ausentes', () => {
    const result = toOmieServico(makePayload(), 'SEQ-004')

    expect(result.cabecalho.cIdTrib).toBe('')
    expect(result.cabecalho.cCodLC116).toBe('')
    expect(result.cabecalho.nIdNBS).toBe('')
  })
})
