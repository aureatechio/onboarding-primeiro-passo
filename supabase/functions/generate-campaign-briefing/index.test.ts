import { assertEquals } from 'jsr:@std/assert'
import {
  extractJsonObject,
  handleRequest,
  isValidHttpUrl,
  isValidUuid,
  normalizeProviderResponse,
} from './index.ts'

Deno.test('uuid and url validators', () => {
  assertEquals(isValidUuid('11111111-1111-1111-1111-111111111111'), true)
  assertEquals(isValidUuid('abc'), false)
  assertEquals(isValidHttpUrl('https://example.com'), true)
  assertEquals(isValidHttpUrl('ftp://example.com'), false)
})

Deno.test('extractJsonObject handles markdown wrapper', () => {
  const raw = 'texto livre\n```json\n{"briefing":{"sobre_empresa":"ok"},"insights_pecas":[]}\n```'
  const parsed = extractJsonObject(raw)
  assertEquals(typeof parsed, 'object')
})

Deno.test('normalizeProviderResponse returns canonical shape', () => {
  const normalized = normalizeProviderResponse(
    {
      compra_id: '11111111-1111-1111-1111-111111111111',
      company_name: 'A',
      company_site: 'https://example.com',
      celebrity_name: 'B',
    },
    {
      id: 'resp_1',
      model: 'sonar',
      usage: { total_tokens: 12 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              briefing: {
                sobre_empresa: 'Empresa',
                publico_alvo: 'Publico',
                sobre_celebridade: 'Celebridade',
                objetivo_campanha: 'Awareness',
                mensagem_central: 'Mensagem',
                tom_voz: 'Tom',
                pontos_prova: ['P1'],
                cta_principal: 'CTA1',
                cta_secundario: 'CTA2',
              },
              insights_pecas: [
                {
                  diferencial: 'D1',
                  formato: 'Reels',
                  plataforma: 'Instagram',
                  gancho: 'G1',
                  chamada_principal: 'C1',
                  texto_apoio: 'T1',
                  cta: 'CTA',
                  direcao_criativa: 'DIR1',
                },
                {
                  diferencial: 'D2',
                  formato: 'Post',
                  plataforma: 'Instagram',
                  gancho: 'G2',
                  chamada_principal: 'C2',
                  texto_apoio: 'T2',
                  cta: 'CTA2',
                  direcao_criativa: 'DIR2',
                },
                {
                  diferencial: 'D3',
                  formato: 'Stories',
                  plataforma: 'Instagram',
                  gancho: 'G3',
                  chamada_principal: 'C3',
                  texto_apoio: 'T3',
                  cta: 'CTA3',
                  direcao_criativa: 'DIR3',
                },
                {
                  diferencial: 'D4',
                  formato: 'Carrossel',
                  plataforma: 'Instagram',
                  gancho: 'G4',
                  chamada_principal: 'C4',
                  texto_apoio: 'T4',
                  cta: 'CTA4',
                  direcao_criativa: 'DIR4',
                },
              ],
            }),
          },
        },
      ],
      search_results: [{ title: 'Fonte', url: 'https://fonte.com', date: '2026-03-20' }],
    },
    'sonar'
  )

  assertEquals(normalized.compra_id, '11111111-1111-1111-1111-111111111111')
  assertEquals(normalized.insights_pecas.length, 4)
  assertEquals(normalized.citacoes.length, 1)
})

Deno.test('handleRequest returns INVALID_INPUT for malformed payload', async () => {
  const request = new Request('https://example.com/functions/v1/generate-campaign-briefing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compra_id: 'abc',
      company_name: 'X',
      company_site: 'invalid',
      celebrity_name: 'Y',
    }),
  })

  const response = await handleRequest(request, {
    callProvider: async () => ({ choices: [] }),
    persistBriefing: async () => {},
    resolvePersistMode: async () => 'text',
    now: () => 0,
  })
  const body = (await response.json()) as { code: string }

  assertEquals(response.status, 400)
  assertEquals(body.code, 'INVALID_INPUT')
})
