import { extractJsonObject } from './normalize.ts'

export const DISCOVER_CONTRACT_VERSION = 'v1.0.0'
export const DISCOVER_PROMPT_VERSION = 'v1.0.0'
export const DISCOVER_STRATEGY_VERSION = 'v1.0.0'

export interface DiscoverInput {
  company_name: string
  company_site?: string | null
}

export interface DiscoverSource {
  title: string
  url: string
  type: 'site' | 'instagram' | 'linkedin' | 'facebook' | 'other'
}

export interface DiscoverResult {
  company_site: string | null
  instagram: string | null
  linkedin: string | null
  facebook: string | null
  other_sources: DiscoverSource[]
  confidence: 'high' | 'medium' | 'low'
  contract_version: string
  prompt_version: string
  strategy_version: string
}

export interface DiscoverProviderConfig {
  model: string
  api_base_url?: string | null
  api_key?: string | null
  timeout_ms?: number | null
  temperature?: number | null
  top_p?: number | null
  search_mode?: string | null
  search_recency_filter?: string | null
}

export const DEFAULT_DISCOVER_SYSTEM_PROMPT = [
  'You are a web researcher specialized in finding official digital profiles of Brazilian companies.',
  'Search for and return ONLY verified official profiles.',
  'Respond EXCLUSIVELY in valid JSON UTF-8 without markdown.',
  'Do not invent URLs. Use null for any profile not found.',
  'Only include URLs you are confident are official.',
].join(' ')

export function buildDiscoverUserPrompt(input: DiscoverInput): string {
  const hint = input.company_site ? ` Known site hint: ${input.company_site}.` : ''
  const schemaExample = JSON.stringify(
    {
      company_site: 'https://example.com.br',
      instagram: 'https://instagram.com/example',
      linkedin: 'https://linkedin.com/company/example',
      facebook: 'https://facebook.com/example',
      other_sources: [{ title: 'Example News', url: 'https://news.example.com', type: 'other' }],
    },
    null,
    2
  )
  return [
    `Find the official online profiles for company: "${input.company_name}".${hint}`,
    'Return ONLY this JSON format (no markdown, no explanation):',
    schemaExample,
    'Use null for any profile not found. Provide only verified official URLs.',
  ].join('\n')
}

export function buildDiscoverPayload(
  input: DiscoverInput,
  config: DiscoverProviderConfig
): Record<string, unknown> {
  return {
    model: config.model,
    messages: [
      { role: 'system', content: DEFAULT_DISCOVER_SYSTEM_PROMPT },
      { role: 'user', content: buildDiscoverUserPrompt(input) },
    ],
    search_mode: config.search_mode ?? 'web',
    search_recency_filter: config.search_recency_filter ?? 'year',
    temperature: Number(config.temperature ?? 0.1),
    top_p: Number(config.top_p ?? 0.9),
  }
}

function isValidHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function asValidUrl(value: unknown): string | null {
  return isValidHttpUrl(value) ? (value as string).trim() : null
}

function asNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

const VALID_SOURCE_TYPES: DiscoverSource['type'][] = [
  'site',
  'instagram',
  'linkedin',
  'facebook',
  'other',
]

function computeConfidence(
  companySite: string | null,
  instagram: string | null,
  linkedin: string | null,
  facebook: string | null
): 'high' | 'medium' | 'low' {
  const found = [companySite, instagram, linkedin, facebook].filter((v) => v !== null).length
  if (found >= 3) return 'high'
  if (found >= 1) return 'medium'
  return 'low'
}

export function normalizeDiscoverResponse(raw: string): DiscoverResult {
  const parsed = extractJsonObject(raw)

  const companySite = asValidUrl(parsed?.company_site)
  const instagram = asValidUrl(parsed?.instagram)
  const linkedin = asValidUrl(parsed?.linkedin)
  const facebook = asValidUrl(parsed?.facebook)

  const otherSources: DiscoverSource[] = []
  if (Array.isArray(parsed?.other_sources)) {
    for (const item of parsed.other_sources as unknown[]) {
      if (!item || typeof item !== 'object') continue
      const record = item as Record<string, unknown>
      const url = asValidUrl(record.url)
      if (!url) continue
      const rawType = asNonEmptyString(record.type)
      otherSources.push({
        title: asNonEmptyString(record.title) || url,
        url,
        type: VALID_SOURCE_TYPES.includes(rawType as DiscoverSource['type'])
          ? (rawType as DiscoverSource['type'])
          : 'other',
      })
    }
  }

  return {
    company_site: companySite,
    instagram,
    linkedin,
    facebook,
    other_sources: otherSources,
    confidence: computeConfidence(companySite, instagram, linkedin, facebook),
    contract_version: DISCOVER_CONTRACT_VERSION,
    prompt_version: DISCOVER_PROMPT_VERSION,
    strategy_version: DISCOVER_STRATEGY_VERSION,
  }
}
