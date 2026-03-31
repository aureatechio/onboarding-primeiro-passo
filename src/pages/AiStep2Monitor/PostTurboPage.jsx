import { useState, useRef, useCallback } from 'react'
import { Upload, Zap, Download, RefreshCw, X, Loader2 } from 'lucide-react'
import MonitorLayout from './MonitorLayout'
import { monitorTheme, monitorRadius } from './theme'
import { ASPECT_RATIOS } from './constants'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const FORMATS = Object.keys(ASPECT_RATIOS)
const POLL_INTERVAL = 3000

function ImageDropZone({ file, onFileChange }) {
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const dropped = e.dataTransfer?.files?.[0]
    if (dropped) onFileChange(dropped)
  }, [onFileChange])

  const handleDragOver = (e) => e.preventDefault()

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${monitorTheme.border}`,
        borderRadius: monitorRadius.lg,
        padding: 32,
        textAlign: 'center',
        cursor: 'pointer',
        background: monitorTheme.cardMutedBg,
        position: 'relative',
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
            <p style={{ fontSize: 13, fontWeight: 600, color: monitorTheme.textPrimary }}>{file.name}</p>
            <p style={{ fontSize: 12, color: monitorTheme.textMuted }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
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
          <p style={{ fontSize: 13, color: monitorTheme.textSecondary, margin: 0 }}>
            Arraste uma imagem ou clique para selecionar
          </p>
          <p style={{ fontSize: 11, color: monitorTheme.textMuted, margin: '4px 0 0' }}>
            PNG, JPEG ou WebP — max 15 MB
          </p>
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
  const [file, setFile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [format, setFormat] = useState('1:1')
  const [phase, setPhase] = useState('idle') // idle | submitting | polling | completed | failed
  const [jobId, setJobId] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [fileError, setFileError] = useState(null)
  const pollingRef = useRef(null)

  const isFormValid = file && prompt.trim() && !fileError
  const isLoading = phase === 'submitting' || phase === 'polling'

  const handleFileChange = (f) => {
    setFileError(null)
    if (f) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setFileError('Tipo invalido. Use PNG, JPEG ou WebP.')
        return
      }
      if (f.size > MAX_IMAGE_SIZE) {
        setFileError('Arquivo excede 15 MB.')
        return
      }
    }
    setFile(f)
  }

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
        // Ignora erros de polling, tenta novamente no proximo intervalo
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
      formData.append('image', file)
      formData.append('prompt', prompt.trim())
      formData.append('format', format)

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

      setJobId(json.data.job_id)
      setPhase('polling')
      startPolling(json.data.job_id)
    } catch (err) {
      setError('Erro de conexao. Tente novamente.')
      setPhase('failed')
    }
  }

  const handleRetry = () => {
    setPhase('idle')
    setResult(null)
    setError(null)
    setJobId(null)
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
      // fallback: abrir em nova aba
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

  return (
    <MonitorLayout>
      <div style={{ maxWidth: 680 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: monitorTheme.textPrimary, marginBottom: 4 }}>
          Post Turbo
        </h1>
        <p style={{ fontSize: 14, color: monitorTheme.textSecondary, marginBottom: 24 }}>
          Anexe uma imagem existente e gere uma versao turbinada com IA.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upload */}
          <div>
            <label style={labelStyle}>Imagem base *</label>
            <ImageDropZone file={file} onFileChange={handleFileChange} />
            {fileError && <p style={{ fontSize: 12, color: monitorTheme.failedText, marginTop: 4 }}>{fileError}</p>}
          </div>

          {/* Formato */}
          <div>
            <label style={labelStyle}>Formato *</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle} disabled={isLoading}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Prompt */}
          <div>
            <label style={labelStyle}>Prompt *</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva as melhorias desejadas na imagem..."
              rows={4}
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
                <Zap size={16} />
                Turbo
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
