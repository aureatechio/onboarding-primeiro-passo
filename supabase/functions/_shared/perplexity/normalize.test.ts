import { assertEquals, assertThrows, assertInstanceOf } from 'jsr:@std/assert'
import {
  extractJsonObject,
  normalizeProviderResponse,
  NormalizeError,
  type ProviderResponse,
} from './normalize.ts'

Deno.test('extractJsonObject - valid JSON string returns parsed object', () => {
  const input = '{"key": "value", "nested": {"foo": "bar"}}'
  const result = extractJsonObject(input)

  assertEquals(result?.key, 'value')
  assertEquals(result?.nested?.foo, 'bar')
})

Deno.test('extractJsonObject - JSON with text before and after returns parsed object', () => {
  const input = 'Some text before {"name": "Test", "id": 123} and text after'
  const result = extractJsonObject(input)

  assertEquals(result?.name, 'Test')
  assertEquals(result?.id, 123)
})

Deno.test('extractJsonObject - string without JSON returns null', () => {
  const input = 'This is plain text with no JSON structure'
  const result = extractJsonObject(input)

  assertEquals(result, null)
})

Deno.test('extractJsonObject - invalid JSON returns null', () => {
  const input = '{invalid json structure}'
  const result = extractJsonObject(input)

  assertEquals(result, null)
})

Deno.test('normalizeProviderResponse - valid response with briefing and 4+ insights', () => {
  const providerResponse: ProviderResponse = {
    id: 'resp-123',
    model: 'sonar-pro',
    usage: { prompt_tokens: 100, completion_tokens: 200 },
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Tech company',
              publico_alvo: 'Tech enthusiasts',
              sobre_celebridade: 'Tech influencer',
              objetivo_campanha: 'Brand awareness',
              mensagem_central: 'Innovation',
              tom_voz: 'Professional',
              pontos_prova: ['Proven track record'],
              cta_principal: 'Learn more',
              cta_secundario: 'Subscribe',
            },
            insights_pecas: [
              {
                diferencial: 'First insight',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook 1',
                chamada_principal: 'Call 1',
                texto_apoio: 'Support text 1',
                cta: 'Click here',
                direcao_criativa: 'Direction 1',
              },
              {
                diferencial: 'Second insight',
                formato: 'Post',
                plataforma: 'Instagram',
                gancho: 'Hook 2',
                chamada_principal: 'Call 2',
                texto_apoio: 'Support text 2',
                cta: 'Shop now',
                direcao_criativa: 'Direction 2',
              },
              {
                diferencial: 'Third insight',
                formato: 'Story',
                plataforma: 'TikTok',
                gancho: 'Hook 3',
                chamada_principal: 'Call 3',
                texto_apoio: 'Support text 3',
                cta: 'Follow',
                direcao_criativa: 'Direction 3',
              },
              {
                diferencial: 'Fourth insight',
                formato: 'Reel',
                plataforma: 'LinkedIn',
                gancho: 'Hook 4',
                chamada_principal: 'Call 4',
                texto_apoio: 'Support text 4',
                cta: 'Connect',
                direcao_criativa: 'Direction 4',
              },
            ],
          }),
        },
      },
    ],
    search_results: [
      { title: 'Source 1', url: 'https://example.com', date: '2025-01-01' },
    ],
  }

  const result = normalizeProviderResponse(
    { compra_id: 'purchase-123' },
    providerResponse,
    'fallback-model',
    {
      contractVersion: 'v1.0.0',
      promptVersion: 'v2.0.0',
      strategyVersion: 'v1.5.0',
    }
  )

  assertEquals(result.compra_id, 'purchase-123')
  assertEquals(result.provider, 'perplexity')
  assertEquals(result.model, 'sonar-pro')
  assertEquals(result.contract_version, 'v1.0.0')
  assertEquals(result.prompt_version, 'v2.0.0')
  assertEquals(result.strategy_version, 'v1.5.0')
  assertEquals(result.briefing.sobre_empresa, 'Tech company')
  assertEquals(result.insights_pecas.length, 4)
  assertEquals(result.insights_pecas[0].variacao, 1)
  assertEquals(result.insights_pecas[1].variacao, 2)
  assertEquals(result.citacoes.length, 1)
  assertEquals(result.citacoes[0].title, 'Source 1')
})

Deno.test('normalizeProviderResponse - empty content throws NormalizeError', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: '',
        },
      },
    ],
  }

  assertThrows(
    () =>
      normalizeProviderResponse(
        { compra_id: 'purchase-123' },
        providerResponse,
        'fallback-model',
        {
          contractVersion: 'v1.0.0',
          promptVersion: 'v2.0.0',
          strategyVersion: 'v1.5.0',
        }
      ),
    NormalizeError,
    'Provider retornou resposta sem conteudo'
  )
})

Deno.test('normalizeProviderResponse - content without valid JSON throws NormalizeError', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: 'This is plain text without any JSON structure',
        },
      },
    ],
  }

  assertThrows(
    () =>
      normalizeProviderResponse(
        { compra_id: 'purchase-123' },
        providerResponse,
        'fallback-model',
        {
          contractVersion: 'v1.0.0',
          promptVersion: 'v2.0.0',
          strategyVersion: 'v1.5.0',
        }
      ),
    NormalizeError,
    'Nao foi possivel extrair JSON valido'
  )
})

Deno.test('normalizeProviderResponse - missing briefing object throws NormalizeError', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            insights_pecas: [
              {
                diferencial: 'Insight',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
            ],
          }),
        },
      },
    ],
  }

  assertThrows(
    () =>
      normalizeProviderResponse(
        { compra_id: 'purchase-123' },
        providerResponse,
        'fallback-model',
        {
          contractVersion: 'v1.0.0',
          promptVersion: 'v2.0.0',
          strategyVersion: 'v1.5.0',
        }
      ),
    NormalizeError,
    'estrutura minima de briefing'
  )
})

Deno.test('normalizeProviderResponse - insights_pecas with < 4 items throws NormalizeError', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Company',
              publico_alvo: 'Audience',
              sobre_celebridade: 'Celebrity',
              objetivo_campanha: 'Goal',
              mensagem_central: 'Message',
              tom_voz: 'Voice',
              pontos_prova: [],
              cta_principal: 'CTA',
              cta_secundario: 'CTA2',
            },
            insights_pecas: [
              {
                diferencial: 'Insight 1',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 2',
                formato: 'Post',
                plataforma: 'Instagram',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
            ],
          }),
        },
      },
    ],
  }

  assertThrows(
    () =>
      normalizeProviderResponse(
        { compra_id: 'purchase-123' },
        providerResponse,
        'fallback-model',
        {
          contractVersion: 'v1.0.0',
          promptVersion: 'v2.0.0',
          strategyVersion: 'v1.5.0',
        }
      ),
    NormalizeError,
    'estrutura minima de briefing'
  )
})

Deno.test('normalizeProviderResponse - citations with invalid URLs are filtered out', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Company',
              publico_alvo: 'Audience',
              sobre_celebridade: 'Celebrity',
              objetivo_campanha: 'Goal',
              mensagem_central: 'Message',
              tom_voz: 'Voice',
              pontos_prova: [],
              cta_principal: 'CTA',
              cta_secundario: 'CTA2',
            },
            insights_pecas: [
              {
                diferencial: 'Insight 1',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 2',
                formato: 'Post',
                plataforma: 'Instagram',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 3',
                formato: 'Story',
                plataforma: 'TikTok',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 4',
                formato: 'Reel',
                plataforma: 'LinkedIn',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
            ],
          }),
        },
      },
    ],
    search_results: [
      { title: 'Valid source', url: 'https://example.com', date: '2025-01-01' },
      { title: 'Invalid URL', url: 'not a url', date: '2025-01-01' },
      { title: 'No URL', url: '', date: '2025-01-01' },
      { title: 'FTP URL', url: 'ftp://example.com', date: '2025-01-01' },
    ],
  }

  const result = normalizeProviderResponse(
    { compra_id: 'purchase-123' },
    providerResponse,
    'fallback-model',
    {
      contractVersion: 'v1.0.0',
      promptVersion: 'v2.0.0',
      strategyVersion: 'v1.5.0',
    }
  )

  assertEquals(result.citacoes.length, 1)
  assertEquals(result.citacoes[0].url, 'https://example.com')
})

Deno.test('normalizeProviderResponse - missing fields in insight become empty strings', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Company',
              publico_alvo: 'Audience',
              sobre_celebridade: 'Celebrity',
              objetivo_campanha: 'Goal',
              mensagem_central: 'Message',
              tom_voz: 'Voice',
              pontos_prova: [],
              cta_principal: 'CTA',
              cta_secundario: 'CTA2',
            },
            insights_pecas: [
              {
                diferencial: 'Insight 1',
              },
              {
                formato: 'Video',
              },
              {
                plataforma: 'YouTube',
              },
              {
                gancho: 'Hook',
              },
            ],
          }),
        },
      },
    ],
  }

  const result = normalizeProviderResponse(
    { compra_id: 'purchase-123' },
    providerResponse,
    'fallback-model',
    {
      contractVersion: 'v1.0.0',
      promptVersion: 'v2.0.0',
      strategyVersion: 'v1.5.0',
    }
  )

  assertEquals(result.insights_pecas[0].diferencial, 'Insight 1')
  assertEquals(result.insights_pecas[0].formato, '')
  assertEquals(result.insights_pecas[1].formato, 'Video')
  assertEquals(result.insights_pecas[1].diferencial, '')
})

Deno.test('normalizeProviderResponse - pontos_prova filters empty strings', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Company',
              publico_alvo: 'Audience',
              sobre_celebridade: 'Celebrity',
              objetivo_campanha: 'Goal',
              mensagem_central: 'Message',
              tom_voz: 'Voice',
              pontos_prova: ['Point 1', '', '   ', 'Point 2', null, 'Point 3'],
              cta_principal: 'CTA',
              cta_secundario: 'CTA2',
            },
            insights_pecas: [
              {
                diferencial: 'Insight',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 2',
                formato: 'Post',
                plataforma: 'Instagram',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 3',
                formato: 'Story',
                plataforma: 'TikTok',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 4',
                formato: 'Reel',
                plataforma: 'LinkedIn',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
            ],
          }),
        },
      },
    ],
  }

  const result = normalizeProviderResponse(
    { compra_id: 'purchase-123' },
    providerResponse,
    'fallback-model',
    {
      contractVersion: 'v1.0.0',
      promptVersion: 'v2.0.0',
      strategyVersion: 'v1.5.0',
    }
  )

  assertEquals(result.briefing.pontos_prova.length, 3)
  assertEquals(result.briefing.pontos_prova[0], 'Point 1')
  assertEquals(result.briefing.pontos_prova[1], 'Point 2')
  assertEquals(result.briefing.pontos_prova[2], 'Point 3')
})

Deno.test('normalizeProviderResponse - uses fallbackModel when provider model is empty', () => {
  const providerResponse: ProviderResponse = {
    model: '',
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Company',
              publico_alvo: 'Audience',
              sobre_celebridade: 'Celebrity',
              objetivo_campanha: 'Goal',
              mensagem_central: 'Message',
              tom_voz: 'Voice',
              pontos_prova: [],
              cta_principal: 'CTA',
              cta_secundario: 'CTA2',
            },
            insights_pecas: [
              {
                diferencial: 'Insight',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 2',
                formato: 'Post',
                plataforma: 'Instagram',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 3',
                formato: 'Story',
                plataforma: 'TikTok',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 4',
                formato: 'Reel',
                plataforma: 'LinkedIn',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
            ],
          }),
        },
      },
    ],
  }

  const result = normalizeProviderResponse(
    { compra_id: 'purchase-123' },
    providerResponse,
    'custom-fallback-model',
    {
      contractVersion: 'v1.0.0',
      promptVersion: 'v2.0.0',
      strategyVersion: 'v1.5.0',
    }
  )

  assertEquals(result.model, 'custom-fallback-model')
})

Deno.test('normalizeProviderResponse - versions from input are propagated to output', () => {
  const providerResponse: ProviderResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            briefing: {
              sobre_empresa: 'Company',
              publico_alvo: 'Audience',
              sobre_celebridade: 'Celebrity',
              objetivo_campanha: 'Goal',
              mensagem_central: 'Message',
              tom_voz: 'Voice',
              pontos_prova: [],
              cta_principal: 'CTA',
              cta_secundario: 'CTA2',
            },
            insights_pecas: [
              {
                diferencial: 'Insight',
                formato: 'Video',
                plataforma: 'YouTube',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 2',
                formato: 'Post',
                plataforma: 'Instagram',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 3',
                formato: 'Story',
                plataforma: 'TikTok',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
              {
                diferencial: 'Insight 4',
                formato: 'Reel',
                plataforma: 'LinkedIn',
                gancho: 'Hook',
                chamada_principal: 'Call',
                texto_apoio: 'Text',
                cta: 'Click',
                direcao_criativa: 'Direction',
              },
            ],
          }),
        },
      },
    ],
  }

  const result = normalizeProviderResponse(
    { compra_id: 'purchase-123' },
    providerResponse,
    'fallback-model',
    {
      contractVersion: 'v3.5.1',
      promptVersion: 'v2.8.3',
      strategyVersion: 'v1.9.2',
    }
  )

  assertEquals(result.contract_version, 'v3.5.1')
  assertEquals(result.prompt_version, 'v2.8.3')
  assertEquals(result.strategy_version, 'v1.9.2')
})
