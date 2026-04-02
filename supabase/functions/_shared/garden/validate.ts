export const VALID_FORMATS = ['1:1', '4:5', '16:9', '9:16'] as const
export type ImageFormat = (typeof VALID_FORMATS)[number]

export const MAX_IMAGE_SIZE = 15 * 1024 * 1024 // 15 MB
export const MAX_PROMPT_LENGTH = 5000
export const BUCKET_NAME = 'aurea-garden-assets'

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

export function isValidFormat(value: unknown): value is ImageFormat {
  return typeof value === 'string' && VALID_FORMATS.includes(value as ImageFormat)
}

export function isValidUuid(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

export function validateImageFile(
  file: File | null,
  fieldName: string,
  required: boolean,
): string | null {
  if (!file) {
    return required ? `${fieldName} e obrigatorio.` : null
  }
  if (!ALLOWED_IMAGE_TYPES.some((t) => file.type.startsWith(t.replace('/jpg', '/jpeg')))) {
    return `${fieldName} deve ser PNG, JPEG ou WebP.`
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `${fieldName} excede o limite de 15 MB.`
  }
  return null
}

export function validatePrompt(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return 'prompt e obrigatorio.'
  }
  if (value.length > MAX_PROMPT_LENGTH) {
    return `prompt excede o limite de ${MAX_PROMPT_LENGTH} caracteres.`
  }
  return null
}

export function validateFormat(value: unknown): string | null {
  if (!isValidFormat(value)) {
    return `format invalido. Valores aceitos: ${VALID_FORMATS.join(', ')}`
  }
  return null
}

export function nonEmptyString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return `${fieldName} e obrigatorio.`
  }
  return null
}

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_TIMEOUT'
  | 'UPLOAD_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'

export function errorJson(
  code: ErrorCode,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ success: false, code, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

export function successJson(
  data: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  status = 200,
): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
