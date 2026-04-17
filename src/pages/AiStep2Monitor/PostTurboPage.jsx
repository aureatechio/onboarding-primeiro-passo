import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, Zap, Download, RefreshCw, X, Loader2, ImagePlus } from 'lucide-react'
import MonitorLayout from './MonitorLayout'
import { monitorTheme, monitorRadius } from './theme'
import { ASPECT_RATIOS } from './constants'
import useGardenOptions from './useGardenOptions'
import { extractColorsFromImage } from '../../lib/color-extractor'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const FORMATS = Object.keys(ASPECT_RATIOS)
const POLL_INTERVAL = 3000
const MAX_COLORS = 5
const DIRECTIONS = [
  { value: 'moderna', label: 'Moderna' },
  { value: 'clean', label: 'Clean' },
  { value: 'retail', label: 'Retail' },
]

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

function ImageDropZone({ file, onFileChange, label, hint }) {
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) onFileChange(dropped)
  }, [onFileChange])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${monitorTheme.border}`,
        borderRadius: monitorRadius.lg,
        padding: file ? 16 : 32,
        textAlign: 'center',
        cursor: 'pointer',
        background: monitorTheme.cardMutedBg,
      }}
    >
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
          <img
            src={URL.createObjectURL(file)}
            alt="Preview"
            style={{ maxHeight: 80, maxWidth: 120, borderRadius: monitorRadius.sm, objectFit: 'cover' }}
          />
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: monitorTheme.textPrimary, margin: 0 }}>{file.name}</p>
            <p style={{ fontSize: 12, color: monitorTheme.textMuted, margin: '2px 0 0' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFileChange(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: monitorTheme.textMuted, padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <Upload size={28} style={{ color: monitorTheme.textMuted, marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: monitorTheme.textSecondary, margin: 0 }}>{label}</p>
          <p style={{ fontSize: 11, color: monitorTheme.textMuted, margin: '4px 0 0' }}>{hint}</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default function PostTurboPage() {
  const { celebrities, loading: optionsLoading } = useGardenOptions()

  // Form state
  const [file, setFile] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [format, setFormat] = useState('1:1')
  const [direction, setDirection] = useState('')
  const [prompt, setPrompt] = useState('')
  const [celebrityName, setCelebrityName] = useState('')

  // Logo + palette
  const [logoFile, setLogoFile] = useState(null)
  const [logoError, setLogoError] = useState(null)
  const [extractedColors, setExtractedColors] = useState([])
  const [customColors, setCustomColors] = useState([])
  const [extracting, setExtracting] = useState(false)
  const logoInputRef = useRef(null)

  // Product image
  const [productFile, setProductFile] = useState(null)
  const [productError, setProductError] = useState(null)

  // NanoBanana directions
  const [directions, setDirections] = useState({})
  const [loadingDirections, setLoadingDirections] = useState(true)

  // Async state
  const [phase, setPhase] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const pollingRef = useRef(null)

  // Load nanobanana directions on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-nanobanana-config`)
        const json = await res.json()
        if (!cancelled && json.success) {
          setDirections({
            moderna: json.data.direction_moderna || '',
            clean: json.data.direction_clean || '',
            retail: json.data.direction_retail || '',
          })
        }
      } catch {
        // Silent fail — directions will be empty
      } finally {
        if (!cancelled) setLoadingDirections(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // When direction changes, fill prompt with direction text
  const handleDirectionChange = (val) => {
    setDirection(val)
    if (val && directions[val]) {
      setPrompt(directions[val])
    }
  }

  const allColors = [...extractedColors, ...customColors]
  const isFormValid = file && direction && !fileError
  const isLoading = phase === 'submitting' || phase === 'polling'

  // File validation
  const validateFile = (f) => {
    if (!f) return null
    if (!ALLOWED_TYPES.includes(f.type)) return 'Tipo invalido. Use PNG, JPEG ou WebP.'
    if (f.size > MAX_IMAGE_SIZE) return 'Arquivo excede 15 MB.'
    return null
  }

  const handleFileChange = (f) => {
    setFileError(null)
    if (f) {
      const err = validateFile(f)
      if (err) { setFileError(err); return }
    }
    setFile(f)
  }

  const handleProductChange = (f) => {
    setProductError(null)
    if (f) {
      const err = validateFile(f)
      if (err) { setProductError(err); return }
    }
    setProductFile(f)
  }

  // Logo handling with color extraction
  const handleLogoChange = async (file) => {
    setLogoError(null)
    setExtractedColors([])
    if (!file) { setLogoFile(null); return }
    const err = validateFile(file)
    if (err) { setLogoError(err); return }
    setLogoFile(file)
    setExtracting(true)
    try {
      const colors = await extractColorsFromImage(file)
      setExtractedColors(colors || [])
    } catch { /* silent */ } finally {
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
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
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
      } catch { /* retry */ }
    }, POLL_INTERVAL)
  }

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return
    setPhase('submitting')
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('format', format)
      formData.append('direction', direction)
      if (prompt.trim()) formData.append('prompt', prompt.trim())
      if (celebrityName) formData.append('celebrity_name', celebrityName)
      if (logoFile) formData.append('logo', logoFile)
      if (productFile) formData.append('product_image', productFile)
      const palette = allColors.filter((c) => c !== '__temp__')
      if (palette.length > 0) formData.append('palette', JSON.stringify(palette))

      const res = await fetch(`${SUPABASE_URL}/functions/v1/post-turbo-generate`, {
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
      a.download = `post-turbo-${format.replace(':', 'x')}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(result.image_url, '_blank')
    }
  }

  const labelStyle = { fontSize: 12, fontWeight: 600, color: monitorTheme.textSecondary, marginBottom: 6, display: 'block' }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: monitorRadius.md,
    border: `1px solid ${monitorTheme.controlBorder}`, fontSize: 13,
    color: monitorTheme.controlText, background: monitorTheme.controlBg, boxSizing: 'border-box',
  }
  const halfRow = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }

  return (
    <MonitorLayout>
      <div style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: monitorTheme.textPrimary, marginBottom: 4 }}>
          Post Turbo
        </h1>
        <p style={{ fontSize: 14, color: monitorTheme.textSecondary, marginBottom: 24 }}>
          Turbine um post existente com direcao criativa, identidade visual e IA.
        </p>

        {(optionsLoading || loadingDirections) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: monitorTheme.textMuted, fontSize: 13 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando opcoes...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Imagem base */}
            <div>
              <label style={labelStyle}>Imagem base *</label>
              <ImageDropZone
                file={file}
                onFileChange={handleFileChange}
                label="Arraste uma imagem ou clique para selecionar"
                hint="PNG, JPEG ou WebP — max 15 MB"
              />
              {fileError && <p style={{ fontSize: 12, color: monitorTheme.failedText, marginTop: 4 }}>{fileError}</p>}
            </div>

            {/* Row: Direcao criativa + Formato */}
            <div style={halfRow}>
              <div>
                <label style={labelStyle}>Direcao criativa *</label>
                <select value={direction} onChange={(e) => handleDirectionChange(e.target.value)} style={inputStyle} disabled={isLoading}>
                  <option value="">Selecione...</option>
                  {DIRECTIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
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

            {/* Celebridade (opcional) */}
            <div>
              <label style={labelStyle}>Celebridade</label>
              <select value={celebrityName} onChange={(e) => setCelebrityName(e.target.value)} style={inputStyle} disabled={isLoading}>
                <option value="">Nenhuma (opcional)</option>
                {celebrities.map((c) => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>

            {/* Prompt (pre-preenchido pela direcao) */}
            <div>
              <label style={labelStyle}>Prompt {direction ? '' : '(selecione uma direcao criativa)'}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={direction ? 'Edite a direcao criativa ou adicione instrucoes...' : 'Selecione uma direcao criativa acima para pre-preencher'}
                rows={6}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                disabled={isLoading || !direction}
              />
            </div>

            {/* Logo + Paleta */}
            <div style={{
              padding: 16, borderRadius: monitorRadius.lg,
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
                    border: `1px solid ${monitorTheme.buttonSecondaryBorder}`,
                    background: monitorTheme.buttonSecondaryBg,
                    fontSize: 12, color: monitorTheme.buttonSecondaryText, cursor: 'pointer',
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
              {extracting && <p style={{ fontSize: 12, color: monitorTheme.textMuted, margin: '0 0 8px' }}>Extraindo cores...</p>}

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

            {/* Produto / imagem adicional */}
            <div>
              <label style={labelStyle}>Produto ou imagem adicional</label>
              <div style={{
                border: `2px dashed ${monitorTheme.border}`,
                borderRadius: monitorRadius.lg,
                padding: productFile ? 12 : 24,
                textAlign: 'center',
                cursor: 'pointer',
                background: monitorTheme.cardMutedBg,
              }}
                onClick={() => document.getElementById('product-input')?.click()}
              >
                {productFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                    <img
                      src={URL.createObjectURL(productFile)}
                      alt="Produto"
                      style={{ maxHeight: 60, maxWidth: 100, borderRadius: monitorRadius.sm, objectFit: 'cover' }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: monitorTheme.textPrimary, margin: 0 }}>{productFile.name}</p>
                      <p style={{ fontSize: 12, color: monitorTheme.textMuted, margin: '2px 0 0' }}>{(productFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProductFile(null); setProductError(null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: monitorTheme.textMuted, padding: 4 }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <ImagePlus size={24} style={{ color: monitorTheme.textMuted, marginBottom: 6 }} />
                    <p style={{ fontSize: 13, color: monitorTheme.textSecondary, margin: 0 }}>Imagem de produto ou referencia adicional (opcional)</p>
                    <p style={{ fontSize: 11, color: monitorTheme.textMuted, margin: '4px 0 0' }}>PNG, JPEG ou WebP — max 15 MB</p>
                  </>
                )}
                <input
                  id="product-input"
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => handleProductChange(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>
              {productError && <p style={{ fontSize: 12, color: monitorTheme.failedText, marginTop: 4 }}>{productError}</p>}
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 24px', borderRadius: monitorRadius.md, border: 'none',
                background: isFormValid && !isLoading ? monitorTheme.buttonDarkBg : monitorTheme.border,
                color: isFormValid && !isLoading ? monitorTheme.buttonDarkText : monitorTheme.textMuted,
                fontSize: 14, fontWeight: 600,
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
                  <Zap size={16} />
                  Turbo
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: monitorRadius.md,
                background: monitorTheme.dangerBg, border: `1px solid ${monitorTheme.dangerBorder}`,
                color: monitorTheme.dangerText, fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Result */}
            {result && (
              <div style={{
                padding: 16, borderRadius: monitorRadius.lg,
                border: `1px solid ${monitorTheme.border}`, background: monitorTheme.cardMutedBg,
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
                        border: `1px solid ${monitorTheme.buttonSecondaryBorder}`,
                        background: monitorTheme.buttonSecondaryBg,
                        fontSize: 12, color: monitorTheme.buttonSecondaryText, cursor: 'pointer',
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
                        border: `1px solid ${monitorTheme.buttonSecondaryBorder}`,
                        background: monitorTheme.buttonSecondaryBg,
                        fontSize: 12, color: monitorTheme.buttonSecondaryText, cursor: 'pointer',
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
                    width: '100%', maxHeight: 500, objectFit: 'contain',
                    borderRadius: monitorRadius.md, background: monitorTheme.cardElevatedBg,
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
