import { useRef } from 'react'
import { RotateCcw, Download, Search, GitCompare, Upload, FileUp } from 'lucide-react'
import { COLORS } from '../../theme/colors'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'

function ToolbarButton({ icon: Icon, label, onClick, disabled, variant = 'ghost' }) {
  const isPrimary = variant === 'primary'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: monitorRadius.sm,
        border: isPrimary
          ? `1px solid ${COLORS.red}40`
          : `1px solid ${monitorTheme.border}`,
        background: isPrimary ? `${COLORS.red}10` : 'transparent',
        color: disabled
          ? monitorTheme.textMuted
          : isPrimary
            ? COLORS.red
            : monitorTheme.textSecondary,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = isPrimary ? `${COLORS.red}18` : monitorTheme.cardMutedBg
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.background = isPrimary ? `${COLORS.red}10` : 'transparent'
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

export default function EditorToolbar({
  activeEtapaLabel: _activeEtapaLabel,
  isDirty,
  dirtyCount,
  onReset,
  onExport,
  onImport,
  onSearch,
  onToggleDiff,
  diffActive,
  onPublish,
  publishStatus,
}) {
  const fileInputRef = useRef(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = onImport?.(parsed)

      if (!result?.success) {
        const reason =
          result?.reason === 'no-valid-keys'
            ? 'Nenhuma etapa válida encontrada (ETAPA1, ETAPA2, ...).'
            : result?.reason === 'invalid-json'
              ? 'JSON inválido.'
              : 'Falha ao importar.'
        window.alert(reason)
      } else {
        window.alert(`Importado: ${result.imported.join(', ')}. Revise e clique em Publicar.`)
      }
    } catch (err) {
      window.alert(`Erro ao ler arquivo: ${err.message}`)
    } finally {
      // Reset so selecting the same file again re-triggers
      e.target.value = ''
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        marginBottom: 8,
        borderBottom: `1px solid ${monitorTheme.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: monitorTheme.textPrimary,
            margin: 0,
          }}
        >
          Copy Editor
        </h1>
        {dirtyCount > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              background: `${COLORS.accent}18`,
              color: COLORS.accent,
              border: `1px solid ${COLORS.accent}30`,
              borderRadius: 100,
              padding: '2px 10px',
            }}
          >
            {dirtyCount} editado{dirtyCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ToolbarButton
          icon={Search}
          label="Buscar"
          onClick={onSearch}
        />
        <ToolbarButton
          icon={GitCompare}
          label="Comparar"
          onClick={onToggleDiff}
          variant={diffActive ? 'primary' : 'ghost'}
        />
        <ToolbarButton
          icon={RotateCcw}
          label="Resetar"
          onClick={onReset}
          disabled={!isDirty}
        />
        <ToolbarButton
          icon={Download}
          label="Exportar"
          onClick={onExport}
        />
        <ToolbarButton
          icon={FileUp}
          label="Importar"
          onClick={handleImportClick}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <ToolbarButton
          icon={Upload}
          label={publishStatus === 'publishing' ? 'Publicando...' : publishStatus === 'success' ? 'Publicado!' : 'Publicar'}
          onClick={onPublish}
          disabled={!isDirty || publishStatus === 'publishing'}
          variant="primary"
        />
      </div>
    </div>
  )
}
