import { assertEquals } from 'jsr:@std/assert'
import {
  buildDadosAdicNfFiscal,
  buildCanonicalOsPayload,
  buildObservacoesFromPayment,
  buildPagamentosLabel,
  normalizeObservacoesForOmie,
  normalizeDescricaoServico,
  resolveEnvBoletoFromSessions,
  resolveEnvFlagsByMetodoPagamento,
} from './canonical-os-payload.ts'

Deno.test('buildCanonicalOsPayload builds include payload by default', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-1',
    clienteOmieId: 10,
    email: 'financeiro@example.com',
    cidadePrestacaoServico: 'Sao Paulo (SP)',
    codParc: '003',
    osEtapa: '50',
    quantidadeParcelas: 3,
    dataVenda: '01/03/2026',
    enviarLinkNfse: true,
    enviarBoleto: true,
    departamentosCodigos: ['1.01.01'],
    departamentoPayload: [],
    numeroProposta: '123',
    descricaoServico: 'Servico Teste',
    serviceId: 987,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'N',
    aliquotaIss: 2,
    valorTotal: 1200,
  })

  assertEquals(payload.os.os_operation, 'incluir')
  assertEquals(payload.os.omie_os_id, undefined)
  assertEquals(payload.os.servicos_prestados[0].nCodServico, 987)
  assertEquals(payload.os.dados_adicionais_nf?.includes('IRRF = R$ 18,00 (1,5%)'), true)
})

Deno.test('buildCanonicalOsPayload includes cNumContrato from numeroProposta', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-contrato',
    clienteOmieId: 10,
    email: 'financeiro@example.com',
    cidadePrestacaoServico: 'Sao Paulo (SP)',
    codParc: '003',
    osEtapa: '50',
    quantidadeParcelas: 3,
    dataVenda: '01/03/2026',
    enviarLinkNfse: true,
    enviarBoleto: true,
    departamentosCodigos: ['1.01.01'],
    departamentoPayload: [],
    numeroProposta: '6182',
    descricaoServico: 'Servico Teste',
    serviceId: 987,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'N',
    aliquotaIss: 2,
    valorTotal: 1200,
  })

  assertEquals(payload.os.cNumContrato, '6182')
  assertEquals(payload.os.numero_proposta, '6182')
})

Deno.test('buildCanonicalOsPayload builds alter payload with existing os id', () => {
  const payload = buildCanonicalOsPayload(
    {
      compraId: 'compra-2',
      clienteOmieId: 11,
      email: 'financeiro@example.com',
      cidadePrestacaoServico: 'Rio de Janeiro (RJ)',
      codParc: '000',
      osEtapa: '20',
      quantidadeParcelas: 1,
      dataVenda: '02/03/2026',
      enviarLinkNfse: false,
      enviarBoleto: false,
      departamentosCodigos: [],
      departamentoPayload: [],
      numeroProposta: '456',
      descricaoServico: 'Servico Alterado',
      serviceId: 654,
      codigoServicoMunicipal: '01015',
      codigoLc116: '7.07',
      tipoTributacao: '01',
      retencaoIss: 'S',
      aliquotaIss: 3,
      codigoCategoria: '1.01.02',
      valorTotal: 900,
    },
    'alterar',
    123456
  )

  assertEquals(payload.os.os_operation, 'alterar')
  assertEquals(payload.os.omie_os_id, 123456)
  assertEquals(payload.os.servicos_prestados[0].cRetemISS, 'S')
  assertEquals(payload.os.servicos_prestados[0].cCodCategItem, '1.01.02')
})

Deno.test('normalizeDescricaoServico converts escaped new lines', () => {
  const value =
    'Proposta n. 10\\nDireito de uso: Cliente X\\nSegmento: EDUCACAO\\r\\nPagamento(s): Boleto'
  assertEquals(
    normalizeDescricaoServico(value),
    'Proposta n. 10\nDireito de uso: Cliente X\nSegmento: EDUCACAO\nPagamento(s): Boleto'
  )
})

Deno.test('buildCanonicalOsPayload applies normalized description', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-3',
    clienteOmieId: 12,
    email: 'financeiro@example.com',
    cidadePrestacaoServico: 'Vilhena (RO)',
    codParc: '001',
    osEtapa: '50',
    quantidadeParcelas: 12,
    dataVenda: '03/03/2026',
    enviarLinkNfse: true,
    enviarBoleto: true,
    departamentosCodigos: ['5200983274'],
    departamentoPayload: [],
    numeroProposta: '98765',
    descricaoServico: 'Linha 1\\nLinha 2\\nLinha 3',
    serviceId: 321,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'S',
    aliquotaIss: 5,
    valorTotal: 21000,
  })

  assertEquals(payload.os.descricao_servico_formatada, 'Linha 1\nLinha 2\nLinha 3')
  assertEquals(payload.os.servicos_prestados[0].cDescServ, 'Linha 1\nLinha 2\nLinha 3')
})

Deno.test('buildCanonicalOsPayload keeps OMIE line-break tokens in description', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-4',
    clienteOmieId: 13,
    email: 'financeiro@example.com',
    cidadePrestacaoServico: 'Campinas (SP)',
    codParc: '001',
    osEtapa: '50',
    quantidadeParcelas: 1,
    dataVenda: '04/03/2026',
    enviarLinkNfse: true,
    enviarBoleto: true,
    departamentosCodigos: [],
    departamentoPayload: [],
    numeroProposta: '5184',
    descricaoServico:
      'Proposta n. 5184||Direito de uso: COLEGIO JARDIN&apos;S - Campinas - SP - 6 meses|Segmento: EDUCACAO||Pagamento(s): Cartao de Credito',
    serviceId: 111,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'S',
    aliquotaIss: 5,
    valorTotal: 21000,
  })

  assertEquals(
    payload.os.servicos_prestados[0].cDescServ,
    'Proposta n. 5184||Direito de uso: COLEGIO JARDIN&apos;S - Campinas - SP - 6 meses|Segmento: EDUCACAO||Pagamento(s): Cartao de Credito'
  )
})

// --- buildObservacoesFromPayment ---

Deno.test('buildObservacoesFromPayment returns TID + NSU for cartao', () => {
  const result = buildObservacoesFromPayment('cartao', {
    Tid: '1027034568572415D18A',
    Nsu: '157841',
  })
  assertEquals(result, 'TID: 1027034568572415D18A | NSU: 157841')
})

Deno.test('buildObservacoesFromPayment returns TID only when Nsu absent for credit_card', () => {
  const result = buildObservacoesFromPayment('credit_card', {
    Tid: 'ABC123',
  })
  assertEquals(result, 'TID: ABC123')
})

Deno.test('buildObservacoesFromPayment returns PIX TransactionId', () => {
  const result = buildObservacoesFromPayment('pix', {
    TransactionId: 'E00600000202503091234',
  })
  assertEquals(result, 'PIX TransactionId: E00600000202503091234')
})

Deno.test('buildObservacoesFromPayment returns Boleto DigitableLine', () => {
  const result = buildObservacoesFromPayment('boleto', {
    DigitableLine: '23793.38128 60000.000003 00000.000405 1 84340000023000',
    BoletoNumber: '2025/000001-0',
  })
  assertEquals(result, 'Boleto: 23793.38128 60000.000003 00000.000405 1 84340000023000')
})

Deno.test('buildObservacoesFromPayment falls back to BoletoNumber', () => {
  const result = buildObservacoesFromPayment('boleto', {
    BoletoNumber: '2025/000001-0',
  })
  assertEquals(result, 'Boleto: 2025/000001-0')
})

Deno.test('buildObservacoesFromPayment returns undefined for unknown metodo', () => {
  const result = buildObservacoesFromPayment('transferencia', { Tid: 'X' })
  assertEquals(result, undefined)
})

Deno.test('buildObservacoesFromPayment returns undefined for null payload', () => {
  assertEquals(buildObservacoesFromPayment('cartao', null), undefined)
  assertEquals(buildObservacoesFromPayment('pix', undefined), undefined)
})

Deno.test('buildObservacoesFromPayment handles credito variant', () => {
  const result = buildObservacoesFromPayment('credito', {
    Tid: 'TID999',
    Nsu: '888',
  })
  assertEquals(result, 'TID: TID999 | NSU: 888')
})

Deno.test('buildObservacoesFromPayment falls back to AcquirerTransactionId + ProofOfSale for cartao (flat payload)', () => {
  const result = buildObservacoesFromPayment('cartao', {
    AcquirerTransactionId: '29001618055G2U0ESN7E',
    ProofOfSale: '169020',
  })
  assertEquals(result, 'TID: 29001618055G2U0ESN7E | NSU: 169020')
})

Deno.test('buildObservacoesFromPayment falls back to AcquirerTransactionId only when ProofOfSale absent', () => {
  const result = buildObservacoesFromPayment('cartao', {
    AcquirerTransactionId: '29001618055G2U0ESN7E',
  })
  assertEquals(result, 'TID: 29001618055G2U0ESN7E')
})

Deno.test('buildObservacoesFromPayment prefers Tid over AcquirerTransactionId', () => {
  const result = buildObservacoesFromPayment('cartao', {
    Tid: 'PREFERRED_TID',
    AcquirerTransactionId: 'FALLBACK_TID',
    Nsu: '100',
    ProofOfSale: '200',
  })
  assertEquals(result, 'TID: PREFERRED_TID | NSU: 100')
})

Deno.test('buildObservacoesFromPayment returns undefined for cartao with no identifiers', () => {
  const result = buildObservacoesFromPayment('cartao', {
    Status: 2,
    Amount: 100000,
  })
  assertEquals(result, undefined)
})

Deno.test('normalizeObservacoesForOmie accepts only canonical prefixes', () => {
  assertEquals(normalizeObservacoesForOmie('TID: ABC | NSU: 123'), 'TID: ABC | NSU: 123')
  assertEquals(normalizeObservacoesForOmie('PIX TransactionId: XYZ'), 'PIX TransactionId: XYZ')
  assertEquals(normalizeObservacoesForOmie('Boleto: 2379...'), 'Boleto: 2379...')
})

Deno.test('normalizeObservacoesForOmie rejects free text', () => {
  assertEquals(normalizeObservacoesForOmie('dados observacoes teste'), undefined)
  assertEquals(normalizeObservacoesForOmie('  '), undefined)
  assertEquals(normalizeObservacoesForOmie(undefined), undefined)
})

Deno.test('buildDadosAdicNfFiscal renders expected legal text and values', () => {
  const result = buildDadosAdicNfFiscal(10220)
  assertEquals(
    result,
    [
      'IRRF = R$ 153,30 (1,5%)',
      'IRRF recolhido pela agência conforme art. 718 do RIR/2018 e IN SRF 123/1992.',
      'CONFORME LEI 12.741/2012 o valor aproximado dos tributos é R$ 1.784,41 (17,46%), FONTE:',
      'IBPT/empresometro.com.br (21.1.F)',
    ].join('\n')
  )
})

Deno.test('buildDadosAdicNfFiscal falls back to zero when base is invalid', () => {
  const result = buildDadosAdicNfFiscal(Number.NaN)
  assertEquals(result.includes('R$ 0,00'), true)
})

Deno.test('resolveEnvFlagsByMetodoPagamento returns fiscal-only for pix', () => {
  const result = resolveEnvFlagsByMetodoPagamento('pix')
  assertEquals(result, { enviarBoleto: false, enviarPix: false })
})

Deno.test('resolveEnvFlagsByMetodoPagamento returns fiscal-only for boleto', () => {
  const result = resolveEnvFlagsByMetodoPagamento('boleto')
  assertEquals(result, { enviarBoleto: false, enviarPix: false })
})

Deno.test('resolveEnvFlagsByMetodoPagamento returns fiscal-only for cartao', () => {
  const result = resolveEnvFlagsByMetodoPagamento('cartao')
  assertEquals(result, { enviarBoleto: false, enviarPix: false })
})

Deno.test('resolveEnvFlagsByMetodoPagamento returns fiscal-only regardless of fallback', () => {
  const result = resolveEnvFlagsByMetodoPagamento('transferencia', true)
  assertEquals(result, { enviarBoleto: false, enviarPix: false })
})

Deno.test('resolveEnvFlagsByMetodoPagamento returns fiscal-only for undefined input', () => {
  const result = resolveEnvFlagsByMetodoPagamento(undefined)
  assertEquals(result, { enviarBoleto: false, enviarPix: false })
})

Deno.test('resolveEnvFlagsByMetodoPagamento returns fiscal-only for null input', () => {
  const result = resolveEnvFlagsByMetodoPagamento(null)
  assertEquals(result, { enviarBoleto: false, enviarPix: false })
})

// --- buildCanonicalOsPayload observacoes propagation ---

Deno.test('buildCanonicalOsPayload propagates observacoes when provided', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-obs',
    clienteOmieId: 10,
    email: 'test@example.com',
    cidadePrestacaoServico: 'Sao Paulo (SP)',
    codParc: '999',
    osEtapa: '50',
    quantidadeParcelas: 1,
    dataVenda: '09/03/2026',
    enviarLinkNfse: false,
    enviarBoleto: false,
    enviarPix: false,
    departamentosCodigos: [],
    departamentoPayload: [],
    numeroProposta: '100',
    descricaoServico: 'Servico',
    serviceId: 1,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'N',
    aliquotaIss: 2,
    valorTotal: 500,
    observacoes: 'TID: ABC123 | NSU: 999',
  })
  assertEquals(payload.os.observacoes, 'TID: ABC123 | NSU: 999')
  assertEquals(payload.os.enviar_pix, false)
})

Deno.test('buildCanonicalOsPayload drops non-canonical observacoes', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-obs-reject',
    clienteOmieId: 10,
    email: 'test@example.com',
    cidadePrestacaoServico: 'Sao Paulo (SP)',
    codParc: '999',
    osEtapa: '50',
    quantidadeParcelas: 1,
    dataVenda: '09/03/2026',
    enviarLinkNfse: true,
    enviarBoleto: false,
    departamentosCodigos: [],
    departamentoPayload: [],
    numeroProposta: '100',
    descricaoServico: 'Servico',
    serviceId: 1,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'N',
    aliquotaIss: 2,
    valorTotal: 500,
    observacoes: 'dados observacoes teste',
  })
  assertEquals(payload.os.observacoes, undefined)
})

Deno.test('buildCanonicalOsPayload omits observacoes when not provided', () => {
  const payload = buildCanonicalOsPayload({
    compraId: 'compra-no-obs',
    clienteOmieId: 10,
    email: 'test@example.com',
    cidadePrestacaoServico: 'Sao Paulo (SP)',
    codParc: '999',
    osEtapa: '50',
    quantidadeParcelas: 1,
    dataVenda: '09/03/2026',
    enviarLinkNfse: true,
    enviarBoleto: false,
    departamentosCodigos: [],
    departamentoPayload: [],
    numeroProposta: '100',
    descricaoServico: 'Servico',
    serviceId: 1,
    codigoServicoMunicipal: '63194',
    codigoLc116: '7.07',
    tipoTributacao: '01',
    retencaoIss: 'N',
    aliquotaIss: 2,
    valorTotal: 500,
  })
  assertEquals(payload.os.observacoes, undefined)
})

// --- resolveEnvBoletoFromSessions ---

Deno.test('resolveEnvBoletoFromSessions returns false for empty list', () => {
  assertEquals(resolveEnvBoletoFromSessions([]), false)
})

Deno.test('resolveEnvBoletoFromSessions returns true for single boleto', () => {
  assertEquals(resolveEnvBoletoFromSessions(['boleto']), true)
})

Deno.test('resolveEnvBoletoFromSessions returns false for single cartao', () => {
  assertEquals(resolveEnvBoletoFromSessions(['cartao']), false)
})

Deno.test('resolveEnvBoletoFromSessions returns false for single pix', () => {
  assertEquals(resolveEnvBoletoFromSessions(['pix']), false)
})

Deno.test('resolveEnvBoletoFromSessions returns true for cartao + boleto split', () => {
  assertEquals(resolveEnvBoletoFromSessions(['cartao', 'boleto']), true)
})

Deno.test('resolveEnvBoletoFromSessions returns true for pix + boleto split', () => {
  assertEquals(resolveEnvBoletoFromSessions(['pix', 'boleto']), true)
})

Deno.test('resolveEnvBoletoFromSessions returns false for cartao + pix split', () => {
  assertEquals(resolveEnvBoletoFromSessions(['cartao', 'pix']), false)
})

Deno.test('resolveEnvBoletoFromSessions ignores null entries', () => {
  assertEquals(resolveEnvBoletoFromSessions(['boleto', null]), true)
})

Deno.test('resolveEnvBoletoFromSessions returns false for all nulls', () => {
  assertEquals(resolveEnvBoletoFromSessions([null]), false)
})

// --- buildPagamentosLabel ---

Deno.test('buildPagamentosLabel falls back to formaPagamento when sessions empty', () => {
  assertEquals(buildPagamentosLabel([], 'PIX', 1), 'PIX')
})

Deno.test('buildPagamentosLabel falls back with parcelas when sessions empty', () => {
  assertEquals(buildPagamentosLabel([], 'Cartao de Credito', 12), 'Cartao de Credito (12x)')
})

Deno.test('buildPagamentosLabel returns single session PIX without parcelas', () => {
  const sessions = [{ metodo_pagamento: 'PIX', parcelas: 1, split_group_id: null }]
  assertEquals(buildPagamentosLabel(sessions, 'PIX', 1), 'PIX')
})

Deno.test('buildPagamentosLabel returns cartao without parcelas suffix (always a vista)', () => {
  const sessions = [{ metodo_pagamento: 'Cartao de Credito', parcelas: 12, split_group_id: null }]
  assertEquals(buildPagamentosLabel(sessions, 'Cartao de Credito', 12), 'Cartao de Credito')
})

Deno.test('buildPagamentosLabel returns cartao 1x without suffix', () => {
  const sessions = [{ metodo_pagamento: 'Cartao de Credito', parcelas: 1, split_group_id: null }]
  assertEquals(buildPagamentosLabel(sessions, 'Cartao de Credito', 1), 'Cartao de Credito')
})

Deno.test('buildPagamentosLabel returns single session boleto parcelado', () => {
  const sessions = [{ metodo_pagamento: 'Boleto', parcelas: 3, split_group_id: null }]
  assertEquals(buildPagamentosLabel(sessions, 'Boleto', 3), 'Boleto (3x)')
})

Deno.test('buildPagamentosLabel returns boleto 1x without suffix', () => {
  const sessions = [{ metodo_pagamento: 'Boleto', parcelas: 1, split_group_id: null }]
  assertEquals(buildPagamentosLabel(sessions, 'Boleto', 1), 'Boleto')
})

Deno.test('buildPagamentosLabel formats split pix + cartao without (Nx) for cartao', () => {
  const groupId = 'abc-123'
  const sessions = [
    { metodo_pagamento: 'PIX', parcelas: 1, split_group_id: groupId },
    { metodo_pagamento: 'Cartao de Credito', parcelas: 6, split_group_id: groupId },
  ]
  assertEquals(buildPagamentosLabel(sessions, 'PIX', 1), 'Split - 1: PIX | 2: Cartao de Credito')
})

Deno.test('buildPagamentosLabel formats split boleto parcelado + cartao: only boleto shows (Nx)', () => {
  const groupId = 'def-456'
  const sessions = [
    { metodo_pagamento: 'Boleto', parcelas: 3, split_group_id: groupId },
    { metodo_pagamento: 'Cartao de Credito', parcelas: 9, split_group_id: groupId },
  ]
  assertEquals(buildPagamentosLabel(sessions, 'Boleto', 3), 'Split - 1: Boleto (3x) | 2: Cartao de Credito')
})

Deno.test('buildPagamentosLabel formats split without parcelas', () => {
  const groupId = 'ghi-789'
  const sessions = [
    { metodo_pagamento: 'PIX', parcelas: 1, split_group_id: groupId },
    { metodo_pagamento: 'Boleto', parcelas: 1, split_group_id: groupId },
  ]
  assertEquals(buildPagamentosLabel(sessions, 'PIX', 1), 'Split - 1: PIX | 2: Boleto')
})

Deno.test('buildPagamentosLabel treats 2 sessions without split_group_id as single method', () => {
  const sessions = [
    { metodo_pagamento: 'PIX', parcelas: 1, split_group_id: null },
    { metodo_pagamento: 'Cartao de Credito', parcelas: 6, split_group_id: null },
  ]
  assertEquals(buildPagamentosLabel(sessions, 'PIX', 1), 'PIX')
})

Deno.test('buildPagamentosLabel falls back when session metodo_pagamento is null', () => {
  const sessions = [{ metodo_pagamento: null, parcelas: 1, split_group_id: null }]
  assertEquals(buildPagamentosLabel(sessions, 'Cartao de Credito', 3), 'Cartao de Credito (3x)')
})

Deno.test('buildPagamentosLabel uses Pagamento fallback for null metodo in split', () => {
  const groupId = 'jkl-000'
  const sessions = [
    { metodo_pagamento: null, parcelas: 1, split_group_id: groupId },
    { metodo_pagamento: 'PIX', parcelas: 1, split_group_id: groupId },
  ]
  assertEquals(buildPagamentosLabel(sessions, 'PIX', 1), 'PIX')
})
