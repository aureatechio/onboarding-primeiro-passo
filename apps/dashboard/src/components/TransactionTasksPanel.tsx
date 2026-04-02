import { useMemo, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/StatusBadge'
import type { UseTransactionTasksResult } from '@/hooks/useTransactionTasks'
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/types/tasks'
import { formatDate } from '@/lib/mask'

interface TransactionTasksPanelProps {
  compraId: string
  tasksState: UseTransactionTasksResult
}

function statusBadgeVariant(status: TaskStatus): 'completed' | 'in_progress' | 'error' | 'pending' {
  if (status === 'done') return 'completed'
  if (status === 'in_progress') return 'in_progress'
  if (status === 'blocked') return 'error'
  return 'pending'
}

export function TransactionTasksPanel({
  compraId,
  tasksState,
}: TransactionTasksPanelProps) {
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')

  const canCreateTask = useMemo(
    () => title.trim().length > 0 && !tasksState.creating,
    [title, tasksState.creating]
  )

  const handleRefresh = async () => {
    if (!compraId) return
    await tasksState.fetchByCompraId(compraId)
  }

  const handleCreateTask = async () => {
    if (!canCreateTask) return
    const ok = await tasksState.create({
      compraId,
      title,
      assigneeText: assignee,
      priority,
    })
    if (ok) {
      setTitle('')
      setAssignee('')
      setPriority('medium')
    }
  }

  const handleTaskStatusChange = async (taskId: string, status: string) => {
    if (!['todo', 'in_progress', 'done', 'blocked'].includes(status)) return
    await tasksState.updateStatus(taskId, status as TaskStatus)
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Tarefas</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={tasksState.loading}>
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${tasksState.loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Nova tarefa</p>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título da tarefa"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
              placeholder="Responsável (texto livre)"
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="low">{TASK_PRIORITY_LABELS.low}</option>
              <option value="medium">{TASK_PRIORITY_LABELS.medium}</option>
              <option value="high">{TASK_PRIORITY_LABELS.high}</option>
            </select>
          </div>
          <Button size="sm" onClick={handleCreateTask} disabled={!canCreateTask}>
            {tasksState.creating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Criar tarefa
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Tarefas da transação ({tasksState.tasks.length})
          </p>
          <div className="max-h-[220px] space-y-2 overflow-y-auto">
            {tasksState.tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa registrada.</p>
            ) : (
              tasksState.tasks.map((task) => (
                <div key={task.id} className="rounded-md border p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {task.assignee_text || 'Sem responsável'} •{' '}
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </p>
                    </div>
                    <StatusBadge
                      status={statusBadgeVariant(task.status)}
                      label={TASK_STATUS_LABELS[task.status]}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <select
                      value={task.status}
                      onChange={(event) => handleTaskStatusChange(task.id, event.target.value)}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                      disabled={tasksState.updating}
                    >
                      <option value="todo">{TASK_STATUS_LABELS.todo}</option>
                      <option value="in_progress">{TASK_STATUS_LABELS.in_progress}</option>
                      <option value="done">{TASK_STATUS_LABELS.done}</option>
                      <option value="blocked">{TASK_STATUS_LABELS.blocked}</option>
                    </select>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(task.updated_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {tasksState.error && (
          <p className="text-xs text-red-700 rounded-md border border-red-200 bg-red-50 px-2 py-1">
            {tasksState.error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
