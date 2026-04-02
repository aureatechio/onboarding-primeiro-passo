import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { TransactionAttachment } from '@/types/tasks'

export const ATTACHMENTS_BUCKET = 'transaction-attachments'
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
])

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.csv',
  '.zip',
])

export interface UseTransactionAttachmentsResult {
  attachments: TransactionAttachment[]
  loading: boolean
  uploading: boolean
  error: string | null
  fetchByCompraId: (compraId: string) => Promise<void>
  uploadForNote: (input: {
    compraId: string
    noteId: string
    file: File
    createdBy?: string | null
  }) => Promise<TransactionAttachment | null>
  getDownloadUrl: (storagePath: string) => Promise<string | null>
}

function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  if (index < 0) return ''
  return fileName.slice(index).toLowerCase()
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^\w.\-]/g, '_')
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size <= 0) return 'Arquivo inválido'
  if (file.size > MAX_FILE_SIZE_BYTES) return 'Arquivo acima do limite de 50 MB'

  const extension = getFileExtension(file.name)
  const hasAllowedExtension = extension.length > 0 && ALLOWED_EXTENSIONS.has(extension)
  const hasAllowedMime = file.type.length > 0 && ALLOWED_MIME_TYPES.has(file.type)

  if (!hasAllowedExtension && !hasAllowedMime) {
    return 'Tipo de arquivo não permitido'
  }

  return null
}

export function useTransactionAttachments(): UseTransactionAttachmentsResult {
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchByCompraId = useCallback(async (compraId: string) => {
    if (!compraId) {
      setAttachments([])
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('transaction_attachments')
      .select('*')
      .eq('compra_id', compraId)
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setAttachments([])
    } else {
      setAttachments((data as TransactionAttachment[]) ?? [])
    }

    setLoading(false)
  }, [])

  const uploadForNote = useCallback(
    async (input: {
      compraId: string
      noteId: string
      file: File
      createdBy?: string | null
    }): Promise<TransactionAttachment | null> => {
      const validationError = validateAttachmentFile(input.file)
      if (validationError) {
        setError(validationError)
        return null
      }

      setUploading(true)
      setError(null)

      const safeName = sanitizeFileName(input.file.name)
      const path = `${input.compraId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName}`

      const { error: storageError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, input.file, {
          contentType: input.file.type || undefined,
          upsert: false,
        })

      if (storageError) {
        setError(storageError.message)
        setUploading(false)
        return null
      }

      const metadata = {
        compra_id: input.compraId,
        note_id: input.noteId,
        file_name: input.file.name,
        storage_path: path,
        mime_type: input.file.type || null,
        size_bytes: input.file.size,
        created_by: normalizeText(input.createdBy),
      }

      const { data, error: insertError } = await supabase
        .from('transaction_attachments')
        .insert(metadata)
        .select('*')
        .single()

      if (insertError || !data) {
        setError(insertError?.message ?? 'Erro ao salvar metadados do anexo')
        setUploading(false)
        return null
      }

      const attachment = data as TransactionAttachment
      setAttachments((prev) => [attachment, ...prev])
      setUploading(false)
      return attachment
    },
    []
  )

  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error: signedError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(storagePath, 60 * 10)

    if (signedError) {
      setError(signedError.message)
      return null
    }

    return data.signedUrl
  }, [])

  return {
    attachments,
    loading,
    uploading,
    error,
    fetchByCompraId,
    uploadForNote,
    getDownloadUrl,
  }
}
