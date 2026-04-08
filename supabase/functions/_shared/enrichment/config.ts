/**
 * Shared Enrichment Pipeline configuration module.
 *
 * Single source of truth for the EnrichmentConfig interface,
 * the singleton loader (with in-memory cache + TTL), template
 * resolver for prompt variables, and related constants.
 *
 * Pattern: mirrors _shared/nanobanana/config.ts with added TTL.
 *
 * Types, constants, and pure functions live in config-types.ts
 * (no @supabase/supabase-js dependency) and are re-exported here.
 *
 * Consumers:
 *   - onboarding-enrichment
 *   - get-enrichment-config  (future)
 *   - update-enrichment-config (future)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// Re-export everything from config-types (types, constants, resolvePromptTemplate)
export {
  type EnrichmentConfig,
  CONFIG_TABLE,
  DEFAULT_COLOR_FALLBACK_PALETTE,
  DEFAULT_FONT_FALLBACK,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_BASE_URL,
  resolvePromptTemplate,
} from './config-types.ts'

import { type EnrichmentConfig, CONFIG_TABLE } from './config-types.ts'

// ---------------------------------------------------------------------------
// Loader (with in-memory cache + 5-minute TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000

let _cachedConfig: EnrichmentConfig | null = null
let _cachedAt = 0

export async function loadEnrichmentConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<EnrichmentConfig | null> {
  if (_cachedConfig && Date.now() - _cachedAt < CACHE_TTL_MS) {
    return _cachedConfig
  }
  try {
    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select('*')
      .limit(1)
      .single()
    if (error || !data) return null
    _cachedConfig = data as EnrichmentConfig
    _cachedAt = Date.now()
    return _cachedConfig
  } catch {
    return null
  }
}

/** Clear the in-memory cache (useful after updates). */
export function resetConfigCache(): void {
  _cachedConfig = null
  _cachedAt = 0
}
