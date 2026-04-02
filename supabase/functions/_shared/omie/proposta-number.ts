export type NumeroPropostaResolution = {
  numeroProposta: string
  warning?: string
}

type ResolveNumeroPropostaInput = {
  compraImagempropostaId: string
  imagemPropostaPk?: number | null
}

export const resolveNumeroProposta = ({
  compraImagempropostaId,
  imagemPropostaPk,
}: ResolveNumeroPropostaInput): NumeroPropostaResolution => {
  if (typeof imagemPropostaPk === 'number' && Number.isFinite(imagemPropostaPk) && imagemPropostaPk > 0) {
    return { numeroProposta: String(imagemPropostaPk) }
  }

  return {
    numeroProposta: compraImagempropostaId,
    warning:
      'NUMERO_PROPOSTA_FALLBACK_UUID: imagemProposta.id nao encontrado, usando compras.imagemproposta_id',
  }
}
