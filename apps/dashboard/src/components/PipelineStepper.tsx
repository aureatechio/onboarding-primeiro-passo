import {
  ShoppingCart,
  CreditCard,
  FileText,
  FileSignature,
  Building2,
  Check,
  X,
  Loader2,
  Clock,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/mask'
import { getStepStatus, getStepTimestamp } from '@/lib/pipeline'
import {
  getSplitTypeLabel,
  isBoletoParceladoSplit,
  isDualPaymentSplit,
} from '@/lib/split-status'
import type { StepStatus } from '@/lib/pipeline'
import type { TransactionPipeline } from '@/hooks/useTransaction'
import type { PaymentStepSummary } from '@/lib/payment-step-summary'

const STEPS = [
  { key: 'checkout', label: 'Checkout', icon: ShoppingCart },
  { key: 'contract', label: 'Contrato', icon: FileSignature },
  { key: 'payment', label: 'Pagamento', icon: CreditCard },
  { key: 'omie', label: 'OMIE', icon: Building2 },
  { key: 'nfe', label: 'NFS-e', icon: FileText },
] as const

const statusStyles: Record<
  StepStatus,
  { ring: string; bg: string; icon: string }
> = {
  completed: {
    ring: 'ring-emerald-200',
    bg: 'bg-emerald-500',
    icon: 'text-white',
  },
  in_progress: {
    ring: 'ring-amber-200',
    bg: 'bg-amber-500',
    icon: 'text-white',
  },
  error: {
    ring: 'ring-red-200',
    bg: 'bg-red-500',
    icon: 'text-white',
  },
  pending: {
    ring: 'ring-zinc-200',
    bg: 'bg-zinc-200',
    icon: 'text-zinc-500',
  },
}

function StatusIcon({
  status,
  StepIcon,
}: {
  status: StepStatus
  StepIcon: React.ComponentType<{ className?: string }>
}) {
  if (status === 'completed') return <Check className="h-4 w-4" />
  if (status === 'error') return <X className="h-4 w-4" />
  if (status === 'in_progress') return <Loader2 className="h-4 w-4 animate-spin" />
  return <StepIcon className="h-4 w-4" />
}

interface PipelineStepperProps {
  data: TransactionPipeline
  activeStep?: string | null
  onStepClick?: (step: string) => void
  /**
   * When provided (incl. null while loading), detail page uses unified timeline counts/label.
   * When omitted, uses pipeline split_* fields only (ex.: Overview).
   */
  unifiedPaymentBadge?: PaymentStepSummary | null
  paymentSettlementHint?: string | null
}

function legacyPaymentGroupLabel(data: TransactionPipeline): string {
  return isBoletoParceladoSplit(data.split_type)
    ? 'Boleto parcelado'
    : isDualPaymentSplit(data.split_type)
      ? '2 meios'
      : getSplitTypeLabel(data.split_type)
}

function resolvePaymentBadge(
  data: TransactionPipeline,
  unified: PaymentStepSummary | null | undefined,
): { label: string; paid: number; total: number } {
  if (unified != null) {
    return { label: unified.label, paid: unified.paid, total: unified.total }
  }
  return {
    label: legacyPaymentGroupLabel(data),
    paid: data.split_sessoes_pagas ?? 0,
    total: data.split_total_sessoes ?? 0,
  }
}

export function PipelineStepper({
  data,
  activeStep,
  onStepClick,
  unifiedPaymentBadge,
  paymentSettlementHint,
}: PipelineStepperProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground sm:hidden">
        Deslize horizontalmente para navegar pelas etapas.
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max snap-x snap-mandatory items-center gap-2 md:justify-between">
          {STEPS.map((step, i) => {
            const status = getStepStatus(step.key, data)
            const styles = statusStyles[status]
            const timestamp = getStepTimestamp(step.key, data)
            const isActive = activeStep === step.key
            const paymentBadge = resolvePaymentBadge(data, unifiedPaymentBadge)

            return (
              <div key={step.key} className="flex items-center gap-2">
                <button
                  onClick={() => onStepClick?.(step.key)}
                  className={cn(
                    'flex min-w-[104px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-lg p-3 transition-all hover:bg-muted/50',
                    isActive && 'bg-muted ring-1 ring-border'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full ring-4',
                      styles.ring,
                      styles.bg,
                      styles.icon
                    )}
                  >
                    <StatusIcon status={status} StepIcon={step.icon} />
                  </div>
                  <span className="text-xs font-medium">{step.label}</span>
                  {step.key === 'payment' && data.split_group_id && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                      <Layers className="h-2.5 w-2.5" />
                      {paymentBadge.label} {paymentBadge.paid}/{paymentBadge.total}
                    </span>
                  )}
                  {step.key === 'payment' && paymentSettlementHint && (
                    <span className="text-[10px] text-muted-foreground">{paymentSettlementHint}</span>
                  )}
                  {timestamp ? (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(timestamp)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" /> pendente
                    </span>
                  )}
                </button>

                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-8 flex-none rounded-full md:w-12',
                      status === 'completed' ? 'bg-emerald-300' : 'bg-zinc-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
