import { useCallback, useState } from 'react'

export type ExportFormat = 'json' | 'csv'
export type ExportListName = 'transactions' | 'contratos'

export interface ExportMeta {
  totalCount: number
  exportedCount: number
  page?: number
  pageSize?: number
  sections?: Record<string, number>
}

interface ExportRequest {
  listName: ExportListName
  format: ExportFormat
  selectedIds: string[]
  filters?: Record<string, unknown>
  meta: ExportMeta
}

interface UseServerExportReturn {
  loading: boolean
  error: string | null
  exportData: (request: ExportRequest) => Promise<boolean>
  reset: () => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

function parseFilenameFromDisposition(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/filename="([^"]+)"/i)
  return match?.[1] ?? null
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function mapErrorMessage(status: number, fallback: string): string {
  if (status === 413) return 'Quantidade de itens selecionados excede o limite permitido'
  if (status === 422) return fallback || 'Dados de exportação inválidos'
  return fallback || 'Erro ao exportar dados'
}

export function useServerExport(): UseServerExportReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setError(null)
  }, [])

  const exportData = useCallback(async (request: ExportRequest): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/export-dashboard-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listName: request.listName,
          format: request.format,
          selectedIds: request.selectedIds,
          filters: {
            ...(request.filters ?? {}),
            __clientMeta: request.meta,
          },
        }),
      })

      if (!response.ok) {
        let payload: { error?: string } | null = null
        try {
          payload = (await response.json()) as { error?: string }
        } catch {
          payload = null
        }

        setError(mapErrorMessage(response.status, payload?.error ?? 'Erro na exportação'))
        setLoading(false)
        return false
      }

      const filename =
        parseFilenameFromDisposition(response.headers.get('Content-Disposition')) ??
        `${request.listName}-export.${request.format}`

      const blob = await response.blob()
      downloadBlob(blob, filename)
      setLoading(false)
      return true
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro de conexão ao exportar dados'
      )
      setLoading(false)
      return false
    }
  }, [])

  return { loading, error, exportData, reset }
}
