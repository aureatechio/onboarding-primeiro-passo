/**
 * Helpers para status de split (boleto parcelado / 2 meios).
 */
export interface SplitStatusData {
  split_group_id: string | null
  split_type: string | null
  split_sessoes_pagas: number | null
  split_total_sessoes: number | null
  status?: string | null
}

export type SplitGroupStatus =
  | 'pending'
  | 'partial'
  | 'completed'
  | 'cancelled'
  | 'stuck'
  | 'unknown'

export interface SplitStatusBadge {
  label: string
  variant: 'secondary' | 'warning' | 'success' | 'destructive' | 'outline'
  isTerminal: boolean
}

export function normalizeSplitType(splitType: string | null | undefined): string {
  if (!splitType) return 'unknown'
  if (splitType === 'dual_payment' || splitType === 'dois_meios') return 'dual_payment'
  if (splitType === 'boleto_parcelado') return 'boleto_parcelado'
  return splitType
}

export function isBoletoParceladoSplit(splitType: string | null | undefined): boolean {
  return normalizeSplitType(splitType) === 'boleto_parcelado'
}

export function isDualPaymentSplit(splitType: string | null | undefined): boolean {
  return normalizeSplitType(splitType) === 'dual_payment'
}

export function getSplitTypeLabel(splitType: string | null | undefined): string {
  const normalized = normalizeSplitType(splitType)

  if (normalized === 'boleto_parcelado') return 'Boleto parcelado'
  if (normalized === 'dual_payment') return '2 meios'
  if (normalized === 'dois_meios') return '2 meios'

  return normalized
}

export function getSplitStatusLabel(data: SplitStatusData): string | null {
  if (!data.split_group_id) return null

  const paid = data.split_sessoes_pagas ?? 0
  const total = data.split_total_sessoes ?? 0

  return `${getSplitTypeLabel(data.split_type)}: ${paid}/${total} pagas`
}

export function getSplitStatusForTable(status: string | null | undefined): SplitStatusBadge {
  const normalized = status ?? 'unknown'

  switch (normalized) {
    case 'completed':
      return { label: 'Concluído', variant: 'success', isTerminal: true }
    case 'cancelled':
      return {
        label: 'Cancelado',
        variant: 'destructive',
        isTerminal: true,
      }
    case 'partial':
      return { label: 'Parcial', variant: 'warning', isTerminal: false }
    case 'pending':
      return { label: 'Pendente', variant: 'secondary', isTerminal: false }
    default:
      return { label: 'Desconhecido', variant: 'outline', isTerminal: false }
  }
}

export function normalizeSplitStatus(status: string | null | undefined): string {
  if (!status) return 'unknown'
  const normalized = status.toLowerCase().trim()
  if (['pending', 'partial', 'completed', 'cancelled'].includes(normalized)) {
    return normalized
  }
  return 'unknown'
}

export function isSplitTerminalStatus(status: string | null | undefined): boolean {
  return ['completed', 'cancelled'].includes(normalizeSplitStatus(status))
}

export function formatProgress(paid: number | null, total: number | null): number {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((paid ?? 0) / total * 100)))
}

export function isSplitStuck(
  status: string | null | undefined,
  updatedAt: string | null | undefined,
  minutesThreshold = 120
): boolean {
  if (!updatedAt) return false
  if (status === 'completed' || status === 'cancelled') return false
  const updated = new Date(updatedAt).getTime()
  if (Number.isNaN(updated)) return false

  const msSinceUpdate = Date.now() - updated
  return msSinceUpdate >= minutesThreshold * 60 * 1000
}

export function getSplitStatusValue(status: string | null | undefined): SplitGroupStatus {
  if (!status) return 'unknown'
  if (['pending', 'partial', 'completed', 'cancelled'].includes(status)) {
    return status as SplitGroupStatus
  }
  return 'unknown'
}

export function splitStatusFromIsStuck(
  status: string | null | undefined,
  isStuck: boolean
): SplitGroupStatus {
  if (isStuck) return 'stuck'
  return getSplitStatusValue(status)
}
