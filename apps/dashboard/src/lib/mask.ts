import { maskDocument as sharedMaskDocument } from '@aurea/shared/mask'

export function maskDocument(value: string | null | undefined): string {
  if (value == null) {
    return '—'
  }

  return sharedMaskDocument(value)
}
// ============================================
// INPUT MASKS - Formatação para exibição
// ============================================

/**
 * Aplica máscara de CEP: 00000-000
 */
export function applyCepMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return digits
}

/**
 * Aplica máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  // 11 dígitos (celular com 9)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
export function applyCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

// ============================================
// VALIDAÇÃO - Verificação de formato
// ============================================

/**
 * Valida formato de CEP (8 dígitos)
 */
export function validateCep(value: string): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return { valid: true } // Campo vazio é válido (opcional)
  if (digits.length !== 8) {
    return {
      valid: false,
      error: `CEP deve ter 8 dígitos (atual: ${digits.length})`,
    }
  }
  return { valid: true }
}

/**
 * Valida formato de telefone (10-11 dígitos com DDD)
 */
export function validatePhone(
  value: string
): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return { valid: true } // Campo vazio é válido (opcional)
  if (digits.length < 10 || digits.length > 11) {
    return {
      valid: false,
      error: `Telefone deve ter 10-11 dígitos com DDD (atual: ${digits.length})`,
    }
  }
  return { valid: true }
}

/**
 * Valida formato de CPF (11 dígitos)
 */
export function validateCpf(value: string): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return { valid: true }
  if (digits.length !== 11) {
    return {
      valid: false,
      error: `CPF deve ter 11 dígitos (atual: ${digits.length})`,
    }
  }
  return { valid: true }
}

/**
 * Valida formato de CNPJ (14 dígitos)
 */
export function validateCnpj(
  value: string
): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return { valid: true }
  if (digits.length !== 14) {
    return {
      valid: false,
      error: `CNPJ deve ter 14 dígitos (atual: ${digits.length})`,
    }
  }
  return { valid: true }
}

/**
 * Valida formato de email
 */
export function validateEmailFormat(
  value: string
): { valid: boolean; error?: string } {
  if (!value) return { valid: true }

  const normalized = value.trim()
  if (!normalized) return { valid: true }

  if (normalized.includes(',') || normalized.includes(';') || /\s/.test(normalized)) {
    return {
      valid: false,
      error: 'E-mail inválido: remova vírgulas, ponto e vírgula e espaços',
    }
  }

  const parts = normalized.split('@')
  if (parts.length !== 2) {
    return { valid: false, error: 'E-mail em formato inválido' }
  }

  const [local, domain] = parts
  if (!local || !domain) {
    return { valid: false, error: 'E-mail em formato inválido' }
  }

  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return { valid: false, error: 'E-mail inválido: revise o texto antes do @' }
  }

  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { valid: false, error: 'E-mail inválido: revise o domínio' }
  }

  const labels = domain.split('.')
  if (labels.length < 2 || labels.some((label) => label.length === 0)) {
    return { valid: false, error: 'E-mail inválido: domínio incompleto' }
  }

  if (
    labels.some(
      (label) =>
        !/^[A-Za-z0-9-]+$/.test(label) ||
        label.startsWith('-') ||
        label.endsWith('-')
    )
  ) {
    return { valid: false, error: 'E-mail inválido: domínio em formato incorreto' }
  }

  const tld = labels[labels.length - 1]
  if (!tld || tld.length < 2 || !/^[A-Za-z]{2,}$/.test(tld)) {
    return { valid: false, error: 'E-mail inválido: domínio em formato incorreto' }
  }

  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return { valid: false, error: 'E-mail inválido: caracteres não permitidos' }
  }

  return { valid: true }
}

/** Formats a CPF (000.000.000-00) or CNPJ (00.000.000/0000-00) without masking */
export function formatDocument(doc: string | null | undefined): string {
  if (!doc) return '—'
  const cleaned = doc.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return applyCpfMask(cleaned)
  }
  if (cleaned.length === 14) {
    return applyCnpjMask(cleaned)
  }
  return doc
}

/**
 * Masks an email: j***@email.com
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—'
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  return `${local[0]}***@${domain}`
}

/**
 * Formats cents to BRL currency string
 */
export function formatCurrency(
  value: number | string | null | undefined
): string {
  if (value == null) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

/**
 * Formats cents to BRL currency string
 */
export function formatCentsToCurrency(
  cents: number | null | undefined
): string {
  if (cents == null) return '—'
  return formatCurrency(cents / 100)
}

/**
 * Formats a date string to locale
 */
export function formatDate(
  date: string | null | undefined,
  opts?: { time?: boolean }
): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(opts?.time !== false && {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  })
}

/**
 * Formats date to dd/mm/yy without time
 */
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * Relative time (e.g., "há 5 min", "há 2h")
 */
export function timeAgo(date: string | null | undefined): string {
  if (!date) return '—'
  const now = Date.now()
  const d = new Date(date).getTime()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}
