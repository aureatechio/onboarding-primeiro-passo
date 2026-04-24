import { useRef, useState } from 'react'
import { monitorTheme } from '../../theme'

const ACELERAI_BLUE = '#384ffe'
const DESTRUCTIVE = '#ff0058'
const SANS = "'Inter', system-ui, sans-serif"

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function LogoManager({
  activeLogoUrl,
  logoHistory = [],
  onUpload,
  onSetActive,
  onDelete,
  uploading = false,
  busyLogoId = '',
  error = null,
  readOnly = false,
}) {
  const fileRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [localFile, setLocalFile] = useState(null)

  function pick() {
    fileRef.current?.click()
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setLocalFile(file)
  }

  async function confirmUpload() {
    if (!localFile) return
    const res = await onUpload?.(localFile)
    if (res?.ok) {
      setPreviewUrl(null)
      setLocalFile(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function cancelPick() {
    setPreviewUrl(null)
    setLocalFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: 16,
          alignItems: 'center',
          padding: 12,
          borderRadius: 10,
          background: monitorTheme.cardElevatedBg,
          border: `1px solid ${monitorTheme.border}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 10,
            background: monitorTheme.controlBg,
            border: `1px dashed ${monitorTheme.borderStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {(previewUrl || activeLogoUrl) ? (
            <img
              src={previewUrl || activeLogoUrl}
              alt="Logo ativo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 11, color: monitorTheme.textMuted }}>sem logo</span>
          )}
        </div>

        <div>
          <div style={{ fontSize: 12, color: monitorTheme.textSecondary, marginBottom: 8 }}>
            {previewUrl
              ? `Preview: ${localFile?.name || ''} (${formatBytes(localFile?.size)})`
              : activeLogoUrl
              ? 'Logo ativo atual.'
              : 'Nenhum logo enviado.'}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/heic,image/heif,application/pdf"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />

          {!readOnly && !previewUrl ? (
            <button type="button" onClick={pick} style={primaryBtn}>
              {activeLogoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
          ) : !readOnly ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={confirmUpload} disabled={uploading} style={primaryBtn}>
                {uploading ? 'Enviando…' : 'Confirmar upload'}
              </button>
              <button type="button" onClick={cancelPick} disabled={uploading} style={ghostBtn}>
                Cancelar
              </button>
            </div>
          ) : null}

          {error && (
            <div style={{ marginTop: 8, fontSize: 11, color: DESTRUCTIVE }}>{error}</div>
          )}
          {!readOnly && (
            <div style={{ marginTop: 8, fontSize: 11, color: monitorTheme.textMuted }}>
              Maximo 5 MB. Formatos: PNG, JPG, WebP, SVG, PDF, HEIC/HEIF.
            </div>
          )}
        </div>
      </div>

      <LogoHistoryGallery
        entries={logoHistory}
        onSetActive={onSetActive}
        onDelete={onDelete}
        busyLogoId={busyLogoId}
        readOnly={readOnly}
      />
    </div>
  )
}

function LogoHistoryGallery({ entries, onSetActive, onDelete, busyLogoId, readOnly = false }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ fontSize: 12, color: monitorTheme.textMuted, fontFamily: SANS }}>
        Sem historico de logos ainda.
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: monitorTheme.textMuted,
          marginBottom: 10,
        }}
      >
        Historico ({entries.length})
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {entries.map((entry) => {
          const busy = busyLogoId === entry.id
          return (
            <div
              key={entry.id}
              style={{
                border: `1px solid ${entry.is_active ? ACELERAI_BLUE : monitorTheme.border}`,
                borderRadius: 10,
                padding: 8,
                background: monitorTheme.cardElevatedBg,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                position: 'relative',
              }}
            >
              {entry.is_active && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 999,
                    background: ACELERAI_BLUE,
                    color: '#fff',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  ATIVO
                </span>
              )}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  background: monitorTheme.controlBg,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {entry.logo_url ? (
                  <img
                    src={entry.logo_url}
                    alt={entry.original_filename || 'logo'}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: 10, color: monitorTheme.textMuted }}>sem preview</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: monitorTheme.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={entry.original_filename || entry.logo_path}
              >
                {entry.original_filename || entry.logo_path?.split('/').pop() || entry.id}
              </div>
              <div style={{ fontSize: 10, color: monitorTheme.textMuted }}>
                {formatDate(entry.uploaded_at)} · {formatBytes(entry.size_bytes)}
              </div>
              {!readOnly && (
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                {!entry.is_active && (
                  <button
                    type="button"
                    onClick={() => onSetActive?.(entry.id)}
                    disabled={busy}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: ACELERAI_BLUE,
                      border: `1px solid ${ACELERAI_BLUE}`,
                      borderRadius: 6,
                      padding: '4px 6px',
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: busy ? 'wait' : 'pointer',
                      fontFamily: SANS,
                    }}
                  >
                    {busy ? '…' : 'Ativar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete?.(entry.id)}
                  disabled={entry.is_active || busy}
                  title={entry.is_active ? 'Nao e possivel deletar o logo ativo' : 'Deletar'}
                  style={{
                    background: 'transparent',
                    color: entry.is_active ? monitorTheme.textMuted : DESTRUCTIVE,
                    border: `1px solid ${entry.is_active ? monitorTheme.border : DESTRUCTIVE}55`,
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11,
                    cursor: entry.is_active ? 'not-allowed' : busy ? 'wait' : 'pointer',
                    fontFamily: SANS,
                  }}
                >
                  ✕
                </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const primaryBtn = {
  background: ACELERAI_BLUE,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: SANS,
}
const ghostBtn = {
  background: 'transparent',
  color: monitorTheme.textPrimary,
  border: `1px solid ${monitorTheme.borderStrong}`,
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: SANS,
}
