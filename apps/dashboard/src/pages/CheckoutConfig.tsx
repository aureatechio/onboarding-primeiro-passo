import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Settings,
  Loader2,
  CheckCircle2,
  RefreshCcw,
  Save,
  Lock,
} from 'lucide-react'
import {
  useCheckoutConfig,
  type CheckoutConfig,
} from '@/hooks/useCheckoutConfig'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
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

function SwitchField({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
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

export function CheckoutConfigPage() {
  const {
    config,
    loading,
    saving,
    error,
    success,
    fetchConfig,
    updateConfig,
  } = useCheckoutConfig()

  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [form, setForm] = useState<CheckoutConfig | null>(null)
  const [original, setOriginal] = useState<CheckoutConfig | null>(null)

  useEffect(() => {
    if (config && !form) {
      setForm({ ...config })
      setOriginal({ ...config })
    }
  }, [config, form])

  useEffect(() => {
    if (config && authenticated) {
      setForm({ ...config })
      setOriginal({ ...config })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const handleLogin = async () => {
    const ok = await fetchConfig(password)
    if (ok) setAuthenticated(true)
  }

  const isDirty = useMemo(() => {
    if (!form || !original) return false
    return JSON.stringify(form) !== JSON.stringify(original)
  }, [form, original])

  const changedFields = useMemo(() => {
    if (!form || !original) return {}
    const diff: Partial<CheckoutConfig> = {}
    for (const key of Object.keys(form) as (keyof CheckoutConfig)[]) {
      if (form[key] !== original[key]) {
        ;(diff as Record<string, unknown>)[key] = form[key]
      }
    }
    return diff
  }, [form, original])

  const handleSave = async () => {
    if (!isDirty) return
    const ok = await updateConfig(password, changedFields)
    if (ok) {
      setOriginal(form ? { ...form } : null)
    }
  }

  const handleReload = useCallback(async () => {
    setForm(null)
    setOriginal(null)
    await fetchConfig(password)
  }, [fetchConfig, password])

  const updateField = useCallback(
    <K extends keyof CheckoutConfig>(key: K, value: CheckoutConfig[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    []
  )

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Configurações do Checkout
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
              <label
                htmlFor="config-password"
                className="text-sm font-medium"
              >
                Senha de admin
              </label>
              <PasswordInput
                id="config-password"
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password && !loading) handleLogin()
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
              onClick={handleLogin}
              disabled={!password || loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Verificando...' : 'Acessar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
            <Settings className="h-6 w-6" />
            Configurações do Checkout
          </h2>
          <p className="text-muted-foreground">
            Gerencie os parâmetros globais do checkout.
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
        {/* Card 1 - Meios de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meios de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchField
              label="Cartão de Crédito"
              checked={form.cartao_enabled}
              onCheckedChange={(v) => updateField('cartao_enabled', v)}
            />
            <Separator />
            <SwitchField
              label="PIX"
              checked={form.pix_enabled}
              onCheckedChange={(v) => updateField('pix_enabled', v)}
            />
            <Separator />
            <SwitchField
              label="Boleto"
              checked={form.boleto_enabled}
              onCheckedChange={(v) => updateField('boleto_enabled', v)}
            />
          </CardContent>
        </Card>

        {/* Card 2 - Parcelamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parcelamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="Máximo de parcelas"
              description="1 a 18"
              value={form.max_parcelas}
              onChange={(v) => updateField('max_parcelas', v)}
              min={1}
              max={18}
            />
            <NumberField
              label="Parcelas sem juros"
              description="0 a 18"
              value={form.parcelas_sem_juros}
              onChange={(v) => updateField('parcelas_sem_juros', v)}
              min={0}
              max={18}
            />
          </CardContent>
        </Card>

        {/* Card 3 - Desconto PIX */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desconto PIX</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="Percentual de desconto"
              description="0 a 10"
              value={form.pix_discount_percent}
              onChange={(v) => updateField('pix_discount_percent', v)}
              min={0}
              max={10}
              step={0.5}
              suffix="%"
            />
            <NumberField
              label="Valor mínimo para desconto"
              description="Em centavos (ex: 100000 = R$ 1.000)"
              value={form.pix_discount_min_value_centavos}
              onChange={(v) =>
                updateField('pix_discount_min_value_centavos', v)
              }
              min={0}
              suffix="centavos"
            />
          </CardContent>
        </Card>

        {/* Card 4 - PIX e Boleto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PIX e Boleto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumberField
              label="Expiração do PIX"
              description="Em segundos (86400 = 24h)"
              value={form.pix_expiration_seconds}
              onChange={(v) => updateField('pix_expiration_seconds', v)}
              min={600}
              max={259200}
              suffix="segundos"
            />
            <NumberField
              label="Dias até vencimento do boleto"
              description="1 a 120 dias"
              value={form.boleto_first_due_days}
              onChange={(v) => updateField('boleto_first_due_days', v)}
              min={1}
              max={120}
              suffix="dias"
            />
          </CardContent>
        </Card>

        {/* Card 5 - Recorrência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recorrência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchField
              label="Recorrência habilitada"
              checked={form.recorrente_enabled}
              onCheckedChange={(v) => updateField('recorrente_enabled', v)}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Intervalo padrão</label>
              <Select
                value={form.recorrente_intervalo_default}
                onValueChange={(v) =>
                  updateField('recorrente_intervalo_default', v)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="bimestral">Bimestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField
              label="Máximo de tentativas"
              description="1 a 10"
              value={form.recorrente_max_tentativas}
              onChange={(v) => updateField('recorrente_max_tentativas', v)}
              min={1}
              max={10}
            />
          </CardContent>
        </Card>

        {/* Card 6 - Segurança e Retries */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segurança e Retries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwitchField
              label="Smart Retry"
              description="Retentativa inteligente com backoff"
              checked={form.enable_smart_retry}
              onCheckedChange={(v) => updateField('enable_smart_retry', v)}
            />
            <Separator />
            <SwitchField
              label="3DS Obrigatório"
              description="Forçar autenticação 3D Secure"
              checked={form.enable_3ds_enforcement}
              onCheckedChange={(v) =>
                updateField('enable_3ds_enforcement', v)
              }
            />
            <Separator />
            <NumberField
              label="Retries por sessão"
              description="1 a 20"
              value={form.max_retry_attempts_per_session}
              onChange={(v) =>
                updateField('max_retry_attempts_per_session', v)
              }
              min={1}
              max={20}
            />
            <NumberField
              label="Retries em 30 dias"
              description="1 a 30"
              value={form.max_retry_attempts_30d}
              onChange={(v) => updateField('max_retry_attempts_30d', v)}
              min={1}
              max={30}
            />
            <NumberField
              label="Canary percentage"
              description="Rollout gradual (0–100%)"
              value={form.canary_percentage}
              onChange={(v) => updateField('canary_percentage', v)}
              min={0}
              max={100}
              suffix="%"
            />
          </CardContent>
        </Card>

        {/* Card 7 - URLs e Ambiente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">URLs e Ambiente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Versão do checkout</label>
              <p className="text-xs text-muted-foreground">
                Checkout 2.0 usa o fluxo multistep com contrato embutido (
                <code className="text-[11px]">contrato-flow-v3.html</code>
                ). Nesse modo, a ClickSign não dispara e-mail automático de solicitação de
                assinatura; o link gerado em create-checkout aponta para essa página.
              </p>
              <Select
                value={form.checkout_version}
                onValueChange={(v) =>
                  updateField('checkout_version', v as 'checkout_v1' | 'checkout_v2')
                }
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkout_v1">Checkout 1.0 (atual)</SelectItem>
                  <SelectItem value="checkout_v2">Checkout 2.0 (contrato + pagamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">URL base do checkout</label>
              <Input
                value={form.checkout_base_url}
                onChange={(e) =>
                  updateField('checkout_base_url', e.target.value)
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                URL de webhook de retorno
              </label>
              <Input
                value={form.webhook_retorno_url ?? ''}
                onChange={(e) =>
                  updateField(
                    'webhook_retorno_url',
                    e.target.value || null
                  )
                }
                placeholder="https://... (opcional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Expiração do link"
                description="1 a 720 horas"
                value={form.link_expiration_hours}
                onChange={(v) => updateField('link_expiration_hours', v)}
                min={1}
                max={720}
                suffix="horas"
              />
              <div className="space-y-1">
                <label className="text-sm font-medium">Ambiente Cielo</label>
                <p className="text-xs text-muted-foreground">
                  sandbox ou production
                </p>
                <Select
                  value={form.cielo_environment}
                  onValueChange={(v) => updateField('cielo_environment', v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
