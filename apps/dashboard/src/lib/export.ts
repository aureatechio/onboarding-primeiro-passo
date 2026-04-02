/**
 * Exportação de listas filtradas para JSON (debug).
 * Gera arquivo com dados relevantes e metadados dos filtros aplicados.
 */

export interface ExportMeta {
  totalCount: number
  exportedCount: number
  page?: number
  pageSize?: number
  /** Extra metadata for structured exports (e.g. stuck/errors/retries counts) */
  sections?: Record<string, number>
}

export interface ExportPayload<T = unknown> {
  exportedAt: string
  listName: string
  filters?: Record<string, unknown>
  meta: ExportMeta
  data: T
}

export function exportListToJson<T = unknown>(payload: {
  listName: string
  data: T
  filters?: Record<string, unknown>
  meta: ExportMeta
}): void {
  const { listName, data, filters, meta } = payload

  const exportPayload: ExportPayload<T> = {
    exportedAt: new Date().toISOString(),
    listName,
    filters,
    meta,
    data,
  }

  const json = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${listName}-export-${Date.now()}.json`
  a.click()

  URL.revokeObjectURL(url)
}
