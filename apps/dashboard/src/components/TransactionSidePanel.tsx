import { useEffect, useState } from 'react'
import { StickyNote, ListChecks } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TransactionNotesPanel } from '@/components/TransactionNotesPanel'
import { TransactionTasksPanel } from '@/components/TransactionTasksPanel'
import type { UseTransactionNotesResult } from '@/hooks/useTransactionNotes'
import type { UseTransactionTasksResult } from '@/hooks/useTransactionTasks'
import type { UseTransactionAttachmentsResult } from '@/hooks/useTransactionAttachments'

type SidePanelTab = 'notes' | 'tasks'

interface TransactionSidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  compraId: string
  notesState: UseTransactionNotesResult
  tasksState: UseTransactionTasksResult
  attachmentsState: UseTransactionAttachmentsResult
}

export function TransactionSidePanel({
  open,
  onOpenChange,
  compraId,
  notesState,
  tasksState,
  attachmentsState,
}: TransactionSidePanelProps) {
  const [activeTab, setActiveTab] = useState<SidePanelTab>('notes')

  useEffect(() => {
    if (!open || !compraId) return

    notesState.fetch(compraId)
    tasksState.fetchByCompraId(compraId)
  }, [compraId, notesState.fetch, open, tasksState.fetchByCompraId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-auto right-0 top-0 h-dvh w-full max-w-[460px] translate-x-0 translate-y-0 rounded-none border-l p-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full">
        <DialogHeader className="border-b px-4 py-3 text-left">
          <DialogTitle className="text-base">Painel da Transação</DialogTitle>
        </DialogHeader>

        <div className="border-b px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={activeTab === 'notes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('notes')}
            >
              <StickyNote className="mr-1.5 h-3.5 w-3.5" />
              Anotações
            </Button>
            <Button
              type="button"
              variant={activeTab === 'tasks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('tasks')}
            >
              <ListChecks className="mr-1.5 h-3.5 w-3.5" />
              Tarefas
            </Button>
          </div>
        </div>

        <div className="h-[calc(100dvh-124px)] overflow-y-auto p-4">
          {activeTab === 'notes' ? (
            <TransactionNotesPanel
              compraId={compraId}
              notesState={notesState}
              attachmentsState={attachmentsState}
            />
          ) : (
            <TransactionTasksPanel compraId={compraId} tasksState={tasksState} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
