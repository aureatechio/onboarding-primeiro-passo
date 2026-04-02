import {
  buildConsolidatedContaPayload,
  buildConsolidatedIntegrationCode,
  classifyLegacyTitles,
  isCreditoParceladoEligible,
} from './contas-receber-fix.ts'

Deno.test('isCreditoParceladoEligible returns true only for cartao de credito parcelado', () => {
  const eligible = isCreditoParceladoEligible({
    id: 'compra-1',
    valor_total: 15000,
    numero_parcelas: 12,
    forma_pagamento: 'Cartao de Credito',
  })
  if (!eligible) throw new Error('expected eligible compra to be true')

  const notEligibleMetodo = isCreditoParceladoEligible({
    id: 'compra-2',
    valor_total: 15000,
    numero_parcelas: 12,
    forma_pagamento: 'pix',
  })
  if (notEligibleMetodo) throw new Error('expected pix to be false')

  const notEligibleParcela = isCreditoParceladoEligible({
    id: 'compra-3',
    valor_total: 15000,
    numero_parcelas: 1,
    forma_pagamento: 'Cartao de Credito',
  })
  if (notEligibleParcela) throw new Error('expected single parcela to be false')
})

Deno.test('classifyLegacyTitles handles A/B/C cases', () => {
  const caseA = classifyLegacyTitles([
    { status_titulo: 'A vencer', valor_documento: 1250, data_vencimento: '20/03/2026' },
    { status_titulo: 'A vencer', valor_documento: 1250, data_vencimento: '20/04/2026' },
  ])
  if (caseA.caseType !== 'A') throw new Error('expected case A')

  const caseB = classifyLegacyTitles([
    {
      status_titulo: 'Recebido',
      valor_documento: 1250,
      valor_baixado: 1250,
      data_baixa: '20/02/2026',
      data_vencimento: '20/03/2026',
    },
    { status_titulo: 'A vencer', valor_documento: 1250, data_vencimento: '20/04/2026' },
  ])
  if (caseB.caseType !== 'B') throw new Error('expected case B')
  if (caseB.firstReceivedDate !== '20/02/2026') throw new Error('expected first received date')

  const caseC = classifyLegacyTitles([
    { status_titulo: 'Recebido', valor_documento: 1000, valor_baixado: 1000 },
    { status_titulo: 'Recebido', valor_documento: 2000, valor_baixado: 2000 },
  ])
  if (caseC.caseType !== 'C') throw new Error('expected case C')
})

Deno.test('buildConsolidated payload preserves core finance fields', () => {
  const payload = buildConsolidatedContaPayload({
    compra: {
      id: '00000000-0000-0000-0000-000000000001',
      valor_total: 15000,
      numero_parcelas: 12,
    },
    firstTitle: {
      codigo_cliente_fornecedor: 10,
      codigo_categoria: '1.01.02',
      id_conta_corrente: 99,
      codigo_vendedor: 88,
      codigo_projeto: 77,
      data_vencimento: '20/03/2026',
    },
  })

  if (payload.valor_documento !== 15000) throw new Error('wrong total')
  if (payload.numero_parcela !== '001/001') throw new Error('wrong parcela format')
  if (payload.codigo_cliente_fornecedor !== 10) throw new Error('wrong customer')
  if (payload.codigo_categoria !== '1.01.02') throw new Error('wrong category')
})

Deno.test('buildConsolidatedIntegrationCode keeps <= 60 chars', () => {
  const id = '11111111-2222-3333-4444-555555555555'
  const code = buildConsolidatedIntegrationCode(id)
  if (!code.startsWith('fix-cr-')) throw new Error('missing prefix')
  if (code.length > 60) throw new Error('integration code too long')
})
