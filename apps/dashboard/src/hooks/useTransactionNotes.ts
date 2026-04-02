import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TransactionAttachment } from '@/types/tasks'
import {
  ATTACHMENTS_BUCKET,
  validateAttachmentFile,
} from '@/hooks/useTransactionAttachments'

export interface TransactionNote {
  id: string
  compra_id: string
  content: string
  created_by: string | null
  created_at: string
  attachments: TransactionAttachment[]
}

export interface UseTransactionNotesResult {
  notes: TransactionNote[]
  loading: boolean
  creating: boolean
  error: string | null
  fetch: (compraId: string) => Promise<void>
  create: (input: {
    compraId: string
    content: string
    attachment?: File | null
    createdBy?: string | null
  }) => Promise<boolean>
}

function normalizeNoteContent(raw: string): string {
  return raw.trim()
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-]/g, '_')
}

function validateContent(raw: string): string | null {
  const content = normalizeNoteContent(raw)
  if (!content) return 'A anotação não pode ser vazia'
  if (content.length > 500) return 'A anotação deve ter no máximo 500 caracteres'
  return null
}

interface TransactionNoteRow {
  id: string
  compra_id: string
  content: string
  created_by: string | null
  created_at: string
  attachments?: TransactionAttachment[]
}

function mapNoteRow(row: TransactionNoteRow): TransactionNote {
  return {
    id: row.id,
    compra_id: row.compra_id,
    content: row.content,
    created_by: row.created_by,
    created_at: row.created_at,
    attachments: row.attachments ?? [],
  }
}

export function useTransactionNotes(): UseTransactionNotesResult {
  const [notes, setNotes] = useState<TransactionNote[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async (compraId: string) => {
    if (!compraId) {
      setNotes([])
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('transaction_notes')
      .select(
        'id, compra_id, content, created_by, created_at, attachments:transaction_attachments(*)'
      )
      .eq('compra_id', compraId)
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setNotes([])
    } else {
      setNotes(((data as TransactionNoteRow[]) ?? []).map(mapNoteRow))
    }

    setLoading(false)
  }, [])

  const create = useCallback(
    async (input: {
      compraId: string
      content: string
      attachment?: File | null
      createdBy?: string | null
    }): Promise<boolean> => {
      const validationMessage = validateContent(input.content)
      if (validationMessage) {
        setError(validationMessage)
        return false
      }

      if (input.attachment) {
        const fileValidationMessage = validateAttachmentFile(input.attachment)
        if (fileValidationMessage) {
          setError(fileValidationMessage)
          return false
        }
      }

      setCreating(true)
      setError(null)

      const normalizedContent = normalizeNoteContent(input.content)
      const createdBy = input.createdBy?.trim() || null

      const { data: noteData, error: noteInsertError } = await supabase
        .from('transaction_notes')
        .insert({
          compra_id: input.compraId,
          content: normalizedContent,
          created_by: createdBy,
        })
        .select('id, compra_id, content, created_by, created_at')
        .single()

      if (noteInsertError || !noteData) {
        setError(noteInsertError?.message ?? 'Erro ao salvar anotação')
        setCreating(false)
        return false
      }

      let attachment: TransactionAttachment | null = null

      if (input.attachment) {
        const safeName = sanitizeFileName(input.attachment.name)
        const storagePath = `${input.compraId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .upload(storagePath, input.attachment, {
            contentType: input.attachment.type || undefined,
            upsert: false,
          })

        if (uploadError) {
          await supabase.from('transaction_notes').delete().eq('id', noteData.id)
          setError(uploadError.message)
          setCreating(false)
          return false
        }

        const { data: attachmentData, error: attachmentInsertError } = await supabase
          .from('transaction_attachments')
          .insert({
            compra_id: input.compraId,
            note_id: noteData.id,
            file_name: input.attachment.name,
            storage_path: storagePath,
            mime_type: input.attachment.type || null,
            size_bytes: input.attachment.size,
            created_by: createdBy,
          })
          .select('*')
          .single()

        if (attachmentInsertError || !attachmentData) {
          await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath])
          await supabase.from('transaction_notes').delete().eq('id', noteData.id)
          setError(attachmentInsertError?.message ?? 'Erro ao salvar anexo')
          setCreating(false)
          return false
        }

        attachment = attachmentData as TransactionAttachment
      }

      setNotes((prev) => [
        {
          ...noteData,
          attachments: attachment ? [attachment] : [],
        },
        ...prev,
      ])
      setCreating(false)
      return true
    },
    []
  )

  return { notes, loading, creating, error, fetch, create }
}
