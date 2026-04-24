// Validadores compartilhados para onboarding_identity.
// Extraído de save-onboarding-identity (ONB-23) para reuso pelas edges admin-*.

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const INSTAGRAM_HANDLE_RE = /^[a-zA-Z0-9._]{1,30}$/
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export const MAX_PALETTE_COLORS = 8
export const MAX_FONT_LENGTH = 100
export const MAX_NOTES_LENGTH = 2000
export const MAX_URL_LENGTH = 500
export const MAX_HANDLE_LENGTH = 30
export const MAX_BRAND_NAME_LENGTH = 120

export const LOGO_MAX_BYTES = 5 * 1024 * 1024
export const ALLOWED_LOGO_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]

export const VALID_CHOICES = ['add_now', 'later'] as const
export const VALID_PRODUCTION_PATHS = ['standard', 'hybrid'] as const

export type ValidationError = { code: string; message: string }
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: ValidationError }

export function validateUuid(id: string, field = 'compra_id'): ValidationResult<string> {
  if (!id || !UUID_REGEX.test(id)) {
    return { ok: false, error: { code: 'INVALID_UUID', message: `${field} invalido.` } }
  }
  return { ok: true, value: id }
}

export function validateBrandPalette(colors: unknown): ValidationResult<string[]> {
  if (!Array.isArray(colors)) {
    return { ok: false, error: { code: 'INVALID_PALETTE', message: 'brand_palette deve ser array.' } }
  }
  if (colors.length > MAX_PALETTE_COLORS) {
    return { ok: false, error: { code: 'TOO_MANY_COLORS', message: `Maximo ${MAX_PALETTE_COLORS} cores.` } }
  }
  const normalized: string[] = []
  for (const c of colors) {
    if (typeof c !== 'string' || !HEX_COLOR_RE.test(c)) {
      return {
        ok: false,
        error: { code: 'INVALID_COLOR', message: `Cor invalida: ${String(c)}. Use formato #RRGGBB.` },
      }
    }
    normalized.push(c.toLowerCase())
  }
  return { ok: true, value: normalized }
}

export function validateInstagramHandle(raw: string): ValidationResult<string> {
  const handle = String(raw ?? '').trim().replace(/^@/, '')
  if (!handle) return { ok: true, value: '' }
  if (!INSTAGRAM_HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_HANDLE',
        message: 'instagram_handle invalido (alfanumerico, . e _, max 30 chars).',
      },
    }
  }
  return { ok: true, value: handle }
}

export function validateSiteUrl(raw: string): ValidationResult<string> {
  const url = String(raw ?? '').trim()
  if (!url) return { ok: true, value: '' }
  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, error: { code: 'URL_TOO_LONG', message: `site_url excede ${MAX_URL_LENGTH} chars.` } }
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return {
      ok: false,
      error: { code: 'INVALID_URL', message: 'site_url deve comecar com http:// ou https://.' },
    }
  }
  return { ok: true, value: url }
}

export function validateCampaignNotes(raw: string): ValidationResult<string> {
  const notes = String(raw ?? '').trim()
  if (notes.length > MAX_NOTES_LENGTH) {
    return {
      ok: false,
      error: { code: 'NOTES_TOO_LONG', message: `Notas excedem ${MAX_NOTES_LENGTH} chars.` },
    }
  }
  return { ok: true, value: notes }
}

export function validateFontChoice(raw: string): ValidationResult<string> {
  const font = String(raw ?? '').trim()
  if (font.length > MAX_FONT_LENGTH) {
    return {
      ok: false,
      error: { code: 'FONT_TOO_LONG', message: `font_choice excede ${MAX_FONT_LENGTH} chars.` },
    }
  }
  return { ok: true, value: font }
}

export function validateBrandDisplayName(raw: string): ValidationResult<string> {
  const name = String(raw ?? '').trim()
  if (!name) {
    return {
      ok: false,
      error: { code: 'BRAND_NAME_EMPTY', message: 'brand_display_name nao pode ser vazio.' },
    }
  }
  if (name.length > MAX_BRAND_NAME_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'BRAND_NAME_TOO_LONG',
        message: `brand_display_name excede ${MAX_BRAND_NAME_LENGTH} chars.`,
      },
    }
  }
  return { ok: true, value: name }
}

export function validateProductionPath(raw: string): ValidationResult<string> {
  const p = String(raw ?? '').trim()
  if (!p) return { ok: true, value: '' }
  if (!VALID_PRODUCTION_PATHS.includes(p as typeof VALID_PRODUCTION_PATHS[number])) {
    return {
      ok: false,
      error: {
        code: 'INVALID_PRODUCTION_PATH',
        message: `production_path deve ser ${VALID_PRODUCTION_PATHS.join(' ou ')}.`,
      },
    }
  }
  return { ok: true, value: p }
}

export function validateLogoFile(file: File): ValidationResult<File> {
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, error: { code: 'LOGO_TOO_LARGE', message: 'Logo excede 5 MB.' } }
  }
  const mime = (file.type || '').toLowerCase()
  const mimeOk = ALLOWED_LOGO_MIMES.some((t) => mime.startsWith(t))
  if (!mimeOk) {
    const name = (file.name || '').toLowerCase()
    const extOk = /\.(heic|heif|png|jpe?g|webp|pdf|svg)$/i.test(name)
    if (!extOk) {
      return {
        ok: false,
        error: {
          code: 'INVALID_LOGO_TYPE',
          message: 'Formato nao suportado (use PNG, JPG, PDF, WebP, SVG, HEIC ou HEIF).',
        },
      }
    }
  }
  return { ok: true, value: file }
}

export function getFileExtension(file: File): string {
  const name = file.name || ''
  const dotIdx = name.lastIndexOf('.')
  if (dotIdx > 0) return name.slice(dotIdx + 1).toLowerCase()
  const mime = file.type || ''
  if (mime.includes('svg')) return 'svg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('heic')) return 'heic'
  if (mime.includes('heif')) return 'heif'
  return 'jpg'
}
