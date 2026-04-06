import { assertEquals, assertNotEquals } from 'jsr:@std/assert'
import {
  REFERENCE_BUCKET,
  CONFIG_TABLE,
  VALID_CATEGORIES,
  VALID_DIRECTION_MODES,
  loadNanoBananaConfig,
  resetConfigCache,
} from '../_shared/nanobanana/config.ts'

// Test 1: REFERENCE_BUCKET constant
Deno.test('REFERENCE_BUCKET constant equals "nanobanana-references"', () => {
  assertEquals(REFERENCE_BUCKET, 'nanobanana-references')
})

// Test 2: CONFIG_TABLE constant
Deno.test('CONFIG_TABLE constant equals "nanobanana_config"', () => {
  assertEquals(CONFIG_TABLE, 'nanobanana_config')
})

// Test 3: VALID_CATEGORIES array
Deno.test('VALID_CATEGORIES contains exactly ["moderna", "clean", "retail"]', () => {
  assertEquals(VALID_CATEGORIES.length, 3)
  assertEquals(Array.from(VALID_CATEGORIES), ['moderna', 'clean', 'retail'])
})

// Test 4: VALID_DIRECTION_MODES array
Deno.test('VALID_DIRECTION_MODES contains exactly ["text", "image", "both"]', () => {
  assertEquals(VALID_DIRECTION_MODES.length, 3)
  assertEquals(Array.from(VALID_DIRECTION_MODES), ['text', 'image', 'both'])
})

// Test 5: loadNanoBananaConfig returns null when supabase query fails
Deno.test('loadNanoBananaConfig returns null when supabase query fails', async () => {
  // Mock supabase client with failing query
  const mockSupabaseClient = {
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: null,
            error: { message: 'test error' },
          }),
        }),
      }),
    }),
  }

  // Reset cache before test to ensure clean state
  resetConfigCache()

  const result = await loadNanoBananaConfig(mockSupabaseClient as any)
  assertEquals(result, null)
})

// Test 6: resetConfigCache clears the cache
Deno.test('resetConfigCache clears the cache', async () => {
  // Mock successful supabase client
  const mockConfig = {
    gemini_model_name: 'gemini-2.0-flash-exp',
    gemini_api_base_url: 'https://generativelanguage.googleapis.com',
    max_retries: 3,
    worker_batch_size: 4,
    url_expiry_seconds: 86400,
    max_image_download_bytes: 10485760,
    global_rules: 'test rules',
    global_rules_version: '1.0.0',
    prompt_version: '1.0.0',
    direction_moderna: 'test',
    direction_clean: 'test',
    direction_retail: 'test',
    direction_moderna_mode: 'text' as const,
    direction_clean_mode: 'text' as const,
    direction_retail_mode: 'text' as const,
    direction_moderna_image_path: null,
    direction_clean_image_path: null,
    direction_retail_image_path: null,
    format_1_1: 'test',
    format_4_5: 'test',
    format_16_9: 'test',
    format_9_16: 'test',
  }

  const mockSupabaseClient = {
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: mockConfig,
            error: null,
          }),
        }),
      }),
    }),
  }

  // Reset cache to start fresh
  resetConfigCache()

  // Load config (should cache it)
  const result1 = await loadNanoBananaConfig(mockSupabaseClient as any)
  assertEquals(result1, mockConfig)

  // Reset cache
  resetConfigCache()

  // Now the next call to loadNanoBananaConfig should return null
  // because our mock will return null after reset
  const mockSupabaseClientAfterReset = {
    from: () => ({
      select: () => ({
        limit: () => ({
          single: async () => ({
            data: null,
            error: { message: 'cache was reset' },
          }),
        }),
      }),
    }),
  }

  const result2 = await loadNanoBananaConfig(mockSupabaseClientAfterReset as any)
  assertEquals(result2, null)
})
