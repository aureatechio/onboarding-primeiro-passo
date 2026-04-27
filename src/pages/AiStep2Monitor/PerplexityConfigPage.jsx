import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2,
  Brain,
  RefreshCw,
  Save,
  Settings,
  FileText,
  Tag,
  Eye,
  EyeOff,
  FlaskConical,
  Play,
  History,
  Sparkles,
} from 'lucide-react'
import { DashboardTabs } from '../../components/dashboard'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorRadius, monitorTheme } from './theme'
import MonitorLayout from './MonitorLayout'
import { adminFetch } from '../../lib/admin-edge'

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
  border: `1px solid ${monitorTheme.controlBorder}`,
  background: monitorTheme.controlBg,
  fontSize: 13,
  color: monitorTheme.controlText,
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
  background: monitorTheme.buttonSecondaryBg,
  color: monitorTheme.buttonSecondaryText,
  border: `1px solid ${monitorTheme.buttonSecondaryBorder}`,
}

const tableHeadStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: `1px solid ${monitorTheme.border}`,
  color: monitorTheme.textMuted,
  fontWeight: 600,
}

const tableCellStyle = {
  padding: '8px 10px',
  borderBottom: `1px solid ${monitorTheme.border}`,
  color: monitorTheme.textPrimary,
}

const TABS = [
  { id: 'provider', label: 'Provider & Parametros', icon: Settings },
  { id: 'prompts', label: 'Prompts', icon: FileText },
  { id: 'tests', label: 'Testes', icon: FlaskConical },
  { id: 'versioning', label: 'Versionamento', icon: Tag },
]

const REQUIRED_TEMPLATE_TOKENS = [
  '${company_name}',
  '${company_site}',
  '${celebrity_name}',
  '${insights_count}',
]

const REQUIRED_SUGGEST_TEMPLATE_TOKENS = [
  '${company_name}',
  '${company_site}',
  '${celebrity_name}',
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

export default function PerplexityConfigPage() {
  const [form, setForm] = useState(null)
  const [original, setOriginal] = useState(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [clearApiKey, setClearApiKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('provider')
  const [eligiblePurchases, setEligiblePurchases] = useState([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [testRunning, setTestRunning] = useState(false)
  const [testError, setTestError] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [testHistory, setTestHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverWarning, setDiscoverWarning] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState(null)
  const [testForm, setTestForm] = useState({
    compra_id: '',
    company_name: '',
    company_site: '',
    celebrity_name: '',
    segment: '',
    region: '',
    campaign_goal_hint: '',
    mode: 'text',
    text: '',
    instagram: '',
    linkedin: '',
    facebook: '',
  })

  const apiKeyWrapperStyle = {
    position: 'relative',
  }

  const apiKeyInputStyle = {
    ...inputStyle,
    paddingRight: 42,
  }

  const apiKeyToggleStyle = {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: monitorTheme.textMuted,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  }

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-perplexity-config`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao buscar configuracoes')
        setLoading(false)
        return
      }
      setForm({ ...data.config })
      setOriginal({ ...data.config })
      setApiKeyInput('')
      setClearApiKey(false)
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Erro de conexao')
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const fetchEligiblePurchases = useCallback(async () => {
    if (!SUPABASE_URL) return
    setLoadingEligible(true)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-ai-campaign-monitor?mode=list&page=1&limit=20`
      )
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar compras elegiveis.')
      }
      setEligiblePurchases(payload?.eligible_purchases || [])
    } catch (err) {
      console.error('[perplexity-config] fetch eligible purchases error:', err)
      setEligiblePurchases([])
    } finally {
      setLoadingEligible(false)
    }
  }, [])

  useEffect(() => {
    fetchEligiblePurchases()
  }, [fetchEligiblePurchases])

  const fetchTestHistory = useCallback(async (compraId) => {
    if (!SUPABASE_URL || !compraId) {
      setTestHistory([])
      return
    }
    setHistoryLoading(true)
    try {
      const query = new URLSearchParams({ compra_id: compraId, limit: '10' })
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/test-perplexity-briefing?${query.toString()}`
      )
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao carregar historico de testes.')
      }
      setTestHistory(payload?.runs || [])
    } catch (err) {
      console.error('[perplexity-config] fetch history error:', err)
      setTestHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const updateTestField = (key, value) => {
    setTestForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSelectCompra = async (compraId) => {
    updateTestField('compra_id', compraId)
    setTestError(null)
    setTestResult(null)
    if (!compraId || !SUPABASE_URL) {
      setTestHistory([])
      return
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-onboarding-data?compra_id=${encodeURIComponent(compraId)}`
      )
      const payload = await res.json()
      if (res.ok && payload?.success && payload?.data) {
        setTestForm((prev) => ({
          ...prev,
          compra_id: compraId,
          company_name: payload.data.clientName || prev.company_name,
          celebrity_name: payload.data.celebName || prev.celebrity_name,
          segment: payload.data.segmento || prev.segment,
          region: payload.data.praca || prev.region,
        }))
      }
    } catch (err) {
      console.warn('[perplexity-config] could not prefill onboarding data:', err)
    }

    fetchTestHistory(compraId)
  }

  const handleDiscoverSources = async () => {
    if (!SUPABASE_URL || testForm.company_name.trim().length < 2) return
    setDiscoverLoading(true)
    setDiscoverWarning(null)
    try {
      const body = {
        company_name: testForm.company_name.trim(),
        company_site: testForm.company_site.trim() || null,
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/discover-company-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao descobrir fontes.')
      }
      const d = payload.data
      setTestForm((prev) => ({
        ...prev,
        company_site: d.company_site && !prev.company_site ? d.company_site : prev.company_site,
        instagram: d.instagram || prev.instagram,
        linkedin: d.linkedin || prev.linkedin,
        facebook: d.facebook || prev.facebook,
      }))
      if (d.confidence !== 'high') {
        setDiscoverWarning(
          'Preenchimento parcial. Alguns perfis nao foram encontrados com alta confianca. Verifique os campos antes de executar o teste.'
        )
      }
    } catch (err) {
      setDiscoverWarning(err.message || 'Erro ao descobrir fontes. Preencha manualmente.')
    } finally {
      setDiscoverLoading(false)
    }
  }

  const handleSuggestBriefing = async () => {
    if (!SUPABASE_URL) return
    setSuggestLoading(true)
    setSuggestError(null)
    try {
      const sources = [
        testForm.company_site,
        testForm.instagram,
        testForm.linkedin,
        testForm.facebook,
      ].filter((s) => s && s.trim().length > 0)
      const body = {
        company_name: testForm.company_name.trim(),
        company_site: testForm.company_site.trim(),
        celebrity_name: testForm.celebrity_name.trim(),
        sources: sources.length > 0 ? sources : undefined,
        segment: testForm.segment.trim() || null,
        region: testForm.region.trim() || null,
        campaign_goal_hint: testForm.campaign_goal_hint || null,
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/suggest-briefing-seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao gerar sugestao.')
      }
      setTestForm((prev) => ({ ...prev, text: payload.data.text }))
    } catch (err) {
      const msg = err.message || 'Erro ao gerar sugestao de briefing.'
      setSuggestError(msg)
      setTimeout(() => setSuggestError(null), 5000)
    } finally {
      setSuggestLoading(false)
    }
  }

  const canRunTest = useMemo(() => {
    const hasRequiredStrings =
      testForm.compra_id &&
      testForm.company_name.trim().length >= 2 &&
      testForm.company_site.trim().length > 0 &&
      testForm.celebrity_name.trim().length >= 2

    if (!hasRequiredStrings) return false
    if (testForm.mode === 'text' || testForm.mode === 'both') {
      return testForm.text.trim().length >= 20
    }
    return true
  }, [testForm])

  const runPerplexityTest = async () => {
    if (!SUPABASE_URL || !canRunTest) return
    setTestRunning(true)
    setTestError(null)
    setTestResult(null)
    try {
      const body = {
        compra_id: testForm.compra_id,
        company_name: testForm.company_name.trim(),
        company_site: testForm.company_site.trim(),
        celebrity_name: testForm.celebrity_name.trim(),
        context: {
          segment: testForm.segment.trim() || null,
          region: testForm.region.trim() || null,
          campaign_goal_hint: testForm.campaign_goal_hint || null,
          sources: [
            testForm.company_site,
            testForm.instagram,
            testForm.linkedin,
            testForm.facebook,
          ].filter((s) => s && s.trim().length > 0),
        },
        briefing_input: {
          mode: testForm.mode,
          text:
            testForm.mode === 'text' || testForm.mode === 'both'
              ? testForm.text.trim()
              : null,
        },
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/test-perplexity-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Falha ao executar teste.')
      }
      setTestResult(payload)
      fetchTestHistory(testForm.compra_id)
    } catch (err) {
      setTestError(err.message || 'Erro ao executar teste.')
    } finally {
      setTestRunning(false)
    }
  }

  const isDirty = useMemo(() => {
    if (!form || !original) return false
    return (
      JSON.stringify(form) !== JSON.stringify(original) ||
      Boolean(apiKeyInput.trim()) ||
      clearApiKey
    )
  }, [form, original, apiKeyInput, clearApiKey])

  const handleSave = async () => {
    if (!isDirty || !form || !original) return
    const template = form.user_prompt_template || ''
    const missingTokens = REQUIRED_TEMPLATE_TOKENS.filter((token) => !template.includes(token))
    if (missingTokens.length > 0) {
      setError(
        `user_prompt_template invalido. Inclua os placeholders obrigatorios: ${missingTokens.join(', ')}`
      )
      return
    }
    if (!form.system_prompt || form.system_prompt.trim().length < 20) {
      setError('system_prompt invalido. Informe ao menos 20 caracteres.')
      return
    }
    const suggestSystemPrompt = form.suggest_system_prompt || ''
    if (!suggestSystemPrompt || suggestSystemPrompt.trim().length < 20) {
      setError('suggest_system_prompt invalido. Informe ao menos 20 caracteres.')
      return
    }
    const suggestTemplate = form.suggest_user_prompt_template || ''
    const missingSuggestTokens = REQUIRED_SUGGEST_TEMPLATE_TOKENS.filter(
      (token) => !suggestTemplate.includes(token)
    )
    if (missingSuggestTokens.length > 0) {
      setError(
        `suggest_user_prompt_template invalido. Inclua os placeholders obrigatorios: ${missingSuggestTokens.join(', ')}`
      )
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    const changed = {}
    for (const key of Object.keys(form)) {
      if (form[key] !== original[key]) changed[key] = form[key]
    }
    if (clearApiKey) {
      changed.api_key = ''
    } else if (apiKeyInput.trim()) {
      changed.api_key = apiKeyInput.trim()
    }
    try {
      const data = await adminFetch('update-perplexity-config', {
        method: 'PATCH',
        body: changed,
      })
      if (!data?.config) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }
      setForm({ ...data.config })
      setOriginal({ ...data.config })
      setApiKeyInput('')
      setClearApiKey(false)
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
        <div role="status" aria-live="polite" style={{ background: monitorTheme.completedBg, border: `1px solid ${monitorTheme.successBorder}`, borderRadius: monitorRadius.md, padding: 12, marginBottom: 16, fontSize: 13, color: monitorTheme.completedText }}>
          {success}
        </div>
      )}

      <DashboardTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} ariaLabel="Configurações do Perplexity" />

      {activeTab === 'provider' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
              <Field label="Modelo">
                <select style={selectStyle} value={form.model} onChange={(e) => updateField('model', e.target.value)}>
                  <option value="sonar">sonar</option>
                  <option value="sonar-pro">sonar-pro</option>
                  <option value="sonar-reasoning">sonar-reasoning</option>
                  <option value="sonar-reasoning-pro">sonar-reasoning-pro</option>
                </select>
              </Field>
              <Field label="Timeout" hint="1000 a 60000">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" style={numberInputStyle} value={form.timeout_ms} onChange={(e) => updateField('timeout_ms', Number(e.target.value))} min={1000} max={60000} step={1000} />
                  <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>ms</span>
                </div>
              </Field>
            </div>
            <Field label="API Base URL">
              <input style={inputStyle} value={form.api_base_url} onChange={(e) => updateField('api_base_url', e.target.value)} />
            </Field>
            <Field
              label="Perplexity API Key"
              hint="Salva no banco com prioridade sobre PERPLEXITY_API_KEY. Deixe vazio para manter sem alteracao."
            >
              <div style={apiKeyWrapperStyle}>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  style={apiKeyInputStyle}
                  value={apiKeyInput}
                  placeholder={form.api_key_hint || 'Digite uma nova API key'}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value)
                    if (clearApiKey) setClearApiKey(false)
                  }}
                />
                <button
                  type="button"
                  aria-label={showApiKey ? 'Ocultar API key' : 'Mostrar API key'}
                  onClick={() => setShowApiKey((prev) => !prev)}
                  style={apiKeyToggleStyle}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginTop: 6 }}>
                Fonte atual: {form.api_key_source || 'none'}
              </p>
              {form.api_key_source === 'database' ? (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('')
                    setClearApiKey(true)
                  }}
                  style={{ ...outlineButton, marginTop: 8, padding: '6px 10px', fontSize: 12 }}
                >
                  Limpar API key do banco
                </button>
              ) : null}
            </Field>
          </div>

          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Parametros de Geracao</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-5">
              <Field label="Temperature" hint="0 a 2">
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.temperature} onChange={(e) => updateField('temperature', Number(e.target.value))} min={0} max={2} step={0.1} />
              </Field>
              <Field label="Top P" hint="0 a 1">
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.top_p} onChange={(e) => updateField('top_p', Number(e.target.value))} min={0} max={1} step={0.1} />
              </Field>
              <Field label="Search Mode">
                <select style={{ ...selectStyle, width: '100%' }} value={form.search_mode} onChange={(e) => updateField('search_mode', e.target.value)}>
                  <option value="web">web</option>
                </select>
              </Field>
              <Field label="Search Recency">
                <select style={{ ...selectStyle, width: '100%' }} value={form.search_recency_filter} onChange={(e) => updateField('search_recency_filter', e.target.value)}>
                  <option value="hour">hour</option>
                  <option value="day">day</option>
                  <option value="week">week</option>
                  <option value="month">month</option>
                  <option value="year">year</option>
                </select>
              </Field>
              <Field label="Insights" hint="1 a 10">
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.insights_count} onChange={(e) => updateField('insights_count', Number(e.target.value))} min={1} max={10} />
              </Field>
            </div>
          </div>
        </>
      )}

      {activeTab === 'prompts' && (
        <div style={{ marginBottom: designTokens.space[7] }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ marginBottom: designTokens.space[5] }}>
            <div style={cardStyle}>
              <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>
                System Prompt (geracao principal)
              </h3>
              <textarea
                style={textareaStyle}
                rows={16}
                value={form.system_prompt}
                onChange={(e) => updateField('system_prompt', e.target.value)}
              />
            </div>
            <div style={cardStyle}>
              <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>
                User Prompt Template (geracao principal)
              </h3>
              <textarea
                style={textareaStyle}
                rows={16}
                value={form.user_prompt_template}
                onChange={(e) => updateField('user_prompt_template', e.target.value)}
              />
              <p style={{ ...hintStyle, marginTop: 8 }}>
                Placeholders:{' '}
                <code style={{ fontSize: 11 }}>
                  {'${company_name}'}, {'${company_site}'}, {'${celebrity_name}'}, {'${segment}'},{' '}
                  {'${region}'}, {'${goal}'}, {'${mode}'}, {'${brief}'}, {'${insights_count}'}
                </code>
              </p>
              <p style={{ ...hintStyle, marginTop: 6 }}>
                Obrigatorios para salvar:{' '}
                <code style={{ fontSize: 11 }}>
                  {'${company_name}'}, {'${company_site}'}, {'${celebrity_name}'},{' '}
                  {'${insights_count}'}
                </code>
              </p>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>
              Prompt de Sugestao de Texto (botao \"Sugerir texto\")
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <p style={{ ...TYPE.bodySmall, fontWeight: 600, color: monitorTheme.textPrimary, marginBottom: 8 }}>
                  Suggest System Prompt
                </p>
                <textarea
                  style={textareaStyle}
                  rows={10}
                  value={form.suggest_system_prompt || ''}
                  onChange={(e) => updateField('suggest_system_prompt', e.target.value)}
                />
              </div>
              <div>
                <p style={{ ...TYPE.bodySmall, fontWeight: 600, color: monitorTheme.textPrimary, marginBottom: 8 }}>
                  Suggest User Prompt Template
                </p>
                <textarea
                  style={textareaStyle}
                  rows={10}
                  value={form.suggest_user_prompt_template || ''}
                  onChange={(e) => updateField('suggest_user_prompt_template', e.target.value)}
                />
                <p style={{ ...hintStyle, marginTop: 8 }}>
                  Placeholders:{' '}
                  <code style={{ fontSize: 11 }}>
                    {'${company_name}'}, {'${company_site}'}, {'${celebrity_name}'}, {'${segment}'},{' '}
                    {'${region}'}, {'${campaign_goal_hint}'}, {'${segment_line}'},{' '}
                    {'${region_line}'}, {'${goal_line}'}, {'${sources_line}'}
                  </code>
                </p>
                <p style={{ ...hintStyle, marginTop: 6 }}>
                  Obrigatorios para salvar:{' '}
                  <code style={{ fontSize: 11 }}>
                    {'${company_name}'}, {'${company_site}'}, {'${celebrity_name}'}
                  </code>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5" style={{ marginTop: designTokens.space[5] }}>
              <Field label="Suggest Prompt Version">
                <input
                  style={inputStyle}
                  value={form.suggest_prompt_version || ''}
                  onChange={(e) => updateField('suggest_prompt_version', e.target.value)}
                />
              </Field>
              <Field label="Suggest Strategy Version">
                <input
                  style={inputStyle}
                  value={form.suggest_strategy_version || ''}
                  onChange={(e) => updateField('suggest_strategy_version', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 14 }}>Entrada do teste</h3>

            <Field
              label="Compra elegivel (paga + contrato assinado)"
              hint="Reutiliza as compras elegiveis do monitor. Campos faltantes podem ser preenchidos manualmente."
            >
              <select
                style={{ ...selectStyle, width: '100%' }}
                value={testForm.compra_id}
                onChange={(e) => handleSelectCompra(e.target.value)}
                disabled={loadingEligible}
              >
                <option value="">
                  {loadingEligible
                    ? 'Carregando compras elegiveis...'
                    : 'Selecione uma compra elegivel'}
                </option>
                {eligiblePurchases.map((purchase) => (
                  <option key={purchase.compra_id} value={purchase.compra_id}>
                    {purchase.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
              <Field label="Nome da empresa" hint="Obrigatorio">
                <input
                  style={inputStyle}
                  value={testForm.company_name}
                  onChange={(e) => updateTestField('company_name', e.target.value)}
                />
              </Field>
              <Field label="Site da empresa" hint="Obrigatorio (http/https)">
                <input
                  style={inputStyle}
                  placeholder="https://empresa.com.br"
                  value={testForm.company_site}
                  onChange={(e) => updateTestField('company_site', e.target.value)}
                />
              </Field>
            </div>

            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={handleDiscoverSources}
                disabled={discoverLoading || testForm.company_name.trim().length < 2}
                style={{
                  ...outlineButton,
                  opacity: discoverLoading || testForm.company_name.trim().length < 2 ? 0.5 : 1,
                  fontSize: 12,
                  padding: '6px 12px',
                }}
              >
                {discoverLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                {discoverLoading ? 'Buscando fontes...' : 'Auto preencher fontes'}
              </button>
            </div>

            {discoverWarning && (
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FCD34D',
                  borderRadius: monitorRadius.md,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#92400E',
                  marginBottom: 12,
                }}
              >
                {discoverWarning}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5">
              <Field label="Instagram (opcional)">
                <input
                  style={inputStyle}
                  placeholder="https://instagram.com/marca"
                  value={testForm.instagram}
                  onChange={(e) => updateTestField('instagram', e.target.value)}
                />
              </Field>
              <Field label="LinkedIn (opcional)">
                <input
                  style={inputStyle}
                  placeholder="https://linkedin.com/company/marca"
                  value={testForm.linkedin}
                  onChange={(e) => updateTestField('linkedin', e.target.value)}
                />
              </Field>
              <Field label="Facebook (opcional)">
                <input
                  style={inputStyle}
                  placeholder="https://facebook.com/marca"
                  value={testForm.facebook}
                  onChange={(e) => updateTestField('facebook', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
              <Field label="Celebridade" hint="Obrigatorio">
                <input
                  style={inputStyle}
                  value={testForm.celebrity_name}
                  onChange={(e) => updateTestField('celebrity_name', e.target.value)}
                />
              </Field>
              <Field label="Objetivo sugerido (opcional)">
                <select
                  style={selectStyle}
                  value={testForm.campaign_goal_hint}
                  onChange={(e) => updateTestField('campaign_goal_hint', e.target.value)}
                >
                  <option value="">Nao definido</option>
                  <option value="awareness">awareness</option>
                  <option value="conversao">conversao</option>
                  <option value="retencao">retencao</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
              <Field label="Segmento (opcional)">
                <input
                  style={inputStyle}
                  value={testForm.segment}
                  onChange={(e) => updateTestField('segment', e.target.value)}
                />
              </Field>
              <Field label="Regiao (opcional)">
                <input
                  style={inputStyle}
                  value={testForm.region}
                  onChange={(e) => updateTestField('region', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
              <Field label="Modo do briefing">
                <select
                  style={selectStyle}
                  value={testForm.mode}
                  onChange={(e) => updateTestField('mode', e.target.value)}
                >
                  <option value="text">text</option>
                  <option value="audio">audio</option>
                  <option value="both">both</option>
                </select>
              </Field>
            </div>

            {(testForm.mode === 'text' || testForm.mode === 'both') && (
              <Field
                label="Briefing textual"
                hint="Obrigatorio para modo text/both (recomendado minimo 20 caracteres para teste operacional)."
              >
                <div style={{ marginBottom: 6 }}>
                  <button
                    type="button"
                    onClick={handleSuggestBriefing}
                    disabled={
                      suggestLoading ||
                      testForm.company_name.trim().length < 2 ||
                      testForm.company_site.trim().length < 1 ||
                      testForm.celebrity_name.trim().length < 2
                    }
                    style={{
                      ...outlineButton,
                      opacity:
                        suggestLoading ||
                        testForm.company_name.trim().length < 2 ||
                        testForm.company_site.trim().length < 1 ||
                        testForm.celebrity_name.trim().length < 2
                          ? 0.5
                          : 1,
                      fontSize: 12,
                      padding: '5px 10px',
                    }}
                  >
                    {suggestLoading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {suggestLoading ? 'Gerando sugestao...' : 'Sugerir texto'}
                  </button>
                </div>
                <textarea
                  style={textareaStyle}
                  rows={6}
                  value={testForm.text}
                  onChange={(e) => updateTestField('text', e.target.value)}
                />
                {suggestError && (
                  <p
                    style={{
                      ...TYPE.caption,
                      color: monitorTheme.dangerTextStrong,
                      marginTop: 4,
                    }}
                  >
                    {suggestError}
                  </p>
                )}
              </Field>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="button"
                onClick={runPerplexityTest}
                disabled={!canRunTest || testRunning}
                style={{ ...primaryButton, opacity: !canRunTest || testRunning ? 0.5 : 1 }}
              >
                {testRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {testRunning ? 'Executando...' : 'Executar teste'}
              </button>
            </div>
          </div>

          {testError && (
            <div
              style={{
                background: monitorTheme.dangerBg,
                border: `1px solid ${monitorTheme.dangerBorder}`,
                borderRadius: monitorRadius.md,
                padding: 12,
                marginBottom: 16,
                fontSize: 13,
                color: monitorTheme.dangerTextStrong,
              }}
            >
              {testError}
            </div>
          )}

          {testResult && (
            <div style={cardStyle}>
              <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>
                Saida do teste
              </h3>
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginBottom: 10 }}>
                Run ID: {testResult.run_id || '—'} | Duracao: {testResult.duration_ms ?? 0} ms
              </p>
              <textarea
                style={textareaStyle}
                rows={16}
                readOnly
                value={JSON.stringify(testResult.data, null, 2)}
              />
            </div>
          )}

          <div style={cardStyle}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
            >
              <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <History size={14} />
                Historico de testes
              </h3>
              <button
                type="button"
                onClick={() => fetchTestHistory(testForm.compra_id)}
                disabled={!testForm.compra_id || historyLoading}
                style={{ ...outlineButton, padding: '6px 10px', fontSize: 12 }}
              >
                {historyLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Atualizar
              </button>
            </div>

            {!testForm.compra_id ? (
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
                Selecione uma compra para visualizar o historico.
              </p>
            ) : testHistory.length === 0 ? (
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
                Nenhum teste registrado para essa compra.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: monitorTheme.cardMutedBg }}>
                      <th style={tableHeadStyle}>Criado em</th>
                      <th style={tableHeadStyle}>Status</th>
                      <th style={tableHeadStyle}>Modelo</th>
                      <th style={tableHeadStyle}>Duracao</th>
                      <th style={tableHeadStyle}>Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testHistory.map((run) => (
                      <tr key={run.id}>
                        <td style={tableCellStyle}>
                          {run.created_at
                            ? new Date(run.created_at).toLocaleString('pt-BR')
                            : '—'}
                        </td>
                        <td style={tableCellStyle}>{run.status || '—'}</td>
                        <td style={tableCellStyle}>{run.provider_model || '—'}</td>
                        <td style={tableCellStyle}>{run.duration_ms ?? 0} ms</td>
                        <td style={tableCellStyle}>{run.error_code || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'versioning' && (
        <div style={cardStyle}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5">
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
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${monitorTheme.border}`, paddingTop: 16, marginTop: 8 }}>
        <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
          Última atualização: {form.updated_at ? new Date(form.updated_at).toLocaleString('pt-BR') : '—'}
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
