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
  useOmieNfseConfig,
  type OmieNfseConfig,
} from '@/hooks/useOmieNfseConfig'
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
import { toOmieTemplateDescription } from '@/lib/omie-template-description'

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
  placeholder,
}: {
  label: string
  description?: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value
          if (next.trim() === '') {
            onChange(null)
            return
          }
          const parsed = Number(next)
          onChange(Number.isNaN(parsed) ? null : parsed)
        }}
      />
    </div>
  )
}

type TaxRetention = 'S' | 'N'

function TaxFieldRow({
  label,
  aliquota,
  retencao,
  onAliquotaChange,
  onRetencaoChange,
}: {
  label: string
  aliquota: number
  retencao: TaxRetention
  onAliquotaChange: (v: number) => void
  onRetencaoChange: (v: TaxRetention) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
      <NumberField
        label={`Alíquota ${label}`}
        description="Valor decimal entre 0 e 100 (ex: 1.50)"
        value={aliquota}
        onChange={(v) => onAliquotaChange(v ?? 0)}
        min={0}
        max={100}
        step={0.01}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium">Retenção {label}</label>
        <Select value={retencao} onValueChange={(v) => onRetencaoChange(v as TaxRetention)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="N">Não</SelectItem>
            <SelectItem value="S">Sim</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export function OmieNfseConfigPage() {
  const {
    config,
    loading,
    saving,
    error,
    success,
    fetchConfig,
    updateConfig,
  } = useOmieNfseConfig()

  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [form, setForm] = useState<OmieNfseConfig | null>(null)
  const [original, setOriginal] = useState<OmieNfseConfig | null>(null)

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
    const diff: Partial<OmieNfseConfig> = {}
    for (const key of Object.keys(form) as (keyof OmieNfseConfig)[]) {
      if (key === 'id' || key === 'created_at' || key === 'updated_at') continue
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
    <K extends keyof OmieNfseConfig>(key: K, value: OmieNfseConfig[K]) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
    },
    []
  )

  const handleDepartamentosCodigosChange = useCallback(
    (nextText: string) => {
      const normalized = nextText
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .filter((item, index, arr) => arr.indexOf(item) === index)
        .join(',')
      updateField('departamentos_codigos', normalized)
    },
    [updateField]
  )

  const omieTemplatePreview = useMemo(
    () =>
      toOmieTemplateDescription(form?.descricao_servico_template ?? ''),
    [form?.descricao_servico_template]
  )

  if (!authenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Configuração OMIE NFS-e
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
              <label htmlFor="config-password" className="text-sm font-medium">
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
            Configuração OMIE NFS-e
          </h2>
          <p className="text-muted-foreground">
            Gerencie a configuração fiscal ativa consumida pelo orquestrador OMIE.
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviço e Tributação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Código Serviço Municipal</label>
              <Input
                value={form.codigo_servico_municipal}
                onChange={(e) => updateField('codigo_servico_municipal', e.target.value)}
                placeholder="Ex: 63194"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Código LC116</label>
              <Input
                value={form.codigo_lc116}
                onChange={(e) => updateField('codigo_lc116', e.target.value)}
                placeholder="Ex: 7.07"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo Tributação</label>
              <Input
                value={form.tipo_tributacao}
                onChange={(e) => updateField('tipo_tributacao', e.target.value)}
                placeholder="Ex: 01"
              />
            </div>

            <TaxFieldRow
              label="ISS"
              aliquota={form.aliquota_iss}
              retencao={form.retencao_iss}
              onAliquotaChange={(v) => updateField('aliquota_iss', v)}
              onRetencaoChange={(v) => updateField('retencao_iss', v)}
            />

            <TaxFieldRow
              label="IR"
              aliquota={form.aliquota_ir}
              retencao={form.retencao_ir}
              onAliquotaChange={(v) => updateField('aliquota_ir', v)}
              onRetencaoChange={(v) => updateField('retencao_ir', v)}
            />

            <TaxFieldRow
              label="INSS"
              aliquota={form.aliquota_inss}
              retencao={form.retencao_inss}
              onAliquotaChange={(v) => updateField('aliquota_inss', v)}
              onRetencaoChange={(v) => updateField('retencao_inss', v)}
            />

            <TaxFieldRow
              label="PIS"
              aliquota={form.aliquota_pis}
              retencao={form.retencao_pis}
              onAliquotaChange={(v) => updateField('aliquota_pis', v)}
              onRetencaoChange={(v) => updateField('retencao_pis', v)}
            />

            <TaxFieldRow
              label="COFINS"
              aliquota={form.aliquota_cofins}
              retencao={form.retencao_cofins}
              onAliquotaChange={(v) => updateField('aliquota_cofins', v)}
              onRetencaoChange={(v) => updateField('retencao_cofins', v)}
            />

            <TaxFieldRow
              label="CSLL"
              aliquota={form.aliquota_csll}
              retencao={form.retencao_csll}
              onAliquotaChange={(v) => updateField('aliquota_csll', v)}
              onRetencaoChange={(v) => updateField('retencao_csll', v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financeiro OMIE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Código Categoria</label>
              <Input
                value={form.codigo_categoria}
                onChange={(e) => updateField('codigo_categoria', e.target.value)}
                placeholder="Ex: 1.02.02"
              />
            </div>

            <NumberField
              label="Conta Corrente ID"
              description="Inteiro positivo. Deixe em branco para null."
              value={form.conta_corrente_id}
              onChange={(v) => updateField('conta_corrente_id', v)}
              min={1}
              step={1}
              placeholder="Ex: 5191114476"
            />

            <div className="space-y-1">
              <label className="text-sm font-medium">Status da Configuração</label>
              <Input value={form.ativo ? 'Ativa' : 'Inativa'} disabled />
              <p className="text-xs text-muted-foreground">
                Apenas a configuração ativa é lida pelo orquestrador.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payload da OS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Etapa da OS</label>
              <Input
                value={form.os_etapa}
                onChange={(e) => updateField('os_etapa', e.target.value)}
                placeholder="Ex: 50"
              />
              <p className="text-xs text-muted-foreground">
                Valor enviado em <code>Cabecalho.cEtapa</code> (ex.: 50 = Faturar).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Enviar link da NFS-e</label>
              <Select
                value={form.enviar_link_nfse ? 'S' : 'N'}
                onValueChange={(v) => updateField('enviar_link_nfse', v === 'S')}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Sim</SelectItem>
                  <SelectItem value="N">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Enviar boleto por email</label>
              <Select
                value={form.enviar_boleto ? 'S' : 'N'}
                onValueChange={(v) => updateField('enviar_boleto', v === 'S')}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Sim</SelectItem>
                  <SelectItem value="N">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Usar imagemProposta.id como número</label>
              <Select
                value={form.usar_imagemproposta_id_como_numero ? 'S' : 'N'}
                onValueChange={(v) =>
                  updateField('usar_imagemproposta_id_como_numero', v === 'S')
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Sim</SelectItem>
                  <SelectItem value="N">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Template e Departamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Template da descrição do serviço</label>
              <textarea
                className="w-full min-h-[130px] rounded-md border bg-background px-3 py-2 text-sm"
                value={form.descricao_servico_template}
                onChange={(e) =>
                  updateField('descricao_servico_template', e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Placeholders: {'{{numero_proposta}}'}, {'{{celebridade}}'},
                {'{{cliente_nome}}'}, {'{{cidade}}'}, {'{{uf}}'}, {'{{vigencia}}'},
                {'{{segmento}}'}, {'{{subsegmento}}'}, {'{{negocio}}'},
                {'{{pagamentos}}'}.
              </p>
              <p className="text-xs text-muted-foreground">
                Enter vira <code>|</code> e linha em branco vira <code>||</code> no formato OMIE.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Preview (formato OMIE final)</label>
              <pre className="max-h-36 overflow-auto rounded-md border bg-muted/30 px-3 py-2 text-xs whitespace-pre-wrap wrap-break-word">
                {omieTemplatePreview}
              </pre>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                Códigos de departamento (separados por vírgula)
              </label>
              <Input
                value={form.departamentos_codigos}
                placeholder="5200983274,1234567890"
                onChange={(e) => handleDepartamentosCodigosChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Informe apenas os códigos. O backend converte para o formato OMIE.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      </div>
    </div>
  )
}
