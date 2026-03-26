import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Palette, RefreshCw, Save, Settings, FileText, Brush, Ratio } from 'lucide-react'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorRadius, monitorTheme } from './theme'
import MonitorLayout from './MonitorLayout'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const cardStyle = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xxl,
  padding: designTokens.space[8],
  marginBottom: designTokens.space[7],
}

const labelStyle = {
  ...TYPE.bodySmall,
  fontWeight: 600,
  color: monitorTheme.textPrimary,
  marginBottom: 4,
  display: 'block',
}

const hintStyle = {
  ...TYPE.caption,
  color: monitorTheme.textMuted,
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: monitorRadius.md,
  border: `1px solid ${monitorTheme.border}`,
  background: '#fff',
  fontSize: 13,
  color: monitorTheme.textPrimary,
  outline: 'none',
  boxSizing: 'border-box',
}

const numberInputStyle = {
  ...inputStyle,
  width: 180,
}

const textareaStyle = {
  ...inputStyle,
  fontFamily: 'monospace',
  fontSize: 12,
  resize: 'vertical',
  lineHeight: 1.5,
}

const buttonBase = {
  borderRadius: monitorRadius.md,
  padding: '8px 16px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontWeight: 600,
  fontSize: 13,
  border: 'none',
}

const primaryButton = {
  ...buttonBase,
  background: monitorTheme.buttonDarkBg,
  color: monitorTheme.buttonDarkText,
}

const outlineButton = {
  ...buttonBase,
  background: '#fff',
  color: monitorTheme.textPrimary,
  border: `1px solid ${monitorTheme.borderStrong}`,
}

const tabBarStyle = {
  display: 'flex',
  gap: 0,
  borderBottom: `2px solid ${monitorTheme.border}`,
  marginBottom: 24,
}

const tabStyle = (active) => ({
  padding: '10px 20px',
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  fontSize: 13,
  fontWeight: active ? 700 : 500,
  color: active ? monitorTheme.textPrimary : monitorTheme.textMuted,
  borderBottom: active ? `2px solid ${monitorTheme.buttonDarkBg}` : '2px solid transparent',
  marginBottom: -2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'color 0.15s, border-color 0.15s',
})

const TABS = [
  { id: 'provider', label: 'Provider', icon: Settings },
  { id: 'rules', label: 'Global Rules', icon: FileText },
  { id: 'direction', label: 'Direcao Criativa', icon: Brush },
  { id: 'formats', label: 'Formatos & Versao', icon: Ratio },
]

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {hint && <p style={hintStyle}>{hint}</p>}
      {children}
    </div>
  )
}

export default function NanoBananaConfigPage() {
  const [form, setForm] = useState(null)
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('provider')

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-nanobanana-config`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao buscar configuracoes')
        setLoading(false)
        return
      }
      setForm({ ...data.config })
      setOriginal({ ...data.config })
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Erro de conexao')
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const isDirty = useMemo(() => {
    if (!form || !original) return false
    return JSON.stringify(form) !== JSON.stringify(original)
  }, [form, original])

  const handleSave = async () => {
    if (!isDirty || !form || !original) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    const changed = {}
    for (const key of Object.keys(form)) {
      if (form[key] !== original[key]) changed[key] = form[key]
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-nanobanana-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }
      setForm({ ...data.config })
      setOriginal({ ...data.config })
      setSuccess('Configuracoes salvas com sucesso')
      setSaving(false)
    } catch (err) {
      setError(err.message || 'Erro de conexao')
      setSaving(false)
    }
  }

  const handleReload = () => {
    setForm(null)
    setOriginal(null)
    fetchConfig()
  }

  const updateField = (key, value) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  if (loading || !form) {
    return (
      <MonitorLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: monitorTheme.textMuted }} />
        </div>
      </MonitorLayout>
    )
  }

  return (
    <MonitorLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ ...TYPE.h2, color: monitorTheme.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={22} />
            Configuracoes do NanoBanana
          </h2>
          <p style={{ ...TYPE.bodySmall, color: monitorTheme.textMuted, marginTop: 4 }}>
            Gerencie os parametros do gerador de criativos com Gemini.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: monitorTheme.dangerBg, border: `1px solid ${monitorTheme.dangerBorder}`, borderRadius: monitorRadius.md, padding: 12, marginBottom: 16, fontSize: 13, color: monitorTheme.dangerTextStrong }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: monitorTheme.completedBg, border: `1px solid #A7F3D0`, borderRadius: monitorRadius.md, padding: 12, marginBottom: 16, fontSize: 13, color: monitorTheme.completedText }}>
          {success}
        </div>
      )}

      <div style={tabBarStyle}>
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={tabStyle(activeTab === tab.id)}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'provider' && (
        <div style={cardStyle}>
          <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Provider (Gemini)</h3>
          <Field label="Model Name">
            <input style={inputStyle} value={form.gemini_model_name} onChange={(e) => updateField('gemini_model_name', e.target.value)} />
          </Field>
          <Field label="API Base URL">
            <input style={inputStyle} value={form.gemini_api_base_url} onChange={(e) => updateField('gemini_api_base_url', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            <Field label="Max Retries" hint="0 a 10">
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.max_retries} onChange={(e) => updateField('max_retries', Number(e.target.value))} min={0} max={10} />
            </Field>
            <Field label="Worker Batch Size" hint="1 a 12">
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.worker_batch_size} onChange={(e) => updateField('worker_batch_size', Number(e.target.value))} min={1} max={12} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            <Field label="URL Expiry" hint="3600 a 2592000">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.url_expiry_seconds} onChange={(e) => updateField('url_expiry_seconds', Number(e.target.value))} min={3600} max={2592000} step={3600} />
                <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>s</span>
              </div>
            </Field>
            <Field label="Max Image Download" hint="1048576 a 52428800">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.max_image_download_bytes} onChange={(e) => updateField('max_image_download_bytes', Number(e.target.value))} min={1048576} max={52428800} step={1048576} />
                <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>bytes</span>
              </div>
            </Field>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div style={cardStyle}>
          <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>Global Rules (Prompt Mestre)</h3>
          <textarea style={textareaStyle} rows={20} value={form.global_rules} onChange={(e) => updateField('global_rules', e.target.value)} />
          <div style={{ marginTop: 12 }}>
            <Field label="Global Rules Version">
              <input style={{ ...inputStyle, maxWidth: 300 }} value={form.global_rules_version} onChange={(e) => updateField('global_rules_version', e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {activeTab === 'direction' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ marginBottom: designTokens.space[7] }}>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>Moderna</h3>
            <textarea style={textareaStyle} rows={10} value={form.direction_moderna} onChange={(e) => updateField('direction_moderna', e.target.value)} />
          </div>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>Clean</h3>
            <textarea style={textareaStyle} rows={10} value={form.direction_clean} onChange={(e) => updateField('direction_clean', e.target.value)} />
          </div>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>Retail</h3>
            <textarea style={textareaStyle} rows={10} value={form.direction_retail} onChange={(e) => updateField('direction_retail', e.target.value)} />
          </div>
        </div>
      )}

      {activeTab === 'formats' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Formatos de Saida</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-5">
              <Field label="1:1 (1080x1080)">
                <textarea style={textareaStyle} rows={3} value={form.format_1_1} onChange={(e) => updateField('format_1_1', e.target.value)} />
              </Field>
              <Field label="4:5 (1080x1350)">
                <textarea style={textareaStyle} rows={3} value={form.format_4_5} onChange={(e) => updateField('format_4_5', e.target.value)} />
              </Field>
              <Field label="16:9 (1920x1080)">
                <textarea style={textareaStyle} rows={3} value={form.format_16_9} onChange={(e) => updateField('format_16_9', e.target.value)} />
              </Field>
              <Field label="9:16 (1080x1920)">
                <textarea style={textareaStyle} rows={3} value={form.format_9_16} onChange={(e) => updateField('format_9_16', e.target.value)} />
              </Field>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Versionamento</h3>
            <Field label="Prompt Version">
              <input style={{ ...inputStyle, maxWidth: 400 }} value={form.prompt_version} onChange={(e) => updateField('prompt_version', e.target.value)} />
            </Field>
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${monitorTheme.border}`, paddingTop: 16, marginTop: 8 }}>
        <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
          Ultima atualizacao: {form.updated_at ? new Date(form.updated_at).toLocaleString('pt-BR') : '—'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={handleReload} disabled={loading || saving} style={{ ...outlineButton, opacity: (loading || saving) ? 0.5 : 1 }}>
            <RefreshCw size={14} /> Recarregar
          </button>
          <button type="button" onClick={handleSave} disabled={!isDirty || saving} style={{ ...primaryButton, opacity: (!isDirty || saving) ? 0.5 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Salvando...' : 'Salvar Configuracoes'}
          </button>
        </div>
      </div>
    </MonitorLayout>
  )
}
