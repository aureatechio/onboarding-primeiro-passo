/**
 * Shared Gemini REST client for the enrichment pipeline.
 *
 * Provides a single `callGeminiText` function with:
 *   - timeout via AbortController
 *   - automatic retry with configurable backoff (429, 500, 503, timeout)
 *   - support for text-only and image+text (vision) requests
 *
 * Consumers:
 *   - color-extractor.ts  (Gemini Vision for logo palette)
 *   - font-detector.ts    (validation + suggestion prompts)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeminiCallConfig {
  apiKey: string
  modelName: string
  baseUrl: string
  temperature: number
  timeoutMs: number
  maxRetries: number
  backoffMs: number[]
}

export interface ImagePart {
  mimeType: string
  base64Data: string
}

export interface GeminiCallResult {
  text: string
  retryCount: number
  durationMs: number
}

const RETRYABLE_STATUSES = new Set([429, 500, 503])

const LOG_PREFIX = '[enrichment.gemini]'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function parseBackoffMs(raw: string): number[] {
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
}

// ---------------------------------------------------------------------------
// Core call
// ---------------------------------------------------------------------------

async function singleCall(
  prompt: string,
  image: ImagePart | null,
  config: GeminiCallConfig,
  signal: AbortSignal,
): Promise<string> {
  const parts: Record<string, unknown>[] = []

  if (image) {
    parts.push({
      inlineData: { mimeType: image.mimeType, data: image.base64Data },
    })
  }
  parts.push({ text: prompt })

  const payload = {
    contents: [{ parts }],
    generationConfig: { temperature: config.temperature },
  }

  const endpoint = `${config.baseUrl}/models/${config.modelName}:generateContent`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const err = new Error(`Gemini HTTP ${response.status}`) as Error & {
      status: number
      body: string
    }
    err.status = response.status
    err.body = body
    throw err
  }

  const result = await response.json()
  const candidates = result?.candidates
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return ''
  }
  const textParts = candidates[0]?.content?.parts
  if (!Array.isArray(textParts)) return ''

  return textParts
    .map((p: { text?: string }) => (typeof p?.text === 'string' ? p.text : ''))
    .join('\n')
    .trim()
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error && err.name === 'AbortError') return true
  if (
    err instanceof Error &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
  ) {
    return RETRYABLE_STATUSES.has((err as { status: number }).status)
  }
  return false
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Call Gemini with optional image and return text response.
 * Retries on 429/500/503/timeout with configurable backoff.
 */
export async function callGeminiText(
  prompt: string,
  image: ImagePart | null,
  config: GeminiCallConfig,
): Promise<GeminiCallResult> {
  const backoffs = config.backoffMs.length > 0 ? config.backoffMs : [1000]
  const maxAttempts = 1 + Math.max(0, config.maxRetries)
  let retryCount = 0
  const start = Date.now()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), config.timeoutMs)

    try {
      const text = await singleCall(prompt, image, config, controller.signal)
      return { text, retryCount, durationMs: Date.now() - start }
    } catch (err) {
      const isLast = attempt >= maxAttempts - 1
      if (isLast || !isRetryable(err)) {
        console.error(`${LOG_PREFIX} call failed after ${attempt + 1} attempt(s)`, {
          error: String(err),
        })
        return { text: '', retryCount, durationMs: Date.now() - start }
      }

      const backoff = backoffs[Math.min(attempt, backoffs.length - 1)]
      console.warn(`${LOG_PREFIX} retry`, {
        attempt: attempt + 1,
        backoff_ms: backoff,
        reason: String(err),
      })
      retryCount++
      await new Promise((r) => setTimeout(r, backoff))
    } finally {
      clearTimeout(timer)
    }
  }

  return { text: '', retryCount, durationMs: Date.now() - start }
}
