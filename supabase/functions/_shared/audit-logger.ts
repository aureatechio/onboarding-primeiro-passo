/**
 * Módulo de Auditoria para Checkout
 * 
 * Registra todo o ciclo de vida do checkout para debug e monitoramento.
 * - Fire-and-forget: não bloqueia o fluxo principal
 * - Sanitiza dados sensíveis (números de cartão)
 * - Silencia erros de logging
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// Tipos de eventos suportados
export type AuditEventType = 
  | 'CREATE_REQUEST' 
  | 'CREATE_SUCCESS' 
  | 'CREATE_ERROR' 
  | 'VALIDATION_FAILED' 
  | 'PAYMENT_ATTEMPT' 
  | 'PAYMENT_SUCCESS' 
  | 'PAYMENT_ERROR' 
  | 'PIX_GENERATED' 
  | 'BOLETO_GENERATED' 
  | 'SOP_ERROR';

export interface AuditLogEntry {
  session_id?: string;
  compra_id?: string;
  cliente_id?: string;
  event_type: AuditEventType;
  ip_address?: string;
  user_agent?: string;
  request_payload?: Record<string, unknown>;
  cliente_snapshot?: Record<string, unknown>;
  response_data?: Record<string, unknown>;
  validation_errors?: string[];
  error_code?: string;
  error_message?: string;
  function_name: string;
  execution_time_ms?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Padrões de dados sensíveis a serem mascarados
 */
const SENSITIVE_PATTERNS = [
  /\b\d{13,19}\b/g,           // Números de cartão (13-19 dígitos)
  /\b\d{3,4}\b(?=.*cvv)/gi,   // CVV
];

const SENSITIVE_KEYS = [
  'cardNumber', 'card_number', 'numero_cartao',
  'cvv', 'securityCode', 'security_code', 'codigo_seguranca',
  'password', 'senha', 'secret',
  'token', 'accessToken', 'access_token',
];

/**
 * Sanitiza um payload removendo/mascarando dados sensíveis
 */
export function sanitizePayload(payload: unknown): unknown {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    // Mascara números que parecem cartões
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
      // Verifica se a chave é sensível
      const isSensitiveKey = SENSITIVE_KEYS.some(
        sensitive => key.toLowerCase().includes(sensitive.toLowerCase())
      );
      
      if (isSensitiveKey) {
        // Mascara o valor
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

/**
 * Registra um evento de auditoria no banco de dados
 * 
 * Características:
 * - Fire-and-forget: retorna imediatamente, não aguarda o insert
 * - Silencia erros: apenas loga no console, não propaga exceções
 * - Sanitiza dados: remove informações sensíveis antes de salvar
 */
export function logCheckoutAudit(entry: AuditLogEntry): void {
  // Fire-and-forget: executa em background
  (async () => {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('[AUDIT] Missing Supabase credentials');
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Sanitiza payloads antes de salvar
      const sanitizedEntry = {
        session_id: entry.session_id || null,
        compra_id: entry.compra_id || null,
        cliente_id: entry.cliente_id || null,
        event_type: entry.event_type,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent ? entry.user_agent.substring(0, 500) : null, // Limita tamanho
        request_payload: entry.request_payload ? sanitizePayload(entry.request_payload) : null,
        cliente_snapshot: entry.cliente_snapshot || null,
        response_data: entry.response_data ? sanitizePayload(entry.response_data) : null,
        validation_errors: entry.validation_errors || null,
        error_code: entry.error_code || null,
        error_message: entry.error_message ? entry.error_message.substring(0, 1000) : null, // Limita tamanho
        function_name: entry.function_name,
        execution_time_ms: entry.execution_time_ms || null,
        metadata: entry.metadata || null,
      };

      const { error } = await supabase
        .from('checkout_audit_log')
        .insert(sanitizedEntry);

      if (error) {
        console.error('[AUDIT] Failed to insert log:', error.message);
      }
    } catch (err) {
      // Silencia erros - logging não deve quebrar o fluxo principal
      console.error('[AUDIT] Unexpected error:', err instanceof Error ? err.message : 'Unknown error');
    }
  })();
}

/**
 * Helper para criar snapshot do cliente para auditoria
 */
export function createClienteSnapshot(cliente: {
  id?: string;
  nome?: string;
  cpf?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
} | null | undefined): Record<string, unknown> | null {
  if (!cliente) return null;
  
  // Determina qual documento está disponível (prioriza CPF)
  const documento = cliente.cpf || cliente.cnpj || '(vazio)';
  const tipoDocumento = cliente.cpf ? 'CPF' : (cliente.cnpj ? 'CNPJ' : 'N/A');
  
  return {
    id: cliente.id || null,
    nome: cliente.nome || null,
    documento: documento,
    tipo_documento: tipoDocumento,
    cpf: cliente.cpf || null,
    cnpj: cliente.cnpj || null,
    email: cliente.email || null,
    telefone: cliente.telefone || null,
    cep: cliente.cep || null,
    endereco: cliente.logradouro ? 
      `${cliente.logradouro}, ${cliente.numero || 's/n'} - ${cliente.bairro || ''}, ${cliente.cidade || ''}/${cliente.estado || ''}` : 
      null,
  };
}

/**
 * Helper para medir tempo de execução
 */
export class ExecutionTimer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }
}
