import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Code2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { useDevCredentials } from '@/hooks/useDevCredentials'
import { buildDotenvFile, parseDotenvContent } from '@/lib/parseDotenv'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CopyValueButton } from '@/components/CopyValueButton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type LocalRow = {
  id: string
  env_key: string
  env_value: string
  selected: boolean
}

function newRow(partial?: Partial<LocalRow>): LocalRow {
  return {
    id: crypto.randomUUID(),
    env_key: partial?.env_key ?? '',
    env_value: partial?.env_value ?? '',
    selected: partial?.selected ?? false,
  }
}

function isRowEmpty(r: LocalRow): boolean {
  return !r.env_key.trim() && !r.env_value.trim()
}

function ensureTrailingEmptyRow(rows: LocalRow[]): LocalRow[] {
  const filled = rows.filter((r) => !isRowEmpty(r))
  return [...filled, newRow()]
}

function mergeParsedIntoRows(
  rows: LocalRow[],
  parsed: Array<{ key: string; value: string }>
): LocalRow[] {
  const map = new Map<string, LocalRow>()
  for (const r of rows) {
    const k = r.env_key.trim()
    if (k) map.set(k, { ...r, env_key: k })
  }
  for (const p of parsed) {
    const existing = map.get(p.key)
    if (existing) {
      map.set(p.key, { ...existing, env_value: p.value })
    } else {
      map.set(p.key, newRow({ env_key: p.key, env_value: p.value }))
    }
  }
  return ensureTrailingEmptyRow(Array.from(map.values()))
}

function ValueInputWithCopy({
  value,
  onChange,
  onKeyDown,
}: {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        placeholder="valor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="font-mono text-sm pr-16"
        autoComplete="off"
        spellCheck={false}
      />
      <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
        <CopyValueButton value={value || null} label="Valor" />
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar valor' : 'Mostrar valor'}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}

export function DevCredenciaisPage() {
  const {
    credentials,
    loading,
    saving,
    error,
    success,
    fetchCredentials,
    upsertCredentials,
    deleteCredential,
    logExport,
  } = useDevCredentials()

  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [rows, setRows] = useState<LocalRow[]>([newRow()])
  const skipNextHydrateRef = useRef(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    entries: Array<{ key: string; value: string }>
    errors: Array<{ lineNumber: number; line: string; reason: string }>
    skipped: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authenticated) return
    if (skipNextHydrateRef.current) {
      skipNextHydrateRef.current = false
      return
    }
    if (credentials.length > 0) {
      setRows(
        ensureTrailingEmptyRow(
          credentials.map((c) =>
            newRow({
              env_key: c.env_key,
              env_value: c.env_value,
              selected: false,
            })
          )
        )
      )
    } else {
      setRows([newRow()])
    }
  }, [authenticated, credentials])

  const handleLogin = async () => {
    const ok = await fetchCredentials(password)
    if (ok) setAuthenticated(true)
  }

  const updateRow = useCallback((id: string, patch: Partial<LocalRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addRow = useCallback(() => {
    setRows((prev) => ensureTrailingEmptyRow(prev))
  }, [])

  const removeRow = useCallback(
    async (row: LocalRow) => {
      const key = row.env_key.trim()
      if (key && authenticated) {
        const ok = await deleteCredential(password, key)
        if (!ok) return
      }
      setRows((prev) => {
        const next = prev.filter((r) => r.id !== row.id)
        return ensureTrailingEmptyRow(next)
      })
    },
    [authenticated, deleteCredential, password]
  )

  const entriesToSave = useMemo(() => {
    const out: Array<{ env_key: string; env_value: string }> = []
    const seen = new Set<string>()
    for (const r of rows) {
      const k = r.env_key.trim()
      if (!k) continue
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ env_key: k, env_value: r.env_value })
    }
    return out
  }, [rows])

  const handleSave = async () => {
    if (entriesToSave.length === 0) return
    skipNextHydrateRef.current = true
    const ok = await upsertCredentials(password, entriesToSave, 'form')
    if (ok) {
      setRows([newRow()])
    } else {
      skipNextHydrateRef.current = false
    }
  }

  const handlePasteInKey = useCallback(
    (rowId: string, text: string) => {
      const singleLine = !text.includes('\n') && !text.includes('\r')
      if (singleLine && !text.includes('=')) return false
      const { entries, errors } = parseDotenvContent(text)
      if (entries.length === 0 && errors.length === 0) return false
      setRows((prev) => {
        const withoutTarget = prev.filter((r) => r.id !== rowId)
        const target = prev.find((r) => r.id === rowId)
        const base = target ? withoutTarget : prev
        let merged: LocalRow[]
        if (entries.length > 0) {
          const dedup: Array<{ key: string; value: string }> = []
          const byKey = new Map<string, string>()
          for (const e of entries) byKey.set(e.key, e.value)
          for (const [key, value] of byKey) dedup.push({ key, value })
          merged = mergeParsedIntoRows(base, dedup)
        } else if (target && errors.length === 0) {
          merged = ensureTrailingEmptyRow([...base, target])
        } else {
          merged = ensureTrailingEmptyRow(base)
        }
        return merged
      })
      return true
    },
    []
  )

  const onKeyPaste = (rowId: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (handlePasteInKey(rowId, text)) e.preventDefault()
  }

  const handleRowKeyDown = useCallback(
    (rowId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      setRows((prev) => {
        const normalized = ensureTrailingEmptyRow(prev)
        const idx = normalized.findIndex((r) => r.id === rowId)
        if (idx >= 0 && idx < normalized.length - 1) {
          const nextEl = document.querySelector<HTMLInputElement>(
            `[data-row-id="${normalized[idx + 1]?.id}"] input`
          )
          setTimeout(() => nextEl?.focus(), 0)
        }
        return normalized
      })
    },
    []
  )

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const parsed = parseDotenvContent(text)
      const dedup: Array<{ key: string; value: string }> = []
      const byKey = new Map<string, string>()
      for (const e of parsed.entries) byKey.set(e.key, e.value)
      for (const [key, value] of byKey) dedup.push({ key, value })
      setImportPreview({
        entries: dedup,
        errors: parsed.errors,
        skipped: parsed.skippedLines,
      })
      setImportOpen(true)
    }
    reader.readAsText(file)
  }

  const applyImport = async () => {
    if (!importPreview) return
    setImportOpen(false)
    const entries = importPreview.entries.map((e) => ({ env_key: e.key, env_value: e.value }))
    setImportPreview(null)
    await upsertCredentials(password, entries, 'import')
  }

  const applyImportLocalOnly = () => {
    if (!importPreview) return
    setRows((prev) => mergeParsedIntoRows(prev, importPreview.entries))
    setImportOpen(false)
    setImportPreview(null)
  }

  const downloadBlob = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = async () => {
    const list = entriesToSave
    if (list.length === 0) return
    const content = buildDotenvFile(list.map((e) => ({ key: e.env_key, value: e.env_value })))
    downloadBlob('.env', content)
    await logExport(password, 'all', list.length)
  }

  const handleExportSelected = async () => {
    const selected = rows.filter((r) => r.selected && r.env_key.trim())
    if (selected.length === 0) return
    const list = selected.map((r) => ({
      key: r.env_key.trim(),
      value: r.env_value,
    }))
    const content = buildDotenvFile(list)
    downloadBlob('.env', content)
    await logExport(password, 'selected', list.length)
  }

  const toggleSelectAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
  }

  const allSelectableSelected =
    rows.some((r) => r.env_key.trim()) &&
    rows.filter((r) => r.env_key.trim()).every((r) => r.selected)

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="h-7 w-7" />
            Credenciais (Dev)
          </h2>
          <p className="text-muted-foreground">
            Acesso protegido. Informe a senha de administrador.
          </p>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="dev-cred-password" className="text-sm font-medium">
                Senha de admin
              </label>
              <PasswordInput
                id="dev-cred-password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !loading) void handleLogin()
                }}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={() => void handleLogin()}
              disabled={!password || loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Verificando...' : 'Acessar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (
    authenticated &&
    loading &&
    rows.length === 1 &&
    rows[0]?.env_key === '' &&
    rows[0]?.env_value === ''
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Code2 className="h-7 w-7" />
            Credenciais
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Gerencie pares chave/valor estilo <code className="text-xs">.env</code>. Cole blocos
            multilinha no campo chave, importe arquivo ou exporte selecionadas. Valores não são
            registrados em logs do servidor.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchCredentials(password)}
            disabled={loading || saving}
          >
            <RefreshCcw className="h-4 w-4" />
            Recarregar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
          <CardTitle className="text-base">Variáveis</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={addRow} type="button">
              <Plus className="h-4 w-4" />
              Linha
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".env,text/plain"
              className="sr-only"
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) handleFile(f)
              }}
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Importar .env
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void handleExportSelected()}
              disabled={!rows.some((r) => r.selected && r.env_key.trim())}
            >
              <Download className="h-4 w-4" />
              Exportar selecionadas
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void handleExportAll()}
              disabled={entriesToSave.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar todas
            </Button>
            <Button size="sm" type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden sm:grid sm:grid-cols-[2rem_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
            <div className="flex items-center justify-center">
              <Checkbox
                checked={allSelectableSelected}
                onCheckedChange={(v) => toggleSelectAll(v === true)}
                aria-label="Selecionar todas"
              />
            </div>
            <div>Chave</div>
            <div>Valor</div>
            <div />
          </div>

          <div className="space-y-2">
            {rows.map((row) => {
              const hasKey = !!row.env_key.trim()
              const envLine = hasKey ? `${row.env_key.trim()}=${row.env_value}` : ''

              return (
                <div
                  key={row.id}
                  data-row-id={row.id}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-[2rem_1fr_1fr_auto] sm:items-center border rounded-md p-2"
                >
                  <div className="flex items-center justify-center sm:justify-center order-1 sm:order-0">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={(v) => updateRow(row.id, { selected: v === true })}
                      disabled={!hasKey}
                      aria-label={`Selecionar ${row.env_key || 'linha'}`}
                    />
                  </div>
                  <Input
                    placeholder="NOME_CHAVE"
                    value={row.env_key}
                    onChange={(e) => updateRow(row.id, { env_key: e.target.value })}
                    onPaste={(e) => onKeyPaste(row.id, e)}
                    onKeyDown={(e) => handleRowKeyDown(row.id, e)}
                    className="font-mono text-sm"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <ValueInputWithCopy
                    value={row.env_value}
                    onChange={(v) => updateRow(row.id, { env_value: v })}
                    onKeyDown={(e) => handleRowKeyDown(row.id, e)}
                  />
                  <div className="flex items-center gap-0.5 justify-self-end">
                    <CopyValueButton value={envLine || null} label="Linha .env" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeRow(row)}
                      disabled={saving}
                      aria-label="Remover linha"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar .env</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>{importPreview.entries.length}</strong> variáveis reconhecidas.
                {importPreview.skipped > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({importPreview.skipped} linhas ignoradas: vazias/comentário)
                  </span>
                )}
              </p>
              {importPreview.errors.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900 text-xs space-y-1 max-h-32 overflow-y-auto">
                  {importPreview.errors.map((err, i) => (
                    <div key={i}>
                      Linha {err.lineNumber}: {err.reason} — <code>{err.line}</code>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Salvar envia ao servidor com auditoria de importação. &quot;Apenas na tela&quot;
                mescla localmente sem gravar ainda.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setImportOpen(false)} type="button">
              Cancelar
            </Button>
            <Button variant="secondary" onClick={applyImportLocalOnly} type="button">
              Apenas na tela
            </Button>
            <Button onClick={() => void applyImport()} type="button" disabled={saving}>
              Salvar no servidor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
