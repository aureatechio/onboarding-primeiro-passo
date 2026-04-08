/**
 * Enrichment pipeline types, constants, and pure functions.
 *
 * Separated from config.ts to avoid pulling in @supabase/supabase-js
 * for modules that only need types and template resolution.
 *
 * config.ts re-exports everything from here plus the DB loader.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentConfig {
  id: string

  // Phase 1: Colors
  color_gemini_prompt: string
  color_fallback_palette: string[]
  color_extraction_max: number

  // Phase 2: Font
  font_validation_prompt: string
  font_suggestion_prompt: string
  font_fallback: string

  // Phase 3: Briefing
  briefing_auto_mode: string

  // Gemini model (phases 1 & 2)
  gemini_model_name: string
  gemini_api_base_url: string
  gemini_temperature: number

  // Per-phase timeouts (ms)
  timeout_colors_ms: number
  timeout_font_ms: number
  timeout_briefing_ms: number
  timeout_campaign_ms: number

  // Intra-phase retry
  retry_gemini_max: number
  retry_gemini_backoff_ms: string
  retry_scrape_max: number
  retry_scrape_backoff_ms: string

  // Scraping
  scrape_timeout_ms: number
  scrape_user_agent: string

  // Metadata
  updated_at: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CONFIG_TABLE = 'enrichment_config' as const

export const DEFAULT_COLOR_FALLBACK_PALETTE: readonly string[] = [
  '#384ffe',
  '#1a1a2e',
  '#f5f5f5',
] as const

export const DEFAULT_FONT_FALLBACK = 'Inter' as const

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash' as const

export const DEFAULT_GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta' as const

// ---------------------------------------------------------------------------
// Template resolver
// ---------------------------------------------------------------------------

/**
 * Replace `${variable_name}` placeholders in a prompt template.
 *
 * Available variables depend on the caller context:
 *   - company_name, segment, detected_font
 *
 * Unknown variables are replaced with an empty string.
 */
export function resolvePromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\$\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}
