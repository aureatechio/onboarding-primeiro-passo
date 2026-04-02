import {
  ShoppingCart,
  CreditCard,
  FileSignature,
  FileText,
  Building2,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStepStatus } from '@/lib/pipeline'
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

const STATUS_LABELS: Record<StepStatus, string> = {
  completed: 'concluído',
  in_progress: 'em andamento',
  error: 'erro',
  pending: 'pendente',
}

const dotStyles: Record<StepStatus, string> = {
  completed: 'bg-emerald-500 text-white',
  in_progress: 'bg-amber-500 text-white',
  error: 'bg-red-500 text-white',
  pending: 'bg-zinc-200 text-zinc-500',
}

const lineStyles: Record<StepStatus, string> = {
  completed: 'bg-emerald-300',
  in_progress: 'bg-amber-300',
  error: 'bg-red-300',
  pending: 'bg-zinc-200',
}

function MiniStatusIcon({
  status,
  StepIcon,
}: {
  status: StepStatus
  StepIcon: React.ComponentType<{ className?: string }>
}) {
  if (status === 'completed') return <Check className="h-2.5 w-2.5" />
  if (status === 'error') return <X className="h-2.5 w-2.5" />
  if (status === 'in_progress')
    return <Loader2 className="h-2.5 w-2.5 animate-spin" />
  return <StepIcon className="h-2.5 w-2.5" />
}

interface MiniPipelineStepperProps {
  data: TransactionPipeline
  /** When set, payment tooltip uses unified timeline counts/label (detail page). */
  unifiedPaymentBadge?: PaymentStepSummary | null
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

export function MiniPipelineStepper({
  data,
  unifiedPaymentBadge,
}: MiniPipelineStepperProps) {
  return (
    <div className="flex items-center gap-0.5">
      {STEPS.map((step, i) => {
        const status = getStepStatus(step.key, data)
        const isSplitPayment = step.key === 'payment' && !!data.split_group_id
        const paymentBadge = resolvePaymentBadge(data, unifiedPaymentBadge)
        const splitSuffix = isSplitPayment
          ? ` (${paymentBadge.label} - ${paymentBadge.paid}/${paymentBadge.total} pagas)`
          : ''
        return (
          <div key={step.key} className="flex items-center">
            <div
              title={`${step.label}: ${STATUS_LABELS[status]}${splitSuffix}`}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full shrink-0',
                dotStyles[status]
              )}
            >
              <MiniStatusIcon status={status} StepIcon={step.icon} />
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn('h-0.5 w-3 shrink-0', lineStyles[status])}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
