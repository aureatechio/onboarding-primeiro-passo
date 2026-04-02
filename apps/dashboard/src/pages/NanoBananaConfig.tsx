import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Palette,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  Save,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  ScanText,
} from 'lucide-react'
import {
  useNanoBananaConfig,
  type NanoBananaConfig,
} from '@/hooks/useNanoBananaConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

type DirectionCategory = 'moderna' | 'clean' | 'retail'

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step ?? 1}
          className="w-40"
        />
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  )
}

function ReferenceImageUpload({
  inputId,
  selectedFile,
  currentImageUrl,
  onChange,
  onRemove,
  onReadImage,
  isReading,
}: {
  inputId: string
  selectedFile?: File
  currentImageUrl?: string | null
  onChange: (file: File | null) => void
  onRemove: () => void
  onReadImage: () => void
  isReading: boolean
}) {
  const hasImage = Boolean(selectedFile || currentImageUrl)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setLocalPreviewUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <UploadCloud className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Imagem de referência</p>
              <p className="text-xs text-muted-foreground">PNG/JPG/WEBP • até 10MB</p>
            </div>
          </div>
          <label
            htmlFor={inputId}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            {hasImage ? 'Trocar imagem' : 'Selecionar imagem'}
          </label>
        </div>

        {selectedFile && (
          <div className="mt-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Arquivo selecionado:</span>{' '}
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </div>
        )}
      </div>

      {currentImageUrl && !selectedFile && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            Imagem atual
          </div>
          <img
            src={currentImageUrl}
            alt="Referência atual"
            className="max-h-44 rounded-md border object-contain"
          />
        </div>
      )}

      {localPreviewUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            Prévia local
          </div>
          <img
            src={localPreviewUrl}
            alt="Prévia local"
            className="max-h-44 rounded-md border object-contain"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onReadImage}
          className="gap-2"
          disabled={!selectedFile || isReading}
        >
          {isReading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
          {isReading ? 'Lendo imagem...' : 'Ler imagem'}
        </Button>
        {hasImage && (
          <Button type="button" variant="outline" onClick={onRemove} className="gap-2">
            <Trash2 className="h-4 w-4" />
            Remover imagem
          </Button>
        )}
      </div>
    </div>
  )
}

export function NanoBananaConfigPage() {
  const {
    config,
    loading,
    saving,
    error,
    success,
    fetchConfig,
    updateConfig,
    readDirectionFromImage,
  } = useNanoBananaConfig()

  const [form, setForm] = useState<NanoBananaConfig | null>(null)
  const [original, setOriginal] = useState<NanoBananaConfig | null>(null)
  const [referenceFiles, setReferenceFiles] = useState<Partial<Record<DirectionCategory, File>>>({})
  const [removeReferenceImage, setRemoveReferenceImage] = useState<Partial<Record<DirectionCategory, boolean>>>({})
  const [readingByCategory, setReadingByCategory] = useState<Partial<Record<DirectionCategory, boolean>>>({})

  useEffect(() => {
    if (config && !form) {
      setForm({ ...config })
      setOriginal({ ...config })
    }
  }, [config, form])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  const isDirty = useMemo(() => {
    if (!form || !original) return false
    return JSON.stringify(form) !== JSON.stringify(original)
  }, [form, original])

  const changedFields = useMemo(() => {
    if (!form || !original) return {}
    const diff: Partial<NanoBananaConfig> = {}
    for (const key of Object.keys(form) as (keyof NanoBananaConfig)[]) {
      if (form[key] !== original[key]) {
        ;(diff as Record<string, unknown>)[key] = form[key]
      }
    }
    return diff
  }, [form, original])

  const handleSave = async () => {
    if (!isDirty) return
    const hasFileChanges = Object.keys(referenceFiles).length > 0 || Object.keys(removeReferenceImage).length > 0
    let payload: Partial<NanoBananaConfig> | FormData = changedFields

    if (hasFileChanges) {
      const formData = new FormData()
      for (const [key, value] of Object.entries(changedFields)) {
        if (value == null) continue
        formData.append(key, String(value))
      }
      for (const category of ['moderna', 'clean', 'retail'] as DirectionCategory[]) {
        const file = referenceFiles[category]
        if (file) {
          formData.append(`direction_${category}_image`, file)
        }
        if (removeReferenceImage[category]) {
          formData.append(`direction_${category}_remove_image`, 'true')
        }
      }
      payload = formData
    }

    const ok = await updateConfig(payload)
    if (ok) {
      setOriginal(form ? { ...form } : null)
      setReferenceFiles({})
      setRemoveReferenceImage({})
    }
  }

  const handleReload = useCallback(async () => {
    setForm(null)
    setOriginal(null)
    setReferenceFiles({})
    setRemoveReferenceImage({})
    await fetchConfig()
  }, [fetchConfig])

  const updateField = useCallback(
    <K extends keyof NanoBananaConfig>(key: K, value: NanoBananaConfig[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    []
  )

  const handleReferenceFile = useCallback((category: DirectionCategory, file: File | null) => {
    setReferenceFiles((prev) => {
      const next = { ...prev }
      if (file) next[category] = file
      else delete next[category]
      return next
    })
    if (file) {
      setRemoveReferenceImage((prev) => ({ ...prev, [category]: false }))
    }
  }, [])

  const markReferenceRemoval = useCallback((category: DirectionCategory) => {
    setReferenceFiles((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
    setRemoveReferenceImage((prev) => ({ ...prev, [category]: true }))
    const pathKey = `direction_${category}_image_path` as const
    const urlKey = `direction_${category}_image_url` as const
    setForm((prev) => (prev ? { ...prev, [pathKey]: null, [urlKey]: null } : prev))
  }, [])

  const handleReadImage = useCallback(
    async (category: DirectionCategory) => {
      const file = referenceFiles[category]
      if (!file) return

      setReadingByCategory((prev) => ({ ...prev, [category]: true }))
      const directionText = await readDirectionFromImage(category, file)
      setReadingByCategory((prev) => ({ ...prev, [category]: false }))

      if (!directionText) return
      const key = `direction_${category}` as const
      setForm((prev) => (prev ? { ...prev, [key]: directionText } : prev))
    },
    [readDirectionFromImage, referenceFiles]
  )

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Configurações do NanoBanana
          </h2>
          <p className="text-muted-foreground">
            Gerencie os parâmetros do gerador de criativos com Gemini.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1 - Provider (Gemini) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider (Gemini)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Model Name</label>
              <Input
                value={form.gemini_model_name}
                onChange={(e) => updateField('gemini_model_name', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">API Base URL</label>
              <Input
                value={form.gemini_api_base_url}
                onChange={(e) => updateField('gemini_api_base_url', e.target.value)}
                placeholder="https://generativelanguage.googleapis.com"
              />
            </div>
            <NumberField
              label="Max Retries"
              description="0 a 10"
              value={form.max_retries}
              onChange={(v) => updateField('max_retries', v)}
              min={0}
              max={10}
            />
            <NumberField
              label="Worker Batch Size"
              description="1 a 12"
              value={form.worker_batch_size}
              onChange={(v) => updateField('worker_batch_size', v)}
              min={1}
              max={12}
            />
          </CardContent>
        </Card>

        {/* Card 2 - Limites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="URL Expiry"
              description="3600 a 2592000"
              value={form.url_expiry_seconds}
              onChange={(v) => updateField('url_expiry_seconds', v)}
              min={3600}
              max={2592000}
              step={3600}
              suffix="s"
            />
            <NumberField
              label="Max Image Download"
              description="1048576 a 52428800"
              value={form.max_image_download_bytes}
              onChange={(v) => updateField('max_image_download_bytes', v)}
              min={1048576}
              max={52428800}
              step={1048576}
              suffix="bytes"
            />
          </CardContent>
        </Card>

        {/* Card 3 - Global Rules (Prompt Mestre) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Global Rules (Prompt Mestre)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={15}
              value={form.global_rules}
              onChange={(e) => updateField('global_rules', e.target.value)}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Global Rules Version</label>
              <Input
                value={form.global_rules_version}
                onChange={(e) => updateField('global_rules_version', e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4 - Direção Criativa — Moderna */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Direção Criativa — Moderna</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={6}
              value={form.direction_moderna}
              onChange={(e) => updateField('direction_moderna', e.target.value)}
            />
            <div className="space-y-2">
              <ReferenceImageUpload
                inputId="nanobanana-ref-moderna"
                selectedFile={referenceFiles.moderna}
                currentImageUrl={form.direction_moderna_image_url}
                onChange={(file) => handleReferenceFile('moderna', file)}
                onRemove={() => markReferenceRemoval('moderna')}
                onReadImage={() => void handleReadImage('moderna')}
                isReading={Boolean(readingByCategory.moderna)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 5 - Direção Criativa — Clean */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Direção Criativa — Clean</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={6}
              value={form.direction_clean}
              onChange={(e) => updateField('direction_clean', e.target.value)}
            />
            <div className="space-y-2">
              <ReferenceImageUpload
                inputId="nanobanana-ref-clean"
                selectedFile={referenceFiles.clean}
                currentImageUrl={form.direction_clean_image_url}
                onChange={(file) => handleReferenceFile('clean', file)}
                onRemove={() => markReferenceRemoval('clean')}
                onReadImage={() => void handleReadImage('clean')}
                isReading={Boolean(readingByCategory.clean)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 6 - Direção Criativa — Retail */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Direção Criativa — Retail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={6}
              value={form.direction_retail}
              onChange={(e) => updateField('direction_retail', e.target.value)}
            />
            <div className="space-y-2">
              <ReferenceImageUpload
                inputId="nanobanana-ref-retail"
                selectedFile={referenceFiles.retail}
                currentImageUrl={form.direction_retail_image_url}
                onChange={(file) => handleReferenceFile('retail', file)}
                onRemove={() => markReferenceRemoval('retail')}
                onReadImage={() => void handleReadImage('retail')}
                isReading={Boolean(readingByCategory.retail)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 7 - Formatos de Saída */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Formatos de Saída</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">1:1 (1080×1080)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                rows={3}
                value={form.format_1_1}
                onChange={(e) => updateField('format_1_1', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">4:5 (1080×1350)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                rows={3}
                value={form.format_4_5}
                onChange={(e) => updateField('format_4_5', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">16:9 (1920×1080)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                rows={3}
                value={form.format_16_9}
                onChange={(e) => updateField('format_16_9', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">9:16 (1080×1920)</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                rows={3}
                value={form.format_9_16}
                onChange={(e) => updateField('format_9_16', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 8 - Versionamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versionamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Prompt Version</label>
              <Input
                value={form.prompt_version}
                onChange={(e) => updateField('prompt_version', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Última atualização: {formatUpdatedAt(form.updated_at)}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleReload}
            disabled={loading || saving}
          >
            <RefreshCcw className="h-4 w-4" />
            Recarregar
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </div>
    </div>
  )
}
