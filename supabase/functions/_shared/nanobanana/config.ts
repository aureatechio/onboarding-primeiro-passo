/**
 * Shared NanoBanana configuration module.
 *
 * Single source of truth for the NanoBananaDbConfig interface,
 * the singleton loader (with in-memory cache), and related constants.
 *
 * Consumers:
 *   - create-ai-campaign-job
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
  temperature: number
  top_p: number
  top_k: number
  safety_preset: SafetyPreset
  use_system_instruction: boolean
}

export type DirectionMode = 'text' | 'image' | 'both'

export type SafetyPreset = 'default' | 'relaxed' | 'permissive' | 'strict'

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

export const VALID_SAFETY_PRESETS: readonly SafetyPreset[] = [
  'default',
  'relaxed',
  'permissive',
  'strict',
] as const

// ---------------------------------------------------------------------------
// Safety preset → Gemini API safetySettings resolver
// ---------------------------------------------------------------------------

const SAFETY_CATEGORIES = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
] as const

const SAFETY_THRESHOLD_MAP: Record<string, string> = {
  relaxed: 'BLOCK_ONLY_HIGH',
  permissive: 'BLOCK_NONE',
  strict: 'BLOCK_MEDIUM_AND_ABOVE',
}

/**
 * Resolves a safety preset to the Gemini API safetySettings array.
 * Returns undefined for 'default' (let Gemini use its own defaults).
 */
export function resolveSafetyPreset(
  preset: SafetyPreset | undefined,
): Array<{ category: string; threshold: string }> | undefined {
  if (!preset) return undefined
  const threshold = SAFETY_THRESHOLD_MAP[preset]
  if (!threshold) return undefined // 'default' → don't send
  return SAFETY_CATEGORIES.map((category) => ({ category, threshold }))
}

// ---------------------------------------------------------------------------
// Image override builder (centralizes config → overrides mapping)
// ---------------------------------------------------------------------------

export interface ImageOverrides {
  modelName?: string
  baseUrl?: string
  maxRetries?: number
  maxImageDownloadBytes?: number
  temperature?: number
  topP?: number
  topK?: number
  safetySettings?: Array<{ category: string; threshold: string }>
  systemInstruction?: string
}

/**
 * Builds image generation overrides from NanoBanana config.
 * systemInstruction is only set when use_system_instruction is true.
 */
export function buildImageOverrides(
  config: NanoBananaDbConfig | null,
): ImageOverrides {
  if (!config) return {}
  return {
    modelName: config.gemini_model_name,
    baseUrl: config.gemini_api_base_url,
    maxRetries: config.max_retries ?? 2,
    maxImageDownloadBytes: config.max_image_download_bytes,
    temperature: config.temperature,
    topP: config.top_p,
    topK: config.top_k,
    safetySettings: resolveSafetyPreset(config.safety_preset),
    systemInstruction: config.use_system_instruction
      ? config.global_rules
      : undefined,
  }
}

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
