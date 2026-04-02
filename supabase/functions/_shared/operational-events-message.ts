import { FALLBACK_CELEBRIDADE, FALLBACK_VENDEDOR } from './operational-events-labels.ts'

const ERROR_MAX_LEN = 200

export type WhatsAppMessageContext = {
  vendedor_nome: string
  celebridade_nome: string
  compra_id_short: string
  session_id_short?: string
  metodo_pagamento?: string
  valor_reais?: string
  payment_id?: string
  event_name?: string
  omie_os_id?: string
  nf_numero?: string
  failure_code?: string
  last_error?: string
}

export function shortUuid(id: string | undefined | null): string {
  if (!id || id.length < 8) return id?.trim() || '—'
  return `…${id.slice(-8)}`
}

/**
 * Centavos para exibição em pt-BR: milhares com `.`, decimais com `,` (ex.: 1.234.567,89).
 * O prefixo `R$` fica nos templates da mensagem.
 */
export function formatCentavosBRL(centavos: unknown): string | undefined {
  const n = typeof centavos === 'number' ? centavos : Number(centavos)
  if (!Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  const intPart = Math.floor(abs / 100)
  const centPart = abs % 100
  const intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${intStr},${String(centPart).padStart(2, '0')}`
}

export function truncateOperationalError(text: string | undefined, max = ERROR_MAX_LEN): string {
  if (!text?.trim()) return '—'
  const t = text.trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

/**
 * Texto único para WhatsApp; ramifica por event_type (7 tipos).
 */
export function buildOperationalWhatsAppMessage(
  event_type: string,
  ctx: WhatsAppMessageContext
): string {
  const v = ctx.vendedor_nome?.trim() || FALLBACK_VENDEDOR
  const c = ctx.celebridade_nome?.trim() || FALLBACK_CELEBRIDADE
  const compra = ctx.compra_id_short
  const sess = ctx.session_id_short

  switch (event_type) {
    case 'checkout.session_created': {
      const lines = [
        '🛒 *Checkout — novo link*',
        '',
        'Nova sessão de pagamento criada.',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (sess) lines.push(`• *Sessão:* ${sess}`)
      if (ctx.metodo_pagamento) lines.push(`• *Método:* ${ctx.metodo_pagamento}`)
      if (ctx.valor_reais) lines.push(`• *Valor:* R$ ${ctx.valor_reais}`)
      lines.push('', 'Acompanhe no monitor.')
      return lines.join('\n')
    }
    case 'checkout.session_expired': {
      const lines = [
        '⏰ *Checkout — link expirado*',
        '',
        'O prazo do link de pagamento encerrou.',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (sess) lines.push(`• *Sessão:* ${sess}`)
      lines.push('', 'Se a venda segue ativa, gere novo link.')
      return lines.join('\n')
    }
    case 'contract.signed': {
      const lines = [
        '✍️ *Contrato — assinado*',
        '',
        'Contrato assinado no ClickSign.',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (ctx.event_name) lines.push(`• *Evento:* ${ctx.event_name}`)
      lines.push('', 'Próximos passos conforme fluxo da compra.')
      return lines.join('\n')
    }
    case 'checkout.payment_succeeded': {
      const lines = [
        '✅ *Pagamento — aprovado*',
        '',
        'Pagamento confirmado.',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (sess) lines.push(`• *Sessão:* ${sess}`)
      if (ctx.metodo_pagamento) lines.push(`• *Método:* ${ctx.metodo_pagamento}`)
      if (ctx.valor_reais) lines.push(`• *Valor:* R$ ${ctx.valor_reais}`)
      if (ctx.payment_id) lines.push(`• *ID pagamento:* ${ctx.payment_id}`)
      return lines.join('\n')
    }
    case 'checkout.payment_failed': {
      const lines = [
        '❌ *Pagamento — falha*',
        '',
        'Pagamento não concluído ou recusado.',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (sess) lines.push(`• *Sessão:* ${sess}`)
      if (ctx.metodo_pagamento) lines.push(`• *Método:* ${ctx.metodo_pagamento}`)
      if (ctx.last_error && ctx.last_error !== '—') {
        lines.push(`• *Motivo:* ${truncateOperationalError(ctx.last_error)}`)
      }
      lines.push('', 'Verificar no dashboard / outro meio de pagamento.')
      return lines.join('\n')
    }
    case 'omie.integration_synced': {
      const lines = [
        '📤 *OMIE — integrado*',
        '',
        'Integração concluída (NFSe neste fluxo).',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (ctx.omie_os_id) lines.push(`• *OS:* ${ctx.omie_os_id}`)
      if (ctx.nf_numero) lines.push(`• *NF:* ${ctx.nf_numero}`)
      return lines.join('\n')
    }
    case 'omie.integration_failed': {
      const lines = [
        '⚠️ *OMIE — falha*',
        '',
        'Falha na integração com a OMIE.',
        '',
        `• *Vendedor:* ${v}`,
        `• *Celebridade:* ${c}`,
        `• *Compra:* ${compra}`,
      ]
      if (ctx.failure_code) lines.push(`• *Código:* ${ctx.failure_code}`)
      lines.push(`• *Detalhe:* ${truncateOperationalError(ctx.last_error)}`)
      lines.push('', 'Conferir dados, NFSe e logs do orquestrador.')
      return lines.join('\n')
    }
    default:
      return `📋 *Evento operacional*\n\n• *Tipo:* ${event_type}\n• *Vendedor:* ${v}\n• *Celebridade:* ${c}\n• *Compra:* ${compra}`
  }
}
