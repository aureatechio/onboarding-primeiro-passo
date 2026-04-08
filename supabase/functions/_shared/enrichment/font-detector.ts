/**
 * Font detection and validation module for the enrichment pipeline.
 *
 * Waterfall strategy:
 *   1. If site_url exists: extract font from CSS via css-scraper
 *   2. Validate detected font via Gemini (font_validation_prompt)
 *      - If rejected, use Gemini's suggestion
 *   3. If no site or scraping failed: ask Gemini for suggestion (font_suggestion_prompt)
 *   4. Fallback to config.font_fallback
 *
 * Consumers:
 *   - onboarding-enrichment/index.ts (Phase 2)
 */

import { callGeminiText, parseBackoffMs, type GeminiCallConfig } from './gemini-client.ts'
import { fetchAndParseCss, type ScrapeConfig } from './css-scraper.ts'
import { resolvePromptTemplate, type EnrichmentConfig } from './config-types.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FontSource = 'site_css' | 'gemini_suggestion' | 'fallback'

export interface FontDetectionInput {
  siteUrl: string | null
  companyName: string
  segment: string
  config: EnrichmentConfig
  geminiApiKey: string
  fetchFn?: typeof fetch
}

export interface AttemptLog {
  method: string
  success: boolean
  durationMs: number
  resultSummary: string
  error?: string
  retryCount?: number
}

export interface FontDetectionResult {
  font: string
  source: FontSource
  validated: boolean
  validationReason: string | null
  attempts: AttemptLog[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[enrichment.font-detector]'

interface ValidationResponse {
  approved: boolean
  reason: string
  suggestion: string | null
}

function parseValidationResponse(text: string): ValidationResponse | null {
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (typeof parsed.approved !== 'boolean') return null
    return {
      approved: parsed.approved,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
      suggestion: typeof parsed.suggestion === 'string' ? parsed.suggestion : null,
    }
  } catch {
    return null
  }
}

function parseSuggestionResponse(text: string): string | null {
  const cleaned = text.trim().replace(/^["']|["']$/g, '').trim()
  if (!cleaned || cleaned.length > 60) return null
  return cleaned
}

function buildGeminiConfig(config: EnrichmentConfig, apiKey: string): GeminiCallConfig {
  return {
    apiKey,
    modelName: config.gemini_model_name,
    baseUrl: config.gemini_api_base_url,
    temperature: config.gemini_temperature,
    timeoutMs: config.timeout_font_ms,
    maxRetries: config.retry_gemini_max,
    backoffMs: parseBackoffMs(config.retry_gemini_backoff_ms),
  }
}

function buildScrapeConfig(config: EnrichmentConfig): ScrapeConfig {
  return {
    timeoutMs: config.scrape_timeout_ms,
    userAgent: config.scrape_user_agent,
    maxRetries: config.retry_scrape_max,
    backoffMs: parseBackoffMs(config.retry_scrape_backoff_ms),
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function detectAndValidateFont(
  input: FontDetectionInput,
): Promise<FontDetectionResult> {
  const { siteUrl, companyName, segment, config, geminiApiKey } = input
  const attempts: AttemptLog[] = []
  const geminiConfig = buildGeminiConfig(config, geminiApiKey)
  const templateVars = { company_name: companyName, segment }

  // Step 1: Try CSS scraping if site_url exists
  if (siteUrl) {
    const scrapeStart = Date.now()
    try {
      const scrapeConfig = buildScrapeConfig(config)
      const deps = input.fetchFn ? { fetchFn: input.fetchFn } : {}
      const analysis = await fetchAndParseCss(siteUrl, scrapeConfig, deps)
      const detectedFont = analysis.fonts.primary

      attempts.push({
        method: 'site_css',
        success: !!detectedFont,
        durationMs: Date.now() - scrapeStart,
        resultSummary: detectedFont ? `${detectedFont} detectada` : 'nenhuma fonte encontrada',
      })

      if (detectedFont) {
        // Step 2: Validate via Gemini
        const validationStart = Date.now()
        const validationPrompt = resolvePromptTemplate(config.font_validation_prompt, {
          ...templateVars,
          detected_font: detectedFont,
        })

        const validationResult = await callGeminiText(validationPrompt, null, geminiConfig)
        const validation = parseValidationResponse(validationResult.text)

        if (validation) {
          attempts.push({
            method: 'gemini_validation',
            success: true,
            durationMs: Date.now() - validationStart,
            resultSummary: `approved=${validation.approved}`,
            retryCount: validationResult.retryCount,
          })

          if (validation.approved) {
            return {
              font: detectedFont,
              source: 'site_css',
              validated: true,
              validationReason: validation.reason,
              attempts,
            }
          }

          // Rejected — use suggestion if available
          if (validation.suggestion) {
            return {
              font: validation.suggestion,
              source: 'site_css',
              validated: true,
              validationReason: validation.reason,
              attempts,
            }
          }
        } else {
          attempts.push({
            method: 'gemini_validation',
            success: false,
            durationMs: Date.now() - validationStart,
            resultSummary: 'resposta malformada',
            retryCount: validationResult.retryCount,
          })
        }
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} CSS scraping failed`, { url: siteUrl, error: String(err) })
      attempts.push({
        method: 'site_css',
        success: false,
        durationMs: Date.now() - scrapeStart,
        resultSummary: 'erro no scraping',
        error: String(err).slice(0, 200),
      })
    }
  }

  // Step 3: Ask Gemini for suggestion
  const suggestionStart = Date.now()
  try {
    const suggestionPrompt = resolvePromptTemplate(
      config.font_suggestion_prompt,
      templateVars,
    )

    const suggestionResult = await callGeminiText(suggestionPrompt, null, geminiConfig)
    const suggestedFont = parseSuggestionResponse(suggestionResult.text)

    if (suggestedFont) {
      attempts.push({
        method: 'gemini_suggestion',
        success: true,
        durationMs: Date.now() - suggestionStart,
        resultSummary: `sugeriu ${suggestedFont}`,
        retryCount: suggestionResult.retryCount,
      })

      return {
        font: suggestedFont,
        source: 'gemini_suggestion',
        validated: false,
        validationReason: null,
        attempts,
      }
    }

    attempts.push({
      method: 'gemini_suggestion',
      success: false,
      durationMs: Date.now() - suggestionStart,
      resultSummary: 'resposta vazia ou invalida',
      retryCount: suggestionResult.retryCount,
    })
  } catch (err) {
    console.error(`${LOG_PREFIX} Gemini suggestion failed`, { error: String(err) })
    attempts.push({
      method: 'gemini_suggestion',
      success: false,
      durationMs: Date.now() - suggestionStart,
      resultSummary: 'erro na chamada',
      error: String(err).slice(0, 200),
    })
  }

  // Step 4: Fallback
  attempts.push({
    method: 'fallback',
    success: true,
    durationMs: 0,
    resultSummary: `usando ${config.font_fallback}`,
  })

  return {
    font: config.font_fallback,
    source: 'fallback',
    validated: false,
    validationReason: null,
    attempts,
  }
}
