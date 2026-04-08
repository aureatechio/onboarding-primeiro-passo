/**
 * Color extraction module for the enrichment pipeline.
 *
 * Three strategies (waterfall):
 *   1. extractColorsFromImage  — algorithmic median-cut on raw PNG pixels
 *   2. extractColorsViaGemini  — Gemini Vision analysis of logo image
 *   3. extractColorsFromCss    — regex parse of CSS text
 *
 * All functions return `string[]` of validated hex colors (`#RRGGBB`).
 * Invalid colors are silently discarded; failures return `[]`.
 */

import {
  bytesToBase64,
  callGeminiText,
  type GeminiCallConfig,
  type ImagePart,
} from './gemini-client.ts'

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_RE.test(color)
}

function normalizeHex(color: string): string {
  return color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`
}

// ---------------------------------------------------------------------------
// Color math (ported from src/lib/color-extractor.js)
// ---------------------------------------------------------------------------

const MIN_SATURATION = 0.08
const MIN_LIGHTNESS = 0.06
const MAX_LIGHTNESS = 0.94

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((c) => Math.round(c).toString(16).padStart(2, '0'))
      .join('')
  )
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

function isUsableColor(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return false
  const [, s, l] = rgbToHsl(r, g, b)
  return s >= MIN_SATURATION && l >= MIN_LIGHTNESS && l <= MAX_LIGHTNESS
}

type RGB = [number, number, number]

function getChannelRange(pixels: RGB[], channel: number): number {
  if (pixels.length === 0) return 0
  let min = 255
  let max = 0
  for (const p of pixels) {
    if (p[channel] < min) min = p[channel]
    if (p[channel] > max) max = p[channel]
  }
  return max - min
}

function medianCut(pixels: RGB[], depth: number): RGB[] {
  if (depth === 0 || pixels.length === 0) {
    if (pixels.length === 0) return []
    const avg: RGB = [0, 1, 2].map((ch) => {
      const sum = pixels.reduce((s, p) => s + p[ch], 0)
      return Math.round(sum / pixels.length)
    }) as RGB
    return [avg]
  }

  const ranges = [0, 1, 2].map((ch) => getChannelRange(pixels, ch))
  const widestChannel = ranges.indexOf(Math.max(...ranges))

  pixels.sort((a, b) => a[widestChannel] - b[widestChannel])
  const mid = Math.floor(pixels.length / 2)

  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ]
}

function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

function deduplicateColors(colors: RGB[], minDistance = 40): RGB[] {
  const unique: RGB[] = []
  for (const color of colors) {
    if (unique.every((u) => colorDistance(u, color) >= minDistance)) {
      unique.push(color)
    }
  }
  return unique
}

// ---------------------------------------------------------------------------
// PNG decoder (minimal — uncompressed RGBA from standard PNGs)
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false
  }
  return true
}

function readUint32BE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]) >>>
    0
  )
}

interface PngHeader {
  width: number
  height: number
  bitDepth: number
  colorType: number
}

function readPngHeader(bytes: Uint8Array): PngHeader | null {
  if (bytes.length < 33) return null
  const chunkLen = readUint32BE(bytes, 8)
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
  if (chunkType !== 'IHDR' || chunkLen < 13) return null
  return {
    width: readUint32BE(bytes, 16),
    height: readUint32BE(bytes, 20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  }
}

function collectIdatChunks(bytes: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = []
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const len = readUint32BE(bytes, offset)
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    )
    if (type === 'IDAT') {
      chunks.push(bytes.slice(offset + 8, offset + 8 + len))
    }
    offset += 12 + len
  }
  if (chunks.length === 0) return new Uint8Array(0)
  const totalLen = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(totalLen)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  return result
}

async function inflatePngData(compressed: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()

  const writePromise = writer.write(compressed as unknown as BufferSource).then(() => writer.close())

  const chunks: Uint8Array[] = []
  let done = false
  while (!done) {
    const { value, done: d } = await reader.read()
    if (d) {
      done = true
    } else if (value) {
      chunks.push(value)
    }
  }
  await writePromise

  const totalLen = chunks.reduce((s, c) => s + c.length, 0)
  const result = new Uint8Array(totalLen)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  return result
}

function defilterRow(
  filter: number,
  row: Uint8Array,
  prev: Uint8Array | null,
  bpp: number,
): Uint8Array {
  const out = new Uint8Array(row.length)
  for (let i = 0; i < row.length; i++) {
    const a = i >= bpp ? out[i - bpp] : 0
    const b = prev ? prev[i] : 0
    const c = prev && i >= bpp ? prev[i - bpp] : 0

    switch (filter) {
      case 0:
        out[i] = row[i]
        break
      case 1:
        out[i] = (row[i] + a) & 0xff
        break
      case 2:
        out[i] = (row[i] + b) & 0xff
        break
      case 3:
        out[i] = (row[i] + Math.floor((a + b) / 2)) & 0xff
        break
      case 4: {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        out[i] =
          (row[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
        break
      }
      default:
        out[i] = row[i]
    }
  }
  return out
}

/**
 * Decode raw RGBA pixel data from a standard 8-bit RGBA or RGB PNG.
 * Returns null for unsupported formats (interlaced, 16-bit, palette, etc.).
 */
export async function decodePngPixels(
  bytes: Uint8Array,
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  if (!isPng(bytes)) return null

  const header = readPngHeader(bytes)
  if (!header) return null
  if (header.bitDepth !== 8) return null
  if (header.colorType !== 2 && header.colorType !== 6) return null

  const channels = header.colorType === 6 ? 4 : 3
  const bpp = channels
  const compressed = collectIdatChunks(bytes)
  if (compressed.length === 0) return null

  let raw: Uint8Array
  try {
    raw = await inflatePngData(compressed)
  } catch {
    return null
  }

  const { width, height } = header
  const rowBytes = width * channels
  const expectedLen = height * (1 + rowBytes)
  if (raw.length < expectedLen) return null

  const rgba = new Uint8Array(width * height * 4)
  let prev: Uint8Array | null = null
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + rowBytes)
    const filter = raw[rowStart]
    const rowData = raw.slice(rowStart + 1, rowStart + 1 + rowBytes)
    const defiltered = defilterRow(filter, rowData, prev, bpp)
    prev = defiltered

    for (let x = 0; x < width; x++) {
      const srcOff = x * channels
      const dstOff = (y * width + x) * 4
      rgba[dstOff] = defiltered[srcOff]
      rgba[dstOff + 1] = defiltered[srcOff + 1]
      rgba[dstOff + 2] = defiltered[srcOff + 2]
      rgba[dstOff + 3] = channels === 4 ? defiltered[srcOff + 3] : 255
    }
  }

  return { data: rgba, width, height }
}

// ---------------------------------------------------------------------------
// Strategy 1: Algorithmic extraction from PNG bytes
// ---------------------------------------------------------------------------

export function extractColorsFromImage(
  imageBytes: Uint8Array,
  pixelData: { data: Uint8Array; width: number; height: number },
  maxColors: number,
): string[] {
  try {
    const { data, width, height } = pixelData
    const step = Math.max(1, Math.floor((width * height) / 5000))
    const pixels: RGB[] = []

    for (let i = 0; i < width * height; i += step) {
      const offset = i * 4
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]
      const a = data[offset + 3]
      if (isUsableColor(r, g, b, a)) {
        pixels.push([r, g, b])
      }
    }

    if (pixels.length === 0) return []

    const depth = Math.ceil(Math.log2(maxColors + 2))
    const quantized = medianCut([...pixels], depth)
    const unique = deduplicateColors(quantized)

    const sorted = unique.sort((a, b) => {
      const [, sA] = rgbToHsl(a[0], a[1], a[2])
      const [, sB] = rgbToHsl(b[0], b[1], b[2])
      return sB - sA
    })

    return sorted
      .slice(0, maxColors)
      .map((c) => rgbToHex(c[0], c[1], c[2]))
      .filter(isValidHexColor)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Strategy 2: Gemini Vision
// ---------------------------------------------------------------------------

export interface GeminiColorConfig {
  apiKey: string
  modelName: string
  baseUrl: string
  temperature: number
  timeoutMs: number
  maxRetries: number
  backoffMs: number[]
}

export async function extractColorsViaGemini(
  imageBytes: Uint8Array,
  mimeType: string,
  prompt: string,
  config: GeminiColorConfig,
): Promise<string[]> {
  try {
    const image: ImagePart = {
      mimeType,
      base64Data: bytesToBase64(imageBytes),
    }

    const geminiConfig: GeminiCallConfig = {
      apiKey: config.apiKey,
      modelName: config.modelName,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
      backoffMs: config.backoffMs,
    }

    const result = await callGeminiText(prompt, image, geminiConfig)
    if (!result.text) return []

    return parseColorsFromText(result.text)
  } catch {
    return []
  }
}

function parseColorsFromText(text: string): string[] {
  const jsonMatch = text.match(/\[[\s\S]*?\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((v: unknown) => typeof v === 'string')
      .map((v: string) => normalizeHex(v.trim()))
      .filter(isValidHexColor)
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Strategy 3: CSS text extraction
// ---------------------------------------------------------------------------

const CSS_HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
const CSS_RGB_RE = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g
const CSS_VAR_COLOR_RE = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,8})\b/g

function expandShortHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex
}

export function extractColorsFromCss(cssText: string, maxColors: number): string[] {
  const colors = new Set<string>()

  for (const match of cssText.matchAll(CSS_VAR_COLOR_RE)) {
    const hex = expandShortHex(normalizeHex(match[1]))
    if (isValidHexColor(hex)) colors.add(hex)
  }

  for (const match of cssText.matchAll(CSS_HEX_RE)) {
    const hex = expandShortHex(normalizeHex(match[0]))
    if (isValidHexColor(hex)) colors.add(hex)
  }

  for (const match of cssText.matchAll(CSS_RGB_RE)) {
    const r = parseInt(match[1], 10)
    const g = parseInt(match[2], 10)
    const b = parseInt(match[3], 10)
    if (r <= 255 && g <= 255 && b <= 255) {
      const hex = rgbToHex(r, g, b)
      if (isValidHexColor(hex)) colors.add(hex)
    }
  }

  return Array.from(colors).slice(0, maxColors)
}
