import type { ServicoWebhookPayload } from '../validators/omieServico.js'

const MAX_CDESCRICAO_LENGTH = 100

function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength)
}

export interface OmieServico {
  intIncluir: { cCodIntServ: string }
  descricao: { cDescrCompleta: string }
  cabecalho: {
    cDescricao: string
    cCodigo: string
    cIdTrib: string
    cCodServMun: string
    cCodLC116: string
    nIdNBS: string
    nPrecoUnit: number
    cCodCateg: string
  }
}

export function toOmieServico(
  payload: ServicoWebhookPayload,
  sequence: string
): OmieServico {
  const { dados } = payload

  const descricaoCompleta = `${dados.celebridade} - UF: ${dados.uf} - Cidade: ${dados.cidade} - Seg: ${dados.segmento} - SubSeg: ${dados.subsegmento} - Vigencia: ${dados.vigencia} meses`
  const descricaoCabecalho = truncateText(descricaoCompleta, MAX_CDESCRICAO_LENGTH)

  return {
    intIncluir: { cCodIntServ: sequence },
    descricao: { cDescrCompleta: descricaoCompleta },
    cabecalho: {
      cDescricao: descricaoCabecalho,
      cCodigo: sequence,
      cIdTrib: dados.cIdTrib ?? '',
      cCodServMun: dados.cCodServMun ?? '',
      cCodLC116: dados.cCodLC116 ?? '',
      nIdNBS: dados.nIdNBS ?? '',
      nPrecoUnit: dados.valor,
      cCodCateg: dados.cCodCateg ?? '',
    },
  }
}
