/**
 * Edge Function: read-nanobanana-reference
 * Lê imagem de referência por categoria e devolve direção criativa em texto.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_CATEGORIES = ['moderna', 'clean', 'retail'] as const
type Category = (typeof VALID_CATEGORIES)[number]

const MAX_UPLOAD_BYTES = parseInt(
  Deno.env.get('NANOBANANA_MAX_REFERENCE_UPLOAD_BYTES') ?? String(10 * 1024 * 1024),
  10,
)

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isValidCategory(value: string): value is Category {
  return (VALID_CATEGORIES as readonly string[]).includes(value)
}

function isValidImageMime(mimeType: string): boolean {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)
}

function getPromptForCategory(category: Category): string {
  const titleByCategory: Record<Category, string> = {
    moderna: 'CREATIVE DIRECTION — MODERNA (Dark & Bold)',
    clean: 'CREATIVE DIRECTION — CLEAN (Light & Editorial)',
    retail: 'CREATIVE DIRECTION — RETAIL (Hard Sell & Impact)',
  }

  return [
    'Você é Diretor de Arte Sênior.',
    `Analise a imagem enviada e responda SOMENTE neste formato para a categoria ${category.toUpperCase()}:`,
    '',
    titleByCategory[category],
    '- Background: ...',
    '- Celebrity: ...',
    '- Layout: ...',
    '- Typography: ...',
    '- Reference mood: ...',
    '',
    'Regras obrigatórias:',
    '- Responda em inglês.',
    '- Texto objetivo e acionável para geração de criativo.',
    '- Não inclua texto fora desse bloco.',
  ].join('\n')
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function extractTextFromGeminiResponse(result: any): string | null {
  const parts = result?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null

  const text = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim()

  return text || null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Método não permitido', code: 'METHOD_NOT_ALLOWED' }, 405)
    }

    const contentType = req.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'Content-Type deve ser multipart/form-data', code: 'INVALID_CONTENT_TYPE' }, 400)
    }

    const formData = await req.formData()
    const categoryRaw = String(formData.get('category') ?? '').trim().toLowerCase()
    if (!isValidCategory(categoryRaw)) {
      return json({ error: 'Categoria inválida. Use moderna, clean ou retail.', code: 'INVALID_CATEGORY' }, 400)
    }

    const imageFile = formData.get('image')
    if (!(imageFile instanceof File) || imageFile.size <= 0) {
      return json({ error: 'Arquivo de imagem é obrigatório.', code: 'MISSING_IMAGE' }, 400)
    }

    if (!isValidImageMime(imageFile.type)) {
      return json({ error: 'Imagem deve ser PNG, JPEG ou WEBP.', code: 'INVALID_IMAGE_TYPE' }, 415)
    }

    if (imageFile.size > MAX_UPLOAD_BYTES) {
      return json(
        {
          error: `Imagem excede o limite de ${MAX_UPLOAD_BYTES} bytes.`,
          code: 'IMAGE_TOO_LARGE',
        },
        400,
      )
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY não configurada.', code: 'CONFIG_ERROR' }, 500)
    }

    const imageBytes = new Uint8Array(await imageFile.arrayBuffer())
    const base64Image = bytesToBase64(imageBytes)
    const modelName = Deno.env.get('GEMINI_MODEL_NAME') || 'gemini-1.5-flash'
    const baseUrl = Deno.env.get('GEMINI_API_BASE_URL') || 'https://generativelanguage.googleapis.com/v1beta'
    const endpoint = `${baseUrl}/models/${modelName}:generateContent`

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: imageFile.type,
                data: base64Image,
              },
            },
            { text: getPromptForCategory(categoryRaw) },
          ],
        },
      ],
    }

    const geminiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      return json(
        {
          error: `Gemini API ${geminiResponse.status}`,
          code: 'MODEL_ERROR',
          details: errText.substring(0, 300),
        },
        502,
      )
    }

    const geminiResult = await geminiResponse.json()
    const directionText = extractTextFromGeminiResponse(geminiResult)
    if (!directionText) {
      return json(
        {
          error: 'Modelo não retornou texto de direção criativa.',
          code: 'EMPTY_MODEL_RESPONSE',
        },
        502,
      )
    }

    return json({
      success: true,
      category: categoryRaw,
      direction_text: directionText,
    })
  } catch (error) {
    return json(
      {
        error: 'Erro interno ao ler imagem de referência.',
        code: 'INTERNAL_ERROR',
        details: String(error),
      },
      500,
    )
  }
})
