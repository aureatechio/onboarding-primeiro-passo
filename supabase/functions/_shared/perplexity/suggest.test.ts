import { assertEquals, assertStringIncludes, assertThrows } from 'jsr:@std/assert'
import {
  DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE,
  buildSuggestPayload,
  buildSuggestUserPrompt,
  normalizeSuggestResponse,
} from './suggest.ts'

Deno.test('buildSuggestUserPrompt uses default template and resolves required placeholders', () => {
  const prompt = buildSuggestUserPrompt({
    company_name: 'Empresa XPTO',
    company_site: 'https://xpto.com.br',
    celebrity_name: 'Famosa XPTO',
    segment: 'Moda',
    region: 'Sao Paulo',
    campaign_goal_hint: 'awareness',
    sources: ['https://xpto.com.br', 'https://instagram.com/xpto'],
  })

  assertStringIncludes(prompt, 'Empresa XPTO (https://xpto.com.br)')
  assertStringIncludes(prompt, '- Celebridade: Famosa XPTO')
  assertStringIncludes(prompt, '- Segmento: Moda')
  assertStringIncludes(prompt, '- Regiao: Sao Paulo')
  assertStringIncludes(prompt, '- Objetivo: awareness')
  assertStringIncludes(prompt, 'Fontes de referencia: https://xpto.com.br, https://instagram.com/xpto')
  assertEquals(prompt.includes('${company_name}'), false)
})

Deno.test('buildSuggestUserPrompt supports custom template with fallback lines', () => {
  const customTemplate = [
    'Marca=${company_name}',
    'Site=${company_site}',
    'Celebridade=${celebrity_name}',
    '${sources_line}',
  ].join('\n')

  const prompt = buildSuggestUserPrompt(
    {
      company_name: 'Empresa ABC',
      company_site: 'https://abc.com.br',
      celebrity_name: 'Celebridade ABC',
      sources: ['https://abc.com.br'],
    },
    customTemplate
  )

  assertStringIncludes(prompt, 'Marca=Empresa ABC')
  assertStringIncludes(prompt, 'Site=https://abc.com.br')
  assertStringIncludes(prompt, 'Celebridade=Celebridade ABC')
  assertStringIncludes(prompt, '- Fontes de referencia: https://abc.com.br')
})

Deno.test('buildSuggestPayload prioritizes configured prompts', () => {
  const payload = buildSuggestPayload(
    {
      company_name: 'Empresa',
      company_site: 'https://empresa.com',
      celebrity_name: 'Celebridade',
    },
    {
      model: 'sonar',
      suggest_system_prompt: 'SYSTEM CUSTOM',
      suggest_user_prompt_template: 'USER CUSTOM ${company_name}',
      search_mode: 'web',
      search_recency_filter: 'month',
      temperature: 0.6,
      top_p: 0.8,
    }
  )

  assertEquals(payload.model, 'sonar')
  assertEquals(Array.isArray(payload.messages), true)
  const messages = payload.messages as Array<{ role: string; content: string }>
  assertEquals(messages[0].content, 'SYSTEM CUSTOM')
  assertEquals(messages[1].content, 'USER CUSTOM Empresa')
})

Deno.test('normalizeSuggestResponse applies dynamic versions when provided', () => {
  const result = normalizeSuggestResponse(
    'Texto suficientemente longo para passar no guardrail. '.repeat(4),
    { prompt_version: 'v2.1.0', strategy_version: 'v2.0.0' }
  )

  assertEquals(result.prompt_version, 'v2.1.0')
  assertEquals(result.strategy_version, 'v2.0.0')
})

Deno.test('normalizeSuggestResponse rejects placeholders and short text', () => {
  assertThrows(
    () => normalizeSuggestResponse('Texto curto'),
    Error,
    'Sugestao muito curta'
  )

  const textWithPlaceholder =
    'Este texto esta longo o bastante para validar guardrail, mas contem ${placeholder} indevido.'
  assertThrows(
    () => normalizeSuggestResponse(textWithPlaceholder.repeat(2)),
    Error,
    'Sugestao contem placeholders nao resolvidos'
  )
})

Deno.test('default suggest template remains stable', () => {
  assertStringIncludes(DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE, '${company_name}')
  assertStringIncludes(DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE, '${company_site}')
  assertStringIncludes(DEFAULT_SUGGEST_USER_PROMPT_TEMPLATE, '${celebrity_name}')
})
