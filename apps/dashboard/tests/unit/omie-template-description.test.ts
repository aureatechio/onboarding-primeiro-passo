import { describe, expect, it } from 'vitest'
import {
  fromOmieTemplateDescription,
  toOmieTemplateDescription,
} from '../../src/lib/omie-template-description'

describe('omie-template-description', () => {
  it('converts multiline editor text to OMIE format', () => {
    const editorValue =
      "Proposta n. 5184\n\nDireito de uso: COLEGIO JARDIN'S - Campinas - SP - 6 meses\nSegmento: EDUCACAO\n\nPagamento(s): Cartao de Credito"

    expect(toOmieTemplateDescription(editorValue)).toBe(
      'Proposta n. 5184||Direito de uso: COLEGIO JARDIN&apos;S - Campinas - SP - 6 meses|Segmento: EDUCACAO||Pagamento(s): Cartao de Credito'
    )
  })

  it('converts OMIE format back to multiline editor text', () => {
    const omieValue =
      'Proposta n. 5184||Direito de uso: COLEGIO JARDIN&apos;S - Campinas - SP - 6 meses|Segmento: EDUCACAO||Pagamento(s): Cartao de Credito'

    expect(fromOmieTemplateDescription(omieValue)).toBe(
      "Proposta n. 5184\n\nDireito de uso: COLEGIO JARDIN'S - Campinas - SP - 6 meses\nSegmento: EDUCACAO\n\nPagamento(s): Cartao de Credito"
    )
  })

  it('keeps escaped CRLF and pipes normalized', () => {
    const value = 'Linha 1\r\nLinha 2\r\n\r\nLinha 3'
    const encoded = toOmieTemplateDescription(value)
    expect(encoded).toBe('Linha 1|Linha 2||Linha 3')
    expect(fromOmieTemplateDescription(encoded)).toBe('Linha 1\nLinha 2\n\nLinha 3')
  })
})
