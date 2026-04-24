import { useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import { COLORS } from '../../theme/colors'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'

/**
 * PublishDialog — Modal for publishing copy changes to Supabase.
 * Collects optional notes; admin permission comes from the logged-in JWT.
 */
export default function PublishDialog({
  isOpen,
  onClose,
  onPublish,
  dirtyEtapas,
  publishStatus,
  publishError,
}) {
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const isPublishing = publishStatus === 'publishing'
  const isSuccess = publishStatus === 'success'
  const dirtyList = [...dirtyEtapas]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isPublishing) return
    onPublish('', notes.trim())
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPublishing) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: monitorTheme.pageBg,
          borderRadius: monitorRadius.lg,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${monitorTheme.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} color={COLORS.red} />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: monitorTheme.textPrimary }}>
              Publicar alterações
            </h3>
          </div>
          {!isPublishing && (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `1px solid ${monitorTheme.border}`,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} color={monitorTheme.textMuted} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Changed etapas */}
          {dirtyList.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: monitorTheme.textMuted,
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: '0 0 8px 0',
                }}
              >
                ETAPAS ALTERADAS
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {dirtyList.map((id) => (
                  <span
                    key={id}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: `${COLORS.accent}15`,
                      color: COLORS.accent,
                      border: `1px solid ${COLORS.accent}30`,
                      borderRadius: 6,
                      padding: '2px 8px',
                    }}
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: monitorTheme.textSecondary,
                marginBottom: 6,
              }}
            >
              <FileText size={12} />
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descreva o que foi alterado..."
              disabled={isPublishing}
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${monitorTheme.border}`,
                fontSize: 13,
                outline: 'none',
                resize: 'vertical',
                background: monitorTheme.pageBg,
                color: monitorTheme.textPrimary,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {publishError && (
            <div
              style={{
                background: `${COLORS.danger}10`,
                border: `1px solid ${COLORS.danger}25`,
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 14,
              }}
            >
              <p style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600, margin: 0 }}>
                {publishError}
              </p>
            </div>
          )}

          {/* Success */}
          {isSuccess && (
            <div
              style={{
                background: `${COLORS.success}10`,
                border: `1px solid ${COLORS.success}25`,
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 14,
              }}
            >
              <p style={{ color: COLORS.success, fontSize: 12, fontWeight: 600, margin: 0 }}>
                Publicado com sucesso!
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: `1px solid ${monitorTheme.border}`,
                background: 'transparent',
                color: monitorTheme.textSecondary,
                fontSize: 13,
                fontWeight: 600,
                cursor: isPublishing ? 'not-allowed' : 'pointer',
              }}
            >
              {isSuccess ? 'Fechar' : 'Cancelar'}
            </button>
            {!isSuccess && (
              <button
                type="submit"
                disabled={isPublishing}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: isPublishing
                    ? monitorTheme.border
                    : COLORS.red,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isPublishing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Upload size={14} />
                {isPublishing ? 'Publicando...' : 'Publicar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
