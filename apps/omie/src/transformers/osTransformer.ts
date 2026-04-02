import type { OsWebhookPayload } from '../validators/omieOrdemServico.js'

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const day = result.getDay()
    if (day !== 0 && day !== 6) {
      remaining -= 1
    }
  }
  return result
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/').map(Number)
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export interface OmieOrdemServico {
  Cabecalho: {
    cCodIntOS: string
    cCodParc: string
    cEtapa: string
    dDtPrevisao: string
    nCodCli: number
    nQtdeParc: number
  }
  Departamentos: unknown[]
  Email: {
    cEnvBoleto: string
    cEnvLink: string
    cEnvPix: string
    cEnviarPara: string
    cEnvViaUnica: string
  }
  InformacoesAdicionais: {
    cCidPrestServ: string
    cCodCateg: string
    cDadosAdicNF: string
    nCodCC: number
  }
  ServicosPrestados: Array<{
    nCodServico: number
    nValUnit?: number
    cDescServ?: string
  }>
}

export function toOmieOrdemServico(payload: OsWebhookPayload): OmieOrdemServico {
  const { compra_id, dados } = payload

  const baseDate = dados.data_previsao ? parseDate(dados.data_previsao) : null
  const previsao = formatDate(addBusinessDays(baseDate ?? new Date(), 2))

  return {
    Cabecalho: {
      cCodIntOS: compra_id,
      cCodParc: dados.forma_pagamento,
      cEtapa: '50',
      dDtPrevisao: previsao,
      nCodCli: dados.cliente_omie_id,
      nQtdeParc: dados.quantidade_parcelas,
    },
    Departamentos: [],
    Email: {
      cEnvBoleto: dados.env_boleto,
      cEnvLink: dados.env_link,
      cEnvPix: dados.env_pix,
      cEnviarPara: dados.email,
      cEnvViaUnica: dados.env_via_unica,
    },
    InformacoesAdicionais: {
      cCidPrestServ: dados.cidade_prestacao_servico,
      cCodCateg: '1.01.02',
      cDadosAdicNF: ' ',
      nCodCC: 5191114476,
    },
    ServicosPrestados: dados.servicos_prestados.map((s) => ({
      nCodServico: s.nCodServico,
      ...(s.nValUnit !== undefined ? { nValUnit: s.nValUnit } : {}),
      ...(s.cDescServ ? { cDescServ: s.cDescServ } : {}),
    })),
  }
}
