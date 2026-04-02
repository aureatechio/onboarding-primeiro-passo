process.env.OMIE_APP_KEY = 'test_omie_key'
process.env.OMIE_APP_SECRET = 'test_omie_secret'
process.env.OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_KEY = 'test_supabase_key'
process.env.WEBHOOK_SECRET = 'test_webhook_secret'
process.env.NODE_ENV = 'test'

import { toOmieOrdemServico } from '../../src/transformers/osTransformer'
import type { OsWebhookPayload } from '../../src/validators/omieOrdemServico'

const makePayload = (overrides: Partial<OsWebhookPayload['dados']> = {}): OsWebhookPayload => ({
  compra_id: '550e8400-e29b-41d4-a716-446655440000',
  evento: 'ordem_servico.criar',
  timestamp: '2026-01-01T00:00:00Z',
  dados: {
    cliente_omie_id: 12345,
    email: 'test@example.com',
    cidade_prestacao_servico: 'São Paulo (SP)',
    forma_pagamento: '000',
    quantidade_parcelas: 1,
    env_boleto: 'N',
    env_pix: 'N',
    env_link: 'N',
    env_via_unica: 'N',
    servicos_prestados: [{ nCodServico: 100, nValUnit: 5000 }],
    ...overrides,
  },
})

describe('toOmieOrdemServico', () => {
  it('transforma payload em formato OMIE', () => {
    const result = toOmieOrdemServico(makePayload())

    expect(result.Cabecalho.cCodIntOS).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(result.Cabecalho.nCodCli).toBe(12345)
    expect(result.Cabecalho.cCodParc).toBe('000')
    expect(result.Cabecalho.cEtapa).toBe('50')
    expect(result.Email.cEnviarPara).toBe('test@example.com')
    expect(result.InformacoesAdicionais.cCidPrestServ).toBe('São Paulo (SP)')
    expect(result.ServicosPrestados).toHaveLength(1)
    expect(result.ServicosPrestados[0].nCodServico).toBe(100)
  })

  it('envia cDadosAdicNF como espaco em branco', () => {
    const result = toOmieOrdemServico(makePayload())
    expect(result.InformacoesAdicionais.cDadosAdicNF).toBe(' ')
  })

  it('envia cDadosAdicNF como espaco em branco mesmo com nf_numero presente', () => {
    const result = toOmieOrdemServico(makePayload({ nf_numero: '12345' }))
    expect(result.InformacoesAdicionais.cDadosAdicNF).toBe(' ')
  })

  it('calcula previsão com +2 dias úteis', () => {
    const result = toOmieOrdemServico(makePayload())
    expect(result.Cabecalho.dDtPrevisao).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('omite nValUnit e cDescServ opcionais do serviço', () => {
    const result = toOmieOrdemServico(makePayload({
      servicos_prestados: [{ nCodServico: 200 }],
    }))
    expect(result.ServicosPrestados[0]).toEqual({ nCodServico: 200 })
  })
})
