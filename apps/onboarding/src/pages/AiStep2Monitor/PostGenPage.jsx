import { useState, useRef, useCallback, useMemo } from 'react'
import { Upload, Sparkles, Download, RefreshCw, X, Loader2 } from 'lucide-react'
import MonitorLayout from './MonitorLayout'
import { monitorTheme, monitorRadius } from './theme'
import { ASPECT_RATIOS } from './constants'
import useGardenOptions from './useGardenOptions'
import { extractColorsFromImage } from '../../lib/color-extractor'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const FORMATS = Object.keys(ASPECT_RATIOS)
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const POLL_INTERVAL = 3000
const MAX_COLORS = 5

function ColorSwatch({ color, onRemove, removable }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: color,
        border: `1px solid ${monitorTheme.border}`,
      }} />
      <span style={{ fontSize: 12, color: monitorTheme.textMuted, fontFamily: 'monospace' }}>{color}</span>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: monitorTheme.textMuted, padding: 2 }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

export default function PostGenPage() {
  const { celebrities, segments, subsegments, businesses, loading: optionsLoading } = useGardenOptions()

  // Form state
  const [celebrityName, setCelebrityName] = useState('')
  const [format, setFormat] = useState('1:1')
  const [segmentId, setSegmentId] = useState('')
  const [subsegmentId, setSubsegmentId] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [style, setStyle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [briefing, setBriefing] = useState('')

  // Logo + palette
  const [logoFile, setLogoFile] = useState(null)
  const [logoError, setLogoError] = useState(null)
  const [extractedColors, setExtractedColors] = useState([])
  const [customColors, setCustomColors] = useState([])
  const [extracting, setExtracting] = useState(false)
  const logoInputRef = useRef(null)

  // Async state
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const pollingRef = useRef(null)

  // Cascade filtering
  const filteredSubsegments = useMemo(
    () => segmentId ? subsegments.filter((s) => s.segmento_id === segmentId) : [],
    [segmentId, subsegments],
  )
  const filteredBusinesses = useMemo(
    () => segmentId && subsegmentId
      ? businesses.filter((b) => b.segmento_id === segmentId && b.subsegmento_id === subsegmentId)
      : [],
    [segmentId, subsegmentId, businesses],
  )

  // Reset dependents when parent changes
  const handleSegmentChange = (val) => {
    setSegmentId(val)
    setSubsegmentId('')
    setBusinessId('')
  }
  const handleSubsegmentChange = (val) => {
    setSubsegmentId(val)
    setBusinessId('')
  }

  // Resolve names from IDs
  const getSegmentName = () => segments.find((s) => s.id === segmentId)?.nome || ''
  const getSubsegmentName = () => subsegments.find((s) => s.id === subsegmentId)?.nome || ''
  const getBusinessName = () => businesses.find((b) => b.id === businessId)?.nome || ''

  const allColors = [...extractedColors, ...customColors]
  const isFormValid = celebrityName && format && segmentId && subsegmentId && businessId && style.trim() && prompt.trim()
  const isLoading = phase === 'submitting' || phase === 'polling'

  // Logo handling
  const handleLogoChange = async (file) => {
    setLogoError(null)
    setExtractedColors([])
    if (!file) {
      setLogoFile(null)
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setLogoError('Tipo invalido. Use PNG, JPEG ou WebP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setLogoError('Arquivo excede 15 MB.')
      return
    }
    setLogoFile(file)

    // Extract colors
    setExtracting(true)
    try {
      const colors = await extractColorsFromImage(file)
      setExtractedColors(colors || [])
    } catch {
      // Silently fail — palette is optional
    } finally {
      setExtracting(false)
    }
  }

  const handleAddColor = () => {
    if (allColors.length >= MAX_COLORS) return
    const input = document.createElement('input')
    input.type = 'color'
    input.value = '#E8356D'
    input.addEventListener('input', (e) => {
      setCustomColors((prev) => {
        const updated = prev.filter((c) => c !== '__temp__')
        return [...updated, e.target.value]
      })
    })
    input.click()
    setCustomColors((prev) => [...prev, '__temp__'])
  }

  const removeCustomColor = (idx) => {
    setCustomColors((prev) => prev.filter((_, i) => i !== idx))
  }

  // Polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPolling = (id) => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-garden-job?job_id=${id}`)
        const json = await res.json()
        if (!json.success) return
        const { status, output_image_url, duration_ms, error_code, error_message } = json.data
        if (status === 'completed') {
          stopPolling()
          setResult({ image_url: output_image_url, duration_ms, format })
          setPhase('completed')
        } else if (status === 'failed') {
          stopPolling()
          setError(`${error_code || 'ERRO'}: ${error_message || 'Falha na geracao.'}`)
          setPhase('failed')
        }
      } catch {
        // retry
      }
    }, POLL_INTERVAL)
  }

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return
    setPhase('submitting')
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('celebrity_name', celebrityName)
      formData.append('format', format)
      formData.append('segment', getSegmentName())
      formData.append('subsegment', getSubsegmentName())
      formData.append('business', getBusinessName())
      formData.append('style', style.trim())
      formData.append('prompt', prompt.trim())
      if (city.trim()) formData.append('city', city.trim())
      if (state.trim()) formData.append('state', state.trim())
      if (briefing.trim()) formData.append('briefing', briefing.trim())
      if (logoFile) formData.append('logo', logoFile)
      const palette = allColors.filter((c) => c !== '__temp__')
      if (palette.length > 0) formData.append('palette', JSON.stringify(palette))

      const res = await fetch(`${SUPABASE_URL}/functions/v1/post-gen-generate`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.message || 'Erro ao submeter.')
        setPhase('failed')
        return
      }

      setPhase('polling')
      startPolling(json.data.job_id)
    } catch {
      setError('Erro de conexao. Tente novamente.')
      setPhase('failed')
    }
  }

  const handleRetry = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    stopPolling()
  }

  const handleDownload = async () => {
    if (!result?.image_url) return
    try {
      const res = await fetch(result.image_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `post-gen-${format.replace(':', 'x')}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(result.image_url, '_blank')
    }
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: monitorTheme.textSecondary, marginBottom: 6, display: 'block' }
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: monitorRadius.md,
    border: `1px solid ${monitorTheme.border}`,
    fontSize: 13,
    color: monitorTheme.textPrimary,
    background: '#fff',
    boxSizing: 'border-box',
  }
  const halfRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

  return (
    <MonitorLayout>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: monitorTheme.textPrimary, marginBottom: 4 }}>
          Post Gen
        </h1>
        <p style={{ fontSize: 14, color: monitorTheme.textSecondary, marginBottom: 24 }}>
          Gere criativos do zero com prompt estruturado e paleta de cores.
        </p>

        {optionsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: monitorTheme.textMuted, fontSize: 13 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando opcoes...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Row: Celebridade + Formato */}
            <div style={halfRow}>
              <div>
                <label style={labelStyle}>Celebridade *</label>
                <select value={celebrityName} onChange={(e) => setCelebrityName(e.target.value)} style={inputStyle} disabled={isLoading}>
                  <option value="">Selecione...</option>
                  {celebrities.map((c) => (
                    <option key={c.id} value={c.nome}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Formato *</label>
                <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle} disabled={isLoading}>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Segmento + Subsegmento */}
            <div style={halfRow}>
              <div>
                <label style={labelStyle}>Segmento *</label>
                <select value={segmentId} onChange={(e) => handleSegmentChange(e.target.value)} style={inputStyle} disabled={isLoading}>
                  <option value="">Selecione...</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Subsegmento *</label>
                <select value={subsegmentId} onChange={(e) => handleSubsegmentChange(e.target.value)} style={inputStyle} disabled={isLoading || !segmentId}>
                  <option value="">Selecione...</option>
                  {filteredSubsegments.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Negocio + Estilo */}
            <div style={halfRow}>
              <div>
                <label style={labelStyle}>Negocio *</label>
                <select value={businessId} onChange={(e) => setBusinessId(e.target.value)} style={inputStyle} disabled={isLoading || !subsegmentId}>
                  <option value="">Selecione...</option>
                  {filteredBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Estilo *</label>
                <input
                  type="text"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Ex: moderno, minimalista..."
                  style={inputStyle}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label style={labelStyle}>Prompt *</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva o criativo que deseja gerar..."
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                disabled={isLoading}
              />
            </div>

            {/* Logo + Paleta */}
            <div style={{
              padding: 16,
              borderRadius: monitorRadius.lg,
              border: `1px solid ${monitorTheme.borderSoft}`,
              background: monitorTheme.cardMutedBg,
            }}>
              <label style={{ ...labelStyle, marginBottom: 12 }}>Logo + Paleta (opcional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: monitorRadius.sm,
                    border: `1px solid ${monitorTheme.border}`, background: '#fff',
                    fontSize: 12, color: monitorTheme.textSecondary, cursor: 'pointer',
                  }}
                  disabled={isLoading}
                >
                  <Upload size={13} />
                  {logoFile ? 'Trocar logo' : 'Upload logo'}
                </button>
                {logoFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={URL.createObjectURL(logoFile)} alt="Logo" style={{ height: 32, borderRadius: 4 }} />
                    <span style={{ fontSize: 12, color: monitorTheme.textMuted }}>{logoFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setExtractedColors([]) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: monitorTheme.textMuted }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>
              {logoError && <p style={{ fontSize: 12, color: monitorTheme.failedText, margin: '0 0 8px' }}>{logoError}</p>}
              {extracting && (
                <p style={{ fontSize: 12, color: monitorTheme.textMuted, margin: '0 0 8px' }}>
                  Extraindo cores...
                </p>
              )}

              {/* Color swatches */}
              {allColors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                  {extractedColors.map((c, i) => (
                    <ColorSwatch key={`ext-${i}`} color={c} removable={false} />
                  ))}
                  {customColors.filter((c) => c !== '__temp__').map((c, i) => (
                    <ColorSwatch key={`cust-${i}`} color={c} removable onRemove={() => removeCustomColor(i)} />
                  ))}
                </div>
              )}
              {allColors.filter((c) => c !== '__temp__').length < MAX_COLORS && (
                <button
                  type="button"
                  onClick={handleAddColor}
                  style={{
                    fontSize: 12, color: monitorTheme.textMuted, background: 'none',
                    border: `1px dashed ${monitorTheme.border}`, borderRadius: monitorRadius.sm,
                    padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  + Adicionar cor
                </button>
              )}
            </div>

            {/* Row: Cidade + Estado */}
            <div style={halfRow}>
              <div>
                <label style={labelStyle}>Cidade</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Opcional" style={inputStyle} disabled={isLoading} />
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="Opcional" style={inputStyle} disabled={isLoading} />
              </div>
            </div>

            {/* Briefing */}
            <div>
              <label style={labelStyle}>Briefing adicional</label>
              <textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                placeholder="Informacoes complementares para a geracao (opcional)"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                disabled={isLoading}
              />
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 24px',
                borderRadius: monitorRadius.md,
                border: 'none',
                background: isFormValid && !isLoading ? monitorTheme.buttonDarkBg : monitorTheme.border,
                color: isFormValid && !isLoading ? monitorTheme.buttonDarkText : monitorTheme.textMuted,
                fontSize: 14,
                fontWeight: 600,
                cursor: isFormValid && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  {phase === 'submitting' ? 'Enviando...' : 'Gerando imagem...'}
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Gerar imagem
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px',
                borderRadius: monitorRadius.md,
                background: monitorTheme.dangerBg,
                border: `1px solid ${monitorTheme.dangerBorder}`,
                color: monitorTheme.dangerText,
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div style={{
                padding: 16,
                borderRadius: monitorRadius.lg,
                border: `1px solid ${monitorTheme.border}`,
                background: monitorTheme.cardMutedBg,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: monitorTheme.completedText, margin: 0 }}>
                    Imagem gerada com sucesso
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleDownload}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: monitorRadius.sm,
                        border: `1px solid ${monitorTheme.border}`, background: '#fff',
                        fontSize: 12, color: monitorTheme.textSecondary, cursor: 'pointer',
                      }}
                    >
                      <Download size={13} /> Download
                    </button>
                    <button
                      type="button"
                      onClick={handleRetry}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', borderRadius: monitorRadius.sm,
                        border: `1px solid ${monitorTheme.border}`, background: '#fff',
                        fontSize: 12, color: monitorTheme.textSecondary, cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={13} /> Gerar novamente
                    </button>
                  </div>
                </div>
                <img
                  src={result.image_url}
                  alt="Imagem gerada"
                  style={{
                    width: '100%',
                    maxHeight: 500,
                    objectFit: 'contain',
                    borderRadius: monitorRadius.md,
                    background: '#fff',
                  }}
                />
                {result.duration_ms && (
                  <p style={{ fontSize: 11, color: monitorTheme.textMuted, marginTop: 8 }}>
                    Formato: {result.format} | Duracao: {(result.duration_ms / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </MonitorLayout>
  )
}
