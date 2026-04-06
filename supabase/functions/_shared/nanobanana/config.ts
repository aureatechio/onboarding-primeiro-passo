/**
 * Shared NanoBanana configuration module.
 *
 * Single source of truth for the NanoBananaDbConfig interface,
 * the singleton loader (with in-memory cache), and related constants.
 *
 * Consumers:
 *   - create-ai-campaign-job
 *   - post-gen-generate
 *   - post-turbo-generate
 *   - get-nanobanana-config
 *   - update-nanobanana-config
 *   - read-nanobanana-reference
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NanoBananaDbConfig {
  gemini_model_name: string
  gemini_api_base_url: string
  max_retries: number
  worker_batch_size: number
  url_expiry_seconds: number
  max_image_download_bytes: number
  global_rules: string
  global_rules_version: string
  prompt_version: string
  direction_moderna: string
  direction_clean: string
  direction_retail: string
  direction_moderna_mode: DirectionMode
  direction_clean_mode: DirectionMode
  direction_retail_mode: DirectionMode
  direction_moderna_image_path: string | null
  direction_clean_image_path: string | null
  direction_retail_image_path: string | null
  format_1_1: string
  format_4_5: string
  format_16_9: string
  format_9_16: string
}

export type DirectionMode = 'text' | 'image' | 'both'

export type CategoryKey = 'moderna' | 'clean' | 'retail'

/** Alias kept for semantic clarity in campaign-job context. */
export type GroupName = CategoryKey

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REFERENCE_BUCKET = 'nanobanana-references'

export const VALID_CATEGORIES: readonly CategoryKey[] = [
  'moderna',
  'clean',
  'retail',
] as const

export const VALID_DIRECTION_MODES: readonly DirectionMode[] = [
  'text',
  'image',
  'both',
] as const

export const CONFIG_TABLE = 'nanobanana_config' as const

// ---------------------------------------------------------------------------
// Loader (with in-memory cache for edge function warm instances)
// ---------------------------------------------------------------------------

let _cachedConfig: NanoBananaDbConfig | null = null

export async function loadNanoBananaConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<NanoBananaDbConfig | null> {
  if (_cachedConfig) return _cachedConfig
  try {
    const { data, error } = await supabase
      .from(CONFIG_TABLE)
      .select('*')
      .limit(1)
      .single()
    if (error || !data) return null
    _cachedConfig = data as NanoBananaDbConfig
    return _cachedConfig
  } catch {
    return null
  }
}

/** Clear the in-memory cache (useful after updates). */
export function resetConfigCache(): void {
  _cachedConfig = null
}
