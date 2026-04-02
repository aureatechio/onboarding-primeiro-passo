import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TaskPriority, TaskStatus, TransactionTask } from '@/types/tasks'

const PAGE_SIZE = 25

export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface UseTransactionTasksResult {
  tasks: TransactionTask[]
  loading: boolean
  creating: boolean
  updating: boolean
  error: string | null
  total: number
  page: number
  pageSize: number
  fetchByCompraId: (compraId: string) => Promise<void>
  fetchAll: (filters?: TaskFilters, page?: number) => Promise<void>
  create: (input: {
    compraId: string
    title: string
    description?: string
    priority?: TaskPriority
    assigneeText?: string
    dueDate?: string | null
    createdBy?: string | null
  }) => Promise<boolean>
  updateStatus: (taskId: string, status: TaskStatus) => Promise<boolean>
}

function normalizeText(value: string | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

export function useTransactionTasks(): UseTransactionTasksResult {
  const [tasks, setTasks] = useState<TransactionTask[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const fetchByCompraId = useCallback(async (compraId: string) => {
    if (!compraId) {
      setTasks([])
      setTotal(0)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('transaction_tasks')
      .select('*')
      .eq('compra_id', compraId)
      .order('updated_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setTasks([])
      setTotal(0)
    } else {
      const parsed = (data as TransactionTask[]) ?? []
      setTasks(parsed)
      setTotal(parsed.length)
    }

    setLoading(false)
  }, [])

  const fetchAll = useCallback(async (filters?: TaskFilters, pageNum = 0) => {
    setLoading(true)
    setError(null)
    setPage(pageNum)

    const from = pageNum * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('transaction_tasks')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to)

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status)
    }

    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters?.search) {
      const s = filters.search.trim()
      if (s.length > 0) {
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
          query = query.eq('compra_id', s)
        } else {
          query = query.or(
            `title.ilike.%${s}%,description.ilike.%${s}%,assignee_text.ilike.%${s}%`
          )
        }
      }
    }

    const { data, error: queryError, count } = await query

    if (queryError) {
      setError(queryError.message)
      setTasks([])
      setTotal(0)
    } else {
      setTasks((data as TransactionTask[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [])

  const create = useCallback(
    async (input: {
      compraId: string
      title: string
      description?: string
      priority?: TaskPriority
      assigneeText?: string
      dueDate?: string | null
      createdBy?: string | null
    }): Promise<boolean> => {
      const title = normalizeText(input.title)
      if (!title) {
        setError('Título da tarefa é obrigatório')
        return false
      }

      if (title.length > 140) {
        setError('Título deve ter no máximo 140 caracteres')
        return false
      }

      const description = normalizeText(input.description)
      if (description && description.length > 1000) {
        setError('Descrição deve ter no máximo 1000 caracteres')
        return false
      }

      setCreating(true)
      setError(null)

      const now = new Date().toISOString()
      const payload = {
        compra_id: input.compraId,
        title,
        description,
        priority: input.priority ?? 'medium',
        assignee_text: normalizeText(input.assigneeText),
        due_date: input.dueDate ?? null,
        created_by: normalizeText(input.createdBy ?? undefined),
        updated_at: now,
      }

      const { data, error: insertError } = await supabase
        .from('transaction_tasks')
        .insert(payload)
        .select('*')
        .single()

      if (insertError || !data) {
        setError(insertError?.message ?? 'Erro ao criar tarefa')
        setCreating(false)
        return false
      }

      setTasks((prev) => [data as TransactionTask, ...prev])
      setTotal((prev) => prev + 1)
      setCreating(false)
      return true
    },
    []
  )

  const updateStatus = useCallback(
    async (taskId: string, status: TaskStatus): Promise<boolean> => {
      setUpdating(true)
      setError(null)

      const { data, error: updateError } = await supabase
        .from('transaction_tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select('*')
        .single()

      if (updateError || !data) {
        setError(updateError?.message ?? 'Erro ao atualizar status da tarefa')
        setUpdating(false)
        return false
      }

      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? (data as TransactionTask) : task))
      )
      setUpdating(false)
      return true
    },
    []
  )

  return {
    tasks,
    loading,
    creating,
    updating,
    error,
    total,
    page,
    pageSize: PAGE_SIZE,
    fetchByCompraId,
    fetchAll,
    create,
    updateStatus,
  }
}
