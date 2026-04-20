import { log } from './logger.ts'
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm'

let _resvgReady = false
async function ensureResvgReady(): Promise<void> {
  if (_resvgReady) return
  const wasmUrl = import.meta.resolve('npm:@resvg/resvg-wasm/index_bg.wasm')
  await initWasm(fetch(wasmUrl))
  _resvgReady = true
}

async function convertSvgToPng(svgBytes: Uint8Array): Promise<Uint8Array> {
  await ensureResvgReady()
  const svgString = new TextDecoder().decode(svgBytes)
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: 512 },
  })
  const rendered = resvg.render()
  return rendered.asPng() as Uint8Array
}

export interface GenerateImageResult {
  success: boolean
  imageData: Uint8Array | null
  mimeType: string
  error: string | null
}

const DEFAULT_MAX_RETRIES = 2
const RETRY_DELAYS = [1000, 3000]

export interface GenerateImageOverrides {
  modelName?: string
  baseUrl?: string
  maxRetries?: number
  maxImageDownloadBytes?: number
  aspectRatio?: string
  temperature?: number
  topP?: number
  topK?: number
  safetySettings?: Array<{ category: string; threshold: string }>
  systemInstruction?: string
}

export async function generateImage(
  prompt: string,
  celebrityPngUrl: string,
  clientLogoUrl: string,
  campaignImageUrl?: string,
  categoryReferenceImageUrl?: string,
  overrides?: GenerateImageOverrides,
): Promise<GenerateImageResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    return {
      success: false,
      imageData: null,
      mimeType: '',
      error: 'GEMINI_API_KEY not configured',
    }
  }

  let imageInputs: ImageInput[] = []
  try {
    imageInputs = await prepareImageInputs(
      celebrityPngUrl,
      clientLogoUrl,
      campaignImageUrl,
      categoryReferenceImageUrl,
      overrides?.maxImageDownloadBytes,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      imageData: null,
      mimeType: '',
      error: `input_preparation_error: ${message}`,
    }
  }

  let lastError = 'Unknown error'
  const maxRetries =
    typeof overrides?.maxRetries === 'number' && overrides.maxRetries >= 0
      ? Math.min(10, Math.floor(overrides.maxRetries))
      : DEFAULT_MAX_RETRIES

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await callGemini({
        apiKey,
        prompt,
        imageInputs,
        modelName: overrides?.modelName,
        baseUrl: overrides?.baseUrl,
        aspectRatio: overrides?.aspectRatio,
        temperature: overrides?.temperature,
        topP: overrides?.topP,
        topK: overrides?.topK,
        safetySettings: overrides?.safetySettings,
        systemInstructionText: overrides?.systemInstruction,
      })
      if (result.success) return result
      lastError = result.error || 'Gemini returned non-success'

      if (attempt < maxRetries) {
        await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)])
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)])
      }
    }
  }

  return {
    success: false,
    imageData: null,
    mimeType: '',
    error: `model_error after ${maxRetries + 1} attempts: ${lastError}`,
  }
}

interface ImageInput {
  mimeType: string
  base64Data: string
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.startsWith('192.168.') ||
      host === '169.254.169.254' ||
      host.endsWith('.internal')
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

const DEFAULT_MAX_IMAGE_DOWNLOAD_BYTES = parseInt(
  Deno.env.get('AI_CAMPAIGN_MAX_IMAGE_DOWNLOAD_BYTES') ?? String(15 * 1024 * 1024),
  10,
)

async function prepareImageInputs(
  celebrityPngUrl: string,
  clientLogoUrl: string,
  campaignImageUrl?: string,
  categoryReferenceImageUrl?: string,
  maxImageDownloadBytes?: number,
): Promise<ImageInput[]> {
  const inputs: ImageInput[] = []
  const maxBytes = typeof maxImageDownloadBytes === 'number' && maxImageDownloadBytes > 0
    ? maxImageDownloadBytes
    : DEFAULT_MAX_IMAGE_DOWNLOAD_BYTES

  const urls = [celebrityPngUrl, clientLogoUrl]
  if (campaignImageUrl?.trim()) urls.push(campaignImageUrl)
  if (categoryReferenceImageUrl?.trim()) urls.push(categoryReferenceImageUrl)

  for (const url of urls) {
    if (!isSafeUrl(url)) {
      log.warn({ stage: 'generation' }, `Skipping unsafe URL: ${url}`)
      continue
    }
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      const rawContentType = (response.headers.get('content-type') || 'image/png').split(';')[0].trim()
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > maxBytes) {
        log.warn({ stage: 'generation' }, `Image too large (${buffer.byteLength} bytes), skipping: ${url}`)
        continue
      }

      let bytes: Uint8Array = new Uint8Array(buffer)
      let mimeType = rawContentType

      const isSvg = rawContentType === 'image/svg+xml' || url.toLowerCase().endsWith('.svg')
      if (isSvg) {
        try {
          bytes = await convertSvgToPng(bytes)
          mimeType = 'image/png'
          log.info({ stage: 'generation' }, `SVG logo converted to PNG: ${url}`)
        } catch (svgErr) {
          log.warn(
            { stage: 'generation' },
            `SVG conversion failed, skipping: ${url}`,
            { error: svgErr instanceof Error ? svgErr.message : String(svgErr) },
          )
          continue
        }
      }

      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      inputs.push({
        mimeType,
        base64Data: btoa(binary),
      })
    } catch {
      log.warn({ stage: 'generation' }, `Failed to fetch image: ${url}`)
    }
  }

  return inputs
}

interface CallGeminiOptions {
  apiKey: string
  prompt: string
  imageInputs: ImageInput[]
  modelName?: string
  baseUrl?: string
  aspectRatio?: string
  temperature?: number
  topP?: number
  topK?: number
  safetySettings?: Array<{ category: string; threshold: string }>
  systemInstructionText?: string
}

async function callGemini(opts: CallGeminiOptions): Promise<GenerateImageResult> {
  const parts: Record<string, unknown>[] = []

  for (const img of opts.imageInputs) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64Data,
      },
    })
  }

  parts.push({ text: opts.prompt })

  const generationConfig: Record<string, unknown> = {
    responseModalities: ['TEXT', 'IMAGE'],
  }
  if (opts.aspectRatio) {
    generationConfig.imageConfig = { aspectRatio: opts.aspectRatio }
  }
  if (opts.temperature !== undefined) {
    generationConfig.temperature = opts.temperature
  }
  if (opts.topP !== undefined) {
    generationConfig.topP = opts.topP
  }
  if (opts.topK !== undefined) {
    generationConfig.topK = opts.topK
  }

  const requestBody: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig,
  }

  if (opts.safetySettings) {
    requestBody.safetySettings = opts.safetySettings
  }

  if (opts.systemInstructionText) {
    requestBody.systemInstruction = {
      parts: [{ text: opts.systemInstructionText }],
    }
  }

  const modelName = opts.modelName
    || Deno.env.get('GEMINI_MODEL_NAME')
    || 'gemini-3-pro-image-preview'
  const baseUrl = opts.baseUrl
    || Deno.env.get('GEMINI_API_BASE_URL')
    || 'https://generativelanguage.googleapis.com/v1beta'
  const endpoint = `${baseUrl}/models/${modelName}:generateContent`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': opts.apiKey,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errText = await response.text()
    return {
      success: false,
      imageData: null,
      mimeType: '',
      error: `Gemini API ${response.status}: ${errText.substring(0, 200)}`,
    }
  }

  const result = await response.json()

  const candidate = result?.candidates?.[0]
  if (!candidate?.content?.parts) {
    return {
      success: false,
      imageData: null,
      mimeType: '',
      error: 'No candidates in Gemini response',
    }
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      const binaryStr = atob(part.inlineData.data)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      return {
        success: true,
        imageData: bytes,
        mimeType: part.inlineData.mimeType || 'image/png',
        error: null,
      }
    }
  }

  return {
    success: false,
    imageData: null,
    mimeType: '',
    error: 'No image data in Gemini response',
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
