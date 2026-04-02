import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Brain,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  Save,
} from 'lucide-react'
import {
  usePerplexityConfig,
  type PerplexityConfig,
} from '@/hooks/usePerplexityConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
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

export function PerplexityConfigPage() {
  const {
    config,
    loading,
    saving,
    error,
    success,
    fetchConfig,
    updateConfig,
  } = usePerplexityConfig()

  const [form, setForm] = useState<PerplexityConfig | null>(null)
  const [original, setOriginal] = useState<PerplexityConfig | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [clearApiKey, setClearApiKey] = useState(false)

  useEffect(() => {
    if (config && !form) {
      setForm({ ...config })
      setOriginal({ ...config })
      setApiKeyInput('')
      setClearApiKey(false)
    }
  }, [config, form])

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  const isDirty = useMemo(() => {
    if (!form || !original) return false
    return (
      JSON.stringify(form) !== JSON.stringify(original) ||
      Boolean(apiKeyInput.trim()) ||
      clearApiKey
    )
  }, [form, original, apiKeyInput, clearApiKey])

  const changedFields = useMemo(() => {
    if (!form || !original) return {}
    const diff: Partial<PerplexityConfig> = {}
    for (const key of Object.keys(form) as (keyof PerplexityConfig)[]) {
      if (form[key] !== original[key]) {
        ;(diff as Record<string, unknown>)[key] = form[key]
      }
    }
    if (clearApiKey) {
      ;(diff as Record<string, unknown>).api_key = ''
    } else if (apiKeyInput.trim()) {
      ;(diff as Record<string, unknown>).api_key = apiKeyInput.trim()
    }
    return diff
  }, [form, original, apiKeyInput, clearApiKey])

  const handleSave = async () => {
    if (!isDirty) return
    const ok = await updateConfig(changedFields)
    if (ok) {
      setOriginal(form ? { ...form } : null)
      setApiKeyInput('')
      setClearApiKey(false)
    }
  }

  const handleReload = useCallback(async () => {
    setForm(null)
    setOriginal(null)
    await fetchConfig()
  }, [fetchConfig])

  const updateField = useCallback(
    <K extends keyof PerplexityConfig>(key: K, value: PerplexityConfig[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    []
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
            <Brain className="h-6 w-6" />
            Configurações do Perplexity
          </h2>
          <p className="text-muted-foreground">
            Gerencie os parâmetros do provider Perplexity/Sonar para geração de briefing.
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
        {/* Card 1 - Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Modelo</label>
              <Select
                value={form.model}
                onValueChange={(v) => updateField('model', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sonar">sonar</SelectItem>
                  <SelectItem value="sonar-pro">sonar-pro</SelectItem>
                  <SelectItem value="sonar-reasoning">sonar-reasoning</SelectItem>
                  <SelectItem value="sonar-reasoning-pro">sonar-reasoning-pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">API Base URL</label>
              <Input
                value={form.api_base_url}
                onChange={(e) => updateField('api_base_url', e.target.value)}
                placeholder="https://api.perplexity.ai"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Perplexity API Key</label>
              <PasswordInput
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value)
                  if (clearApiKey) setClearApiKey(false)
                }}
                placeholder={form.api_key_hint || 'Digite uma nova API key'}
              />
              <p className="text-xs text-muted-foreground">
                Fonte atual: {form.api_key_source || 'none'}
              </p>
              {form.api_key_source === 'database' && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setApiKeyInput('')
                    setClearApiKey(true)
                  }}
                >
                  Limpar API key do banco
                </Button>
              )}
            </div>
            <NumberField
              label="Timeout"
              description="1000 a 60000"
              value={form.timeout_ms}
              onChange={(v) => updateField('timeout_ms', v)}
              min={1000}
              max={60000}
              step={1000}
              suffix="ms"
            />
          </CardContent>
        </Card>

        {/* Card 2 - Parâmetros de Geração */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parâmetros de Geração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="Temperature"
              description="0 a 2"
              value={form.temperature}
              onChange={(v) => updateField('temperature', v)}
              min={0}
              max={2}
              step={0.1}
            />
            <NumberField
              label="Top P"
              description="0 a 1"
              value={form.top_p}
              onChange={(v) => updateField('top_p', v)}
              min={0}
              max={1}
              step={0.1}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Search Mode</label>
              <Select
                value={form.search_mode}
                onValueChange={(v) => updateField('search_mode', v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">web</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Search Recency Filter</label>
              <Select
                value={form.search_recency_filter}
                onValueChange={(v) => updateField('search_recency_filter', v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">hour</SelectItem>
                  <SelectItem value="day">day</SelectItem>
                  <SelectItem value="week">week</SelectItem>
                  <SelectItem value="month">month</SelectItem>
                  <SelectItem value="year">year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField
              label="Insights Count"
              description="1 a 10"
              value={form.insights_count}
              onChange={(v) => updateField('insights_count', v)}
              min={1}
              max={10}
            />
          </CardContent>
        </Card>

        {/* Card 3 - System Prompt */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">System Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={6}
              value={form.system_prompt}
              onChange={(e) => updateField('system_prompt', e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Card 4 - User Prompt Template */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">User Prompt Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              rows={10}
              value={form.user_prompt_template}
              onChange={(e) => updateField('user_prompt_template', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Placeholders disponíveis:{' '}
              <code className="text-[11px]">
                {'{{company_name}}'}, {'{{company_site}}'}, {'{{celebrity_name}}'},{' '}
                {'{{segment}}'}, {'{{region}}'}, {'{{goal}}'}, {'{{mode}}'},{' '}
                {'{{brief}}'}, {'{{insights_count}}'}
              </code>
            </p>
          </CardContent>
        </Card>

        {/* Card 5 - Versionamento */}
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
            <div className="space-y-1">
              <label className="text-sm font-medium">Strategy Version</label>
              <Input
                value={form.strategy_version}
                onChange={(e) => updateField('strategy_version', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contract Version</label>
              <Input
                value={form.contract_version}
                onChange={(e) => updateField('contract_version', e.target.value)}
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
