/** URL do CRM para detalhes do lead (painel vendedores) */
export const CRM_LEAD_URL = 'https://crm.aureatech.io/painelvendedoresnew?p=2&c='

export const PIPELINE_STAGES = [
  'checkout',
  'contract',
  'payment',
  'omie',
  'nfe',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const STAGE_LABELS: Record<string, string> = {
  checkout: 'Checkout',
  payment: 'Pagamento',
  payment_done: 'Pagamento',
  contract: 'Contrato',
  nfe: 'NFS-e',
  nfe_pending: 'NFS-e',
  nfe_processing: 'NFS-e',
  omie: 'OMIE',
  omie_pending: 'OMIE',
  omie_processing: 'OMIE',
  completed: 'Concluído',
  waiting: 'Aguardando',
}

/**
 * Descricoes amigaveis para eventos do pipeline.
 * Usadas como tooltips na timeline de eventos.
 */
export const EVENT_DESCRIPTIONS: Record<string, string> = {
  // Checkout
  CREATE_REQUEST:
    'O link de pagamento foi gerado e enviado para o cliente.',
  CREATE_SUCCESS:
    'O link de pagamento foi criado com sucesso e está pronto para uso.',
  PAYMENT_ATTEMPT: 'O cliente tentou realizar o pagamento.',
  PAYMENT_ERROR:
    'Houve um problema durante a tentativa de pagamento. O cliente pode tentar novamente.',
  PAYMENT_SUCCESS: 'O pagamento foi confirmado com sucesso!',

  // Payment
  'payment.completed':
    'O pagamento foi processado e aprovado pela operadora.',
  change_type_1:
    'Houve uma atualização no status do pagamento pela operadora.',

  // Contract (ClickSign)
  auto_close:
    'O contrato foi encerrado automaticamente (expirou o prazo de assinatura).',
  sign: 'O signatário realizou a assinatura do contrato.',
  'signer.signed': 'O signatário concluiu a assinatura do documento.',
  'document.signed': 'O documento foi assinado com sucesso.',
  'document.completed': 'O documento foi concluído.',
  'list.completed': 'A lista de signatários foi concluída.',
  'envelope.closed': 'O envelope foi fechado (contrato finalizado).',
  upload: 'O documento foi enviado para assinatura.',
  'document.uploaded': 'O documento foi carregado no sistema.',
  'list.created': 'A lista de signatários foi criada.',
  'envelope.running': 'O envelope foi publicado e está aguardando assinatura.',
  add_signer: 'Um signatário foi adicionado ao envelope.',
  update_settings: 'As configurações do envelope foram atualizadas.',

  // NFS-e
  trigger_nfe_request:
    'A emissão da nota fiscal de serviço foi solicitada ao sistema.',
  trigger_nfe_success: 'A nota fiscal foi emitida com sucesso!',
  trigger_nfe_error: 'Houve um erro ao tentar emitir a nota fiscal.',
  trigger_nfe_idempotent_existing_invoice:
    'A nota fiscal já havia sido emitida anteriormente para esta transação.',
  emissao:
    'A nota fiscal está sendo processada pelo sistema de emissão.',
  webhook:
    'O sistema recebeu uma atualização automática sobre o status da nota fiscal.',
  invoice_persisted:
    'Os dados da nota fiscal foram salvos no sistema.',
}

export const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  in_progress: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  pending: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-500',
    dot: 'bg-zinc-400',
  },
}

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  Assinado: 'Assinado',
  'Aguardando Assinatura': 'Aguardando',
  Cancelado: 'Cancelado',
  error: 'Erro',
}

export const CHECKOUT_STATUS_LABELS: Record<string, string> = {
  aguardando_pagamento: 'Aguardando',
  pago: 'Pago',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  expirado: 'Expirado',
  parcialmente_pago: 'Parcial',
}

export const PRODUCAO_STATUS_LABELS: Record<string, string> = {
  Aprovação: 'Aprovacao',
  'Aguardando Assinatura': 'Aguard. Assinatura',
  'Aguardando Inicio': 'Aguard. Inicio',
  Onbording: 'Onboarding',
  Criação: 'Criacao',
  Produção: 'Producao',
  Delivery: 'Delivery',
  Entregue: 'Entregue',
  Arquivado: 'Arquivado',
}

export const HEALTH_COLORS: Record<string, { dot: string; label: string }> = {
  ok: { dot: 'bg-emerald-500', label: 'Saudavel' },
  atencao: { dot: 'bg-amber-500', label: 'Atencao' },
  alerta: { dot: 'bg-orange-500', label: 'Alerta' },
  critico: { dot: 'bg-red-500', label: 'Critico' },
  inativo: { dot: 'bg-zinc-400', label: 'Inativo' },
}
