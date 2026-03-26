import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Brain, RefreshCw, Save, Lock } from 'lucide-react'
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
  width: 140,
}

const textareaStyle = {
  ...inputStyle,
  fontFamily: 'monospace',
  fontSize: 12,
  resize: 'vertical',
  lineHeight: 1.5,
}

const selectStyle = {
  ...inputStyle,
  width: 200,
  cursor: 'pointer',
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

const passwordButton = {
  ...buttonBase,
  background: monitorTheme.brand,
  color: '#fff',
  width: '100%',
  justifyContent: 'center',
  padding: '10px 16px',
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {hint && <p style={hintStyle}>{hint}</p>}
      {children}
    </div>
  )
}

export default function PerplexityConfigPage() {
  const [password, setPassword] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState(null)
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchConfig = useCallback(async (pw) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-perplexity-config`, {
        method: 'GET',
        headers: { 'x-admin-password': pw },
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.code === 'UNAUTHORIZED' ? 'Senha incorreta' : data.error || 'Erro ao buscar')
        setLoading(false)
        return false
      }
      setConfig(data.config)
      setForm({ ...data.config })
      setOriginal({ ...data.config })
      setLoading(false)
      return true
    } catch (err) {
      setError(err.message || 'Erro de conexao')
      setLoading(false)
      return false
    }
  }, [])

  const handleLogin = async () => {
    const ok = await fetchConfig(password)
    if (ok) setAuthenticated(true)
  }

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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-perplexity-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(changed),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }
      setConfig(data.config)
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
    fetchConfig(password)
  }

  const updateField = (key, value) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  if (!authenticated) {
    return (
      <MonitorLayout>
        <div style={{ maxWidth: 400 }}>
          <h2 style={{ ...TYPE.h2, color: monitorTheme.textPrimary, marginBottom: 8 }}>
            Configuracoes do Perplexity
          </h2>
          <p style={{ ...TYPE.bodySmall, color: monitorTheme.textMuted, marginBottom: 24 }}>
            Acesso protegido. Informe a senha de administrador.
          </p>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Lock size={16} />
              <span style={{ ...TYPE.bodySmall, fontWeight: 700 }}>Autenticacao</span>
            </div>
            <Field label="Senha de admin">
              <input
                type="password"
                style={inputStyle}
                placeholder="Digite a senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && password && !loading) handleLogin() }}
                disabled={loading}
                autoFocus
              />
            </Field>
            {error && (
              <div style={{ background: monitorTheme.dangerBg, border: `1px solid ${monitorTheme.dangerBorder}`, borderRadius: monitorRadius.md, padding: 10, marginBottom: 12, fontSize: 13, color: monitorTheme.dangerTextStrong }}>
                {error}
              </div>
            )}
            <button type="button" onClick={handleLogin} disabled={!password || loading} style={{ ...passwordButton, opacity: (!password || loading) ? 0.5 : 1 }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Verificando...' : 'Acessar Configuracoes'}
            </button>
          </div>
        </div>
      </MonitorLayout>
    )
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
            <Brain size={22} />
            Configuracoes do Perplexity
          </h2>
          <p style={{ ...TYPE.bodySmall, color: monitorTheme.textMuted, marginTop: 4 }}>
            Gerencie os parametros do provider Perplexity/Sonar para geracao de briefing.
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={cardStyle}>
          <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Provider</h3>
          <Field label="Modelo">
            <select style={selectStyle} value={form.model} onChange={(e) => updateField('model', e.target.value)}>
              <option value="sonar">sonar</option>
              <option value="sonar-pro">sonar-pro</option>
              <option value="sonar-reasoning">sonar-reasoning</option>
              <option value="sonar-reasoning-pro">sonar-reasoning-pro</option>
            </select>
          </Field>
          <Field label="API Base URL">
            <input style={inputStyle} value={form.api_base_url} onChange={(e) => updateField('api_base_url', e.target.value)} />
          </Field>
          <Field label="Timeout" hint="1000 a 60000">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" style={numberInputStyle} value={form.timeout_ms} onChange={(e) => updateField('timeout_ms', Number(e.target.value))} min={1000} max={60000} step={1000} />
              <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>ms</span>
            </div>
          </Field>
        </div>

        <div style={cardStyle}>
          <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Parametros de Geracao</h3>
          <Field label="Temperature" hint="0 a 2">
            <input type="number" style={numberInputStyle} value={form.temperature} onChange={(e) => updateField('temperature', Number(e.target.value))} min={0} max={2} step={0.1} />
          </Field>
          <Field label="Top P" hint="0 a 1">
            <input type="number" style={numberInputStyle} value={form.top_p} onChange={(e) => updateField('top_p', Number(e.target.value))} min={0} max={1} step={0.1} />
          </Field>
          <Field label="Search Mode">
            <select style={selectStyle} value={form.search_mode} onChange={(e) => updateField('search_mode', e.target.value)}>
              <option value="web">web</option>
            </select>
          </Field>
          <Field label="Search Recency Filter">
            <select style={selectStyle} value={form.search_recency_filter} onChange={(e) => updateField('search_recency_filter', e.target.value)}>
              <option value="hour">hour</option>
              <option value="day">day</option>
              <option value="week">week</option>
              <option value="month">month</option>
              <option value="year">year</option>
            </select>
          </Field>
          <Field label="Insights Count" hint="1 a 10">
            <input type="number" style={numberInputStyle} value={form.insights_count} onChange={(e) => updateField('insights_count', Number(e.target.value))} min={1} max={10} />
          </Field>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>System Prompt</h3>
        <textarea style={textareaStyle} rows={6} value={form.system_prompt} onChange={(e) => updateField('system_prompt', e.target.value)} />
      </div>

      <div style={cardStyle}>
        <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>User Prompt Template</h3>
        <textarea style={textareaStyle} rows={10} value={form.user_prompt_template} onChange={(e) => updateField('user_prompt_template', e.target.value)} />
        <p style={{ ...hintStyle, marginTop: 8 }}>
          Placeholders: <code style={{ fontSize: 11 }}>{'${company_name}'}, {'${company_site}'}, {'${celebrity_name}'}, {'${segment}'}, {'${region}'}, {'${goal}'}, {'${mode}'}, {'${brief}'}, {'${insights_count}'}</code>
        </p>
      </div>

      <div style={{ ...cardStyle, maxWidth: 500 }}>
        <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Versionamento</h3>
        <Field label="Prompt Version">
          <input style={inputStyle} value={form.prompt_version} onChange={(e) => updateField('prompt_version', e.target.value)} />
        </Field>
        <Field label="Strategy Version">
          <input style={inputStyle} value={form.strategy_version} onChange={(e) => updateField('strategy_version', e.target.value)} />
        </Field>
        <Field label="Contract Version">
          <input style={inputStyle} value={form.contract_version} onChange={(e) => updateField('contract_version', e.target.value)} />
        </Field>
      </div>

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
