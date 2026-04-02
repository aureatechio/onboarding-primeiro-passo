import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  MessageSquare,
  ShieldAlert,
  WifiOff,
  XCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { useCheckoutSessionBrief } from '@/hooks/useCheckoutSessionBrief'
import { formatCentsToCurrency, formatDate } from '@/lib/mask'
import { cn } from '@/lib/utils'
import { STAGE_LABELS } from '@/lib/constants'
import {
  classifyDecline,
  SELLER_SCRIPTS,
  RETRY_POLICY_LABELS,
  SOURCE_LABELS,
  CONFIDENCE_LABELS,
  type DeclineCategory,
  type DeclineClassification,
  type ClassificationConfidence,
  type SellerScriptContext,
} from '@/lib/decline-helpers'

interface DeclineAssistantModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorCode: string
  errorMessage: string
  compraId: string
  stage: string
}

const COPIED_FEEDBACK_MS = 1500

const CATEGORY_ICONS: Record<DeclineCategory, typeof AlertCircle> = {
  insufficient_funds: CreditCard,
  card_blocked: Ban,
  transaction_not_allowed: Ban,
  suspected_fraud: ShieldAlert,
  invalid_card_data: CreditCard,
  issuer_unavailable: WifiOff,
  amount_or_installment_invalid: CreditCard,
  wrong_payment_method: CreditCard,
  recurrence_suspended: Clock,
  auth_failed: ShieldAlert,
  merchant_error: AlertCircle,
  processing_error: WifiOff,
  three_ds_failed: ShieldAlert,
  unknown: AlertCircle,
}

function classifyFromEventAndSession(
  errorCode: string,
  errorMessage: string,
  paymentResponse: Record<string, unknown> | null,
  cardBrand: string | null,
): DeclineClassification {
  const payment = paymentResponse?.Payment as Record<string, unknown> | undefined
  if (payment) {
    const creditCard = payment.CreditCard as Record<string, unknown> | undefined
    return classifyDecline({
      brand: (creditCard?.Brand as string) ?? cardBrand,
      providerReturnCode: payment.ProviderReturnCode as string | undefined,
      providerReturnMessage: payment.ProviderReturnMessage as string | undefined,
      returnCode: payment.ReturnCode as string | undefined,
      returnMessage: payment.ReturnMessage as string | undefined,
      reasonCode: payment.ReasonCode as string | undefined,
      reasonMessage: payment.ReasonMessage as string | undefined,
    })
  }

  const code = errorCode?.replace('PAYMENT_DECLINED', '').replace(/[:\s]/g, '').trim()
  return classifyDecline({
    brand: cardBrand,
    providerReturnCode: code || null,
    providerReturnMessage: errorMessage,
  })
}

function buildContext(
  session: {
    cliente_nome: string | null
    valor_centavos: number | null
    parcelas: number | null
    card_brand: string | null
    card_last_four: string | null
    expires_at: string | null
    permite_dois_meios: boolean | null
  } | null,
  errorMessage: string,
): SellerScriptContext {
  return {
    clienteNome: session?.cliente_nome || 'Cliente',
    valor: session?.valor_centavos != null
      ? formatCentsToCurrency(session.valor_centavos)
      : 'o valor informado',
    parcelas: session?.parcelas ?? 1,
    bandeira: session?.card_brand || 'cartao',
    finalCartao: session?.card_last_four || '',
    errorMessage,
    linkExpira: session?.expires_at ? formatDate(session.expires_at) : null,
    permiteOutrosMetodos: session?.permite_dois_meios ?? true,
  }
}

function ConfidenceBadge({ confidence }: { confidence: ClassificationConfidence }) {
  const variants: Record<ClassificationConfidence, string> = {
    high: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-orange-100 text-orange-800 border-orange-200',
  }
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', variants[confidence])}>
      {CONFIDENCE_LABELS[confidence]}
    </Badge>
  )
}

export function DeclineAssistantModal({
  open,
  onOpenChange,
  errorCode,
  errorMessage,
  compraId,
  stage,
}: DeclineAssistantModalProps) {
  const { data: session, loading, fetch: fetchSession } = useCheckoutSessionBrief()
  const copyToClipboard = useCopyToClipboard()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (open && compraId) {
      fetchSession(compraId)
    }
  }, [open, compraId, fetchSession])

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!open) return null

  if (!['checkout', 'payment'].includes(stage)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <DialogTitle className="text-base">Detalhe do Erro</DialogTitle>
              <DialogDescription className="sr-only">Detalhes tecnicos do erro</DialogDescription>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {errorCode && <Badge variant="destructive" className="text-[10px]">{errorCode}</Badge>}
              <Badge variant="secondary" className="text-[10px]">{STAGE_LABELS[stage] ?? stage}</Badge>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            {errorMessage && (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm whitespace-pre-wrap font-mono">
                {errorMessage}
              </div>
            )}
            {!errorMessage && (
              <p className="text-sm text-muted-foreground">Nenhuma mensagem de erro disponivel.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const classification = classifyFromEventAndSession(
    errorCode,
    errorMessage,
    session?.payment_response ?? null,
    session?.card_brand ?? null,
  )

  const script = SELLER_SCRIPTS[classification.category]
  const CategoryIcon = CATEGORY_ICONS[classification.category]
  const ctx = buildContext(session, errorMessage)
  const whatsappText = script.whatsappTemplate(ctx)

  const handleCopy = async () => {
    const success = await copyToClipboard(whatsappText)
    if (!success) {
      toast.error({
        title: 'Falha ao copiar',
        description: 'Nao foi possivel copiar a mensagem.',
      })
      return
    }

    setCopied(true)
    toast.success({
      title: 'Copiado!',
      description: 'Mensagem formatada para WhatsApp copiada.',
    })

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      timeoutRef.current = null
    }, COPIED_FEEDBACK_MS)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
              <CategoryIcon className="h-4 w-4 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">{script.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Assistente do vendedor para erro de pagamento
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {errorCode && (
              <Badge variant="destructive" className="text-[10px]">
                {errorCode}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {RETRY_POLICY_LABELS[classification.retryPolicy]}
            </Badge>
            {classification.matchedCode && (
              <Badge variant="outline" className="text-[10px]">
                Codigo: {classification.matchedCode}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {SOURCE_LABELS[classification.source]}
            </Badge>
            <ConfidenceBadge confidence={classification.confidence} />
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Carregando dados...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Classification basis */}
            <section className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Base da classificacao
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">{classification.explanation}</p>
              {classification.matchedCode && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Codigo usado: <span className="font-mono font-medium">{classification.matchedCode}</span>
                </p>
              )}
            </section>

            {classification.confidence === 'medium' && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                Classificacao aproximada — confira a base abaixo antes de orientar o cliente.
              </div>
            )}

            {(classification.confidence === 'low' || classification.source === 'fallback_unknown') && errorMessage && (
              <section>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-orange-600">
                  Retorno bruto
                </h4>
                <div className="rounded-md border border-orange-200 bg-orange-50 p-2 text-xs text-orange-800 whitespace-pre-wrap font-mono">
                  {errorMessage}
                </div>
              </section>
            )}

            {/* O que aconteceu */}
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                O que aconteceu
              </h4>
              <p className="text-sm text-foreground">{script.cause}</p>
            </section>

            {/* O que falar */}
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                O que falar
              </h4>
              <ul className="space-y-1">
                {script.whatToSay.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* O que NAO falar */}
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
                O que NAO falar
              </h4>
              <ul className="space-y-1">
                {script.whatNotToSay.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Sugestoes */}
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sugestoes para o cliente
              </h4>
              <ol className="list-inside list-decimal space-y-0.5 text-sm">
                {script.suggestions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </section>

            {/* Dados uteis */}
            {session && (
              <section>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Dados uteis
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor: </span>
                    <span className="font-medium">
                      {formatCentsToCurrency(session.valor_centavos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Parcelas: </span>
                    <span className="font-medium">{session.parcelas ?? 1}x</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cartao: </span>
                    <span className="font-medium">
                      {session.card_brand || '—'}
                      {session.card_last_four ? ` ****${session.card_last_four}` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expira em: </span>
                    <span className="font-medium">
                      {session.expires_at ? formatDate(session.expires_at) : '—'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Outros meios: </span>
                    <span className="font-medium">
                      {session.permite_dois_meios ? 'Sim (PIX, boleto)' : 'Nao'}
                    </span>
                  </div>
                </div>
              </section>
            )}

            <Separator />

            {/* WhatsApp */}
            <section>
              <div className="mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mensagem para WhatsApp
                </h4>
              </div>
              <div className="rounded-lg border bg-zinc-50 p-3 text-sm whitespace-pre-wrap dark:bg-zinc-900">
                {whatsappText}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copiado!' : 'Copiar mensagem'}
              </button>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
