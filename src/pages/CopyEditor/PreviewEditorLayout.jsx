import { useState, useRef, useEffect, useCallback } from 'react'
import { COLORS } from '../../theme/colors'
import { ETAPAS_META } from './constants'
import EtapaSidebar from './EtapaSidebar'
import EditorToolbar from './EditorToolbar'
import SearchOverlay from './SearchOverlay'
import DiffPanel from './DiffPanel'

/**
 * PreviewEditorLayout — Layout principal do Preview-First Copy Editor.
 *
 * Estrutura: EditorToolbar (top) + EtapaSidebar (left 200px) + Preview Area (center, dark bg, 520px max)
 */
export default function PreviewEditorLayout({
  activeEtapaId,
  onSelectEtapa,
  sections,
  originalSections,
  dirtyEtapas,
  isDirty: _isDirty,
  onUpdateField,
  onResetSection,
  onExportJSON,
  PreviewComponent,
  onPublish,
  publishStatus,
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [diffActive, setDiffActive] = useState(false)
  const previewRef = useRef(null)

  const activeEtapaMeta = ETAPAS_META.find((e) => e.id === activeEtapaId)
  const activeLabel = activeEtapaMeta?.label || ''

  // Scroll preview to top when changing etapa
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [activeEtapaId])

  // Cmd+K shortcut for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSearchResult = useCallback((etapaId, path) => {
    onSelectEtapa(etapaId)
    // Scroll to element via data-path after a short delay for render
    setTimeout(() => {
      const pathStr = `${etapaId}.${path.join('.')}`
      const el = document.querySelector(`[data-path="${pathStr}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.outline = `2px solid ${COLORS.accent}`
        el.style.outlineOffset = '3px'
        setTimeout(() => {
          el.style.outline = ''
          el.style.outlineOffset = ''
        }, 2000)
      }
    }, 200)
  }, [onSelectEtapa])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 48px)' }}>
      <SearchOverlay
        sections={sections}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={handleSearchResult}
      />

      <EditorToolbar
        activeEtapaLabel={activeLabel}
        isDirty={dirtyEtapas.has(activeEtapaId)}
        dirtyCount={dirtyEtapas.size}
        onReset={() => onResetSection(activeEtapaId)}
        onExport={onExportJSON}
        onSearch={() => setSearchOpen(true)}
        onToggleDiff={() => setDiffActive((p) => !p)}
        diffActive={diffActive}
        onPublish={onPublish}
        publishStatus={publishStatus}
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: 0,
          minHeight: 0,
        }}
      >
        {/* ─── Etapa Sidebar ────────────────────────────────── */}
        <EtapaSidebar
          etapas={ETAPAS_META}
          activeEtapaId={activeEtapaId}
          dirtyEtapas={dirtyEtapas}
          onSelect={onSelectEtapa}
        />

        {/* ─── Preview Area ─────────────────────────────────── */}
        <div
          ref={previewRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 120px)',
            background: COLORS.bg,
            borderRadius: 12,
            marginLeft: 16,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              margin: '0 auto',
              padding: '28px 24px 40px',
            }}
          >
            {/* Inject CSS for editable-text hover */}
            <style>{`
              .editable-text:hover {
                outline: 1px dashed ${COLORS.textDim}40 !important;
                outline-offset: 2px;
              }
              .editable-text:hover::after {
                content: '✎';
                position: absolute;
                top: -2px;
                right: -2px;
                font-size: 10px;
                color: ${COLORS.textDim};
                opacity: 0.6;
                pointer-events: none;
              }
            `}</style>

            {diffActive && (
              <DiffPanel
                data={sections[activeEtapaId]}
                originalData={originalSections[activeEtapaId]}
                isOpen={diffActive}
              />
            )}

            {PreviewComponent && (
              <PreviewComponent
                data={sections[activeEtapaId]}
                originalData={originalSections[activeEtapaId]}
                etapaId={activeEtapaId}
                onUpdate={(path, value) => onUpdateField(activeEtapaId, path, value)}
                diffActive={diffActive}
              />
            )}

            {!PreviewComponent && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '80px 24px',
                  color: COLORS.textDim,
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                  Preview em construção
                </p>
                <p style={{ fontSize: 13 }}>
                  O preview visual para esta etapa ainda está sendo implementado.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
