const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MIN_PALETTE_COLORS = 1
const MAX_PALETTE_COLORS = 5
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

export function validateLogoFile(file) {
  if (!file) return { valid: false, error: 'Envie o logo para avançar.' }
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Formato não suportado (${file.type || 'desconhecido'}). Use PNG, JPG, SVG ou WebP.`,
    }
  }
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `Arquivo muito grande (${sizeMB} MB). Máximo permitido: 5 MB.`,
    }
  }
  return { valid: true, error: null }
}

export function validatePalette(colors) {
  if (!Array.isArray(colors) || colors.length < MIN_PALETTE_COLORS) {
    return { valid: false, error: 'Adicione ao menos 1 cor à paleta.' }
  }
  if (colors.length > MAX_PALETTE_COLORS) {
    return { valid: false, error: `Máximo de ${MAX_PALETTE_COLORS} cores.` }
  }
  const invalidColor = colors.find((c) => !HEX_COLOR_REGEX.test(c))
  if (invalidColor) {
    return { valid: false, error: `Cor inválida: ${invalidColor}. Use formato #RRGGBB.` }
  }
  return { valid: true, error: null }
}

export function validateFont(fontId) {
  if (!fontId || typeof fontId !== 'string' || fontId.trim().length === 0) {
    return { valid: false, error: 'Selecione uma fonte para avançar.' }
  }
  return { valid: true, error: null }
}

export function validateAiStep2Inputs({ logoFile, logoName, colors, fontId }) {
  const errors = {}

  const logoResult = logoFile ? validateLogoFile(logoFile) : { valid: Boolean(logoName), error: logoName ? null : 'Envie o logo para avançar.' }
  if (!logoResult.valid) errors.logo = logoResult.error

  const paletteResult = validatePalette(colors)
  if (!paletteResult.valid) errors.palette = paletteResult.error

  const fontResult = validateFont(fontId)
  if (!fontResult.valid) errors.font = fontResult.error

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
