export type ExplicitParcela = {
  nParcela: number
  nValor: number
  nPercentual: number
  dDtVenc: string
  meio_pagamento?: string
  tipo_documento?: string
  nsu?: string
}

export type CanonicalOsPayloadInput = {
  compraId: string
  clienteOmieId: number
  email: string | null
  cidadePrestacaoServico: string
  codParc: string
  osEtapa: string
  quantidadeParcelas: number
  dataVenda: string | undefined
  enviarLinkNfse: boolean
  enviarBoleto: boolean
  enviarPix?: boolean
  departamentosCodigos: string[]
  departamentoPayload: unknown[]
  numeroProposta: string
  descricaoServico: string
  serviceId: number
  codigoServicoMunicipal: string
  codigoLc116: string
  tipoTributacao: string
  retencaoIss: string
  aliquotaIss: number
  nfNumero?: string
  vendedorNome?: string
  vendedorOmieCodigo?: number
  agenciaNome?: string
  nCodProj?: number
  codigoCategoria?: string
  contaCorrenteId?: number
  metodoPagamento?: string
  paymentId?: string
  nsu?: string
  observacoes?: string
  valorTotal: number
  parcelasExplicitas?: ExplicitParcela[]
  dataCompetencia?: string
}

export type OsOperation = 'incluir' | 'alterar'

const normalizeMetodoPagamento = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const DADOS_ADIC_NF_ALIQUOTA_IRRF = 0.015
const DADOS_ADIC_NF_ALIQUOTA_TOTAL_TRIBUTOS = 0.1746

const OBSERVACOES_PATTERNS = [
  /^TID:\s*.+$/i,
  /^PIX TransactionId:\s*.+$/i,
  /^Boleto:\s*.+$/i,
]

const normalizeEscapedLineBreaks = (value: string): string =>
  value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

export const roundTo2 = (value: number): number => Math.round(value * 100) / 100

const formatCurrencyBRL = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace(/\u00a0/g, ' ')

export const normalizeDescricaoServico = (value: string): string => {
  const normalized = normalizeEscapedLineBreaks(value).trim()
  if (!normalized) return normalized
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length === 0) return ''
  return lines.join('\n')
}

export const normalizeObservacoesForOmie = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (OBSERVACOES_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return trimmed
  }
  return undefined
}

export const buildDadosAdicNfFiscal = (baseCalculo: number): string => {
  const base = Number.isFinite(baseCalculo) && baseCalculo > 0 ? baseCalculo : 0
  const irrf = roundTo2(base * DADOS_ADIC_NF_ALIQUOTA_IRRF)
  const totalTributos = roundTo2(base * DADOS_ADIC_NF_ALIQUOTA_TOTAL_TRIBUTOS)

  return [
    `IRRF = ${formatCurrencyBRL(irrf)} (1,5%)`,
    'IRRF recolhido pela agência conforme art. 718 do RIR/2018 e IN SRF 123/1992.',
    `CONFORME LEI 12.741/2012 o valor aproximado dos tributos é ${formatCurrencyBRL(totalTributos)} (17,46%), FONTE:`,
    'IBPT/empresometro.com.br (21.1.F)',
  ].join('\n')
}

/**
 * Fiscal-only: OMIE never generates/sends payment documents (PIX, boleto, link).
 * Payment is handled externally (Cielo). OMIE only records the fiscal event.
 * Parameters kept for backward compatibility but result is always fiscal-only.
 */
export const resolveEnvFlagsByMetodoPagamento = (
  _metodoPagamento?: string | null | undefined,
  _fallbackEnviarBoleto?: boolean
): { enviarBoleto: false; enviarPix: false } => {
  return { enviarBoleto: false, enviarPix: false }
}

export function resolveEnvBoletoFromSessions(
  metodos: (string | null | undefined)[]
): boolean {
  return metodos.some(
    (m) => m != null && normalizeMetodoPagamento(m).includes('boleto')
  )
}

export const buildCanonicalOsPayload = (
  input: CanonicalOsPayloadInput,
  operation: OsOperation = 'incluir',
  existingOsId?: number
) => {
  const descricaoServicoNormalizada = normalizeDescricaoServico(input.descricaoServico)
  const observacoesNormalizadas = normalizeObservacoesForOmie(input.observacoes)

  return {
    os: {
    compra_id: input.compraId,
    cliente_omie_id: input.clienteOmieId,
    email: input.email ?? undefined,
    cidade_prestacao_servico: input.cidadePrestacaoServico,
    cCodParc: input.codParc,
    cEtapa: input.osEtapa,
    quantidade_parcelas: input.quantidadeParcelas,
    data_venda: input.dataVenda,
    enviar_link_nfse: input.enviarLinkNfse,
    enviar_boleto: input.enviarBoleto,
    enviar_pix: input.enviarPix ?? undefined,
    departamentos_codigos: input.departamentosCodigos.join(','),
    departamentos: input.departamentoPayload,
    numero_proposta: input.numeroProposta,
      descricao_servico_formatada: descricaoServicoNormalizada,
    servicos_prestados: [
      {
        nCodServico: input.serviceId,
        cDescServ: descricaoServicoNormalizada,
        nQtde: 1,
        nValUnit: input.valorTotal,
        cCodServMun: input.codigoServicoMunicipal,
        cCodServLC116: input.codigoLc116,
        cTribServ: input.tipoTributacao,
        cRetemISS: input.retencaoIss,
        cCodCategItem: input.codigoCategoria ?? undefined,
        impostos: {
          nAliqISS: input.aliquotaIss,
        },
      },
    ],
    nf_numero: input.nfNumero ?? undefined,
    vendedor_nome: input.vendedorNome ?? undefined,
    vendedor_omie_codigo: input.vendedorOmieCodigo ?? undefined,
    agencia_nome: input.agenciaNome ?? undefined,
    nCodProj: input.nCodProj ?? undefined,
    cNumContrato: input.numeroProposta ?? undefined,
    codigo_categoria: input.codigoCategoria ?? undefined,
    conta_corrente_id: input.contaCorrenteId ?? undefined,
    metodo_pagamento: input.metodoPagamento ?? undefined,
    payment_id: input.paymentId ?? undefined,
    nsu: input.nsu ?? undefined,
    observacoes: observacoesNormalizadas,
    dados_adicionais_nf: buildDadosAdicNfFiscal(input.valorTotal),
    valor_total: input.valorTotal,
    data_competencia: input.dataCompetencia ?? undefined,
    os_operation: operation,
    omie_os_id: existingOsId ?? undefined,
    parcelas_explicitas: input.parcelasExplicitas ?? undefined,
    },
  }
}

export type PaidSessionForLabel = {
  metodo_pagamento: string | null
  parcelas: number | null
  split_group_id: string | null
}

const isBoletoMetodo = (metodo: string | null): boolean => {
  if (!metodo) return false
  const normalized = metodo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return normalized === 'boleto' || normalized.includes('boleto')
}

const formatSessionLabel = (metodo: string | null, parcelas: number | null): string => {
  const label = metodo?.trim() || 'Pagamento'
  const isBoletoParcelado = parcelas != null && parcelas > 1 && isBoletoMetodo(metodo)
  return isBoletoParcelado ? `${label} (${parcelas}x)` : label
}

export const buildPagamentosLabel = (
  sessions: PaidSessionForLabel[],
  fallbackFormaPagamento: string,
  fallbackParcelas: number
): string => {
  const useful = sessions.filter((s) => s.metodo_pagamento != null)
  if (useful.length === 0) {
    return fallbackParcelas > 1
      ? `${fallbackFormaPagamento} (${fallbackParcelas}x)`
      : fallbackFormaPagamento
  }

  const isSplit =
    useful.length >= 2 && useful.some((s) => s.split_group_id != null)

  if (!isSplit) {
    const first = useful[0]
    return formatSessionLabel(first.metodo_pagamento, first.parcelas)
  }

  const parts = useful.map(
    (s, i) => `${i + 1}: ${formatSessionLabel(s.metodo_pagamento, s.parcelas)}`
  )
  return `Split - ${parts.join(' | ')}`
}

export const buildObservacoesFromPayment = (
  metodo: string | null | undefined,
  paymentPayload: Record<string, unknown> | null | undefined
): string | undefined => {
  if (!paymentPayload) return undefined
  const metodoNorm = (metodo ?? '').toLowerCase().trim()

  if (['cartao', 'credit_card', 'credito'].some((m) => metodoNorm.includes(m))) {
    const tid = paymentPayload.Tid ? String(paymentPayload.Tid)
      : paymentPayload.AcquirerTransactionId ? String(paymentPayload.AcquirerTransactionId)
      : null
    const nsu = paymentPayload.Nsu ? String(paymentPayload.Nsu)
      : paymentPayload.ProofOfSale ? String(paymentPayload.ProofOfSale)
      : null
    if (tid) return nsu ? `TID: ${tid} | NSU: ${nsu}` : `TID: ${tid}`
  }

  if (metodoNorm.includes('pix')) {
    const txId = paymentPayload.TransactionId ? String(paymentPayload.TransactionId) : null
    if (txId) return `PIX TransactionId: ${txId}`
  }

  if (metodoNorm.includes('boleto')) {
    const digitable = paymentPayload.DigitableLine ? String(paymentPayload.DigitableLine) : null
    const boletoNum = paymentPayload.BoletoNumber ? String(paymentPayload.BoletoNumber) : null
    if (digitable) return `Boleto: ${digitable}`
    if (boletoNum) return `Boleto: ${boletoNum}`
  }

  return undefined
}
