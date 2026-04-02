export type LegacyFixCase = 'A' | 'B' | 'C'

export type CompraSnapshot = {
  id: string
  valor_total: number
  numero_parcelas: number
  forma_pagamento?: string | null
  checkout_metodo_pagamento?: string | null
  mgs_condicao_pagamento?: string | null
}

export type OmieContaReceber = Record<string, unknown>

export type ClassifiedTitles = {
  caseType: LegacyFixCase
  totalCount: number
  receivedCount: number
  openCount: number
  firstDueDate?: string
  firstReceivedDate?: string
  totalReceived: number
}

export type SplitTitles = {
  received: OmieContaReceber[]
  open: OmieContaReceber[]
}

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const normalizeMetodo = (value: unknown): string =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.replace(/\./g, '').replace(',', '.')
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const toDateParts = (value: unknown): [number, number, number] | null => {
  const raw = normalizeText(value)
  if (!raw) return null

  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (dmy) return [Number(dmy[3]), Number(dmy[2]), Number(dmy[1])]

  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return [Number(ymd[1]), Number(ymd[2]), Number(ymd[3])]

  return null
}

const compareDateStrings = (a: unknown, b: unknown): number => {
  const da = toDateParts(a)
  const db = toDateParts(b)
  if (!da && !db) return 0
  if (!da) return 1
  if (!db) return -1
  const [ya, ma, daDay] = da
  const [yb, mb, dbDay] = db
  if (ya !== yb) return ya - yb
  if (ma !== mb) return ma - mb
  return daDay - dbDay
}

const getDateField = (item: OmieContaReceber, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = item[key]
    const text = normalizeText(value)
    if (text) return text
  }
  return undefined
}

export const isCreditoParceladoEligible = (compra: CompraSnapshot): boolean => {
  if (!compra?.id) return false
  if (!Number.isFinite(compra.valor_total) || compra.valor_total <= 0) return false
  if (!Number.isInteger(compra.numero_parcelas) || compra.numero_parcelas <= 1) return false

  const metodoJoined = [
    normalizeMetodo(compra.forma_pagamento),
    normalizeMetodo(compra.checkout_metodo_pagamento),
    normalizeMetodo(compra.mgs_condicao_pagamento),
  ].join(' ')

  // Escopo fechado com Financeiro: somente cartao de credito.
  const isCredito =
    metodoJoined.includes('cartao de credito') ||
    metodoJoined.includes('cartao credito') ||
    metodoJoined.includes('credito') ||
    metodoJoined.includes('credit_card')

  return isCredito
}

export const extractOsBoundTitles = (
  items: OmieContaReceber[],
  omieOsId?: number,
  compraId?: string
): OmieContaReceber[] => {
  if ((!Number.isFinite(omieOsId) || !omieOsId) && !compraId) return []

  return items.filter((item) => {
    const nCodOs =
      toNumber(item.nCodOS) ??
      toNumber(item.nCodOs) ??
      toNumber(item.codigo_os) ??
      toNumber(item.n_cod_os)
    if (Number.isFinite(omieOsId) && omieOsId && nCodOs === omieOsId) return true

    const codIntOs = normalizeText(
      item.cCodIntOS ?? item.codigo_os_integracao ?? item.codigo_integracao_os
    )
    if (compraId && codIntOs === compraId) return true

    const codLancIntegracao = normalizeText(item.codigo_lancamento_integracao)
    if (compraId && codLancIntegracao.includes(compraId)) return true

    return false
  })
}

export const classifyLegacyTitles = (items: OmieContaReceber[]): ClassifiedTitles => {
  if (!items.length) {
    return {
      caseType: 'A',
      totalCount: 0,
      receivedCount: 0,
      openCount: 0,
      totalReceived: 0,
    }
  }

  const received = items.filter((item) => {
    const status = normalizeMetodo(item.status_titulo ?? item.status ?? item.cStatus)
    if (['recebido', 'pago', 'liquidado', 'baixado'].some((key) => status.includes(key))) {
      return true
    }
    const liquidado = normalizeMetodo(item.liquidado)
    if (liquidado === 's') return true
    const valorBaixado = toNumber(item.valor_baixado ?? item.valor_recebido)
    return (valorBaixado ?? 0) > 0
  })

  const open = items.filter((item) => !received.includes(item))

  const firstDueDate = [...items]
    .sort((a, b) =>
      compareDateStrings(
        getDateField(a, ['data_vencimento', 'dVencReal', 'dDtVenc']),
        getDateField(b, ['data_vencimento', 'dVencReal', 'dDtVenc'])
      )
    )
    .map((item) => getDateField(item, ['data_vencimento', 'dVencReal', 'dDtVenc']))
    .find(Boolean)

  const firstReceivedDate = [...received]
    .sort((a, b) =>
      compareDateStrings(
        getDateField(a, ['data_baixa', 'data_recebimento', 'dDtPagto', 'dDtBaixa']),
        getDateField(b, ['data_baixa', 'data_recebimento', 'dDtPagto', 'dDtBaixa'])
      )
    )
    .map((item) => getDateField(item, ['data_baixa', 'data_recebimento', 'dDtPagto', 'dDtBaixa']))
    .find(Boolean)

  const totalReceived = received.reduce((acc, item) => {
    const amount =
      toNumber(item.valor_baixado ?? item.valor_recebido ?? item.valor_documento ?? item.valor)
    return acc + (amount ?? 0)
  }, 0)

  const caseType: LegacyFixCase =
    received.length === 0 ? 'A' : open.length === 0 ? 'C' : 'B'

  return {
    caseType,
    totalCount: items.length,
    receivedCount: received.length,
    openCount: open.length,
    firstDueDate,
    firstReceivedDate,
    totalReceived,
  }
}

export const splitLegacyTitles = (items: OmieContaReceber[]): SplitTitles => {
  const received = items.filter((item) => {
    const status = normalizeMetodo(item.status_titulo ?? item.status ?? item.cStatus)
    if (['recebido', 'pago', 'liquidado', 'baixado'].some((key) => status.includes(key))) {
      return true
    }
    const liquidado = normalizeMetodo(item.liquidado)
    if (liquidado === 's') return true
    const valorBaixado = toNumber(item.valor_baixado ?? item.valor_recebido)
    return (valorBaixado ?? 0) > 0
  })

  return {
    received,
    open: items.filter((item) => !received.includes(item)),
  }
}

export const buildConsolidatedIntegrationCode = (compraId: string): string =>
  `fix-cr-${compraId}`.slice(0, 60)

export const buildConsolidatedContaPayload = (args: {
  compra: CompraSnapshot
  firstTitle: OmieContaReceber
  firstDueDate?: string
}): Record<string, unknown> => {
  const { compra, firstTitle, firstDueDate } = args

  const codigoCliente =
    toNumber(firstTitle.codigo_cliente_fornecedor ?? firstTitle.codigo_cliente) ?? 0
  const codigoCategoria = normalizeText(
    firstTitle.codigo_categoria ?? firstTitle.cCodCateg ?? firstTitle.categoria
  )
  const idContaCorrente =
    toNumber(firstTitle.id_conta_corrente ?? firstTitle.codigo_conta_corrente ?? firstTitle.nCodCC) ??
    undefined
  const dataVencimento =
    firstDueDate ??
    getDateField(firstTitle, ['data_vencimento', 'dVencReal', 'dDtVenc']) ??
    getDateField(firstTitle, ['data_previsao', 'dDtPrevisao']) ??
    ''
  const numeroDocumento = normalizeText(
    firstTitle.numero_documento ?? firstTitle.numero_pedido ?? firstTitle.numero_parcela
  )
  const numeroParcela = '001/001'
  const codigoVendedor =
    toNumber(firstTitle.codigo_vendedor ?? firstTitle.nCodVend ?? firstTitle.vendedor) ?? undefined
  const codigoProjeto =
    toNumber(firstTitle.codigo_projeto ?? firstTitle.nCodProj ?? firstTitle.projeto) ?? undefined

  return {
    codigo_lancamento_integracao: buildConsolidatedIntegrationCode(compra.id),
    codigo_cliente_fornecedor: codigoCliente,
    data_vencimento: dataVencimento,
    valor_documento: compra.valor_total,
    ...(codigoCategoria ? { codigo_categoria: codigoCategoria } : {}),
    ...(dataVencimento ? { data_previsao: dataVencimento } : {}),
    ...(idContaCorrente ? { id_conta_corrente: idContaCorrente } : {}),
    ...(numeroDocumento ? { numero_documento: numeroDocumento } : {}),
    numero_parcela: numeroParcela,
    ...(codigoVendedor ? { codigo_vendedor: codigoVendedor } : {}),
    ...(codigoProjeto ? { codigo_projeto: codigoProjeto } : {}),
    observacao:
      '[AUREA][FIX_LEGADO_CARTAO] Consolidacao automatica de titulos parcelados indevidos.',
  }
}

export const buildExcluirContaKey = (item: OmieContaReceber): Record<string, unknown> | null => {
  const chaveLancamento =
    toNumber(item.codigo_lancamento_omie ?? item.chave_lancamento ?? item.codigo_lancamento)
  const codigoIntegracao = normalizeText(item.codigo_lancamento_integracao)

  if (!chaveLancamento && !codigoIntegracao) return null
  return {
    ...(chaveLancamento ? { chave_lancamento: chaveLancamento } : {}),
    ...(codigoIntegracao ? { codigo_lancamento_integracao: codigoIntegracao } : {}),
  }
}

export const buildDesconciliarRequest = (item: OmieContaReceber): Record<string, unknown> | null => {
  const codigoBaixa = toNumber(item.codigo_baixa ?? item.nCodBaixa)
  const codigoBaixaIntegracao = normalizeText(item.codigo_baixa_integracao ?? item.cCodIntBaixa)
  if (!codigoBaixa && !codigoBaixaIntegracao) return null
  return {
    ...(codigoBaixa ? { codigo_baixa: codigoBaixa } : {}),
    ...(codigoBaixaIntegracao ? { codigo_baixa_integracao: codigoBaixaIntegracao } : {}),
  }
}
