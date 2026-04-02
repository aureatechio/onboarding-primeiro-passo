import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, PanelRightOpen, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { PipelineStepper } from '@/components/PipelineStepper'
import { StepDetail } from '@/components/StepDetail'
import { EventTimeline } from '@/components/EventTimeline'
import { TransactionSidePanel } from '@/components/TransactionSidePanel'
import { CopyValueButton } from '@/components/CopyValueButton'
import { useTransaction } from '@/hooks/useTransaction'
import { usePaymentStepSummary } from '@/hooks/usePaymentStepSummary'
import { usePaymentFinancialSummary } from '@/hooks/usePaymentFinancialSummary'
import { useTransactionAttachments } from '@/hooks/useTransactionAttachments'
import { useTransactionNotes } from '@/hooks/useTransactionNotes'
import { useTransactionTasks } from '@/hooks/useTransactionTasks'
import { useTransactionTimeline } from '@/hooks/useTransactionTimeline'
import { useRealtimeTransaction } from '@/hooks/useRealtime'
import { ClienteName } from '@/components/ClienteName'
import { formatCurrency, timeAgo, formatDate } from '@/lib/mask'
import { STAGE_LABELS } from '@/lib/constants'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

export function TransactionDetailPage() {
  const { compraId } = useParams()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState(compraId ?? '')
  const [activeStep, setActiveStep] = useState<string | null>('checkout')
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)

  const tx = useTransaction()
  const timeline = useTransactionTimeline()
  const notes = useTransactionNotes()
  const tasks = useTransactionTasks()
  const attachments = useTransactionAttachments()

  const handleSearch = useCallback(() => {
    const id = searchValue.trim()
    if (!id) return
    navigate(`/transaction/${id}`)
  }, [searchValue, navigate])

  // Fetch when compraId changes
  useEffect(() => {
    if (compraId) {
      setSearchValue(compraId)
      tx.fetch(compraId)
      timeline.fetch(compraId)
      notes.fetch(compraId)
      tasks.fetchByCompraId(compraId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compraId])

  // Realtime updates
  const handleRealtimeUpdate = useCallback(() => {
    if (compraId) {
      tx.fetch(compraId)
      timeline.fetch(compraId)
      notes.fetch(compraId)
      tasks.fetchByCompraId(compraId)
    }
  }, [compraId, notes, tasks, tx, timeline])

  useRealtimeTransaction(compraId ?? null, handleRealtimeUpdate)

  const paymentStepSummary = usePaymentStepSummary(
    compraId ?? null,
    tx.data?.split_group_id ?? null,
    tx.data?.split_type ?? null,
    `${tx.data?.last_activity_at ?? ''}|${tx.data?.split_sessoes_pagas ?? ''}|${tx.data?.split_total_sessoes ?? ''}`,
  )
  const paymentFinancialSummary = usePaymentFinancialSummary(
    compraId ?? null,
    tx.data?.split_group_id ?? null,
    tx.data?.valor_total,
    `${tx.data?.last_activity_at ?? ''}|${tx.data?.checkout_completed_at ?? ''}|${tx.data?.compra_checkout_status ?? ''}`,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {compraId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/transaction')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">Buscar Transação</h2>
            <p className="text-sm text-muted-foreground">
              Insira um compra_id para visualizar o pipeline completo
            </p>
          </div>
        </div>
        {compraId && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidePanelOpen(true)}
            >
              <PanelRightOpen className="h-3.5 w-3.5 mr-1.5" />
              Painel lateral
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRealtimeUpdate}
              disabled={tx.loading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${tx.loading ? 'animate-spin' : ''}`}
              />
              Atualizar
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cole o compra_id (UUID)..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 font-mono text-sm"
          />
        </div>
        <Button onClick={handleSearch} disabled={tx.loading}>
          {tx.loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {/* Error state */}
      {tx.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">
            {tx.error}
          </CardContent>
        </Card>
      )}

      {/* Transaction data */}
      {tx.data && (
        <>
          {/* Summary bar */}
          <TooltipProvider>
            <Card>
              <CardContent className="flex flex-col gap-4 py-4 xl:flex-row xl:items-center xl:justify-between">
                {/* Grupo 1 — Identificação */}
                <div className="flex flex-wrap items-start gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">ID da Compra</p>
                    <p className="group inline-flex items-center gap-1.5 text-xs font-mono">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {tx.data.compra_id.slice(0, 8)}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-mono text-xs">{tx.data.compra_id}</p>
                        </TooltipContent>
                      </Tooltip>
                      <CopyValueButton value={tx.data.compra_id} label="ID da Compra" />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nº Proposta</p>
                    <p className="group inline-flex items-center gap-1.5 text-xs font-mono">
                      <span>{tx.data.numero_proposta ?? '—'}</span>
                      <CopyValueButton
                        value={tx.data.numero_proposta}
                        label="Nº Proposta"
                      />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-base font-medium">
                      <ClienteName nome={tx.data.cliente_nome} leadId={tx.data.lead_id} />
                    </p>
                  </div>
                </div>

                <Separator orientation="vertical" className="hidden xl:block h-10" />

                {/* Grupo 2 — Comercial */}
                <div className="flex flex-wrap items-start gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Vendedor</p>
                    <p className="text-sm font-medium">{tx.data.vendedor_nome ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Agência</p>
                    <p className="text-sm font-medium">{tx.data.agencia_nome ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Celebridade</p>
                    <p className="text-sm font-medium">{tx.data.celebridade_nome ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="text-base font-semibold">
                      {formatCurrency(tx.data.valor_total)}
                    </p>
                  </div>
                </div>

                <Separator orientation="vertical" className="hidden xl:block h-10" />

                {/* Grupo 3 — Status */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Etapa Atual</p>
                    <p className="text-sm font-medium">
                      {STAGE_LABELS[tx.data.current_stage] ?? tx.data.current_stage}
                    </p>
                  </div>
                  <StatusBadge status={tx.data.pipeline_status} />
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Última atividade</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm cursor-help">
                          {timeAgo(tx.data.last_activity_at)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          {formatDate(tx.data.last_activity_at)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipProvider>

          {/* Pipeline stepper */}
          <Card>
            <CardContent className="py-6">
              <PipelineStepper
                data={tx.data}
                activeStep={activeStep}
                onStepClick={setActiveStep}
                unifiedPaymentBadge={paymentStepSummary.summary}
                paymentSettlementHint={paymentFinancialSummary.settlementHint}
              />
            </CardContent>
          </Card>

          {/* Step detail + Timeline */}
          <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-2">
            {activeStep && (
              <StepDetail
                step={activeStep}
                data={tx.data}
                onRefetch={handleRealtimeUpdate}
              />
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Timeline de Eventos</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <EventTimeline
                  events={timeline.events}
                  loading={timeline.loading}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {tx.data && (
        <TransactionSidePanel
          open={isSidePanelOpen}
          onOpenChange={setIsSidePanelOpen}
          compraId={tx.data.compra_id}
          notesState={notes}
          tasksState={tasks}
          attachmentsState={attachments}
        />
      )}
    </div>
  )
}


