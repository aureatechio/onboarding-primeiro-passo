import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Loader2,
  Palette,
  RefreshCw,
  Save,
  Settings,
  FileText,
  Brush,
  Ratio,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  ScanText,
  HelpCircle,
} from 'lucide-react'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { monitorRadius, monitorTheme } from './theme'
import MonitorLayout from './MonitorLayout'
import FieldInfoModal from './components/FieldInfoModal'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'megazord'

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

const selectStyle = {
  ...inputStyle,
  maxWidth: 320,
  cursor: 'pointer',
}

const DIRECTION_MODE_OPTIONS = [
  { value: 'text', label: 'Apenas texto' },
  { value: 'both', label: 'Prompt + Imagem' },
  { value: 'image', label: 'Referencia Power' },
]

const SAFETY_PRESET_OPTIONS = [
  { value: 'default', label: 'Default (padrao Gemini)' },
  { value: 'relaxed', label: 'Relaxado (bloqueia apenas alto risco)' },
  { value: 'permissive', label: 'Permissivo (sem bloqueios)' },
  { value: 'strict', label: 'Estrito (bloqueia medio e acima)' },
]

const TOOLTIPS = {
  gemini_model_name: {
    title: 'Model Name',
    description:
      'Identificador do modelo Gemini usado para gerar imagens. Determina a qualidade, velocidade e capacidades disponiveis.',
    examples: [
      'gemini-2.0-flash-exp — modelo rapido e experimental, ideal para testes',
      'gemini-3-pro-image-preview — modelo mais recente com melhor qualidade de imagem',
    ],
  },
  gemini_api_base_url: {
    title: 'API Base URL',
    description:
      'URL base da API Gemini. Normalmente nao precisa ser alterada, a menos que use um proxy ou endpoint customizado.',
    examples: [
      'https://generativelanguage.googleapis.com — endpoint padrao da Google',
      'https://generativelanguage.googleapis.com/v1beta — versao beta com recursos mais recentes',
    ],
  },
  max_retries: {
    title: 'Max Retries',
    description:
      'Numero maximo de tentativas quando a geracao de imagem falha. Cada tentativa tem um delay progressivo (1s, 3s).',
    examples: [
      '0 — sem retentativas, falha imediata (util para debug)',
      '3 — tres tentativas com delays progressivos (recomendado para producao)',
    ],
  },
  worker_batch_size: {
    title: 'Worker Batch Size',
    description:
      'Quantas imagens sao geradas em paralelo por batch. Valores maiores sao mais rapidos mas consomem mais cota da API.',
    examples: [
      '2 — conservador, ideal para contas com baixa cota de API',
      '8 — agressivo, ideal para grandes campanhas com alta cota',
    ],
  },
  url_expiry_seconds: {
    title: 'URL Expiry',
    description:
      'Tempo de vida (em segundos) das URLs assinadas geradas para os workers de geracao. Nao afeta a preview no frontend (que usa 30min fixo).',
    examples: [
      '86400 — 24 horas (padrao, suficiente para a maioria dos jobs)',
      '604800 — 7 dias (para campanhas que demoram para processar)',
    ],
  },
  max_image_download_bytes: {
    title: 'Max Image Download',
    description:
      'Tamanho maximo (em bytes) de cada imagem de entrada (celebridade, logo, campanha). Imagens acima desse limite sao ignoradas.',
    examples: [
      '10485760 — 10 MB (padrao, cobre a maioria dos casos)',
      '31457280 — 30 MB (para imagens de altissima resolucao)',
    ],
  },
  temperature: {
    title: 'Temperature',
    description:
      'Controla a aleatoriedade da geracao. Valores baixos produzem resultados mais consistentes e previsiveis; valores altos geram mais variedade e criatividade.',
    examples: [
      '0.5 — mais previsivel e consistente (bom para identidade visual rigida)',
      '1.5 — mais criativo e variado (bom para explorar ideias diferentes)',
    ],
  },
  top_p: {
    title: 'Top P (Nucleus Sampling)',
    description:
      'Limiar de amostragem por probabilidade acumulada. O modelo considera apenas tokens cuja probabilidade somada atinge esse valor. Complementa a temperature.',
    examples: [
      '0.8 — mais focado, menos variedade nas saidas',
      '0.95 — equilibrio padrao entre qualidade e diversidade',
    ],
  },
  top_k: {
    title: 'Top K',
    description:
      'Numero maximo de tokens candidatos considerados a cada passo da geracao. Limita o pool de opcoes do modelo.',
    examples: [
      '10 — muito restrito, resultados mais previsiveis e seguros',
      '40 — padrao equilibrado entre diversidade e coerencia',
    ],
  },
  safety_preset: {
    title: 'Safety Settings',
    description:
      'Nivel de filtragem de conteudo da API Gemini. Define o quao agressivamente a API bloqueia conteudo potencialmente sensivel nas imagens geradas.',
    examples: [
      'Permissivo — sem bloqueios, ideal para criativos publicitarios que podem ter conteudo ousado',
      'Estrito — bloqueia medio e acima, ideal para marcas conservadoras ou conteudo infantil',
    ],
  },
  use_system_instruction: {
    title: 'System Instruction',
    description:
      'Quando ativado, o texto das Global Rules e enviado como "systemInstruction" separado na API Gemini, ao inves de embutido no corpo do prompt. O modelo trata system instructions com maior prioridade, o que pode melhorar a aderencia as regras.',
    examples: [
      'Desativado — Global Rules aparecem no inicio do prompt (comportamento atual)',
      'Ativado — Global Rules vao como systemInstruction, separando regras do conteudo criativo',
    ],
  },
  global_rules: {
    title: 'Global Rules',
    description:
      'Regras mestras de direcao artistica aplicadas a TODAS as geracoes. Define o papel do modelo, restricoes obrigatorias (Sacred Face), tipografia, paleta e portoes de qualidade.',
    examples: [
      'Regra Sacred Face — protege a imagem da celebridade contra alteracoes',
      'Regra Monochromatic Color — forca uso exclusivo da paleta da marca',
    ],
  },
  global_rules_version: {
    title: 'Global Rules Version',
    description:
      'Versionamento semantico das Global Rules. Usado para invalidar hashes de cache quando as regras mudam, forcando re-geracao dos criativos.',
    examples: [
      'v1.0.0 — versao inicial das regras',
      'v1.1.1 — apos ajuste na regra Sacred Face (collage technique)',
    ],
  },
  direction_mode: {
    title: 'Modo de Uso da IA',
    description:
      'Define como o modelo utiliza o prompt textual e a imagem de referencia ao gerar os criativos para esta direcao criativa.',
    examples: [
      'Apenas texto — modelo usa somente o prompt escrito como guia de estilo',
      'Prompt + Imagem — combina o prompt com uma imagem de referencia para guiar o estilo visual',
    ],
  },
  direction_text: {
    title: 'Prompt de Direcao Criativa',
    description:
      'Instrucoes especificas de estilo visual para esta categoria. Define background, posicionamento da celebridade, tipografia e mood reference.',
    examples: [
      'MODERNA: Background escuro, layout assimetrico, tipografia ultra-bold, vibe cinematic',
      'CLEAN: Background branco, editorial split 40/60, tipografia light com whitespace generoso',
    ],
  },
  direction_image: {
    title: 'Imagem de Referencia',
    description:
      'Imagem enviada junto com o prompt para guiar o estilo visual da geracao. O modelo imita a tecnica visual (vetor, 3D, colagem) mas usa a paleta da marca.',
    examples: [
      'Upload de poster Nike como referencia para direcao Moderna (fundo escuro, tipografia bold)',
      'Upload de anuncio Apple como referencia para direcao Clean (minimalismo, whitespace)',
    ],
  },
  format_instruction: {
    title: 'Instrucao de Formato',
    description:
      'Instrucoes especificas para o aspect ratio deste formato. Define layout, composicao e posicionamento de elementos para as dimensoes exatas.',
    examples: [
      '1:1 (1080x1080) — composicao centralizada, ideal para feed do Instagram',
      '9:16 (1080x1920) — vertical full, celebridade no topo, CTA no terco inferior',
    ],
  },
  prompt_version: {
    title: 'Prompt Version',
    description:
      'Versao do template de prompt. Mudancas invalidam hashes de cache e forcam re-geracao. Atualize ao alterar a estrutura do prompt.',
    examples: [
      'v1.0.0 — template inicial sem briefing AI',
      'v1.2.0 — template com suporte a briefing AI e insights por peca',
    ],
  },
}

const uploadCardStyle = {
  border: `1px dashed ${monitorTheme.borderStrong}`,
  borderRadius: monitorRadius.md,
  background: '#f8fafc',
  padding: '10px 12px',
}

const uploadActionStyle = {
  ...buttonBase,
  background: '#fff',
  color: monitorTheme.textPrimary,
  border: `1px solid ${monitorTheme.borderStrong}`,
  padding: '6px 12px',
  fontSize: 12,
}

const uploadMetaStyle = {
  ...TYPE.caption,
  color: monitorTheme.textMuted,
  marginTop: 8,
}

const previewStyle = {
  marginTop: 8,
  maxHeight: 120,
  borderRadius: 6,
  border: `1px solid ${monitorTheme.border}`,
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

function Field({ label, hint, children, tooltip }) {
  const [infoOpen, setInfoOpen] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={labelStyle}>{label}</label>
        {tooltip && (
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: monitorTheme.textMuted,
              display: 'inline-flex',
              alignItems: 'center',
              marginBottom: 4,
            }}
            aria-label={`Informacoes sobre ${label}`}
          >
            <HelpCircle size={14} />
          </button>
        )}
      </div>
      {hint && <p style={hintStyle}>{hint}</p>}
      {children}
      {tooltip && (
        <FieldInfoModal
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          title={tooltip.title || label}
          description={tooltip.description}
          examples={tooltip.examples}
        />
      )}
    </div>
  )
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ReferenceImageUpload({
  id,
  selectedFile,
  currentImageUrl,
  onSelectFile,
  onRemove,
  onReadImage,
  isReading,
}) {
  const hasImage = Boolean(selectedFile || currentImageUrl)
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null)

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
    <div style={{ marginTop: 2 }}>
      <div style={uploadCardStyle}>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <UploadCloud size={14} style={{ color: monitorTheme.textMuted, marginTop: 2 }} />
            <div>
              <p style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 2 }}>Imagem de referência</p>
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>PNG/JPG/WEBP • até 10MB</p>
            </div>
          </div>
          <label htmlFor={id} style={{ ...uploadActionStyle, cursor: 'pointer' }}>
            {hasImage ? 'Trocar imagem' : 'Selecionar imagem'}
          </label>
        </div>

        {selectedFile && (
          <div style={uploadMetaStyle}>
            <strong style={{ color: monitorTheme.textPrimary }}>Arquivo selecionado:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </div>
        )}
      </div>

      {currentImageUrl && !selectedFile && (
        <div style={{ marginTop: 8 }}>
          <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={12} />
            Imagem atual
          </p>
          <img src={currentImageUrl} alt="Referencia atual" style={previewStyle} />
        </div>
      )}

      {localPreviewUrl && (
        <div style={{ marginTop: 8 }}>
          <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ImageIcon size={12} />
            Prévia local
          </p>
          <img src={localPreviewUrl} alt="Previa local" style={previewStyle} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button type="button" style={{ ...outlineButton, opacity: !selectedFile || isReading ? 0.6 : 1 }} onClick={onReadImage} disabled={!selectedFile || isReading}>
          {isReading ? <Loader2 size={13} className="animate-spin" /> : <ScanText size={13} />}
          {isReading ? 'Lendo imagem...' : 'Ler imagem'}
        </button>
        {hasImage && (
          <button type="button" style={{ ...outlineButton }} onClick={onRemove}>
            <Trash2 size={13} />
            Remover imagem
          </button>
        )}
      </div>
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
  const [referenceFiles, setReferenceFiles] = useState({})
  const [removeReferenceImage, setRemoveReferenceImage] = useState({})
  const [readingByCategory, setReadingByCategory] = useState({})

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

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

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
      const hasFileChanges = Object.keys(referenceFiles).length > 0 || Object.keys(removeReferenceImage).length > 0
      let body = JSON.stringify(changed)
      const headers = {
        'Content-Type': 'application/json',
        'x-admin-password': ADMIN_PASSWORD,
      }

      if (hasFileChanges) {
        const formData = new FormData()
        for (const [key, value] of Object.entries(changed)) {
          if (value == null) continue
          formData.append(key, String(value))
        }
        for (const category of ['moderna', 'clean', 'retail']) {
          const file = referenceFiles[category]
          if (file) formData.append(`direction_${category}_image`, file)
          if (removeReferenceImage[category]) formData.append(`direction_${category}_remove_image`, 'true')
        }
        body = formData
        delete headers['Content-Type']
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/update-nanobanana-config`, {
        method: 'PATCH',
        headers,
        body,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        setSaving(false)
        return
      }
      setForm({ ...data.config })
      setOriginal({ ...data.config })
      setReferenceFiles({})
      setRemoveReferenceImage({})
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
    setReferenceFiles({})
    setRemoveReferenceImage({})
    fetchConfig()
  }

  const updateField = (key, value) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleReferenceFile = (category, file) => {
    setReferenceFiles((prev) => {
      const next = { ...prev }
      if (file) next[category] = file
      else delete next[category]
      return next
    })
    if (file) {
      setRemoveReferenceImage((prev) => ({ ...prev, [category]: false }))
    }
  }

  const markReferenceRemoval = (category) => {
    setReferenceFiles((prev) => {
      const next = { ...prev }
      delete next[category]
      return next
    })
    setRemoveReferenceImage((prev) => ({ ...prev, [category]: true }))
    setForm((prev) => prev ? {
      ...prev,
      [`direction_${category}_image_path`]: null,
      [`direction_${category}_image_url`]: null,
    } : prev)
  }

  const handleReadImage = async (category) => {
    const file = referenceFiles[category]
    if (!file) return

    setReadingByCategory((prev) => ({ ...prev, [category]: true }))
    setError(null)

    try {
      const formData = new FormData()
      formData.append('category', category)
      formData.append('image', file)

      const res = await fetch(`${SUPABASE_URL}/functions/v1/read-nanobanana-reference`, {
        method: 'POST',
        headers: { 'x-admin-password': ADMIN_PASSWORD },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao ler imagem')
      } else {
        const text = typeof data.direction_text === 'string' ? data.direction_text.trim() : ''
        if (!text) {
          setError('A leitura da imagem não retornou texto')
        } else {
          updateField(`direction_${category}`, text)
        }
      }
    } catch (err) {
      setError(err.message || 'Erro de conexao ao ler imagem')
    } finally {
      setReadingByCategory((prev) => ({ ...prev, [category]: false }))
    }
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
          <Field label="Model Name" tooltip={TOOLTIPS.gemini_model_name}>
            <input style={inputStyle} value={form.gemini_model_name} onChange={(e) => updateField('gemini_model_name', e.target.value)} />
          </Field>
          <Field label="API Base URL" tooltip={TOOLTIPS.gemini_api_base_url}>
            <input style={inputStyle} value={form.gemini_api_base_url} onChange={(e) => updateField('gemini_api_base_url', e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            <Field label="Max Retries" hint="0 a 10" tooltip={TOOLTIPS.max_retries}>
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.max_retries} onChange={(e) => updateField('max_retries', Number(e.target.value))} min={0} max={10} />
            </Field>
            <Field label="Worker Batch Size" hint="1 a 12" tooltip={TOOLTIPS.worker_batch_size}>
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.worker_batch_size} onChange={(e) => updateField('worker_batch_size', Number(e.target.value))} min={1} max={12} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            <Field label="URL Expiry" hint="3600 a 2592000" tooltip={TOOLTIPS.url_expiry_seconds}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.url_expiry_seconds} onChange={(e) => updateField('url_expiry_seconds', Number(e.target.value))} min={3600} max={2592000} step={3600} />
                <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>s</span>
              </div>
            </Field>
            <Field label="Max Image Download" hint="1048576 a 52428800" tooltip={TOOLTIPS.max_image_download_bytes}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.max_image_download_bytes} onChange={(e) => updateField('max_image_download_bytes', Number(e.target.value))} min={1048576} max={52428800} step={1048576} />
                <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>bytes</span>
              </div>
            </Field>
          </div>

          <h4 style={{ ...TYPE.bodySmall, fontWeight: 700, marginTop: 20, marginBottom: 12, borderTop: `1px solid ${monitorTheme.border}`, paddingTop: 16 }}>
            Parametros de Geracao (Gemini API)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5">
            <Field label="Temperature" hint="0.0 a 2.0" tooltip={TOOLTIPS.temperature}>
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.temperature ?? 1.0} onChange={(e) => updateField('temperature', parseFloat(e.target.value))} min={0} max={2} step={0.1} />
            </Field>
            <Field label="Top P" hint="0.0 a 1.0" tooltip={TOOLTIPS.top_p}>
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.top_p ?? 0.95} onChange={(e) => updateField('top_p', parseFloat(e.target.value))} min={0} max={1} step={0.05} />
            </Field>
            <Field label="Top K" hint="1 a 100" tooltip={TOOLTIPS.top_k}>
              <input type="number" style={{ ...numberInputStyle, width: '100%' }} value={form.top_k ?? 40} onChange={(e) => updateField('top_k', parseInt(e.target.value, 10))} min={1} max={100} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5">
            <Field label="Safety Settings" tooltip={TOOLTIPS.safety_preset}>
              <select style={selectStyle} value={form.safety_preset || 'default'} onChange={(e) => updateField('safety_preset', e.target.value)}>
                {SAFETY_PRESET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <Field label="System Instruction" tooltip={TOOLTIPS.use_system_instruction}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={form.use_system_instruction || false} onChange={(e) => updateField('use_system_instruction', e.target.checked)} />
                <span style={{ ...TYPE.bodySmall, color: monitorTheme.textSecondary }}>
                  Enviar Global Rules como systemInstruction
                </span>
              </label>
            </Field>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div style={cardStyle}>
          <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>Global Rules (Prompt Mestre)</h3>
          <Field label="Global Rules" tooltip={TOOLTIPS.global_rules}>
            <textarea style={textareaStyle} rows={20} value={form.global_rules} onChange={(e) => updateField('global_rules', e.target.value)} />
          </Field>
          <Field label="Global Rules Version" tooltip={TOOLTIPS.global_rules_version}>
            <input style={{ ...inputStyle, maxWidth: 300 }} value={form.global_rules_version} onChange={(e) => updateField('global_rules_version', e.target.value)} />
          </Field>
        </div>
      )}

      {activeTab === 'direction' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ marginBottom: designTokens.space[7] }}>
          {[
            { key: 'moderna', label: 'Moderna' },
            { key: 'clean', label: 'Clean' },
            { key: 'retail', label: 'Retail' },
          ].map(({ key, label }) => {
            const mode = form[`direction_${key}_mode`] || 'text'
            const showImageUpload = mode === 'both' || mode === 'image'
            return (
              <div key={key} style={cardStyle}>
                <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 12 }}>{label}</h3>
                <Field
                  label="Modo de uso da IA"
                  hint="Define como o modelo usa o prompt e a imagem de referência ao gerar os criativos."
                  tooltip={TOOLTIPS.direction_mode}
                >
                  <select
                    style={selectStyle}
                    value={mode}
                    onChange={(e) => updateField(`direction_${key}_mode`, e.target.value)}
                  >
                    {DIRECTION_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prompt de direção criativa" tooltip={TOOLTIPS.direction_text}>
                  <textarea
                    style={textareaStyle}
                    rows={8}
                    value={form[`direction_${key}`]}
                    onChange={(e) => updateField(`direction_${key}`, e.target.value)}
                  />
                </Field>
                {showImageUpload && (
                  <Field label="Imagem de referência (PNG/JPG/WEBP)" tooltip={TOOLTIPS.direction_image}>
                    <ReferenceImageUpload
                      id={`onboarding-ref-${key}`}
                      selectedFile={referenceFiles[key]}
                      currentImageUrl={form[`direction_${key}_image_url`]}
                      onSelectFile={(file) => handleReferenceFile(key, file)}
                      onRemove={() => markReferenceRemoval(key)}
                      onReadImage={() => handleReadImage(key)}
                      isReading={Boolean(readingByCategory[key])}
                    />
                  </Field>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'formats' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Formatos de Saida</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-5">
              <Field label="1:1 (1080x1080)" tooltip={TOOLTIPS.format_instruction}>
                <textarea style={textareaStyle} rows={3} value={form.format_1_1} onChange={(e) => updateField('format_1_1', e.target.value)} />
              </Field>
              <Field label="4:5 (1080x1350)" tooltip={TOOLTIPS.format_instruction}>
                <textarea style={textareaStyle} rows={3} value={form.format_4_5} onChange={(e) => updateField('format_4_5', e.target.value)} />
              </Field>
              <Field label="16:9 (1920x1080)" tooltip={TOOLTIPS.format_instruction}>
                <textarea style={textareaStyle} rows={3} value={form.format_16_9} onChange={(e) => updateField('format_16_9', e.target.value)} />
              </Field>
              <Field label="9:16 (1080x1920)" tooltip={TOOLTIPS.format_instruction}>
                <textarea style={textareaStyle} rows={3} value={form.format_9_16} onChange={(e) => updateField('format_9_16', e.target.value)} />
              </Field>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ ...TYPE.bodySmall, fontWeight: 700, marginBottom: 16 }}>Versionamento</h3>
            <Field label="Prompt Version" tooltip={TOOLTIPS.prompt_version}>
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
