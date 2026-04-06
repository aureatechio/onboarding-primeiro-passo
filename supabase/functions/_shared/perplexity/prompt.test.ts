import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import {
  buildUserPrompt,
  buildPerplexityPayload,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
  type PromptBriefingInput,
  type PromptConfig,
} from './prompt.ts'

Deno.test('buildUserPrompt resolves all required placeholders', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const prompt = buildUserPrompt(input)

  assertStringIncludes(prompt, 'TechCorp')
  assertStringIncludes(prompt, 'https://techcorp.com.br')
  assertStringIncludes(prompt, 'Famoso Silva')
  assertEquals(prompt.includes('${company_name}'), false)
  assertEquals(prompt.includes('${company_site}'), false)
  assertEquals(prompt.includes('${celebrity_name}'), false)
})

Deno.test('buildUserPrompt conditional lines omitted when value empty', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
    context: {
      segment: '',
      region: null,
      campaign_goal_hint: undefined,
    },
    briefing_input: {
      mode: null,
      text: '',
    },
  }

  const prompt = buildUserPrompt(input)

  assertEquals(prompt.includes('Segmento:'), false)
  assertEquals(prompt.includes('Regiao:'), false)
  assertEquals(prompt.includes('Objetivo sugerido:'), false)
  assertEquals(prompt.includes('modo='), false)
  assertEquals(prompt.includes('Resumo do briefing'), false)
})

Deno.test('buildUserPrompt conditional lines present when value provided', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
    context: {
      segment: 'Tecnologia',
      region: 'Sao Paulo',
      campaign_goal_hint: 'conversao',
    },
    briefing_input: {
      mode: 'audio',
      text: 'Lancamento de novo produto',
    },
  }

  const prompt = buildUserPrompt(input)

  assertStringIncludes(prompt, 'Segmento: Tecnologia')
  assertStringIncludes(prompt, 'Regiao: Sao Paulo')
  assertStringIncludes(prompt, 'Objetivo sugerido: conversao')
  assertStringIncludes(prompt, 'modo=audio')
  assertStringIncludes(prompt, 'Resumo do briefing informado pelo usuario: Lancamento de novo produto')
})

Deno.test('buildUserPrompt insights_count clamped to 1-10 range', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const promptMin = buildUserPrompt(input, undefined, 0)
  assertStringIncludes(promptMin, '${insights_count}' in promptMin ? 'fail' : '1')

  const promptMax = buildUserPrompt(input, undefined, 50)
  assertStringIncludes(promptMax, '${insights_count}' in promptMax ? 'fail' : '10')

  const promptValid = buildUserPrompt(input, undefined, 5)
  assertStringIncludes(promptValid, '5')
})

Deno.test('buildUserPrompt custom template overrides default', () => {
  const customTemplate = [
    'CUSTOM TEMPLATE',
    'Empresa: ${company_name}',
    'Site: ${company_site}',
    'Celebridade: ${celebrity_name}',
    '${segment_line}',
  ].join('\n')

  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const prompt = buildUserPrompt(input, customTemplate)

  assertStringIncludes(prompt, 'CUSTOM TEMPLATE')
  assertStringIncludes(prompt, 'Empresa: TechCorp')
  assertStringIncludes(prompt, 'Site: https://techcorp.com.br')
  assertStringIncludes(prompt, 'Celebridade: Famoso Silva')
  assertEquals(prompt.includes('Formato JSON obrigatorio'), false)
})

Deno.test('buildUserPrompt removes consecutive empty lines', () => {
  const customTemplate = [
    'Line 1',
    '${segment_line}',
    '${region_line}',
    '${goal_line}',
    'Line 2',
  ].join('\n')

  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const prompt = buildUserPrompt(input, customTemplate)

  // Should not have consecutive empty lines (\\n\\n)
  const lines = prompt.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    const currentEmpty = lines[i].trim().length === 0
    const nextEmpty = lines[i + 1].trim().length === 0
    assertEquals(currentEmpty && nextEmpty, false)
  }
})

Deno.test('buildPerplexityPayload returns complete payload with messages array', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const config: PromptConfig = {
    model: 'sonar-pro',
  }

  const payload = buildPerplexityPayload(input, config)

  assertEquals(typeof payload.model, 'string')
  assertEquals(payload.model, 'sonar-pro')
  assertEquals(Array.isArray(payload.messages), true)
  assertEquals(payload.messages.length, 2)

  const messages = payload.messages as Array<{ role: string; content: string }>
  assertEquals(messages[0].role, 'system')
  assertEquals(messages[1].role, 'user')
  assertEquals(typeof messages[0].content, 'string')
  assertEquals(typeof messages[1].content, 'string')
  assertEquals(typeof payload.search_mode, 'string')
  assertEquals(typeof payload.temperature, 'number')
  assertEquals(typeof payload.top_p, 'number')
})

Deno.test('buildPerplexityPayload uses default system prompt when config has none', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const config: PromptConfig = {
    model: 'sonar-pro',
  }

  const payload = buildPerplexityPayload(input, config)
  const messages = payload.messages as Array<{ role: string; content: string }>

  assertEquals(messages[0].content, DEFAULT_SYSTEM_PROMPT)
})

Deno.test('buildPerplexityPayload uses config overrides for temperature, top_p, search settings', () => {
  const input: PromptBriefingInput = {
    compra_id: 'comp-123',
    company_name: 'TechCorp',
    company_site: 'https://techcorp.com.br',
    celebrity_name: 'Famoso Silva',
  }

  const config: PromptConfig = {
    model: 'sonar-pro',
    temperature: 0.7,
    top_p: 0.85,
    search_mode: 'academic',
    search_recency_filter: 'week',
    system_prompt: 'CUSTOM SYSTEM',
    user_prompt_template: 'CUSTOM USER ${company_name}',
  }

  const payload = buildPerplexityPayload(input, config)
  const messages = payload.messages as Array<{ role: string; content: string }>

  assertEquals(messages[0].content, 'CUSTOM SYSTEM')
  assertStringIncludes(messages[1].content, 'CUSTOM USER TechCorp')
  assertEquals(payload.temperature, 0.7)
  assertEquals(payload.top_p, 0.85)
  assertEquals(payload.search_mode, 'academic')
  assertEquals(payload.search_recency_filter, 'week')
})
