import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, ImageIcon, Loader2, Paperclip, RefreshCw, Send, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/mask'
import type { UseTransactionNotesResult } from '@/hooks/useTransactionNotes'
import type { UseTransactionAttachmentsResult } from '@/hooks/useTransactionAttachments'

interface TransactionNotesPanelProps {
  compraId: string
  notesState: UseTransactionNotesResult
  attachmentsState: UseTransactionAttachmentsResult
}

const MAX_NOTE_LENGTH = 500

export function TransactionNotesPanel({
  compraId,
  notesState,
  attachmentsState,
}: TransactionNotesPanelProps) {
  const [draft, setDraft] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const trimmed = useMemo(() => draft.trim(), [draft])
  const charCount = draft.length
  const hasExceededLimit = charCount > MAX_NOTE_LENGTH
  const canSubmit =
    compraId.length > 0 &&
    trimmed.length > 0 &&
    !hasExceededLimit &&
    !notesState.creating &&
    !attachmentsState.uploading

  const isImage = selectedFile?.type.startsWith('image/') ?? false

  useEffect(() => {
    if (!selectedFile || !isImage) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [isImage, selectedFile])

  const handleSubmit = async () => {
    if (!canSubmit) return
    const ok = await notesState.create({ compraId, content: draft, attachment: selectedFile })
    if (ok) {
      setDraft('')
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRefresh = async () => {
    if (!compraId || notesState.loading) return
    await notesState.fetch(compraId)
  }

  const handleOpenAttachment = async (storagePath: string) => {
    const url = await attachmentsState.getDownloadUrl(storagePath)
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Anotações da Transação</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={!compraId || notesState.loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${notesState.loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="max-h-[48vh] overflow-y-auto rounded-md border p-3 space-y-2 bg-muted/20">
          {notesState.loading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Carregando histórico...
            </div>
          ) : notesState.notes.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Nenhuma anotação registrada ainda.
            </div>
          ) : (
            notesState.notes.map((note) => (
              <div key={note.id} className="flex flex-col items-start gap-1">
                <div className="max-w-full rounded-lg border bg-background px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word">
                  {note.content}
                </div>
                {note.attachments.length > 0 && (
                  <div className="w-full max-w-full space-y-1">
                    {note.attachments.map((attachment) => {
                      const attachmentIsImage = attachment.mime_type?.startsWith('image/') ?? false

                      return (
                        <button
                          key={attachment.id}
                          onClick={() => handleOpenAttachment(attachment.storage_path)}
                          className="w-full rounded-md border bg-background p-2 text-left hover:bg-muted/40"
                        >
                          <div className="flex items-center gap-2">
                            {attachmentIsImage ? (
                              <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate text-xs">{attachment.file_name}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(note.created_at)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escreva uma anotação rápida..."
              className="min-h-[92px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              maxLength={MAX_NOTE_LENGTH + 20}
            />
            <input
              ref={fileInputRef}
              type="file"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Adicionar anexo"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          {selectedFile && (
            <div className="rounded-md border bg-muted/20 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{selectedFile.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={selectedFile.name}
                  className="mt-2 max-h-28 rounded border object-cover"
                />
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] ${
                hasExceededLimit ? 'text-red-600' : 'text-muted-foreground'
              }`}
            >
              {charCount}/{MAX_NOTE_LENGTH}
            </span>
            <Button size="sm" onClick={handleSubmit} disabled={!canSubmit}>
              {notesState.creating || attachmentsState.uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Salvar anotação
                </>
              )}
            </Button>
          </div>
          {notesState.error && (
            <p className="text-xs text-red-700 rounded-md border border-red-200 bg-red-50 px-2 py-1">
              {notesState.error}
            </p>
          )}
          {attachmentsState.error && !notesState.error && (
            <p className="text-xs text-red-700 rounded-md border border-red-200 bg-red-50 px-2 py-1">
              {attachmentsState.error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
