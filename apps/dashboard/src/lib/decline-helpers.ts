/**
 * Port of supabase/functions/_shared/decline-mapping.ts for dashboard use.
 * Includes classifyDecline + seller script templates for the Decline Assistant Modal.
 */

// ==========================================
// Types (mirrored from Edge Function)
// ==========================================

export type RetryPolicy =
  | 'no_retry'
  | 'no_auto_retry'
  | 'user_retry_allowed'
  | 'user_retry_later'
  | 'retry_with_limit_4x_16d'
  | 'retry_next_day_4x_16d'
  | 'retry_after_few_seconds'
  | 'retry_after_1h'
  | 'retry_after_5m'
  | 'retry_after_72h'
  | 'retry_after_30d'

export type DeclineCategory =
  | 'invalid_card_data'
  | 'insufficient_funds'
  | 'card_blocked'
  | 'transaction_not_allowed'
  | 'suspected_fraud'
  | 'issuer_unavailable'
  | 'amount_or_installment_invalid'
  | 'wrong_payment_method'
  | 'recurrence_suspended'
  | 'auth_failed'
  | 'merchant_error'
  | 'processing_error'
  | 'three_ds_failed'
  | 'unknown'

type BrandKey = 'visa' | 'mastercard' | 'elo' | 'amex'

type DeclineRule = {
  code: string
  messageMatch?: string
  category: DeclineCategory
  retryPolicy: RetryPolicy
}

export type ClassificationSource =
  | 'provider_return_code'
  | 'return_code'
  | 'reason_code'
  | 'parsed_error_message'
  | 'fallback_unknown'

export type ClassificationConfidence = 'high' | 'medium' | 'low'

export type DeclineClassification = {
  category: DeclineCategory
  uxKey: string
  retryPolicy: RetryPolicy
  message: string
  matchedCode: string | null
  source: ClassificationSource
  confidence: ClassificationConfidence
  explanation: string
}

// ==========================================
// Category metadata
// ==========================================

const CATEGORY_META: Record<DeclineCategory, { uxKey: string; message: string }> = {
  invalid_card_data: {
    uxKey: 'UX_INVALID_CARD_DATA',
    message: 'Verifique os dados do cartao e tente novamente.',
  },
  insufficient_funds: {
    uxKey: 'UX_INSUFFICIENT_FUNDS',
    message: 'Saldo/limite insuficiente. Use outro cartao ou fale com o banco.',
  },
  card_blocked: {
    uxKey: 'UX_CARD_BLOCKED',
    message: 'Cartao bloqueado ou restrito. Contate seu banco.',
  },
  transaction_not_allowed: {
    uxKey: 'UX_TRANSACTION_NOT_ALLOWED',
    message: 'Transacao nao permitida. Use outro cartao ou contate seu banco.',
  },
  suspected_fraud: {
    uxKey: 'UX_SUSPECTED_FRAUD',
    message: 'Transacao nao autorizada. Contate seu banco.',
  },
  issuer_unavailable: {
    uxKey: 'UX_ISSUER_UNAVAILABLE',
    message: 'Banco indisponivel. Tente novamente mais tarde.',
  },
  amount_or_installment_invalid: {
    uxKey: 'UX_AMOUNT_INSTALLMENT_INVALID',
    message: 'Valor ou parcelas invalidos. Ajuste e tente novamente.',
  },
  wrong_payment_method: {
    uxKey: 'UX_WRONG_METHOD',
    message: 'Opcao de pagamento incorreta. Selecione a modalidade correta.',
  },
  recurrence_suspended: {
    uxKey: 'UX_RECURRENCE_SUSPENDED',
    message: 'Pagamento recorrente suspenso. Contate seu banco.',
  },
  auth_failed: {
    uxKey: 'UX_AUTH_FAILED',
    message: 'Autenticacao nao foi concluida. Tente novamente.',
  },
  merchant_error: {
    uxKey: 'UX_MERCHANT_ERROR',
    message: 'Nao foi possivel processar. Contate a loja.',
  },
  processing_error: {
    uxKey: 'UX_PROCESSING_ERROR',
    message: 'Nao foi possivel processar. Tente novamente mais tarde.',
  },
  three_ds_failed: {
    uxKey: 'UX_3DS_FAILED',
    message: 'Falha na verificacao de seguranca. Tente novamente ou use outro cartao.',
  },
  unknown: {
    uxKey: 'UX_UNKNOWN',
    message: 'Pagamento nao aprovado. Use outro cartao ou fale com o banco.',
  },
}

// ==========================================
// Brand rules (mirrored from Edge Function)
// ==========================================

const BRAND_RULES: Record<BrandKey, DeclineRule[]> = {
  elo: [
    { code: '04', messageMatch: 'REFAZER A TRANSACAO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '05', messageMatch: 'GENERICA', category: 'unknown', retryPolicy: 'user_retry_allowed' },
    { code: '06', messageMatch: 'CONSULTAR CREDENCIADOR', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
    { code: '12', messageMatch: 'ERRO NO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '13', messageMatch: 'VALOR DA TRANSACAO INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '14', messageMatch: 'NUMERO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '56', messageMatch: 'NUMERO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '19', messageMatch: 'PROBLEMA NO ADQUIRENTE', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '23', messageMatch: 'VALOR DA PARCELA INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '30', messageMatch: 'ERRO DE FORMATO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '38', messageMatch: 'EXCEDIDAS TENTATIVAS', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '41', messageMatch: 'CARTAO PERDIDO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '43', messageMatch: 'CARTAO ROUBADO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '46', messageMatch: 'CONTA ENCERRADA', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '51', messageMatch: 'SALDO/LIMITE INSUFICIENTE', category: 'insufficient_funds', retryPolicy: 'user_retry_allowed' },
    { code: '54', messageMatch: 'CARTAO VENCIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '55', messageMatch: 'SENHA INVALIDA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
    { code: '57', messageMatch: 'TRANSACAO NAO PERMITIDA PARA O CARTAO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '57', messageMatch: 'CAPACIDADE DO TERMINAL', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '57', messageMatch: 'FRAUDE CONFIRMADA', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '57', messageMatch: 'INFRACAO DE LEI', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '58', messageMatch: 'COMERCIANTE INVALIDO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
    { code: '59', messageMatch: 'SUSPEITA DE FRAUDE', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '61', messageMatch: 'VALOR EXCESSO', category: 'amount_or_installment_invalid', retryPolicy: 'user_retry_allowed' },
    { code: '62', messageMatch: 'BLOQUEIO TEMPORARIO', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '62', messageMatch: 'CARTAO DOMESTICO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '63', messageMatch: 'VIOLACAO DE SEGURANCA', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '64', messageMatch: 'VALOR MINIMO', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '65', messageMatch: 'QUANT. DE SAQUES EXCEDIDO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '75', messageMatch: 'EXCEDIDAS TENTATIVAS', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '76', messageMatch: 'CONTA DESTINO INVALIDA', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '77', messageMatch: 'CONTA ORIGEM INVALIDA', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '78', messageMatch: 'CARTAO NOVO SEM DESBLOQUEIO', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '82', messageMatch: 'CARTAO INVALIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '83', messageMatch: 'SENHA VENCIDA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
    { code: '91', messageMatch: 'EMISSOR FORA DO AR', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: '96', messageMatch: 'FALHA DO SISTEMA', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: 'AB', messageMatch: 'FUNCAO INCORRETA (DEBITO)', category: 'wrong_payment_method', retryPolicy: 'user_retry_allowed' },
    { code: 'AC', messageMatch: 'FUNCAO INCORRETA (CREDITO)', category: 'wrong_payment_method', retryPolicy: 'user_retry_allowed' },
    { code: 'FM', messageMatch: 'UTILIZAR O CHIP', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: 'P5', messageMatch: 'TROCA DE SENHA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
    { code: 'P6', messageMatch: 'NOVA SENHA NAO ACEITA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
  ],
  visa: [
    { code: '03', messageMatch: 'COMERCIANTE INVALIDO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
    { code: '04', messageMatch: 'RECOLHER CARTAO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '05', messageMatch: 'GENERICA', category: 'unknown', retryPolicy: 'user_retry_allowed' },
    { code: '06', messageMatch: 'ERRO NO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '07', messageMatch: 'FRAUDE CONFIRMADA', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '12', messageMatch: 'ERRO DE FORMATO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '13', messageMatch: 'VALOR DA TRANSACAO INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '14', messageMatch: 'NUMERO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '15', messageMatch: 'EMISSOR NAO LOCALIZADO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '19', messageMatch: 'PROBLEMA NO ADQUIRENTE', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '39', messageMatch: 'FUNCAO INCORRETA (CREDITO)', category: 'wrong_payment_method', retryPolicy: 'user_retry_allowed' },
    { code: '41', messageMatch: 'CARTAO PERDIDO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '43', messageMatch: 'CARTAO ROUBADO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '46', messageMatch: 'CONTA ENCERRADA', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '51', messageMatch: 'SALDO/LIMITE INSUFICIENTE', category: 'insufficient_funds', retryPolicy: 'user_retry_allowed' },
    { code: '54', messageMatch: 'CARTAO VENCIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '57', messageMatch: 'TRANSACAO NAO PERMITIDA PARA O CARTAO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '58', messageMatch: 'CAPACIDADE DO TERMINAL', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '59', messageMatch: 'SUSPEITA DE FRAUDE', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '62', messageMatch: 'BLOQUEIO TEMPORARIO', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '62', messageMatch: 'CARTAO DOMESTICO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '64', messageMatch: 'ANTI LAVAGEM', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '65', messageMatch: 'QUANT. DE SAQUES EXCEDIDO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '75', messageMatch: 'EXCEDIDAS TENTATIVAS', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '76', messageMatch: 'REVERSAO INVALIDA', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '78', messageMatch: 'CARTAO NOVO SEM DESBLOQUEIO', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '82', messageMatch: 'CARTAO INVALIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '91', messageMatch: 'EMISSOR FORA DO AR', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: '92', messageMatch: 'NAO LOCALIZADO PELO ROTEADOR', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '93', messageMatch: 'INFRACAO DE LEI', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '94', messageMatch: 'TRACING DATA DUPLICADO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '96', messageMatch: 'FALHA DO SISTEMA', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: '52', messageMatch: 'FUNCAO INCORRETA (DEBITO)', category: 'wrong_payment_method', retryPolicy: 'user_retry_allowed' },
    { code: '53', messageMatch: 'FUNCAO INCORRETA (DEBITO)', category: 'wrong_payment_method', retryPolicy: 'user_retry_allowed' },
    { code: '55', messageMatch: 'SENHA INVALIDA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
    { code: '86', messageMatch: 'SENHA INVALIDA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
    { code: '61', messageMatch: 'VALOR EXCESSO', category: 'amount_or_installment_invalid', retryPolicy: 'user_retry_allowed' },
    { code: 'N4', messageMatch: 'VALOR EXCESSO', category: 'amount_or_installment_invalid', retryPolicy: 'user_retry_allowed' },
    { code: '6P', messageMatch: 'FALHA VALIDACAO DE ID', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '74', messageMatch: 'SENHA VENCIDA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
    { code: '81', messageMatch: 'SENHA VENCIDA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
    { code: 'B1', messageMatch: 'SURCHARGE NAO SUPORTADO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: 'B2', messageMatch: 'SURCHARGE NAO SUPORTADO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: 'N0', messageMatch: 'FORCAR STIP', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: 'N3', messageMatch: 'SAQUE NAO DISPONIVEL', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: 'N7', messageMatch: 'VIOLACAO DE SEGURANCA', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: 'N7', messageMatch: 'MUDANCA DE CHAVE', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: 'N8', messageMatch: 'DIFERENCA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: 'R0', messageMatch: 'SUSPENSAO', category: 'recurrence_suspended', retryPolicy: 'no_auto_retry' },
    { code: 'R1', messageMatch: 'SUSPENSAO', category: 'recurrence_suspended', retryPolicy: 'no_auto_retry' },
    { code: 'R2', messageMatch: 'NAO QUALIFICADA', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: 'R3', messageMatch: 'SUSPENSAO', category: 'recurrence_suspended', retryPolicy: 'no_auto_retry' },
    { code: '5C', messageMatch: 'RETENTATIVA', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: '9G', messageMatch: 'RETENTATIVA', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
  ],
  mastercard: [
    { code: '03', messageMatch: 'COMERCIANTE INVALIDO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
    { code: '04', messageMatch: 'RECOLHER CARTAO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '04', messageMatch: 'FRAUDE CONFIRMADA', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '05', messageMatch: 'GENERICA', category: 'unknown', retryPolicy: 'user_retry_allowed' },
    { code: '12', messageMatch: 'VALOR DA PARCELA INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '13', messageMatch: 'VALOR DA TRANSACAO INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '13', messageMatch: 'VALOR MINIMO', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '14', messageMatch: 'NUMERO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '01', messageMatch: 'NUMERO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '15', messageMatch: 'EMISSOR NAO LOCALIZADO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '30', messageMatch: 'PROBLEMA NO ADQUIRENTE', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '30', messageMatch: 'ERRO DE FORMATO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '41', messageMatch: 'CARTAO PERDIDO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '43', messageMatch: 'CARTAO ROUBADO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '51', messageMatch: 'SALDO/LIMITE INSUFICIENTE', category: 'insufficient_funds', retryPolicy: 'user_retry_allowed' },
    { code: '54', messageMatch: 'CARTAO VENCIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '55', messageMatch: 'SENHA INVALIDA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
    { code: '55', messageMatch: 'NOVA SENHA NAO ACEITA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
    { code: '57', messageMatch: 'TRANSACAO NAO PERMITIDA', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '57', messageMatch: 'BLOQUEIO TEMPORARIO', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '57', messageMatch: 'CARTAO NOVO', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '58', messageMatch: 'CAPACIDADE DO TERMINAL', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '61', messageMatch: 'VALOR EXCESSO', category: 'amount_or_installment_invalid', retryPolicy: 'user_retry_allowed' },
    { code: '62', messageMatch: 'CARTAO DOMESTICO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '62', messageMatch: 'INFRACAO DE LEI', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '62', messageMatch: 'CONTA ENCERRADA', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '63', messageMatch: 'VIOLACAO DE SEGURANCA', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '63', messageMatch: 'SUSPEITA DE FRAUDE', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '65', messageMatch: 'QUANT. DE SAQUES EXCEDIDO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '75', messageMatch: 'EXCEDIDAS TENTATIVAS', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '88', messageMatch: 'SENHA VENCIDA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
    { code: '88', messageMatch: 'CARTAO INVALIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '91', messageMatch: 'EMISSOR FORA DO AR', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: '92', messageMatch: 'NAO LOCALIZADO PELO ROTEADOR', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '94', messageMatch: 'TRACING DATA DUPLICADO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '96', messageMatch: 'FALHA DO SISTEMA', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
  ],
  amex: [
    { code: '100', messageMatch: 'GENERICA', category: 'unknown', retryPolicy: 'user_retry_allowed' },
    { code: '100', messageMatch: 'SUSPEITA DE FRAUDE', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '101', messageMatch: 'CARTAO VENCIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '106', messageMatch: 'EXCEDIDAS TENTATIVAS', category: 'card_blocked', retryPolicy: 'user_retry_later' },
    { code: '109', messageMatch: 'COMERCIANTE INVALIDO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
    { code: '110', messageMatch: 'VALOR DA TRANSACAO INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '115', messageMatch: 'ERRO NO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '115', messageMatch: 'VALOR DA PARCELA INVALIDA', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
    { code: '116', messageMatch: 'SALDO/LIMITE INSUFICIENTE', category: 'insufficient_funds', retryPolicy: 'user_retry_allowed' },
    { code: '117', messageMatch: 'SENHA INVALIDA', category: 'auth_failed', retryPolicy: 'user_retry_allowed' },
    { code: '121', messageMatch: 'SALDO/LIMITE INSUFICIENTE', category: 'insufficient_funds', retryPolicy: 'user_retry_allowed' },
    { code: '122', messageMatch: 'NUMERO CARTAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '122', messageMatch: 'VIOLACAO DE SEGURANCA', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '180', messageMatch: 'SENHA VENCIDA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
    { code: '180', messageMatch: 'CARTAO INVALIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
    { code: '181', messageMatch: 'ERRO DE FORMATO', category: 'processing_error', retryPolicy: 'user_retry_later' },
    { code: '200', messageMatch: 'TRANSACAO NAO PERMITIDA', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
    { code: '200', messageMatch: 'CARTAO PERDIDO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '200', messageMatch: 'CARTAO ROUBADO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
    { code: '200', messageMatch: 'FRAUDE CONFIRMADA', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
    { code: '911', messageMatch: 'FALHA DO SISTEMA', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
    { code: '912', messageMatch: 'EMISSOR FORA DO AR', category: 'issuer_unavailable', retryPolicy: 'user_retry_later' },
  ],
}

const RETURN_CODE_RULES: DeclineRule[] = [
  { code: '00', messageMatch: 'AUTORIZADA', category: 'processing_error', retryPolicy: 'no_retry' },
  { code: '002', messageMatch: 'CREDENCIAIS', category: 'merchant_error', retryPolicy: 'user_retry_later' },
  { code: '003', messageMatch: 'TRANSACAO INEXISTENTE', category: 'processing_error', retryPolicy: 'user_retry_later' },
  { code: '02', messageMatch: 'REFERIDA', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: '09', messageMatch: 'CANCELADA PARCIAL', category: 'processing_error', retryPolicy: 'no_retry' },
  { code: '11', messageMatch: 'AUTORIZADA', category: 'processing_error', retryPolicy: 'no_retry' },
  { code: '21', messageMatch: 'CANCELAMENTO NAO EFETUADO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: '22', messageMatch: 'PARCELAMENTO INVALIDO', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
  { code: '24', messageMatch: 'QUANTIDADE DE PARCELAS', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
  { code: '60', messageMatch: 'NAO AUTORIZADA', category: 'issuer_unavailable', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: '67', messageMatch: 'BLOQUEADO', category: 'card_blocked', retryPolicy: 'retry_next_day_4x_16d' },
  { code: '70', messageMatch: 'LIMITE EXCEDIDO', category: 'insufficient_funds', retryPolicy: 'retry_next_day_4x_16d' },
  { code: '72', messageMatch: 'SALDO DISPONIVEL', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: '79', messageMatch: 'MASTERCARD NAO PERMITIDA', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
  { code: '80', messageMatch: 'DIVERGENCIA', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: '82', messageMatch: 'LIGUE PARA O EMISSOR', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: '83', messageMatch: 'SUSPEITA DE FRAUDE', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: '85', messageMatch: 'FALHA DA OPERACAO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: '89', messageMatch: 'ERRO NA TRANSACAO', category: 'processing_error', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: '90', messageMatch: 'FALHA DA OPERACAO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: '97', messageMatch: 'VALOR NAO PERMITIDO', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
  { code: '98', messageMatch: 'COMUNICACAO INDISPONIVEL', category: 'issuer_unavailable', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: '475', messageMatch: 'TIMEOUT', category: 'processing_error', retryPolicy: 'retry_after_few_seconds' },
  { code: '999', messageMatch: 'COMUNICACAO INDISPONIVEL', category: 'issuer_unavailable', retryPolicy: 'retry_next_day_4x_16d' },
  { code: 'AA', messageMatch: 'TEMPO EXCEDIDO', category: 'issuer_unavailable', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: 'AF', messageMatch: 'FALHA DA OPERACAO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: 'AG', messageMatch: 'FALHA DA OPERACAO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: 'AH', messageMatch: 'CREDITO SENDO USADO COM DEBITO', category: 'wrong_payment_method', retryPolicy: 'no_auto_retry' },
  { code: 'AI', messageMatch: 'AUTENTICACAO NAO FOI REALIZADA', category: 'auth_failed', retryPolicy: 'no_auto_retry' },
  { code: 'AJ', messageMatch: 'PRIVATE LABEL', category: 'wrong_payment_method', retryPolicy: 'no_auto_retry' },
  { code: 'AV', messageMatch: 'DADOS INVALIDOS', category: 'invalid_card_data', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: 'BD', messageMatch: 'FALHA DA OPERACAO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: 'BL', messageMatch: 'LIMITE DIARIO', category: 'insufficient_funds', retryPolicy: 'retry_next_day_4x_16d' },
  { code: 'BM', messageMatch: 'CARTAO INVALIDO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'BN', messageMatch: 'CONTA BLOQUEADO', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
  { code: 'BO', messageMatch: 'FALHA DA OPERACAO', category: 'processing_error', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: 'BP', messageMatch: 'CONTA CORRENTE INEXISTENTE', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'BP171', messageMatch: 'VELOCITY', category: 'suspected_fraud', retryPolicy: 'retry_after_1h' },
  { code: 'BP176', messageMatch: 'PROCESSO DE INTEGRACAO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
  { code: 'BP900', messageMatch: 'FALHA NA OPERACAO', category: 'processing_error', retryPolicy: 'retry_after_5m' },
  { code: 'BP901', messageMatch: 'FALHA NA AUTORIZACAO', category: 'processing_error', retryPolicy: 'retry_after_5m' },
  { code: 'BP902', messageMatch: 'AGUARDE RESPOSTA', category: 'processing_error', retryPolicy: 'user_retry_later' },
  { code: 'BP903', messageMatch: 'FALHA NO CANCELAMENTO', category: 'processing_error', retryPolicy: 'user_retry_later' },
  { code: 'BP904', messageMatch: 'FALHA NA CONSULTA', category: 'processing_error', retryPolicy: 'user_retry_later' },
  { code: 'BR', messageMatch: 'CONTA ENCERRADA', category: 'card_blocked', retryPolicy: 'no_auto_retry' },
  { code: 'C1', messageMatch: 'NAO PODE PROCESSAR TRANSACOES DE DEBITO', category: 'transaction_not_allowed', retryPolicy: 'no_auto_retry' },
  { code: 'C2', messageMatch: 'DADOS INCORRETOS', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'C3', messageMatch: 'PERIODO INVALIDO', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: 'CF', messageMatch: 'FALHA NA VALIDACAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'CG', messageMatch: 'FALHA NA VALIDACAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'DF', messageMatch: 'FALHA NO CARTAO', category: 'invalid_card_data', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: 'DM', messageMatch: 'LIMITE EXCEDIDO', category: 'insufficient_funds', retryPolicy: 'retry_next_day_4x_16d' },
  { code: 'DQ', messageMatch: 'FALHA NA VALIDACAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'DS', messageMatch: 'TRANSACAO NAO PERMITIDA', category: 'transaction_not_allowed', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: 'EB', messageMatch: 'PARCELAS', category: 'amount_or_installment_invalid', retryPolicy: 'user_retry_later' },
  { code: 'EE', messageMatch: 'PARCELA INFERIOR', category: 'amount_or_installment_invalid', retryPolicy: 'no_auto_retry' },
  { code: 'EK', messageMatch: 'TRANSACAO NAO PERMITIDA', category: 'transaction_not_allowed', retryPolicy: 'retry_with_limit_4x_16d' },
  { code: 'FC', messageMatch: 'LIGUE EMISSOR', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: 'FE', messageMatch: 'DIVERGENCIA', category: 'processing_error', retryPolicy: 'no_auto_retry' },
  { code: 'FF', messageMatch: 'CANCELAMENTO OK', category: 'processing_error', retryPolicy: 'no_retry' },
  { code: 'FG', messageMatch: 'LIGUE AMEX', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: 'GA', messageMatch: 'AGUARDE CONTATO', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: 'GF', messageMatch: 'IP INFORMADO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
  { code: 'GD', messageMatch: 'TRANSACAO NAO PERMITIDA', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
  { code: 'GT', messageMatch: 'FORCA BRUTA', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: 'GK', messageMatch: 'BLOQUEIO TEMPORARIO', category: 'suspected_fraud', retryPolicy: 'no_auto_retry' },
  { code: 'HJ', messageMatch: 'CODIGO DA OPERACAO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
  { code: 'IA', messageMatch: 'INDICADOR DA OPERACAO', category: 'merchant_error', retryPolicy: 'no_auto_retry' },
  { code: 'KA', messageMatch: 'FALHA NA VALIDACAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: 'KB', messageMatch: 'OPCAO INCORRETA', category: 'wrong_payment_method', retryPolicy: 'no_auto_retry' },
  { code: 'KE', messageMatch: 'OPCAO NAO ESTA HABILITADA', category: 'wrong_payment_method', retryPolicy: 'no_auto_retry' },
  { code: 'NR', messageMatch: 'RETENTAR A TRANSACAO APOS 30 DIAS', category: 'issuer_unavailable', retryPolicy: 'retry_after_30d' },
  { code: 'RP', messageMatch: 'RETENTAR A TRANSACAO APOS 72', category: 'issuer_unavailable', retryPolicy: 'retry_after_72h' },
  { code: 'SC', messageMatch: 'RECORRENTE', category: 'recurrence_suspended', retryPolicy: 'no_auto_retry' },
  { code: 'U3', messageMatch: 'FALHA NA VALIDACAO', category: 'invalid_card_data', retryPolicy: 'no_auto_retry' },
  { code: '6P', messageMatch: 'DADOS INVALIDOS', category: 'invalid_card_data', retryPolicy: 'retry_with_limit_4x_16d' },
]

// ==========================================
// Amex De/Para normalization
// ==========================================

const AMEX_DEPARA: Record<string, string> = {
  FA: '100', BV: '101', A4: '106', DA: '109', JB: '110',
  A2: '115', A5: '116', A6: '117', '8': '122', A7: '180',
  FD: '200', AE: '911', A1: '912',
}

// ==========================================
// Classification logic
// ==========================================

function normalizeText(value?: string | null): string {
  return (value || '').toUpperCase()
}

function normalizeCode(value?: string | number | null): string | null {
  if (value === null || value === undefined) return null
  return String(value).trim().toUpperCase()
}

function normalizeBrand(brand?: string | null): BrandKey | null {
  if (!brand) return null
  const value = brand.toLowerCase()
  if (value.includes('visa')) return 'visa'
  if (value.includes('master')) return 'mastercard'
  if (value.includes('elo')) return 'elo'
  if (value.includes('amex') || value.includes('american')) return 'amex'
  return null
}

function matchRule(
  rules: DeclineRule[],
  code: string,
  message?: string | null,
): DeclineRule | null {
  const normalizedMessage = normalizeText(message)
  const exact = rules.filter((rule) => rule.code === code)
  const withMatch = exact.find(
    (rule) => rule.messageMatch && normalizedMessage.includes(rule.messageMatch),
  )
  if (withMatch) return withMatch
  return exact.find((rule) => !rule.messageMatch) || null
}

export function classifyDecline(input: {
  brand?: string | null
  returnCode?: string | number | null
  returnMessage?: string | null
  providerReturnCode?: string | number | null
  providerReturnMessage?: string | null
  reasonCode?: string | number | null
  reasonMessage?: string | null
}): DeclineClassification {
  const brandKey = normalizeBrand(input.brand)
  const providerCode = normalizeCode(input.providerReturnCode)
  const returnCode = normalizeCode(input.returnCode)
  const reasonCode = normalizeCode(input.reasonCode)
  const providerMessage = input.providerReturnMessage || ''
  const returnMessage = input.returnMessage || ''
  const reasonMessage = input.reasonMessage || ''

  if (brandKey && providerCode) {
    const combinedMessage = providerMessage || returnMessage || reasonMessage
    let rule = matchRule(BRAND_RULES[brandKey], providerCode, combinedMessage)
    let resolvedCode = providerCode

    if (!rule && brandKey === 'amex') {
      const normalized = AMEX_DEPARA[providerCode]
      if (normalized) {
        rule = matchRule(BRAND_RULES.amex, normalized, combinedMessage)
        if (rule) resolvedCode = `${providerCode}->${normalized}`
      }
    }

    if (rule) {
      const meta = CATEGORY_META[rule.category]
      return {
        category: rule.category,
        uxKey: meta.uxKey,
        retryPolicy: rule.retryPolicy,
        message: meta.message,
        matchedCode: resolvedCode,
        source: 'provider_return_code',
        confidence: 'high',
        explanation: `Bandeira ${brandKey} + codigo provedor ${resolvedCode}`,
      }
    }
  }

  if (brandKey && returnCode) {
    const combinedMessage = returnMessage || providerMessage || reasonMessage
    let rule = matchRule(BRAND_RULES[brandKey], returnCode, combinedMessage)
    let resolvedCode = returnCode

    if (!rule && brandKey === 'amex') {
      const normalized = AMEX_DEPARA[returnCode]
      if (normalized) {
        rule = matchRule(BRAND_RULES.amex, normalized, combinedMessage)
        if (rule) resolvedCode = `${returnCode}->${normalized}`
      }
    }

    if (rule) {
      const meta = CATEGORY_META[rule.category]
      return {
        category: rule.category,
        uxKey: meta.uxKey,
        retryPolicy: rule.retryPolicy,
        message: meta.message,
        matchedCode: resolvedCode,
        source: 'return_code',
        confidence: 'high',
        explanation: `Bandeira ${brandKey} + codigo retorno ${resolvedCode}`,
      }
    }
  }

  if (returnCode) {
    const rule = matchRule(
      RETURN_CODE_RULES,
      returnCode,
      returnMessage || providerMessage || reasonMessage,
    )
    if (rule) {
      const meta = CATEGORY_META[rule.category]
      return {
        category: rule.category,
        uxKey: meta.uxKey,
        retryPolicy: rule.retryPolicy,
        message: meta.message,
        matchedCode: returnCode,
        source: 'return_code',
        confidence: 'medium',
        explanation: `Codigo retorno ${returnCode} (sem bandeira para desambiguar)`,
      }
    }
  }

  if (reasonCode) {
    const rule = matchRule(
      RETURN_CODE_RULES,
      reasonCode,
      reasonMessage || returnMessage || providerMessage,
    )
    if (rule) {
      const meta = CATEGORY_META[rule.category]
      return {
        category: rule.category,
        uxKey: meta.uxKey,
        retryPolicy: rule.retryPolicy,
        message: meta.message,
        matchedCode: reasonCode,
        source: 'reason_code',
        confidence: 'medium',
        explanation: `Reason code ${reasonCode}`,
      }
    }
  }

  const fallback = CATEGORY_META.unknown
  return {
    category: 'unknown',
    uxKey: fallback.uxKey,
    retryPolicy: 'no_auto_retry',
    message: fallback.message,
    matchedCode: null,
    source: 'fallback_unknown',
    confidence: 'low',
    explanation: 'Nenhuma regra correspondente encontrada',
  }
}

// ==========================================
// Seller Script types & templates
// ==========================================

export type SellerScriptContext = {
  clienteNome: string
  valor: string
  parcelas: number
  bandeira: string
  finalCartao: string
  errorMessage: string
  linkExpira: string | null
  permiteOutrosMetodos: boolean
}

export type SellerScript = {
  title: string
  cause: string
  whatToSay: string[]
  whatNotToSay: string[]
  suggestions: string[]
  whatsappTemplate: (ctx: SellerScriptContext) => string
}

function expirationLine(linkExpira: string | null): string {
  return linkExpira ? `\nO link de pagamento ainda esta valido ate ${linkExpira}.` : ''
}

function altMethodLine(permite: boolean): string {
  return permite ? '\nSe preferir, tambem aceitamos *PIX* ou *boleto*.' : ''
}

export const SELLER_SCRIPTS: Record<DeclineCategory, SellerScript> = {
  insufficient_funds: {
    title: 'Saldo/Limite Insuficiente',
    cause: 'O banco emissor informou que o cartao nao tem saldo ou limite disponivel para o valor desta compra.',
    whatToSay: [
      'Informe que a transacao foi recusada pelo banco, nao pelo nosso sistema',
      'Sugira verificar o limite disponivel no app do banco',
      'Ofereca parcelamento menor ou outro cartao',
      'Mencione meios alternativos (PIX, boleto) se disponiveis',
    ],
    whatNotToSay: [
      'Nunca diga que o cliente "nao tem dinheiro" ou "limite estourado"',
      'Nao insista se o cliente nao quiser compartilhar detalhes financeiros',
    ],
    suggestions: [
      'Ligar para o banco e pedir aumento temporario de limite',
      'Tentar com outro cartao de credito',
      'Reduzir o numero de parcelas',
      'Usar PIX ou boleto como alternativa',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* em *${ctx.parcelas}x* no cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}:\n\nA tentativa foi recusada pelo banco emissor do cartao. Isso nao e um problema do nosso lado.\n\n*O que voce pode fazer:*\n1. Ligar para o banco (numero no verso do cartao) e verificar o limite disponivel\n2. Tentar com menos parcelas (ex: ${Math.max(1, ctx.parcelas - 3)}x)\n3. Usar outro cartao de credito${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  card_blocked: {
    title: 'Cartao Bloqueado',
    cause: 'O cartao esta bloqueado, restrito ou com alguma limitacao ativa no banco emissor.',
    whatToSay: [
      'Informe que o banco do cliente bloqueou a transacao',
      'Sugira entrar em contato com o banco para desbloquear',
      'Ofereca alternativa com outro cartao ou meio de pagamento',
    ],
    whatNotToSay: [
      'Nao diga "seu cartao esta bloqueado" de forma alarmante',
      'Nao especule sobre o motivo do bloqueio',
    ],
    suggestions: [
      'Ligar para o banco e pedir desbloqueio para compras online',
      'Verificar se o cartao novo foi desbloqueado',
      'Tentar com outro cartao',
      'Usar PIX ou boleto',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* no cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}:\n\nO banco emissor nao autorizou a transacao. Pode ser um bloqueio temporario ou restricao para compras online.\n\n*O que voce pode fazer:*\n1. Ligar para o banco (numero no verso do cartao) e pedir liberacao\n2. Se for cartao novo, verificar se ja foi desbloqueado\n3. Tentar com outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  transaction_not_allowed: {
    title: 'Transacao Nao Permitida',
    cause: 'O banco ou a bandeira do cartao nao permite este tipo de transacao (compra online, valor, parcelamento, etc.).',
    whatToSay: [
      'Informe que o cartao nao esta habilitado para este tipo de compra',
      'Sugira habilitar compras online no app do banco',
      'Ofereca outro cartao ou meio de pagamento',
    ],
    whatNotToSay: [
      'Nao diga que "o cartao nao serve"',
      'Nao peca dados do cartao por mensagem',
    ],
    suggestions: [
      'Habilitar compras online no app do banco',
      'Tentar com outro cartao',
      'Usar PIX ou boleto',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* no cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}:\n\nO banco informou que esse tipo de transacao nao e permitido para este cartao.\n\n*O que voce pode fazer:*\n1. No app do banco, verificar se compras online estao habilitadas\n2. Tentar com outro cartao\n3. Entrar em contato com o banco para mais detalhes${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  suspected_fraud: {
    title: 'Transacao Nao Autorizada pelo Banco',
    cause: 'O banco emissor sinalizou uma restricao de seguranca na transacao. Isso pode ser por politica interna do banco.',
    whatToSay: [
      'Diga apenas que "o banco pediu para entrar em contato"',
      'Sugira que o cliente ligue para o banco para liberar a compra',
      'Ofereca alternativas de pagamento',
    ],
    whatNotToSay: [
      'NUNCA diga "suspeita de fraude" ou "fraude"',
      'Nao mencione que o sistema detectou algo irregular',
      'Nao culpe o cliente de forma alguma',
      'Nao mencione codigos tecnicos',
    ],
    suggestions: [
      'Ligar para o banco e informar que deseja autorizar a compra',
      'Tentar com outro cartao',
      'Usar PIX ou boleto',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* no cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}:\n\nO banco emissor pediu que voce entre em contato com eles antes de prosseguir com esta compra. E um procedimento de seguranca padrao.\n\n*O que voce pode fazer:*\n1. Ligar para o banco (numero no verso do cartao) e informar que deseja autorizar a compra\n2. Apos a liberacao, podemos tentar novamente\n3. Se preferir, pode usar outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  invalid_card_data: {
    title: 'Dados do Cartao Invalidos',
    cause: 'Os dados informados (numero, validade ou codigo de seguranca) nao correspondem ao cartao cadastrado no banco.',
    whatToSay: [
      'Informe que pode ter havido um erro ao digitar os dados do cartao',
      'Sugira conferir numero, validade e CVV',
      'Ofereca tentar novamente com os dados corretos',
    ],
    whatNotToSay: [
      'Nao peca os dados do cartao por mensagem ou ligacao',
      'Nao diga que "o cartao e falso"',
    ],
    suggestions: [
      'Conferir o numero do cartao, data de validade e CVV',
      'Verificar se o cartao nao esta vencido',
      'Tentar com outro cartao',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nParece que houve um erro nos dados do cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}. Isso pode acontecer por um digito errado.\n\n*O que voce pode fazer:*\n1. Conferir o numero do cartao, data de validade e codigo de seguranca (CVV)\n2. Verificar se o cartao nao esta vencido\n3. Tentar novamente com os dados corretos ou usar outro cartao${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  issuer_unavailable: {
    title: 'Banco Indisponivel',
    cause: 'O sistema do banco emissor esta temporariamente fora do ar ou com lentidao. Nao e um problema com o cartao.',
    whatToSay: [
      'Tranquilize o cliente: e um problema temporario do banco',
      'Sugira tentar novamente em alguns minutos',
      'Informe que o cartao esta ok, o problema e do sistema do banco',
    ],
    whatNotToSay: [
      'Nao diga que "o banco esta com problemas graves"',
      'Nao alarme o cliente sobre a seguranca do cartao',
    ],
    suggestions: [
      'Tentar novamente em 15-30 minutos',
      'Se persistir, tentar com outro cartao',
      'Usar PIX ou boleto como alternativa imediata',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* no cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}:\n\nO sistema do banco esta temporariamente indisponivel. Nao e um problema com seu cartao.\n\n*O que voce pode fazer:*\n1. Tentar novamente em 15-30 minutos\n2. Se preferir nao esperar, pode usar outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  amount_or_installment_invalid: {
    title: 'Valor ou Parcelas Invalidos',
    cause: 'O banco ou a operadora nao aceitou a combinacao de valor e/ou numero de parcelas para este cartao.',
    whatToSay: [
      'Informe que o parcelamento pode nao ser aceito pelo banco para este valor',
      'Sugira reduzir o numero de parcelas',
      'Ofereca pagamento a vista ou com menos parcelas',
    ],
    whatNotToSay: [
      'Nao diga que "o valor e muito alto"',
      'Nao faca julgamentos sobre a capacidade de pagamento',
    ],
    suggestions: [
      'Tentar com menos parcelas',
      'Tentar pagamento a vista no cartao',
      'Usar outro cartao que aceite o parcelamento',
      'Usar PIX ou boleto',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* em *${ctx.parcelas}x*:\n\nO banco nao aceitou esse parcelamento para o cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}.\n\n*O que voce pode fazer:*\n1. Tentar com menos parcelas (ex: ${Math.max(1, ctx.parcelas - 3)}x ou ${Math.max(1, ctx.parcelas - 6)}x)\n2. Tentar com outro cartao\n3. Entrar em contato com o banco para verificar o limite de parcelamento${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  wrong_payment_method: {
    title: 'Metodo de Pagamento Incorreto',
    cause: 'O cartao foi utilizado na modalidade errada (ex: debito quando deveria ser credito, ou vice-versa).',
    whatToSay: [
      'Informe que o cartao pode ter sido usado na funcao errada',
      'Sugira selecionar credito em vez de debito (ou vice-versa)',
    ],
    whatNotToSay: [
      'Nao diga que o cliente "errou"',
      'Nao use termos tecnicos como "funcao incorreta"',
    ],
    suggestions: [
      'Tentar novamente selecionando a funcao correta (credito/debito)',
      'Tentar com outro cartao',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nO cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''} foi processado na modalidade incorreta.\n\n*O que voce pode fazer:*\n1. Tentar novamente verificando se o cartao e de credito ou debito\n2. Usar outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  recurrence_suspended: {
    title: 'Recorrencia Suspensa',
    cause: 'O pagamento recorrente vinculado a este cartao foi suspenso pelo banco emissor.',
    whatToSay: [
      'Informe que o banco suspendeu os pagamentos automaticos deste cartao',
      'Sugira entrar em contato com o banco para reativar',
    ],
    whatNotToSay: [
      'Nao diga que o cliente "cancelou" o pagamento',
      'Nao especule sobre o motivo da suspensao',
    ],
    suggestions: [
      'Entrar em contato com o banco para reativar pagamentos recorrentes',
      'Atualizar o cartao cadastrado',
      'Usar outro cartao ou meio de pagamento',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nO banco informou que o pagamento automatico do cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''} esta suspenso.\n\n*O que voce pode fazer:*\n1. Ligar para o banco e pedir para reativar pagamentos recorrentes\n2. Usar outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  auth_failed: {
    title: 'Falha na Autenticacao',
    cause: 'A autenticacao (senha, 3DS ou verificacao) nao foi concluida ou a senha esta incorreta.',
    whatToSay: [
      'Informe que a verificacao de seguranca nao foi concluida',
      'Sugira tentar novamente com atencao a senha',
      'Se for 3DS, sugira usar outro navegador',
    ],
    whatNotToSay: [
      'Nao diga que "a senha esta errada"',
      'Nao peca a senha do cartao',
    ],
    suggestions: [
      'Tentar novamente com atencao a senha digitada',
      'Se solicitou verificacao no app do banco, completar a etapa',
      'Tentar em outro navegador se a verificacao nao aparecer',
      'Usar outro cartao',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nA verificacao de seguranca do cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''} nao foi concluida.\n\n*O que voce pode fazer:*\n1. Tentar novamente, prestando atencao na senha ou verificacao do app do banco\n2. Se apareceu uma tela de verificacao, completar a etapa no app do banco\n3. Tentar em outro navegador ou usar outro cartao${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  merchant_error: {
    title: 'Erro Interno (Nosso Lado)',
    cause: 'Ocorreu um problema na configuracao ou comunicacao do nosso sistema com a operadora. Nao e culpa do cliente.',
    whatToSay: [
      'Seja honesto: o problema e do nosso lado, nao do cliente',
      'Informe que a equipe tecnica ja esta ciente',
      'Peca para aguardar e tentar novamente em breve',
    ],
    whatNotToSay: [
      'Nao culpe o cartao ou o banco do cliente',
      'Nao entre em detalhes tecnicos',
    ],
    suggestions: [
      'Aguardar alguns minutos e tentar novamente',
      'Se persistir, entrar em contato com o suporte',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nIdentificamos um problema temporario no nosso sistema de pagamento. Nao e um problema com seu cartao.\n\nNossa equipe ja esta trabalhando na solucao. Voce pode tentar novamente em alguns minutos.${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nPedimos desculpa pelo inconveniente. Qualquer duvida, estou a disposicao!`,
  },

  processing_error: {
    title: 'Erro de Processamento',
    cause: 'Ocorreu uma falha temporaria na comunicacao entre os sistemas. Pode ser resolvido ao tentar novamente.',
    whatToSay: [
      'Tranquilize o cliente: e um erro temporario',
      'Sugira tentar novamente em alguns minutos',
      'Informe que nao e problema com o cartao',
    ],
    whatNotToSay: [
      'Nao alarme o cliente sobre seguranca',
      'Nao entre em detalhes sobre falhas de sistema',
    ],
    suggestions: [
      'Tentar novamente em 2-5 minutos',
      'Se persistir, tentar com outro cartao',
      'Usar PIX ou boleto como alternativa',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nOcorreu uma falha temporaria no processamento. Nao e um problema com seu cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}.\n\n*O que voce pode fazer:*\n1. Tentar novamente em alguns minutos\n2. Se persistir, usar outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  three_ds_failed: {
    title: 'Falha na Verificacao de Seguranca (3DS)',
    cause: 'A verificacao de seguranca adicional (3D Secure) nao foi completada. Pode ser timeout ou falha no app do banco.',
    whatToSay: [
      'Informe que a verificacao de seguranca nao foi concluida',
      'Sugira tentar novamente e completar a verificacao no app do banco',
      'Recomendar outro navegador se o problema persistir',
    ],
    whatNotToSay: [
      'Nao use termos tecnicos como "3DS" ou "autenticacao MPI"',
      'Nao diga que o cartao tem problema',
    ],
    suggestions: [
      'Tentar novamente e completar a verificacao quando solicitada',
      'Verificar notificacoes no app do banco',
      'Tentar em outro navegador (Chrome, Firefox)',
      'Usar outro cartao',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}*:\n\nA verificacao de seguranca do cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''} nao foi concluida.\n\n*O que voce pode fazer:*\n1. Tentar novamente e ficar atento a verificacao no app do banco\n2. Verificar se tem notificacoes pendentes no app do banco\n3. Tentar em outro navegador (Chrome ou Firefox)\n4. Usar outro cartao${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },

  unknown: {
    title: 'Pagamento Nao Aprovado',
    cause: 'O pagamento nao foi aprovado. O motivo exato nao foi especificado pelo banco ou operadora.',
    whatToSay: [
      'Informe que o pagamento nao foi aprovado pelo banco',
      'Sugira entrar em contato com o banco para mais informacoes',
      'Ofereca alternativas de pagamento',
    ],
    whatNotToSay: [
      'Nao especule sobre o motivo',
      'Nao culpe o cliente ou o cartao',
    ],
    suggestions: [
      'Ligar para o banco e perguntar sobre a transacao',
      'Tentar com outro cartao',
      'Usar PIX ou boleto',
    ],
    whatsappTemplate: (ctx) =>
      `Ola ${ctx.clienteNome}!\n\nSobre o pagamento de *${ctx.valor}* no cartao ${ctx.bandeira}${ctx.finalCartao ? ` final ${ctx.finalCartao}` : ''}:\n\nO banco nao aprovou a transacao. Para mais detalhes, recomendamos entrar em contato com o banco.\n\n*O que voce pode fazer:*\n1. Ligar para o banco (numero no verso do cartao)\n2. Tentar com outro cartao${altMethodLine(ctx.permiteOutrosMetodos)}${expirationLine(ctx.linkExpira)}\n\nQualquer duvida, estou a disposicao!`,
  },
}

export const RETRY_POLICY_LABELS: Record<RetryPolicy, string> = {
  no_retry: 'Sem retentativa',
  no_auto_retry: 'Trocar cartao',
  user_retry_allowed: 'Pode tentar novamente',
  user_retry_later: 'Tentar mais tarde',
  retry_with_limit_4x_16d: 'Pode tentar novamente',
  retry_next_day_4x_16d: 'Tentar amanha',
  retry_after_few_seconds: 'Tentar em instantes',
  retry_after_1h: 'Tentar em 1 hora',
  retry_after_5m: 'Tentar em 5 min',
  retry_after_72h: 'Tentar em 3 dias',
  retry_after_30d: 'Tentar em 30 dias',
}

export const SOURCE_LABELS: Record<ClassificationSource, string> = {
  provider_return_code: 'Codigo do adquirente',
  return_code: 'Codigo Cielo/Braspag',
  reason_code: 'Reason code',
  parsed_error_message: 'Mensagem do erro',
  fallback_unknown: 'Sem codigo reconhecido',
}

export const CONFIDENCE_LABELS: Record<ClassificationConfidence, string> = {
  high: 'Alta confianca',
  medium: 'Media confianca',
  low: 'Baixa confianca',
}
