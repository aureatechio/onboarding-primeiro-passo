/**
 * Activity Logger - Sistema Centralizado de Logs de Atividade
 * 
 * Registra eventos de Checkout, Contratos e NFS-e para monitoramento.
 * - Fire-and-forget: não bloqueia o fluxo principal
 * - Sanitiza dados sensíveis (números de cartão, CVV)
 * - Silencia erros de logging
 * - Suporta severidade de alertas (info, warning, critical)
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ============================================================================
// TYPES
// ============================================================================

export type ActivityModule = 'checkout' | 'contract' | 'nfse' | 'omie';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ActivitySource = 'frontend' | 'edge_function' | 'webhook' | 'cron' | 'manual';

export interface ActivityLogEntry {
  module: ActivityModule;
  event: string;
  eventLabel: string;
  compraId?: string;
  clienteId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  source?: ActivitySource;
  sourceIp?: string;
  userAgent?: string;
  isError?: boolean;
  severity?: AlertSeverity;
  errorCode?: string;
  errorMessage?: string;
  executionTimeMs?: number;
}

// ============================================================================
// CHECKOUT EVENTS
// ============================================================================

export const CHECKOUT_EVENTS = {
  // Criação
  SESSION_CREATED: { event: 'checkout.session_created', label: 'Link de pagamento criado' },
  
  // Acesso (frontend)
  PAGE_VIEWED: { event: 'checkout.page_viewed', label: 'Cliente acessou o checkout' },
  PAGE_LOADED: { event: 'checkout.page_loaded', label: 'Página carregou completamente' },
  
  // Formulário (frontend)
  FIELD_FOCUSED: { event: 'checkout.field_focused', label: 'Cliente clicou no campo' },
  FIELD_FILLED: { event: 'checkout.field_filled', label: 'Campo preenchido' },
  ADDRESS_VALIDATED: { event: 'checkout.address_validated', label: 'Endereço validado via CEP' },
  ADDRESS_INVALID: { event: 'checkout.address_invalid', label: 'CEP não encontrado' },
  
  // Método de pagamento
  METHOD_SELECTED: { event: 'checkout.method_selected', label: 'Método de pagamento selecionado' },
  CARD_TOKENIZED: { event: 'checkout.card_tokenized', label: 'Dados do cartão tokenizados' },
  
  // 3DS
  '3DS_STARTED': { event: 'checkout.3ds_started', label: 'Autenticação 3DS iniciada' },
  '3DS_COMPLETED': { event: 'checkout.3ds_completed', label: 'Autenticação 3DS concluída' },
  '3DS_FAILED': { event: 'checkout.3ds_failed', label: 'Falha na autenticação 3DS' },
  
  // Pagamento
  PAYMENT_STARTED: { event: 'checkout.payment_started', label: 'Processando pagamento' },
  PAYMENT_AUTHORIZED: { event: 'checkout.payment_authorized', label: 'Pagamento autorizado' },
  PAYMENT_CONFIRMED: { event: 'checkout.payment_confirmed', label: 'Pagamento confirmado' },
  PAYMENT_DENIED: { event: 'checkout.payment_denied', label: 'Pagamento recusado' },
  
  // PIX
  PIX_GENERATED: { event: 'checkout.pix_generated', label: 'QR Code PIX gerado' },
  PIX_COPIED: { event: 'checkout.pix_copied', label: 'Cliente copiou o código PIX' },
  PIX_PAID: { event: 'checkout.pix_paid', label: 'PIX pago com sucesso' },
  PIX_EXPIRED: { event: 'checkout.pix_expired', label: 'PIX expirou sem pagamento' },
  
  // Boleto
  BOLETO_GENERATED: { event: 'checkout.boleto_generated', label: 'Boleto gerado' },
  BOLETO_DOWNLOADED: { event: 'checkout.boleto_downloaded', label: 'Cliente baixou o boleto' },
  BOLETO_PAID: { event: 'checkout.boleto_paid', label: 'Boleto compensado' },
  
  // Abandono e erro
  ABANDONED: { event: 'checkout.abandoned', label: 'Checkout abandonado' },
  ERROR: { event: 'checkout.error', label: 'Erro no checkout' },
} as const;

// ============================================================================
// CONTRACT EVENTS
// ============================================================================

export const CONTRACT_EVENTS = {
  CREATED: { event: 'contract.created', label: 'Contrato criado no sistema' },
  SENT: { event: 'contract.sent', label: 'Contrato enviado para assinatura' },
  EMAIL_DELIVERED: { event: 'contract.email_delivered', label: 'E-mail de assinatura entregue' },
  EMAIL_OPENED: { event: 'contract.email_opened', label: 'E-mail de assinatura aberto' },
  LINK_ACCESSED: { event: 'contract.link_accessed', label: 'Signatário acessou o link' },
  DOCUMENT_VIEWED: { event: 'contract.document_viewed', label: 'Signatário visualizou o contrato' },
  SIGNATURE_STARTED: { event: 'contract.signature_started', label: 'Signatário iniciou assinatura' },
  SIGNATURE_COMPLETED: { event: 'contract.signature_completed', label: 'Signatário assinou o contrato' },
  ALL_SIGNED: { event: 'contract.all_signed', label: 'Todas as partes assinaram' },
  SIGNED_DOWNLOADED: { event: 'contract.signed_downloaded', label: 'Contrato assinado baixado' },
  REFUSED: { event: 'contract.refused', label: 'Signatário recusou assinar' },
  REMINDER_SENT: { event: 'contract.reminder_sent', label: 'Lembrete enviado' },
  EXPIRED: { event: 'contract.expired', label: 'Contrato expirou' },
  CANCELLED: { event: 'contract.cancelled', label: 'Contrato cancelado' },
  ERROR: { event: 'contract.error', label: 'Erro no contrato' },
} as const;

// ============================================================================
// NFSE EVENTS
// ============================================================================

export const NFSE_EVENTS = {
  ELIGIBILITY_CHECK: { event: 'nfse.eligibility_check', label: 'Verificando elegibilidade' },
  ELIGIBLE: { event: 'nfse.eligible', label: 'Compra elegível para NFS-e' },
  NOT_ELIGIBLE: { event: 'nfse.not_eligible', label: 'Não elegível para NFS-e' },
  CUSTOMER_VALIDATED: { event: 'nfse.customer_validated', label: 'Dados do cliente validados' },
  CUSTOMER_INVALID: { event: 'nfse.customer_invalid', label: 'Dados do cliente inválidos' },
  IBGE_RESOLVED: { event: 'nfse.ibge_resolved', label: 'Código IBGE encontrado' },
  IBGE_NOT_FOUND: { event: 'nfse.ibge_not_found', label: 'Cidade não encontrada no IBGE' },
  EMISSION_LOCKED: { event: 'nfse.emission_locked', label: 'Bloqueio de concorrência adquirido' },
  EMISSION_ALREADY_RUNNING: { event: 'nfse.emission_already_running', label: 'Emissão já em andamento' },
  API_REQUEST_SENT: { event: 'nfse.api_request_sent', label: 'Requisição enviada para NFe.io' },
  API_RESPONSE_RECEIVED: { event: 'nfse.api_response_received', label: 'Resposta recebida da NFe.io' },
  API_ERROR: { event: 'nfse.api_error', label: 'Erro na API NFe.io' },
  PENDING_APPROVAL: { event: 'nfse.pending_approval', label: 'Aguardando prefeitura' },
  ISSUED: { event: 'nfse.issued', label: 'NFS-e emitida' },
  REJECTED: { event: 'nfse.rejected', label: 'Rejeitada pela prefeitura' },
  XML_AVAILABLE: { event: 'nfse.xml_available', label: 'XML disponível' },
  PDF_AVAILABLE: { event: 'nfse.pdf_available', label: 'PDF disponível' },
  CANCEL_REQUESTED: { event: 'nfse.cancel_requested', label: 'Cancelamento solicitado' },
  CANCELLED: { event: 'nfse.cancelled', label: 'NFS-e cancelada' },
  CANCEL_DENIED: { event: 'nfse.cancel_denied', label: 'Cancelamento negado' },
  RETRY_SCHEDULED: { event: 'nfse.retry_scheduled', label: 'Tentativa agendada' },
  MAX_RETRIES_REACHED: { event: 'nfse.max_retries_reached', label: 'Máximo de tentativas' },
  OMIE_TRIGGERED: { event: 'nfse.omie_triggered', label: 'Sincronização OMIE iniciada' },
  ERROR: { event: 'nfse.error', label: 'Erro na NFS-e' },
} as const;

// ============================================================================
// SENSITIVE DATA HANDLING
// ============================================================================

const SENSITIVE_PATTERNS = [
  /\b\d{13,19}\b/g,           // Números de cartão (13-19 dígitos)
  /\b\d{3,4}\b(?=.*cvv)/gi,   // CVV
];

const SENSITIVE_KEYS = [
  'cardNumber', 'card_number', 'numero_cartao',
  'cvv', 'securityCode', 'security_code', 'codigo_seguranca',
  'password', 'senha', 'secret',
  'token', 'accessToken', 'access_token',
  'authorization', 'bearer',
];

/**
 * Sanitiza um payload removendo/mascarando dados sensíveis
 */
export function sanitizePayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    let sanitized = payload;
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        if (match.length >= 13) {
          return `****${match.slice(-4)}`;
        }
        return '***';
      });
    });
    return sanitized;
  }

  if (Array.isArray(payload)) {
    return payload.map(item => sanitizePayload(item));
  }

  if (typeof payload === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(payload)) {
      const isSensitiveKey = SENSITIVE_KEYS.some(
        sensitive => key.toLowerCase().includes(sensitive.toLowerCase())
      );
      
      if (isSensitiveKey) {
        if (typeof value === 'string' && value.length > 4) {
          sanitized[key] = `****${value.slice(-4)}`;
        } else {
          sanitized[key] = '***REDACTED***';
        }
      } else {
        sanitized[key] = sanitizePayload(value);
      }
    }
    
    return sanitized;
  }

  return payload;
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('[ACTIVITY_LOG] Missing Supabase credentials');
    return null;
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

// ============================================================================
// MAIN LOGGING FUNCTION
// ============================================================================

/**
 * Registra um evento de atividade no banco de dados
 * 
 * Fire-and-forget: retorna imediatamente, não aguarda o insert
 * Silencia erros: apenas loga no console, não propaga exceções
 */
export function logActivity(entry: ActivityLogEntry): void {
  (async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const sanitizedEntry = {
        module: entry.module,
        event: entry.event,
        event_label: entry.eventLabel,
        compra_id: entry.compraId || null,
        cliente_id: entry.clienteId || null,
        session_id: entry.sessionId || null,
        metadata: entry.metadata ? sanitizePayload(entry.metadata) : null,
        source: entry.source || 'edge_function',
        source_ip: entry.sourceIp || null,
        user_agent: entry.userAgent ? entry.userAgent.substring(0, 500) : null,
        is_error: entry.isError || false,
        severity: entry.severity || 'info',
        error_code: entry.errorCode || null,
        error_message: entry.errorMessage ? entry.errorMessage.substring(0, 1000) : null,
        execution_time_ms: entry.executionTimeMs || null,
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(sanitizedEntry);

      if (error) {
        console.error('[ACTIVITY_LOG] Failed to insert:', error.message);
      }
    } catch (err) {
      console.error('[ACTIVITY_LOG] Unexpected error:', err instanceof Error ? err.message : 'Unknown');
    }
  })();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Log de evento de checkout
 */
export function logCheckoutEvent(
  eventDef: { event: string; label: string },
  options: {
    sessionId?: string;
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
    sourceIp?: string;
    userAgent?: string;
    executionTimeMs?: number;
  } = {}
): void {
  logActivity({
    module: 'checkout',
    event: eventDef.event,
    eventLabel: eventDef.label,
    sessionId: options.sessionId,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'edge_function',
    sourceIp: options.sourceIp,
    userAgent: options.userAgent,
    executionTimeMs: options.executionTimeMs,
  });
}

/**
 * Log de erro de checkout
 */
export function logCheckoutError(
  eventDef: { event: string; label: string },
  errorCode: string,
  errorMessage: string,
  options: {
    sessionId?: string;
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
    sourceIp?: string;
    userAgent?: string;
    severity?: AlertSeverity;
    executionTimeMs?: number;
  } = {}
): void {
  logActivity({
    module: 'checkout',
    event: eventDef.event,
    eventLabel: eventDef.label,
    sessionId: options.sessionId,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'edge_function',
    sourceIp: options.sourceIp,
    userAgent: options.userAgent,
    isError: true,
    severity: options.severity || 'warning',
    errorCode,
    errorMessage,
    executionTimeMs: options.executionTimeMs,
  });
}

/**
 * Log de evento de NFS-e
 */
export function logNfseEvent(
  eventDef: { event: string; label: string },
  options: {
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
    executionTimeMs?: number;
  } = {}
): void {
  logActivity({
    module: 'nfse',
    event: eventDef.event,
    eventLabel: eventDef.label,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'edge_function',
    executionTimeMs: options.executionTimeMs,
  });
}

/**
 * Log de erro de NFS-e
 */
export function logNfseError(
  eventDef: { event: string; label: string },
  errorCode: string,
  errorMessage: string,
  options: {
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
    severity?: AlertSeverity;
    executionTimeMs?: number;
  } = {}
): void {
  logActivity({
    module: 'nfse',
    event: eventDef.event,
    eventLabel: eventDef.label,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'edge_function',
    isError: true,
    severity: options.severity || 'warning',
    errorCode,
    errorMessage,
    executionTimeMs: options.executionTimeMs,
  });
}

/**
 * Log de evento de contrato
 */
export function logContractEvent(
  eventDef: { event: string; label: string },
  options: {
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): void {
  logActivity({
    module: 'contract',
    event: eventDef.event,
    eventLabel: eventDef.label,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'webhook',
  });
}

/**
 * Log de erro de contrato
 */
export function logContractError(
  eventDef: { event: string; label: string },
  errorCode: string,
  errorMessage: string,
  options: {
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
    severity?: AlertSeverity;
  } = {}
): void {
  logActivity({
    module: 'contract',
    event: eventDef.event,
    eventLabel: eventDef.label,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'webhook',
    isError: true,
    severity: options.severity || 'warning',
    errorCode,
    errorMessage,
  });
}

/**
 * Log de evento do frontend (via endpoint dedicado)
 */
export function logFrontendEvent(
  module: ActivityModule,
  event: string,
  eventLabel: string,
  options: {
    sessionId?: string;
    compraId?: string;
    clienteId?: string;
    metadata?: Record<string, unknown>;
    sourceIp?: string;
    userAgent?: string;
  } = {}
): void {
  logActivity({
    module,
    event,
    eventLabel,
    sessionId: options.sessionId,
    compraId: options.compraId,
    clienteId: options.clienteId,
    metadata: options.metadata,
    source: 'frontend',
    sourceIp: options.sourceIp,
    userAgent: options.userAgent,
  });
}

// ============================================================================
// EXECUTION TIMER
// ============================================================================

export class ExecutionTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
}
