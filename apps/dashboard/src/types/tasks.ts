export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface TransactionTask {
  id: string
  compra_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_text: string | null
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TransactionAttachment {
  id: string
  compra_id: string
  note_id: string | null
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  created_by: string | null
  created_at: string
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  done: 'Concluída',
  blocked: 'Bloqueada',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}
