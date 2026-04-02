import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ExternalLink, Layers, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/StatusBadge'
import { CopyValueButton } from '@/components/CopyValueButton'
import {
  applyPhoneMask,
  formatDocument,
  formatCurrency,
  formatCentsToCurrency,
  formatDate,
} from '@/lib/mask'
import {
  getPaymentStatusLabel,
  getPaymentStatusTooltip,
} from '@/lib/payment-status'
import {
  getSplitStatusLabel,
  isBoletoParceladoSplit,
  isDualPaymentSplit,
} from '@/lib/split-status'
import {
  computePaymentFinancialSummary,
  getPaymentSettlementLabel,
} from '@/lib/payment-financial-summary'
import { ClienteName } from '@/components/ClienteName'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { TransactionPipeline } from '@/hooks/useTransaction'
import { useManualReconcile } from '@/hooks/useManualReconcile'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useBoletos, type BoletoSession } from '@/hooks/useBoletos'
import type { SplitSession } from '@/hooks/useSplitGroupSessions'
import { useSplitGroupDetail } from '@/hooks/useSplitGroupDetail'
import {
  useCompraPaymentTimeline,
  type TimelineSession,
} from '@/hooks/useCompraPaymentTimeline'
import { SplitGroupDetailDrawer } from '@/components/split/SplitGroupDetailDrawer'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? ''
const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY ?? ''
const SUPABASE_INTERNAL_KEY = SUPABASE_SECRET_KEY || SUPABASE_SERVICE_ROLE_KEY
const normalizeBearerToken = (token?: string): string =>
  (token ?? '')
    .trim()
    .replace(/^Bearer\s+/i, '')
const isLikelyJwt = (token: string): boolean => {
  const jwtParts = token.split('.')
  return jwtParts.length === 3 && jwtParts.every((part) => part.length > 0)
}
const UPSERT_BEARER_KEY = normalizeBearerToken(SUPABASE_SERVICE_ROLE_KEY)

type OmieUpsertResponse = {
  success: boolean
  action?: string
  omie_os_id?: string
  omie_servico_id?: string
  nCodServ?: string | number
  cCodIntServ?: string
  correlation_id?: string
  code?: string
  message?: string
}

const mapOmieUpsertError = (code?: string, message?: string): string => {
  switch (code) {
    case 'ADMIN_PASSWORD_INVALID':
      return 'Senha administrativa inválida.'
    case 'INTERNAL_AUTH_INVALID':
    case 'UNAUTHORIZED':
      return 'Credencial interna inválida para executar upsert.'
    case 'LOCK_NOT_ACQUIRED':
      return 'Compra em processamento por outra execução. Tente novamente em instantes.'
    case 'MISSING_REQUIRED_FIELDS':
      return 'Dados obrigatórios ausentes para executar upsert na OMIE.'
    case 'INVALID_REQUEST':
      return message || 'Requisição inválida para upsert OMIE.'
    case 'COMPRA_NOT_FOUND':
      return 'Compra não encontrada no CRM.'
    case 'CLIENTE_NOT_FOUND':
      return 'Cliente da compra não encontrado.'
    case 'NFSE_CONFIG_NOT_FOUND':
      return 'Configuração fiscal OMIE ativa não encontrada.'
    case 'OS_NOT_EDITABLE':
      return 'OS faturada/cancelada; alteração não permitida.'
    case 'OMIE_ERROR':
    case 'OMIE_REQUEST_FAILED':
      return 'Falha de comunicação com OMIE. Tente novamente.'
    default:
      return message || 'Erro inesperado ao executar upsert OMIE.'
  }
}

async function executeOmieUpsert(compraId: string, adminPassword: string): Promise<OmieUpsertResponse> {
  if (!SUPABASE_URL || !UPSERT_BEARER_KEY) {
    throw new Error('Configuração interna ausente para executar upsert OMIE.')
  }
  if (!isLikelyJwt(UPSERT_BEARER_KEY)) {
    throw new Error(
      'Credencial interna inválida para upsert. Configure VITE_SUPABASE_SERVICE_ROLE_KEY com JWT válido do projeto.'
    )
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/omie-upsert-os`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${UPSERT_BEARER_KEY}`,
      'x-admin-password': adminPassword,
      'x-correlation-id': crypto.randomUUID(),
    },
    body: JSON.stringify({ compra_id: compraId }),
  })

  const data = (await response.json().catch(() => ({}))) as OmieUpsertResponse
  if (!response.ok) {
    const mapped = mapOmieUpsertError(data.code, data.message)
    throw new Error(mapped)
  }

  return data
}

const mapOmieUpsertServiceError = (code?: string, message?: string): string => {
  switch (code) {
    case 'ADMIN_PASSWORD_INVALID':
      return 'Senha administrativa inválida.'
    case 'INTERNAL_AUTH_INVALID':
    case 'UNAUTHORIZED':
      return 'Credencial interna inválida para executar upsert de serviço.'
    case 'INVALID_REQUEST':
      return message || 'Requisição inválida para upsert de serviço.'
    case 'SYNC_NOT_FOUND':
      return 'Registro OMIE não encontrado para a compra.'
    case 'MISSING_SERVICE_ID':
      return 'Serviço OMIE ainda não existe para esta compra.'
    case 'MISSING_REQUIRED_FIELDS':
      return 'Dados obrigatórios ausentes para atualizar serviço OMIE.'
    case 'NFSE_CONFIG_NOT_FOUND':
      return 'Configuração fiscal OMIE ativa não encontrada.'
    case 'OMIE_ERROR':
    case 'OMIE_REQUEST_FAILED':
      return 'Falha de comunicação com OMIE. Tente novamente.'
    default:
      return message || 'Erro inesperado ao executar upsert de serviço OMIE.'
  }
}

async function executeOmieUpsertService(
  compraId: string,
  adminPassword: string
): Promise<OmieUpsertResponse> {
  if (!SUPABASE_URL || !UPSERT_BEARER_KEY) {
    throw new Error('Configuração interna ausente para executar upsert de serviço OMIE.')
  }
  if (!isLikelyJwt(UPSERT_BEARER_KEY)) {
    throw new Error(
      'Credencial interna inválida para upsert. Configure VITE_SUPABASE_SERVICE_ROLE_KEY com JWT válido do projeto.'
    )
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/omie-upsert-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${UPSERT_BEARER_KEY}`,
      'x-admin-password': adminPassword,
      'x-correlation-id': crypto.randomUUID(),
    },
    body: JSON.stringify({ compra_id: compraId }),
  })

  const data = (await response.json().catch(() => ({}))) as OmieUpsertResponse
  if (!response.ok) {
    const mapped = mapOmieUpsertServiceError(data.code, data.message)
    throw new Error(mapped)
  }

  return data
}

async function retryNfseViaOrchestrator(compraId: string): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/omie-orchestrator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_INTERNAL_KEY}`,
    },
    body: JSON.stringify({ compra_id: compraId, force: true }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message ?? data.error ?? `Erro ${response.status}`)
  }

  return { success: data.success ?? true, status: data.status ?? 'unknown' }
}

function RetryNfseButton({ compraId }: { compraId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await retryNfseViaOrchestrator(compraId)
      if (res.status === 'synced' || res.status === 'success') {
        setResult('NFS-e processada com sucesso')
      } else if (res.status === 'awaiting_nfse') {
        setResult('Prefeitura ainda processando. Tente novamente em alguns minutos.')
      } else {
        setResult(`Retorno: ${res.status}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reprocessar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-2 space-y-1">
      <button
        onClick={handleRetry}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Reprocessando...' : 'Reprocessar NFS-e'}
      </button>
      {result && (
        <div className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
          {result}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

/**
 * Download signed contract PDF via clicksign-download-signed-document Edge Function.
 * Fetches a fresh signed URL from ClickSign API v3 to avoid 502 when stored URL expires.
 * Function has verify_jwt: false — no JWT required. Access relies on compra_id (UUID) knowledge.
 */
async function downloadContractPdfFromApi(
  compraId: string,
  filename = 'contrato-assinado.pdf'
): Promise<void> {
  const url = `${SUPABASE_URL}/functions/v1/clicksign-download-signed-document?compra_id=${encodeURIComponent(compraId)}`

  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    let msg = `Falha ao baixar PDF: ${response.status}`
    try {
      const text = await response.text()
      try {
        const err = JSON.parse(text)
        msg += err?.error ? ` - ${err.error}` : ''
        if (err?.hint) msg += ` (${err.hint})`
        if (err?.body) msg += ` [${String(err.body).slice(0, 80)}]`
      } catch {
        if (text) msg += ` - ${text.slice(0, 100)}`
      }
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(blobUrl)
}

function ContractPdfDownloadButton({
  compraId,
  label = 'Download PDF',
}: {
  compraId: string
  label?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    try {
      await downloadContractPdfFromApi(compraId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="text-blue-600 underline hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Baixando...' : label}
      </button>
      {error && (
        <span className="text-red-500 text-xs" title={error}>
          ⚠️
        </span>
      )}
    </span>
  )
}

interface StepDetailProps {
  step: string
  data: TransactionPipeline
  onRefetch?: () => void
}

function DetailRow({
  label,
  value,
  mono,
  copyValue,
  copyLabel,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  copyValue?: string | null
  copyLabel?: string
}) {
  return (
    <div className="group flex flex-col gap-1 py-1.5 border-b border-dashed last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1.5 break-all sm:ml-4 ${mono ? 'font-mono' : ''}`}>
        <span className="text-left text-xs sm:text-right">{value ?? '—'}</span>
        <CopyValueButton value={copyValue} label={copyLabel ?? label} />
      </span>
    </div>
  )
}

function resolveCheckoutInstallments(data: TransactionPipeline): {
  value: number | null
  isPlanned: boolean
  isRecurrence: boolean
} {
  if (data.checkout_recorrencia_enabled && (data.recorrencia_total_parcelas ?? 0) > 0) {
    return { value: data.recorrencia_total_parcelas, isPlanned: false, isRecurrence: true }
  }

  if (data.split_group_id && (data.split_total_sessoes ?? 0) > 0) {
    return { value: data.split_total_sessoes, isPlanned: false, isRecurrence: false }
  }

  if (!data.split_group_id && data.metodo_pagamento === 'boleto' && (data.compra_numero_parcelas ?? 0) > 1) {
    return { value: data.compra_numero_parcelas, isPlanned: true, isRecurrence: false }
  }

  if ((data.parcelas ?? 0) > 0) {
    return { value: data.parcelas, isPlanned: false, isRecurrence: false }
  }

  return { value: null, isPlanned: false, isRecurrence: false }
}

function CheckoutDetail({
  data,
}: {
  data: TransactionPipeline
  onRefetch?: () => void
}) {
  const [adminPassword, setAdminPassword] = useState('')
  const {
    isEligible,
    reconcile,
    loadingBySession,
    errorBySession,
    feedbackBySession,
    resultBySession,
    getCooldownSeconds,
  } = useManualReconcile()

  const sessionId = data.session_id ?? ''
  const hasSessionId = sessionId.length > 0
  const result = hasSessionId ? resultBySession[sessionId] : null
  const checkoutStatus = result?.status ?? data.checkout_session_status
  const checkoutCompletedAt = result?.completed_at ?? data.checkout_completed_at
  const eligible = hasSessionId && isEligible(checkoutStatus, data.payment_id)
  const loading = hasSessionId ? loadingBySession[sessionId] === true : false
  const cooldownSeconds = hasSessionId ? getCooldownSeconds(sessionId) : 0
  const error = hasSessionId ? errorBySession[sessionId] : null
  const feedback = hasSessionId ? feedbackBySession[sessionId] : null
  const installments = resolveCheckoutInstallments(data)

  const handleReconcile = async () => {
    if (!hasSessionId) return
    await reconcile({
      sessionId,
      compraId: data.compra_id,
      statusBefore: checkoutStatus,
      paymentId: data.payment_id,
      adminPassword,
    })
  }

  return (
    <>
      <DetailRow
        label="Session ID"
        value={data.session_id}
        mono
        copyValue={data.session_id}
      />
      <DetailRow label="Status" value={<StatusBadge
              status={
                checkoutStatus === 'completed'
                  ? 'completed'
                  : checkoutStatus === 'failed' ||
                      checkoutStatus === 'expired' ||
                      checkoutStatus === 'cancelled'
                    ? 'error'
                    : 'in_progress'
              }
              label={checkoutStatus ?? '—'}
            />} />
      <DetailRow label="Método" value={formatMethodLabel(data.metodo_pagamento)} />
      <DetailRow
        label="Valor"
        value={
          data.checkout_recorrencia_enabled && data.valor_parcela_recorrente_centavos
            ? `${(data.recorrencia_total_parcelas ?? 1)}x de ${formatCentsToCurrency(data.valor_parcela_recorrente_centavos)}`
            : (data.valor_centavos ? formatCentsToCurrency(data.valor_centavos) : formatCurrency(data.valor_total))
        }
      />
      <DetailRow
        label="Parcelas"
        value={
          installments.value != null
            ? installments.isRecurrence
              ? `${installments.value}x (recorrente)`
              : `${installments.value}${installments.isPlanned ? ' (planejadas)' : ''}`
            : '—'
        }
      />
      {data.split_group_id && (
        <DetailRow
          label={
            isBoletoParceladoSplit(data.split_type)
              ? 'Boleto parcelado'
              : isDualPaymentSplit(data.split_type)
                ? 'Split (2 meios)'
                : 'Pagamento em grupo'
          }
          value={
            <Badge variant="outline">{getSplitStatusLabel(data)}</Badge>
          }
        />
      )}
      <DetailRow
        label="Cliente"
        value={<ClienteName nome={data.cliente_nome} leadId={data.lead_id} />}
      />
      <DetailRow
        label="Documento"
        value={formatDocument(data.cliente_documento)}
        copyValue={data.cliente_documento}
      />
      <DetailRow label="Email" value={data.cliente_email ?? '—'} copyValue={data.cliente_email} />
      <DetailRow
        label="Telefone"
        value={data.cliente_telefone ? applyPhoneMask(data.cliente_telefone) : '—'}
        copyValue={data.cliente_telefone}
      />
      <DetailRow label="Vendedor" value={data.vendedor_nome ?? '—'} />
      {data.checkout_url && (
        <DetailRow
          label="Link do Checkout"
          value={
            <a
              href={data.checkout_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-1"
            >
              Abrir checkout
              <ExternalLink className="h-3 w-3" />
            </a>
          }
        />
      )}
      {data.checkout_expires_at && (
        <DetailRow label="Expira em" value={formatDate(data.checkout_expires_at)} />
      )}
      <DetailRow label="Criado em" value={formatDate(data.checkout_created_at)} />
      <DetailRow label="Completado em" value={formatDate(checkoutCompletedAt)} />
      <DetailRow
        label="Reconciliar pagamento"
        value={
          hasSessionId ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] sm:items-end">
              <PasswordInput
                placeholder="Senha de admin"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="h-8 text-xs"
                disabled={loading}
              />
              <Button
                size="sm"
                onClick={handleReconcile}
                disabled={!eligible || !adminPassword.trim() || loading || cooldownSeconds > 0}
              >
                {loading
                  ? 'Reconciliando...'
                  : cooldownSeconds > 0
                    ? `Aguarde ${cooldownSeconds}s`
                    : 'Reconciliar pagamento'}
              </Button>
              {!eligible && (
                <span className="text-[11px] text-muted-foreground">
                  Disponível para sessões pending/processing com payment_id.
                </span>
              )}
              {feedback && (
                <span
                  className={
                    feedback.kind === 'success'
                      ? 'text-[11px] text-emerald-700'
                      : 'text-[11px] text-amber-700'
                  }
                >
                  {feedback.message}
                </span>
              )}
              {error && <span className="text-[11px] text-red-700">{error}</span>}
            </div>
          ) : (
            '—'
          )
        }
      />
    </>
  )
}

const COMPRA_CHECKOUT_STATUS_MAP: Record<
  string,
  'completed' | 'in_progress' | 'error' | 'pending'
> = {
  pago: 'completed',
  recusado: 'error',
  cancelado: 'error',
  parcialmente_pago: 'in_progress',
  aguardando_pagamento: 'pending',
}

function mapBoletoSessionStatus(
  status: string,
): 'completed' | 'in_progress' | 'error' | 'pending' {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'processing':
      return 'in_progress'
    case 'failed':
    case 'expired':
    case 'cancelled':
      return 'error'
    default:
      return 'pending'
  }
}

function getBoletoLabel(index: number, total: number, splitIndex: number | null): string {
  if (total === 1) return 'Boleto único'
  if (splitIndex != null) return `Boleto ${splitIndex}`
  return `Boleto ${index + 1}`
}

function BoletoCard({
  boleto,
  index,
  total,
  defaultOpen = false,
}: {
  boleto: BoletoSession
  index: number
  total: number
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">
                {getBoletoLabel(index, total, boleto.split_index)}
              </span>
              <StatusBadge
                status={mapBoletoSessionStatus(boleto.status)}
                label={boleto.status}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium">
                {formatCentsToCurrency(boleto.valor_centavos)}
              </span>
              <span className="text-xs text-muted-foreground">
                {boleto.boleto_vencimento ? formatDate(boleto.boleto_vencimento) : '—'}
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 pb-3 pt-1 space-y-0.5">
            <DetailRow
              label="URL"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <a
                    href={boleto.boleto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    Abrir
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <CopyValueButton value={boleto.boleto_url} label="Link do boleto" />
                </span>
              }
            />
            {boleto.boleto_digitable_line && (
              <DetailRow
                label="Linha digitável"
                value={boleto.boleto_digitable_line}
                mono
                copyValue={boleto.boleto_digitable_line}
                copyLabel="Linha digitável"
              />
            )}
            {boleto.boleto_barcode && (
              <DetailRow
                label="Código de barras"
                value={boleto.boleto_barcode}
                mono
                copyValue={boleto.boleto_barcode}
                copyLabel="Código de barras"
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function formatMethodLabel(method: string | null): string {
  if (!method) return '—'
  const normalized = method.toLowerCase()
  if (normalized === 'pix') return 'PIX'
  if (normalized === 'cartao_recorrente') return 'Cartão Recorrente'
  if (normalized.includes('cartao') || normalized.includes('card')) return 'Cartão'
  if (normalized.includes('boleto')) return 'Boleto'
  return method
}

function mapSplitSessionStatus(
  status: string | null,
): 'completed' | 'in_progress' | 'error' | 'pending' {
  if (!status) return 'pending'
  switch (status) {
    case 'completed':
      return 'completed'
    case 'processing':
      return 'in_progress'
    case 'failed':
    case 'expired':
    case 'cancelled':
      return 'error'
    default:
      return 'pending'
  }
}

function SplitSessionCard({
  session,
  index,
  total,
  defaultOpen = false,
  displayIndex,
}: {
  session: SplitSession | TimelineSession
  index: number
  total: number
  defaultOpen?: boolean
  displayIndex?: number
}) {
  const [open, setOpen] = useState(defaultOpen)
  const method = session.metodo_pagamento?.toLowerCase() ?? ''
  const isBoleto = method.includes('boleto')
  const label =
    displayIndex != null
      ? `#${displayIndex}`
      : session.split_index != null
        ? `#${session.split_index}`
        : total > 1
          ? `#${index + 1}`
          : ''

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {label && <span className="text-xs font-mono text-muted-foreground">{label}</span>}
              <span className="text-xs font-medium">{formatMethodLabel(session.metodo_pagamento)}</span>
              <StatusBadge
                status={mapSplitSessionStatus(session.status)}
                label={session.status ?? 'pending'}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium">
                {formatCentsToCurrency(session.valor_centavos)}
              </span>
              {session.completed_at && (
                <span className="text-xs text-muted-foreground">
                  {formatDate(session.completed_at)}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  open && 'rotate-180',
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 pb-3 pt-1 space-y-0.5">
            {session.payment_id && (
              <DetailRow
                label="Payment ID"
                value={session.payment_id}
                mono
                copyValue={session.payment_id}
              />
            )}
            {session.payment_status != null && (
              <DetailRow
                label="Payment Status"
                value={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-help">
                        {getPaymentStatusLabel(session.payment_status)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      {getPaymentStatusTooltip(session.payment_status)}
                    </TooltipContent>
                  </Tooltip>
                }
              />
            )}
            {isBoleto && session.boleto_url && (
              <DetailRow
                label="Download PDF"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <a
                      href={session.boleto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      Download PDF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <CopyValueButton value={session.boleto_url} label="Link do boleto" />
                  </span>
                }
              />
            )}
            {isBoleto && session.boleto_digitable_line && (
              <DetailRow
                label="Linha digitável"
                value={session.boleto_digitable_line}
                mono
                copyValue={session.boleto_digitable_line}
                copyLabel="Linha digitável"
              />
            )}
            {isBoleto && session.boleto_barcode && (
              <DetailRow
                label="Código de barras"
                value={session.boleto_barcode}
                mono
                copyValue={session.boleto_barcode}
                copyLabel="Código de barras"
              />
            )}
            {isBoleto && session.boleto_vencimento && (
              <DetailRow
                label="Vencimento"
                value={formatDate(session.boleto_vencimento)}
              />
            )}
            {session.completed_at && (
              <DetailRow label="Concluído em" value={formatDate(session.completed_at)} />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function SplitSessionCards({
  data,
  sessions,
  loading,
  onRefetch,
  onOpenDrawer,
  paidCount,
  totalCount,
}: {
  data: TransactionPipeline
  sessions: (SplitSession | TimelineSession)[]
  loading: boolean
  onRefetch?: () => void
  onOpenDrawer?: () => void
  paidCount?: number
  totalCount?: number
}) {
  const paid = paidCount ?? data.split_sessoes_pagas ?? 0
  const total = totalCount ?? data.split_total_sessoes ?? 0
  const progressPercent = total > 0 ? Math.round((paid / total) * 100) : 0
  const isGroupedFlow = Boolean(data.split_group_id)
  const isBoletoParcelado = isBoletoParceladoSplit(data.split_type)
  const isDualPayment = isDualPaymentSplit(data.split_type)
  const hasMultipleMethods = new Set(
    sessions.map((s) => s.metodo_pagamento?.toLowerCase()),
  ).size > 1
  const sectionLabel = !isGroupedFlow
    ? 'Histórico de tentativas de pagamento'
    : hasMultipleMethods
      ? 'Histórico de pagamentos'
      : isBoletoParcelado
        ? 'Parcelas do boleto'
        : isDualPayment
          ? 'Split (2 meios)'
          : 'Pagamentos em grupo'
  const loadingLabel = !isGroupedFlow
    ? 'Carregando histórico de tentativas...'
    : isBoletoParcelado
      ? 'Carregando parcelas do boleto...'
      : 'Carregando sessões do split...'
  const emptyStateLabel = !isGroupedFlow
    ? 'Nenhuma tentativa de pagamento encontrada para esta compra.'
    : isBoletoParcelado
      ? 'Nenhuma parcela encontrada para este boleto parcelado.'
      : 'Nenhuma sessão encontrada para este grupo de split.'

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-violet-600" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {sectionLabel}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {paid}/{total} pagas
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onOpenDrawer && (
            <button
              type="button"
              onClick={onOpenDrawer}
              className="text-xs text-violet-600 hover:text-violet-800"
            >
              Ver detalhes completos
            </button>
          )}
          {onRefetch && (
            <button
              type="button"
              onClick={onRefetch}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Atualizar
            </button>
          )}
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-zinc-100">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all',
            progressPercent >= 100 ? 'bg-emerald-500' : 'bg-violet-500',
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {loadingLabel}
        </div>
      )}

      {!loading && sessions.length > 0 &&
        sessions.map((session, i) => (
          <SplitSessionCard
            key={session.id}
            session={session}
            index={i}
            total={sessions.length}
            defaultOpen={sessions.length <= 2}
            displayIndex={'displayIndex' in session ? session.displayIndex : undefined}
          />
        ))}

      {!loading && sessions.length === 0 && (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {emptyStateLabel}
        </div>
      )}
    </div>
  )
}

function PaymentDetail({
  data,
  onRefetch,
}: {
  data: TransactionPipeline
  onRefetch?: () => void
}) {
  const { boletos, loading: boletosLoading, fetch: fetchBoletos } = useBoletos()
  const {
    sessions: timelineSessions,
    paidCount: timelinePaid,
    totalCount: timelineTotal,
    loading: timelineLoading,
    fetch: fetchTimeline,
  } = useCompraPaymentTimeline(data.compra_id, data.split_group_id)
  const splitDrawer = useSplitGroupDetail()
  const [showSplitDrawer, setShowSplitDrawer] = useState(false)

  const splitGroupId = data.split_group_id
  const timelineSplitGroupId =
    timelineSessions.find((session) => session.split_group_id)?.split_group_id ?? null
  const activeSplitGroupId = splitGroupId ?? timelineSplitGroupId
  const hasSplitGroup = !!activeSplitGroupId
  const isDualPayment = hasSplitGroup && isDualPaymentSplit(data.split_type)
  const isBoletoParcelado = hasSplitGroup && isBoletoParceladoSplit(data.split_type)
  const hasGroupedPayments = hasSplitGroup && (isDualPayment || isBoletoParcelado || !data.split_type)
  const shouldShowUnifiedTimeline = hasGroupedPayments || timelineTotal > 1
  const financialSummary = computePaymentFinancialSummary(
    timelineSessions,
    data.valor_total,
  )
  const settlementLabel = getPaymentSettlementLabel(financialSummary.situacaoQuitacao)

  const refetchAll = useCallback(() => {
    fetchBoletos(data.compra_id)
    void fetchTimeline(data.compra_id, activeSplitGroupId)
    onRefetch?.()
  }, [
    activeSplitGroupId,
    data.compra_id,
    fetchBoletos,
    fetchTimeline,
    onRefetch
  ])

  useEffect(() => {
    fetchBoletos(data.compra_id)
  }, [data.compra_id, fetchBoletos])

  const handleOpenDrawer = useCallback(() => {
    if (!activeSplitGroupId) return
    setShowSplitDrawer(true)
    void splitDrawer.load(activeSplitGroupId)
  }, [activeSplitGroupId, splitDrawer])

  const handleRefreshDrawer = useCallback(() => {
    if (!activeSplitGroupId) return
    void splitDrawer.load(activeSplitGroupId)
  }, [activeSplitGroupId, splitDrawer])

  const metodoEBoleto = data.metodo_pagamento?.toLowerCase().includes('boleto') ?? false

  return (
    <>
      <DetailRow
        label="Payment ID (Braspag/Cielo)"
        value={data.payment_id}
        mono
        copyValue={data.payment_id}
      />
      <DetailRow label="NSU" value={data.payment_nsu} mono copyValue={data.payment_nsu} />
      <DetailRow
        label="Payment Status"
        value={
          data.payment_status != null ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-help"
                >
                  {getPaymentStatusLabel(data.payment_status)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm">
                {getPaymentStatusTooltip(data.payment_status)}
              </TooltipContent>
            </Tooltip>
          ) : (
            '—'
          )
        }
      />
      <DetailRow
        label="Checkout Status"
        value={
          data.compra_checkout_status ? (
            <StatusBadge
              status={
                COMPRA_CHECKOUT_STATUS_MAP[data.compra_checkout_status] ??
                'pending'
              }
              label={data.compra_checkout_status}
            />
          ) : (
            '—'
          )
        }
      />
      <DetailRow label="Valor da venda" value={formatCurrency(data.valor_total)} />
      <DetailRow
        label="Total pago confirmado"
        value={formatCentsToCurrency(financialSummary.totalPagoCentavos)}
      />
      <DetailRow
        label="Saldo pendente"
        value={formatCentsToCurrency(financialSummary.saldoPendenteCentavos)}
      />
      <DetailRow
        label="Quitação da venda"
        value={
          <Badge
            variant="outline"
            className={
              financialSummary.situacaoQuitacao === 'quitado'
                ? 'border-emerald-200 text-emerald-700'
                : financialSummary.situacaoQuitacao === 'parcial'
                  ? 'border-amber-200 text-amber-700'
                  : 'border-zinc-200 text-zinc-700'
            }
          >
            {settlementLabel}
          </Badge>
        }
      />
      <DetailRow label="Venda Aprovada" value={data.vendaaprovada ? 'Sim' : 'Não'} />
      <DetailRow label="Completado em" value={formatDate(data.checkout_completed_at)} />

      {/* Unified payment timeline (split 2 meios / boleto parcelado + entry payments) */}
      {shouldShowUnifiedTimeline && (
        <SplitSessionCards
          data={data}
          sessions={timelineSessions}
          loading={timelineLoading}
          onRefetch={refetchAll}
          onOpenDrawer={handleOpenDrawer}
          paidCount={timelinePaid}
          totalCount={timelineTotal}
        />
      )}

      {/* Boletos section (only for non-grouped transactions) */}
      {!hasGroupedPayments && !timelineLoading && boletosLoading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando boletos...
        </div>
      )}

      {!hasGroupedPayments && !timelineLoading && !boletosLoading && boletos.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Boletos ({boletos.length})
            </span>
            <button
              type="button"
              onClick={refetchAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Atualizar
            </button>
          </div>
          {boletos.map((boleto, i) => (
            <BoletoCard
              key={boleto.id}
              boleto={boleto}
              index={i}
              total={boletos.length}
              defaultOpen={boletos.length === 1}
            />
          ))}
        </div>
      )}

      {!hasGroupedPayments && !timelineLoading && !boletosLoading && boletos.length === 0 && metodoEBoleto && (
        <div className="mt-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Nenhum boleto gerado para esta compra.
        </div>
      )}

      {/* Split Group Detail Drawer */}
      {hasGroupedPayments && (
        <SplitGroupDetailDrawer
          open={showSplitDrawer}
          onOpenChange={setShowSplitDrawer}
          loading={splitDrawer.loading}
          error={splitDrawer.error}
          detail={splitDrawer.detail}
          onRefresh={handleRefreshDrawer}
        />
      )}
    </>
  )
}

function NfeDetail({ data }: { data: TransactionPipeline; onRefetch?: () => void }) {
  const canRetry =
    data.nfe_status === 'awaiting_nfse' || data.nfe_status === 'Error'

  return (
    <>
      <DetailRow label="Nota Fiscal ID" value={data.nota_fiscal_id} mono />
      <DetailRow label="OS OMIE" value={data.nf_omie_os_id ?? data.omie_os_id} mono />
      <DetailRow
        label="Status NF"
        value={
          data.nfe_status ? (
            <StatusBadge
              status={
                data.nfe_status === 'Issued'
                  ? 'completed'
                  : data.nfe_status === 'Error' || data.nfe_status === 'Cancelled'
                    ? 'error'
                    : 'in_progress'
              }
              label={data.nfe_status}
            />
          ) : (
            '—'
          )
        }
      />
      <DetailRow label="Numero" value={data.nfe_numero} />
      <DetailRow label="Emitida em" value={formatDate(data.nfe_emitida_em)} />
      <DetailRow
        label="PDF"
        value={
          data.nfe_pdf_url ? (
            <a
              href={data.nfe_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 inline-flex items-center gap-1"
            >
              Download
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-muted-foreground">PDF nao disponivel</span>
          )
        }
      />
      {data.nfe_erro_mensagem && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {data.nfe_erro_mensagem}
        </div>
      )}
      {canRetry && <RetryNfseButton compraId={data.compra_id} />}
    </>
  )
}

function ContractDetail({
  data,
}: {
  data: TransactionPipeline
  onRefetch?: () => void
}) {
  const contractStatus = data.clicksign_status
  const statusMap: Record<string, 'completed' | 'in_progress' | 'error' | 'pending'> = {
    Assinado: 'completed',
    'Aguardando Assinatura': 'in_progress',
    error: 'error',
  }

  const signers = data.clicksign_signers ?? []
  const celebridade =
    (data.clicksign_metadata as Record<string, unknown>)?.celebridade as string | undefined

  const compraId = data.compra_id

  return (
    <>
      <DetailRow
        label="Envelope ID"
        value={data.clicksign_envelope_id}
        mono
        copyValue={data.clicksign_envelope_id}
      />
      <DetailRow
        label="Document Key"
        value={data.clicksign_document_key}
        mono
        copyValue={data.clicksign_document_key}
      />
      <DetailRow
        label="Status"
        value={
          contractStatus ? (
            <StatusBadge
              status={statusMap[contractStatus] ?? 'pending'}
              label={contractStatus ?? 'desconhecido'}
            />
          ) : (
            '—'
          )
        }
      />
      <DetailRow
        label="Venda Aprovada"
        value={
          data.vendaaprovada === true
            ? 'Sim'
            : data.vendaaprovada === false
              ? 'Não'
              : '—'
        }
      />
      <DetailRow label="Status Produção" value={data.statusproducao ?? '—'} />
      <DetailRow label="Enviado em" value={formatDate(data.data_envio_assinatura)} />
      <DetailRow label="Assinado em" value={formatDate(data.data_assinatura_concluida)} />
      {celebridade && <DetailRow label="Celebridade" value={celebridade} />}
      {signers.length > 0 && (
        <div className="mt-2 space-y-1">
          <span className="text-xs text-muted-foreground">Signatários</span>
          {signers.map((s, i) => (
            <div
              key={s.signer_key ?? i}
              className="group flex items-center justify-between rounded-md border px-2 py-1 text-xs"
            >
              <span className="font-medium">{s.name ?? '—'}</span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span>{s.email ?? '—'}</span>
                <CopyValueButton value={s.email} label="E-mail do signatário" />
              </span>
            </div>
          ))}
        </div>
      )}
      {contractStatus === 'Assinado' && compraId && (
        <DetailRow
          label="Documento Assinado"
          value={<ContractPdfDownloadButton compraId={compraId} label="Download PDF" />}
        />
      )}
      {data.clicksign_error_message && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {data.clicksign_error_message}
        </div>
      )}
    </>
  )
}

function OmieDetail({
  data,
  onRefetch,
}: {
  data: TransactionPipeline
  onRefetch?: () => void
}) {
  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState(false)
  const [selectedPayloadType, setSelectedPayloadType] = useState<
    'cliente' | 'servico' | 'os' | null
  >(null)

  const payloadByType: Record<'cliente' | 'servico' | 'os', Record<string, unknown> | null> = {
    cliente: data.omie_cliente_payload,
    servico: data.omie_servico_payload,
    os: data.omie_os_payload,
  }
  const payloadTitleByType: Record<'cliente' | 'servico' | 'os', string> = {
    cliente: 'Cliente',
    servico: 'Serviço',
    os: 'OS',
  }

  const openPayloadModal = (type: 'cliente' | 'servico' | 'os') => {
    setSelectedPayloadType(type)
    setIsPayloadModalOpen(true)
  }

  const selectedPayload = selectedPayloadType ? payloadByType[selectedPayloadType] : null
  const selectedPayloadText = selectedPayload
    ? JSON.stringify(selectedPayload, null, 2)
    : null
  const selectedPayloadLabel = selectedPayloadType
    ? `Payload OMIE (${payloadTitleByType[selectedPayloadType]})`
    : 'Payload OMIE'
  const [adminPassword, setAdminPassword] = useState('')
  const [loadingUpsert, setLoadingUpsert] = useState(false)
  const [upsertError, setUpsertError] = useState<string | null>(null)
  const [upsertResult, setUpsertResult] = useState<string | null>(null)
  const [loadingUpsertService, setLoadingUpsertService] = useState(false)
  const [upsertServiceError, setUpsertServiceError] = useState<string | null>(null)
  const [upsertServiceResult, setUpsertServiceResult] = useState<string | null>(null)

  const renderClickableId = (
    value: string | null,
    type: 'cliente' | 'servico' | 'os'
  ) => {
    if (!value) return '—'

    return (
      <button
        type="button"
        onClick={() => openPayloadModal(type)}
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
      >
        {value}
      </button>
    )
  }

  const handleUpsert = async () => {
    if (!adminPassword.trim() || loadingUpsert) return
    setLoadingUpsert(true)
    setUpsertError(null)
    setUpsertResult(null)

    try {
      const result = await executeOmieUpsert(data.compra_id, adminPassword)
      const action = result.action ? ` (${result.action})` : ''
      const osId = result.omie_os_id ? ` | OS: ${result.omie_os_id}` : ''
      setUpsertResult(`Upsert executado com sucesso${action}${osId}`)
      onRefetch?.()
    } catch (error) {
      setUpsertError(error instanceof Error ? error.message : 'Falha ao executar upsert OMIE.')
    } finally {
      setLoadingUpsert(false)
    }
  }

  const handleUpsertService = async () => {
    if (!adminPassword.trim() || loadingUpsertService) return
    setLoadingUpsertService(true)
    setUpsertServiceError(null)
    setUpsertServiceResult(null)

    try {
      const result = await executeOmieUpsertService(data.compra_id, adminPassword)
      const action = result.action ? ` (${result.action})` : ''
      const serviceId = result.omie_servico_id ?? result.nCodServ
      const service = serviceId ? ` | Serviço: ${serviceId}` : ''
      setUpsertServiceResult(`Upsert serviço executado com sucesso${action}${service}`)
      onRefetch?.()
    } catch (error) {
      setUpsertServiceError(
        error instanceof Error ? error.message : 'Falha ao executar upsert de serviço OMIE.'
      )
    } finally {
      setLoadingUpsertService(false)
    }
  }

  return (
    <>
      <DetailRow
        label="Sync ID"
        value={
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                {data.omie_sync_id ?? '—'}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-sm">
              Identificador interno do registro de sincronização na tabela omie_sync.
            </TooltipContent>
          </Tooltip>
        }
        mono
        copyValue={data.omie_sync_id}
      />
      <DetailRow
        label="Status"
        value={
          data.omie_status ? (
            <StatusBadge
              status={
                data.omie_status === 'synced'
                  ? 'completed'
                  : data.omie_status === 'failed'
                    ? 'error'
                    : 'in_progress'
              }
              label={data.omie_status}
            />
          ) : (
            '—'
          )
        }
      />
      <DetailRow
        label="Tipo de venda"
        value={
          data.tipo_venda === 'Venda'
            ? 'Venda nova'
            : data.tipo_venda === 'Renovacao'
              ? 'Renovação'
              : data.tipo_venda === 'Upsell'
                ? 'Upsell'
                : '—'
        }
      />
      <DetailRow label="Segmento" value={data.segmento_nome ?? '—'} />
      <DetailRow label="Subsegmento" value={data.subsegmento_nome ?? '—'} />
      <DetailRow label="Celebridade" value={data.celebridade_nome ?? '—'} />
      <DetailRow label="Praça" value={data.praca ?? '—'} />
      <DetailRow
        label="OMIE Cliente ID"
        value={renderClickableId(data.omie_cliente_id, 'cliente')}
        mono
      />
      <DetailRow
        label="OMIE Serviço ID"
        value={renderClickableId(data.omie_servico_id, 'servico')}
        mono
      />
      <DetailRow
        label="OMIE OS ID"
        value={renderClickableId(data.omie_os_id, 'os')}
        mono
      />
      <DetailRow label="Tentativas" value={data.omie_attempts ?? 0} />
      <DetailRow label="Sincronizado em" value={formatDate(data.omie_synced_at)} />
      <DetailRow
        label="Upsert Serviço"
        value={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] sm:items-end">
            <PasswordInput
              placeholder="Senha de admin"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="h-8 text-xs"
              disabled={loadingUpsertService}
            />
            <Button
              size="sm"
              onClick={handleUpsertService}
              disabled={!adminPassword.trim() || loadingUpsertService}
            >
              {loadingUpsertService ? 'Executando...' : 'Upsert Serviço'}
            </Button>
            {upsertServiceResult && (
              <span className="text-[11px] text-emerald-700">{upsertServiceResult}</span>
            )}
            {upsertServiceError && (
              <span className="text-[11px] text-red-700">{upsertServiceError}</span>
            )}
          </div>
        }
      />
      <DetailRow
        label="Upsert OS"
        value={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[260px] sm:items-end">
            <PasswordInput
              placeholder="Senha de admin"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              className="h-8 text-xs"
              disabled={loadingUpsert}
            />
            <Button
              size="sm"
              onClick={handleUpsert}
              disabled={!adminPassword.trim() || loadingUpsert}
            >
              {loadingUpsert ? 'Executando...' : 'Upsert OS'}
            </Button>
            {upsertResult && <span className="text-[11px] text-emerald-700">{upsertResult}</span>}
            {upsertError && <span className="text-[11px] text-red-700">{upsertError}</span>}
          </div>
        }
      />
      {data.omie_last_error && (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {data.omie_last_error}
        </div>
      )}
      <Dialog open={isPayloadModalOpen} onOpenChange={setIsPayloadModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle>
                Payload enviado para OMIE
                {selectedPayloadType ? ` (${payloadTitleByType[selectedPayloadType]})` : ''}
              </DialogTitle>
              <CopyValueButton
                value={selectedPayloadText}
                label={selectedPayloadLabel}
                className="h-6 w-6 shrink-0"
              />
            </div>
            <DialogDescription>
              Mostra o payload persistido da tentativa mais recente para o item selecionado.
            </DialogDescription>
          </DialogHeader>
          {selectedPayload ? (
            <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              Payload não disponível para esta tentativa.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

const STEP_COMPONENTS: Record<
  string,
  React.ComponentType<{ data: TransactionPipeline; onRefetch?: () => void }>
> = {
  checkout: CheckoutDetail,
  payment: PaymentDetail,
  contract: ContractDetail,
  nfe: NfeDetail,
  omie: OmieDetail,
}

const STEP_TITLES: Record<string, string> = {
  checkout: 'Detalhes do Checkout',
  payment: 'Detalhes do Pagamento',
  contract: 'Detalhes do Contrato',
  nfe: 'Detalhes da NFS-e',
  omie: 'Detalhes OMIE Sync',
}

export function StepDetail({ step, data, onRefetch }: StepDetailProps) {
  const Component = STEP_COMPONENTS[step]
  if (!Component) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{STEP_TITLES[step]}</CardTitle>
      </CardHeader>
      <CardContent>
        <Component data={data} onRefetch={onRefetch} />
      </CardContent>
    </Card>
  )
}

