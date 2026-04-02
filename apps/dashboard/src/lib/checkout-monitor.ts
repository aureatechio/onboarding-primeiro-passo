export interface CheckoutHealthKpis {
  pendingSessions: number
  processingSessions: number
  completedLast24h: number
  failedLast24h: number
  totalLast24h: number
  successRate: number | null
  failureRate: number | null
  avgCompletionSeconds: number | null
  slaWarningCount: number
  slaCriticalCount: number
  divergenceCount: number
}

export interface PendingSessionSla {
  session_id: string
  compra_id: string
  metodo_pagamento: string
  status: string
  payment_status: number | null
  payment_id: string
  pending_age_minutes: number
  sla_bucket: 'ok' | 'warning' | 'critical'
  updated_at: string
  created_at: string
}

export interface StatusDivergence {
  compra_id: string
  compra_checkout_status: string
  compra_status: string
  session_id: string
  session_status: string
  payment_status: number | null
  divergence_type: string
  session_updated_at: string
  compra_updated_at: string
}

export interface WebhookSignalHour {
  hour_bucket: string
  incoming_webhooks: number
  incoming_webhooks_ok: number
  pending_with_payment: number
}

export interface AuditAlert {
  id: string
  event_type: string
  function_name: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface StatusDistributionEntry {
  status: string
  count: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--color-chart-4)',
  processing: 'var(--color-chart-2)',
  completed: '#22c55e',
  failed: '#ef4444',
  expired: '#94a3b8',
  cancelled: '#6b7280',
  split_created: 'var(--color-chart-5)',
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#a1a1aa'
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Em processamento',
  completed: 'Pago',
  failed: 'Falhou',
  expired: 'Expirado',
  cancelled: 'Cancelado',
  split_created: 'Split criado',
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function getSlaBadgeStyle(bucket: string): { className: string; label: string } {
  switch (bucket) {
    case 'critical':
      return { className: 'bg-red-50 text-red-700 border-red-200', label: 'Crítico' }
    case 'warning':
      return { className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Atenção' }
    default:
      return { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'OK' }
  }
}

export function formatMinutesAgo(minutes: number | null): string {
  if (minutes == null) return '—'
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

const ALERT_SEVERITY_MAP: Record<string, 'critical' | 'warning' | 'info'> = {
  HIGH_ERROR_RATE: 'critical',
  FUNCTION_100_FAILURE: 'critical',
  PENDING_SLA_CRITICAL: 'critical',
  PAYMENT_HTTP_401_5XX_SPIKE: 'critical',
  PENDING_SLA_WARNING: 'warning',
  WEBHOOK_SIGNAL_DROP: 'warning',
  BOLETO_PARCELADO_GATEWAY_ERRORS_SPIKE: 'warning',
  RECONCILIATION_SPIKE: 'warning',
  RECONCILIATION_MISSING_WINDOW: 'warning',
  MANUAL_RECONCILE: 'info',
  PAYMENT_RECONCILIATION_RUN: 'info',
}

export function getAlertSeverity(eventType: string): 'critical' | 'warning' | 'info' {
  return ALERT_SEVERITY_MAP[eventType] ?? 'info'
}

const ALERT_LABELS: Record<string, string> = {
  HIGH_ERROR_RATE: 'Taxa de erro alta',
  FUNCTION_100_FAILURE: 'Função 100% falha',
  PENDING_SLA_CRITICAL: 'SLA crítico',
  PENDING_SLA_WARNING: 'SLA atenção',
  WEBHOOK_SIGNAL_DROP: 'Queda de webhooks',
  PAYMENT_HTTP_401_5XX_SPIKE: 'Spike HTTP 401/5xx',
  BOLETO_PARCELADO_GATEWAY_ERRORS_SPIKE: 'Spike erros boleto parcelado',
  RECONCILIATION_SPIKE: 'Spike reconciliação',
  RECONCILIATION_MISSING_WINDOW: 'Janela reconciliação ausente',
  MANUAL_RECONCILE: 'Reconciliação manual',
  PAYMENT_RECONCILIATION_RUN: 'Reconciliação automática',
}

export function getAlertLabel(eventType: string): string {
  return ALERT_LABELS[eventType] ?? eventType
}

export function getAlertBadgeStyle(
  severity: 'critical' | 'warning' | 'info'
): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-zinc-50 text-zinc-600 border-zinc-200'
  }
}

const DIVERGENCE_LABELS: Record<string, string> = {
  session_completed_but_compra_not_paid: 'Sessão paga, compra não',
  compra_paid_but_session_not_completed: 'Compra paga, sessão pendente',
  other: 'Outro',
}

export function getDivergenceLabel(type: string): string {
  return DIVERGENCE_LABELS[type] ?? type
}

export function formatHourBucket(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const MONITOR_ALERT_EVENT_TYPES = [
  'HIGH_ERROR_RATE',
  'FUNCTION_100_FAILURE',
  'PENDING_SLA_CRITICAL',
  'PENDING_SLA_WARNING',
  'WEBHOOK_SIGNAL_DROP',
  'PAYMENT_HTTP_401_5XX_SPIKE',
  'BOLETO_PARCELADO_GATEWAY_ERRORS_SPIKE',
  'RECONCILIATION_SPIKE',
  'RECONCILIATION_MISSING_WINDOW',
  'MANUAL_RECONCILE',
  'PAYMENT_RECONCILIATION_RUN',
] as const

export const ALERT_EVENT_TYPES = MONITOR_ALERT_EVENT_TYPES as readonly string[]

export const MONITOR_HELP_TEXTS = {
  pendingSessions:
    'Sessões aguardando confirmação de pagamento neste momento. Número alto pode indicar lentidão no gateway ou queda de webhooks.',
  processingSessions:
    'Sessões cujo pagamento está sendo processado pelo gateway. Se permanecer alto por muito tempo, pode indicar timeout na Cielo/Braspag.',
  successRate24h:
    'Percentual de sessões concluídas com sucesso nas últimas 24h. Meta saudável: acima de 80%. Abaixo disso, investigue falhas recorrentes.',
  failureRate24h:
    'Percentual de sessões que falharam nas últimas 24h. Acima de 10% requer investigação imediata no gateway ou nos logs de erro.',
  slaWarning:
    'Sessões pendentes há mais de 15 minutos sem conclusão. Indica atraso no processamento — acompanhe para evitar escalação.',
  slaCritical:
    'Sessões pendentes há mais de 30 minutos. Requer ação imediata: verifique o gateway, webhooks e considere reconciliação manual.',
  totalSessions24h:
    'Volume total de sessões de checkout criadas nas últimas 24 horas. Indica o nível de atividade do checkout.',
  avgCompletion:
    'Tempo médio entre a criação e a conclusão de uma sessão paga. Quanto menor, melhor a experiência do cliente. Acima de 5 min merece atenção.',
  divergences:
    'Casos onde o status da sessão de pagamento e o status da compra estão inconsistentes. Ex: sessão marcada como paga mas compra ainda pendente. Sempre investigue.',
  statusDistribution:
    'Gráfico com a proporção de cada status (pendente, pago, falha, etc.) nas últimas 24h. Ideal: fatia "Pago" dominante. Fatia "Pendente" grande indica gargalo.',
  webhookSignal:
    'Volume de webhooks da Cielo recebidos por hora nas últimas 24h. Queda súbita pode indicar problema na integração com o gateway. Compare com "Pendentes com payment_id".',
  atRiskSessions:
    'Sessões que ultrapassaram o SLA (15 ou 30 min) sem conclusão. Use o botão "Reconciliar" para forçar uma verificação de status no gateway.',
  reconcileButton:
    'Força uma nova consulta de status do pagamento diretamente no gateway (Cielo). Requer senha de admin. Há cooldown de 30 segundos entre tentativas para a mesma sessão.',
  adminPassword:
    'Senha de administrador necessária para executar a reconciliação manual. Protege contra acionamentos acidentais.',
  divergencesTable:
    'Lista de compras onde o status da sessão não bate com o status da compra. Clique "Ver transação" para abrir os detalhes e investigar a causa.',
  alertsTimeline:
    'Eventos de anomalia detectados automaticamente pelo sistema: picos de erro, quebras de SLA, quedas de webhook e reconciliações executadas. Ordenados do mais recente ao mais antigo.',
} as const
