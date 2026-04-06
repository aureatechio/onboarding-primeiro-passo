import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import {
  buildDiscoverUserPrompt,
  buildDiscoverPayload,
  normalizeDiscoverResponse,
  DISCOVER_CONTRACT_VERSION,
  DISCOVER_PROMPT_VERSION,
  DISCOVER_STRATEGY_VERSION,
  type DiscoverInput,
  type DiscoverProviderConfig,
} from './discover.ts'

Deno.test('buildDiscoverUserPrompt includes company name in prompt', () => {
  const input: DiscoverInput = {
    company_name: 'Acelerai Tech',
  }

  const prompt = buildDiscoverUserPrompt(input)

  assertStringIncludes(prompt, 'Acelerai Tech')
})

Deno.test('buildDiscoverUserPrompt includes site hint when provided', () => {
  const input: DiscoverInput = {
    company_name: 'Acelerai Tech',
    company_site: 'https://acelerai.com.br',
  }

  const prompt = buildDiscoverUserPrompt(input)

  assertStringIncludes(prompt, 'Known site hint: https://acelerai.com.br')
})

Deno.test('buildDiscoverUserPrompt omits hint when company_site is null', () => {
  const input: DiscoverInput = {
    company_name: 'Acelerai Tech',
    company_site: null,
  }

  const prompt = buildDiscoverUserPrompt(input)

  assertEquals(prompt.includes('Known site hint'), false)
})

Deno.test('buildDiscoverPayload returns correct payload structure', () => {
  const input: DiscoverInput = {
    company_name: 'Acelerai Tech',
    company_site: 'https://acelerai.com.br',
  }

  const config: DiscoverProviderConfig = {
    model: 'sonar-pro',
    temperature: 0.1,
    top_p: 0.9,
    search_mode: 'web',
    search_recency_filter: 'year',
  }

  const payload = buildDiscoverPayload(input, config)

  assertEquals(payload.model, 'sonar-pro')
  assertEquals(Array.isArray(payload.messages), true)
  assertEquals(payload.messages.length, 2)

  const messages = payload.messages as Array<{ role: string; content: string }>
  assertEquals(messages[0].role, 'system')
  assertEquals(messages[1].role, 'user')
  assertEquals(payload.search_mode, 'web')
  assertEquals(payload.search_recency_filter, 'year')
  assertEquals(payload.temperature, 0.1)
  assertEquals(payload.top_p, 0.9)
})

Deno.test('buildDiscoverPayload uses default values when config has nulls', () => {
  const input: DiscoverInput = {
    company_name: 'Test Company',
  }

  const config: DiscoverProviderConfig = {
    model: 'sonar',
  }

  const payload = buildDiscoverPayload(input, config)

  assertEquals(payload.search_mode, 'web')
  assertEquals(payload.search_recency_filter, 'year')
  assertEquals(payload.temperature, 0.1)
  assertEquals(payload.top_p, 0.9)
})

Deno.test('normalizeDiscoverResponse response with all 4 profiles = confidence high', () => {
  const raw = JSON.stringify({
    company_site: 'https://company.com.br',
    instagram: 'https://instagram.com/company',
    linkedin: 'https://linkedin.com/company/company',
    facebook: 'https://facebook.com/company',
    other_sources: [],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.confidence, 'high')
  assertEquals(result.company_site, 'https://company.com.br')
  assertEquals(result.instagram, 'https://instagram.com/company')
  assertEquals(result.linkedin, 'https://linkedin.com/company/company')
  assertEquals(result.facebook, 'https://facebook.com/company')
})

Deno.test('normalizeDiscoverResponse response with 1 profile = confidence medium', () => {
  const raw = JSON.stringify({
    company_site: 'https://company.com.br',
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.confidence, 'medium')
  assertEquals(result.company_site, 'https://company.com.br')
  assertEquals(result.instagram, null)
  assertEquals(result.linkedin, null)
  assertEquals(result.facebook, null)
})

Deno.test('normalizeDiscoverResponse with 3 profiles = confidence high', () => {
  const raw = JSON.stringify({
    company_site: 'https://company.com.br',
    instagram: 'https://instagram.com/company',
    linkedin: 'https://linkedin.com/company/company',
    facebook: null,
    other_sources: [],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.confidence, 'high')
})

Deno.test('normalizeDiscoverResponse empty/invalid response = confidence low', () => {
  const raw = JSON.stringify({
    company_site: null,
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.confidence, 'low')
  assertEquals(result.company_site, null)
  assertEquals(result.instagram, null)
  assertEquals(result.linkedin, null)
  assertEquals(result.facebook, null)
})

Deno.test('normalizeDiscoverResponse invalid URLs are discarded', () => {
  const raw = JSON.stringify({
    company_site: 'not-a-valid-url',
    instagram: 'ftp://invalid.com',
    linkedin: '',
    facebook: null,
    other_sources: [],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.company_site, null)
  assertEquals(result.instagram, null)
  assertEquals(result.linkedin, null)
  assertEquals(result.facebook, null)
})

Deno.test('normalizeDiscoverResponse other_sources with invalid type defaults to other', () => {
  const raw = JSON.stringify({
    company_site: 'https://company.com.br',
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [
      {
        title: 'News Site',
        url: 'https://news.company.com',
        type: 'invalid_type',
      },
      {
        title: 'Blog',
        url: 'https://blog.company.com',
        type: 'site',
      },
    ],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.other_sources.length, 2)
  assertEquals(result.other_sources[0].type, 'other')
  assertEquals(result.other_sources[1].type, 'site')
})

Deno.test('normalizeDiscoverResponse other_sources without URL are skipped', () => {
  const raw = JSON.stringify({
    company_site: 'https://company.com.br',
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [
      {
        title: 'No URL source',
        type: 'other',
      },
      {
        title: 'Valid source',
        url: 'https://example.com',
        type: 'other',
      },
      {
        title: 'Empty URL',
        url: '',
        type: 'other',
      },
    ],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.other_sources.length, 1)
  assertEquals(result.other_sources[0].url, 'https://example.com')
})

Deno.test('normalizeDiscoverResponse version constants are present in result', () => {
  const raw = JSON.stringify({
    company_site: 'https://company.com.br',
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.contract_version, DISCOVER_CONTRACT_VERSION)
  assertEquals(result.prompt_version, DISCOVER_PROMPT_VERSION)
  assertEquals(result.strategy_version, DISCOVER_STRATEGY_VERSION)
})

Deno.test('normalizeDiscoverResponse other_sources missing title uses URL as fallback', () => {
  const raw = JSON.stringify({
    company_site: null,
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [
      {
        url: 'https://example.com',
        type: 'other',
      },
    ],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.other_sources.length, 1)
  assertEquals(result.other_sources[0].title, 'https://example.com')
  assertEquals(result.other_sources[0].url, 'https://example.com')
})

Deno.test('normalizeDiscoverResponse all valid source types are accepted', () => {
  const raw = JSON.stringify({
    company_site: null,
    instagram: null,
    linkedin: null,
    facebook: null,
    other_sources: [
      { title: 'Site', url: 'https://example1.com', type: 'site' },
      { title: 'Instagram', url: 'https://example2.com', type: 'instagram' },
      { title: 'LinkedIn', url: 'https://example3.com', type: 'linkedin' },
      { title: 'Facebook', url: 'https://example4.com', type: 'facebook' },
      { title: 'Other', url: 'https://example5.com', type: 'other' },
    ],
  })

  const result = normalizeDiscoverResponse(raw)

  assertEquals(result.other_sources.length, 5)
  assertEquals(result.other_sources[0].type, 'site')
  assertEquals(result.other_sources[1].type, 'instagram')
  assertEquals(result.other_sources[2].type, 'linkedin')
  assertEquals(result.other_sources[3].type, 'facebook')
  assertEquals(result.other_sources[4].type, 'other')
})
