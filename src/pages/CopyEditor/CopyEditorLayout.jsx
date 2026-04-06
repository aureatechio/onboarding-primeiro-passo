import { designTokens } from '../../theme/design-tokens'
import { monitorTheme, monitorRadius } from '../AiStep2Monitor/theme'
import { ETAPAS_META, UI } from './constants'
import EtapaSection from './EtapaSection'
import PreviewPanel from './PreviewPanel'

const brand = monitorTheme.brand

// ─── EtapaTab ─────────────────────────────────────────────────────────────────

function EtapaTab({ meta, isActive, isDirty, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? brand : 'transparent'}`,
        color: isActive ? monitorTheme.textPrimary : monitorTheme.textMuted,
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        transition: 'color 0.15s, border-color 0.15s',
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.color = monitorTheme.textSecondary
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.color = monitorTheme.textMuted
      }}
    >
      {meta.label.split(' — ')[0]}
      {isDirty && (
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: brand,
            flexShrink: 0,
          }}
          title="Editado"
        />
      )}
    </button>
  )
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

function ActionButton({ label, onClick, variant = 'ghost' }) {
  const base = {
    padding: '7px 14px',
    borderRadius: monitorRadius.md,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    fontFamily: "'Inter', sans-serif",
  }
  const variants = {
    ghost: {
      background: 'transparent',
      color: monitorTheme.textSecondary,
      border: `1px solid ${monitorTheme.borderStrong}`,
    },
    primary: {
      background: brand,
      color: '#fff',
      border: `1px solid ${brand}`,
    },
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => {
        if (variant === 'ghost') e.currentTarget.style.background = monitorTheme.borderSoft
        if (variant === 'primary') e.currentTarget.style.opacity = '0.88'
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost') e.currentTarget.style.background = 'transparent'
        if (variant === 'primary') e.currentTarget.style.opacity = '1'
      }}
    >
      {label}
    </button>
  )
}

// ─── CopyEditorLayout ─────────────────────────────────────────────────────────

export default function CopyEditorLayout({
  activeEtapaId,
  onSelectEtapa,
  sections,
  originalSections,
  dirtyEtapas,
  isDirty,
  onUpdateField,
  onResetSection,
  onExportJSON,
}) {
  const activeEtapa = ETAPAS_META.find((m) => m.id === activeEtapaId)

  return (
    <div style={{ color: monitorTheme.textPrimary }}>
      {/* ── Page header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: designTokens.space[8],
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: monitorTheme.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
              marginBottom: 4,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {UI.appTitle}
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: monitorTheme.textPrimary,
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {activeEtapa?.label ?? '—'}
          </h1>
          {isDirty && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 6,
                padding: '2px 8px',
                background: `${brand}18`,
                color: brand,
                border: `1px solid ${brand}44`,
                borderRadius: 100,
                fontSize: 10,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {ETAPAS_META.filter((m) => dirtyEtapas.has(m.id)).length} etapa(s) editada(s)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {dirtyEtapas.has(activeEtapaId) && (
            <ActionButton
              label={UI.resetButton}
              onClick={() => onResetSection(activeEtapaId)}
              variant="ghost"
            />
          )}
          <ActionButton
            label={UI.exportButton}
            onClick={onExportJSON}
            variant="primary"
          />
        </div>
      </div>

      {/* ── Tabs de etapa ── */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: `1px solid ${monitorTheme.border}`,
          marginBottom: designTokens.space[10],
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {ETAPAS_META.map((meta) => (
          <EtapaTab
            key={meta.id}
            meta={meta}
            isActive={meta.id === activeEtapaId}
            isDirty={dirtyEtapas.has(meta.id)}
            onClick={() => onSelectEtapa(meta.id)}
          />
        ))}
      </div>

      {/* ── Campos da etapa ── */}
      <EtapaSection
        etapaId={activeEtapaId}
        data={sections[activeEtapaId]}
        originalData={originalSections[activeEtapaId]}
        onUpdate={(path, value) => onUpdateField(activeEtapaId, path, value)}
      />

      {/* ── Preview panel ── */}
      <div style={{ marginTop: designTokens.space[10] }}>
        <PreviewPanel sections={sections} activeEtapaId={activeEtapaId} />
      </div>
    </div>
  )
}
