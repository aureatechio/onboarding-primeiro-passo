/**
 * CSS scraper module for the enrichment pipeline.
 *
 * Fetches a site's main page, extracts inline `<style>` and linked
 * stylesheets (first level only, no recursive @import), then parses
 * colors and font-family declarations.
 *
 * Consumers:
 *   - font-detector.ts (font primary detection)
 *   - onboarding-enrichment/index.ts (Phase 1 CSS fallback + Phase 2)
 */

import { extractColorsFromCss } from './color-extractor.ts'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrapeConfig {
  timeoutMs: number
  userAgent: string
  maxRetries: number
  backoffMs: number[]
}

export interface FontAnalysis {
  primary: string | null
  all: string[]
  raw: string[]
}

export interface CssAnalysis {
  colors: string[]
  fonts: FontAnalysis
  fetchDurationMs: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[enrichment.css-scraper]'

const GENERIC_FONTS = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  'inherit',
  'initial',
  'unset',
  'cursive',
  'fantasy',
  'math',
  'emoji',
  'fangsong',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  '-apple-system',
  'blinkmacsystemfont',
])

const EMPTY_FONT_ANALYSIS: FontAnalysis = {
  primary: null,
  all: [],
  raw: [],
}

const EMPTY_ANALYSIS: CssAnalysis = {
  colors: [],
  fonts: EMPTY_FONT_ANALYSIS,
  fetchDurationMs: 0,
}

// ---------------------------------------------------------------------------
// HTML extraction helpers
// ---------------------------------------------------------------------------

const STYLE_TAG_RE = /<style[^>]*>([\s\S]*?)<\/style>/gi

const LINK_STYLESHEET_RE =
  /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi

const LINK_STYLESHEET_RE2 =
  /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi

function extractInlineCss(html: string): string[] {
  const results: string[] = []
  let match: RegExpExecArray | null
  STYLE_TAG_RE.lastIndex = 0
  while ((match = STYLE_TAG_RE.exec(html)) !== null) {
    if (match[1].trim()) results.push(match[1])
  }
  return results
}

function extractLinkedStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls = new Set<string>()

  for (const re of [LINK_STYLESHEET_RE, LINK_STYLESHEET_RE2]) {
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(html)) !== null) {
      try {
        const resolved = new URL(match[1], baseUrl).href
        urls.add(resolved)
      } catch { /* invalid URL, skip */ }
    }
  }

  return Array.from(urls)
}

// ---------------------------------------------------------------------------
// Font extraction
// ---------------------------------------------------------------------------

const FONT_FAMILY_RE = /font-family\s*:\s*([^;}]+)/gi

const GOOGLE_FONTS_IMPORT_RE =
  /@import\s+url\(\s*['"]?https?:\/\/fonts\.googleapis\.com\/css2?\?family=([^'")\s]+)['"]?\s*\)/gi

function cleanFontName(raw: string): string {
  return raw.replace(/['",]+/g, '').trim()
}

function isGenericFont(name: string): boolean {
  return GENERIC_FONTS.has(name.toLowerCase())
}

export function extractFontsFromCss(cssText: string): FontAnalysis {
  const frequency = new Map<string, number>()
  const rawDeclarations: string[] = []
  const allFonts = new Set<string>()

  let match: RegExpExecArray | null

  FONT_FAMILY_RE.lastIndex = 0
  while ((match = FONT_FAMILY_RE.exec(cssText)) !== null) {
    const declaration = match[1].trim()
    rawDeclarations.push(declaration)

    const fonts = declaration.split(',').map(cleanFontName).filter(Boolean)
    for (const font of fonts) {
      if (!isGenericFont(font)) {
        allFonts.add(font)
        frequency.set(font, (frequency.get(font) ?? 0) + 1)
      }
    }
  }

  GOOGLE_FONTS_IMPORT_RE.lastIndex = 0
  while ((match = GOOGLE_FONTS_IMPORT_RE.exec(cssText)) !== null) {
    const familyParam = decodeURIComponent(match[1])
    const families = familyParam.split('|')
    for (const fam of families) {
      const name = fam.split(':')[0].replace(/\+/g, ' ').trim()
      if (name && !isGenericFont(name)) {
        allFonts.add(name)
        frequency.set(name, (frequency.get(name) ?? 0) + 1)
      }
    }
  }

  let primary: string | null = null
  let maxFreq = 0
  for (const [font, freq] of frequency) {
    if (freq > maxFreq) {
      maxFreq = freq
      primary = font
    }
  }

  return {
    primary,
    all: Array.from(allFonts),
    raw: rawDeclarations,
  }
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

interface FetchDeps {
  fetchFn?: typeof fetch
}

async function fetchWithTimeout(
  url: string,
  config: ScrapeConfig,
  deps: FetchDeps = {},
): Promise<Response> {
  const fetchFn = deps.fetchFn ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)

  try {
    return await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': config.userAgent,
        Accept: 'text/html,text/css,*/*',
      },
      signal: controller.signal,
      redirect: 'follow',
    })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchWithRetry(
  url: string,
  config: ScrapeConfig,
  deps: FetchDeps = {},
): Promise<Response | null> {
  const maxAttempts = 1 + Math.max(0, config.maxRetries)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await fetchWithTimeout(url, config, deps)
      if (resp.ok) return resp
      if (resp.status >= 500 && attempt < maxAttempts - 1) {
        const backoff = config.backoffMs[Math.min(attempt, config.backoffMs.length - 1)] ?? 2000
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      return null
    } catch (err) {
      if (attempt < maxAttempts - 1) {
        const backoff = config.backoffMs[Math.min(attempt, config.backoffMs.length - 1)] ?? 2000
        console.warn(`${LOG_PREFIX} fetch retry`, { url, attempt: attempt + 1, reason: String(err) })
        await new Promise((r) => setTimeout(r, backoff))
        continue
      }
      return null
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchAndParseCss(
  siteUrl: string,
  config: ScrapeConfig,
  deps: FetchDeps = {},
): Promise<CssAnalysis> {
  const start = Date.now()

  try {
    const response = await fetchWithRetry(siteUrl, config, deps)
    if (!response) {
      return { ...EMPTY_ANALYSIS, fetchDurationMs: Date.now() - start }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return { ...EMPTY_ANALYSIS, fetchDurationMs: Date.now() - start }
    }

    const html = await response.text()
    const cssChunks: string[] = []

    cssChunks.push(...extractInlineCss(html))

    const linkedUrls = extractLinkedStylesheetUrls(html, siteUrl)
    for (const cssUrl of linkedUrls.slice(0, 5)) {
      try {
        const cssResp = await fetchWithTimeout(cssUrl, config, deps)
        if (cssResp.ok) {
          const ct = cssResp.headers.get('content-type') ?? ''
          if (ct.includes('text/css') || ct.includes('text/html') || !ct) {
            cssChunks.push(await cssResp.text())
          }
        }
      } catch {
        console.warn(`${LOG_PREFIX} failed to fetch stylesheet`, { url: cssUrl })
      }
    }

    const allCss = cssChunks.join('\n')
    const colors = extractColorsFromCss(allCss, 10)
    const fonts = extractFontsFromCss(allCss)
    const fetchDurationMs = Date.now() - start

    return { colors, fonts, fetchDurationMs }
  } catch (err) {
    console.error(`${LOG_PREFIX} fetchAndParseCss failed`, { url: siteUrl, error: String(err) })
    return { ...EMPTY_ANALYSIS, fetchDurationMs: Date.now() - start }
  }
}
