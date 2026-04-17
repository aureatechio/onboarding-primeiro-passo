import { useState } from 'react'
import { AlertTriangle, Image as ImageIcon, Loader2, RefreshCw, RotateCcw, Play, Zap } from 'lucide-react'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { ASPECT_RATIOS, ASSET_GROUPS, DETAIL_TABS, GALLERY_CATEGORY_TABS } from './constants'
import DataRow from './components/DataRow'
import ProgressBar from './components/ProgressBar'
import TabBar from './components/TabBar'
import { normalizeGroupName } from './utils'
import { monitorRadius, monitorTheme } from './theme'

const MONO = `'JetBrains Mono', 'Fira Mono', monospace`

// ── Swatches de paleta ────────────────────────────────────────────────────────
function PaletteDisplay({ colors }) {
  if (!colors || colors.length === 0)
    return <span style={{ color: monitorTheme.textMuted, fontSize: 13 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      {colors.map((color, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            title={color}
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: color,
              border: '1px solid rgba(255,255,255,0.14)',
              flexShrink: 0,
              boxShadow: `0 0 0 1px rgba(0,0,0,0.3)`,
              cursor: 'help',
            }}
          />
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              color: monitorTheme.textSecondary,
              letterSpacing: '0.04em',
            }}
          >
            {color}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Badge de status (pagamento / contrato) ────────────────────────────────────
function FieldBadge({ value }) {
  if (!value) return <span style={{ color: monitorTheme.textMuted, fontSize: 13 }}>—</span>
  const v = value.toLowerCase()
  let bg, color
  if (['paid', 'pago', 'done', 'completed', 'signed', 'aprovado', 'active'].includes(v)) {
    bg = monitorTheme.completedBg
    color = monitorTheme.completedText
  } else if (['pending', 'pendente', 'waiting', 'aguardando'].includes(v)) {
    bg = monitorTheme.pendingBg
    color = monitorTheme.pendingText
  } else if (['failed', 'error', 'cancelado', 'rejected'].includes(v)) {
    bg = monitorTheme.failedBg
    color = monitorTheme.failedText
  } else if (['processing', 'processando', 'in_progress'].includes(v)) {
    bg = monitorTheme.processingBg
    color = monitorTheme.processingText
  } else {
    bg = monitorTheme.neutralBadgeBg
    color = monitorTheme.neutralBadgeText
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: bg,
        color,
        borderRadius: 5,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontFamily: MONO,
      }}
    >
      {value}
    </span>
  )
}

// ── Cabeçalho de seção dentro do painel ──────────────────────────────────────
function SectionHeader({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 0 8px',
        marginBottom: 4,
        borderBottom: `1px solid ${monitorTheme.border}`,
      }}
    >
      <div
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: monitorTheme.brand,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: monitorTheme.textSecondary,
          fontFamily: MONO,
        }}
      >
        {children}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DetailModePanel({
  data,
  assets,
  onboarding,
  identity,
  briefing,
  progress,
  activeTab,
  onTabChange,
  onOpenViewer,
  activeGalleryCategory,
  onGalleryCategoryChange,
  onRetrySingleAsset,
  onRetryFailedAssets,
  onRetryCategory,
  retryingAssetId,
  retryingAll,
  retryingCategory,
  onSaveEdits,
  onRerunAll,
  savingEdits,
}) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState({})
  const [savedOk, setSavedOk] = useState(false)

  const enterEdit = () => {
    setDraft({
      choice: identity?.choice || 'add_now',
      font_choice: identity?.font_choice || '',
      brand_palette: (identity?.brand_palette || []).join('\n'),
      campaign_notes: identity?.campaign_notes || '',
      site_url: identity?.site_url || '',
      production_path: identity?.production_path || 'standard',
      brief_text: briefing?.brief_text || '',
    })
    setEditMode(true)
    setSavedOk(false)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setDraft({})
    setSavedOk(false)
  }

  const handleSave = async () => {
    const paletteLines = draft.brand_palette
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => /^#[0-9a-fA-F]{6}$/.test(s))
      .slice(0, 8)

    const identityChanges = {
      choice: draft.choice,
      ...(draft.font_choice ? { font_choice: draft.font_choice } : {}),
      ...(paletteLines.length ? { brand_palette: paletteLines } : {}),
      ...(draft.campaign_notes ? { campaign_notes: draft.campaign_notes } : {}),
      ...(draft.site_url ? { site_url: draft.site_url } : {}),
      ...(draft.production_path ? { production_path: draft.production_path } : {}),
    }
    const briefingChanges = draft.brief_text ? { brief_text: draft.brief_text } : {}

    const result = await onSaveEdits?.({ identityChanges, briefingChanges })
    if (result?.ok) {
      setEditMode(false)
      setSavedOk(true)
    }
  }

  const groupedAssets = ASSET_GROUPS.map((group) => ({
    ...group,
    items: assets.filter((asset) => normalizeGroupName(asset.group_name) === group.key),
  }))
  const currentGroup =
    groupedAssets.find((group) => group.key === activeGalleryCategory) || groupedAssets[0]
  const failedAssets = assets.filter((asset) => asset.status === 'failed')
  const diagnostics = data?.diagnostics || {}
  const diagnosticFlags = diagnostics?.inconsistency_flags || []
  const lastError = diagnostics?.last_error || null

  return (
    <>
      <TabBar tabs={DETAIL_TABS} activeTab={activeTab} onTabChange={onTabChange} />

      {/* ── GALLERY ──────────────────────────────────────────────────────────── */}
      {activeTab === 'gallery' ? (
        <section>
          {/* Error banner */}
          {failedAssets.length > 0 ? (
            <div
              style={{
                border: `1px solid ${monitorTheme.dangerBorder}`,
                background: monitorTheme.dangerBg,
                borderRadius: monitorRadius.xl,
                padding: '14px 16px',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <AlertTriangle size={16} style={{ marginTop: 2, color: monitorTheme.dangerText, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: monitorTheme.dangerTextStrong, margin: 0 }}>
                    Instabilidade temporária no provedor de imagens
                  </p>
                  <p style={{ fontSize: 12, color: monitorTheme.dangerText, marginTop: 3, fontFamily: MONO }}>
                    {failedAssets.length} asset(s) com falha — tente reprocessar abaixo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRetryFailedAssets}
                disabled={retryingAll}
                style={retryAllBtnStyle(retryingAll)}
              >
                {retryingAll ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                Reprocessar todas com erro
              </button>
            </div>
          ) : null}

          {/* Stats cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: 'Esperado', value: progress.total_expected ?? 12 },
              { label: 'Gerado', value: progress.total_generated ?? 0 },
              { label: 'Percentual', value: `${progress.percent ?? 0}%` },
            ].map((item) => (
              <div key={item.label} style={statCardStyle}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: monitorTheme.textMuted,
                    margin: 0,
                    fontFamily: MONO,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: monitorTheme.textPrimary,
                    margin: '8px 0 0',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div
            style={{
              border: `1px solid ${monitorTheme.border}`,
              borderRadius: monitorRadius.xl,
              padding: '14px 16px',
              marginBottom: 24,
              background: monitorTheme.cardMutedBg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: monitorTheme.textMuted, fontFamily: MONO }}>Andamento</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: monitorTheme.textSecondary, fontFamily: MONO }}>
                {progress.percent ?? 0}%
              </span>
            </div>
            <ProgressBar percent={progress.percent} animated showLabel={false} height={6} />
          </div>

          {/* Gallery header + category tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: monitorTheme.textPrimary, margin: 0 }}>
              Previews por categoria
            </h2>
            <span style={{ fontSize: 11, color: monitorTheme.textMuted, fontFamily: MONO }}>
              {assets.length} assets
            </span>
          </div>
          <TabBar
            tabs={GALLERY_CATEGORY_TABS}
            activeTab={activeGalleryCategory}
            onTabChange={onGalleryCategoryChange}
          />

          {assets.length === 0 ? (
            <div
              style={{
                border: `1px dashed ${monitorTheme.borderStrong}`,
                borderRadius: monitorRadius.xl,
                padding: 32,
                textAlign: 'center',
                color: monitorTheme.textMuted,
                fontSize: 13,
              }}
            >
              Nenhum preview disponível ainda.
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 600, color: monitorTheme.textPrimary, margin: 0 }}>
                  {currentGroup?.label || 'Categoria'}
                </h3>
                {currentGroup && currentGroup.items.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onRetryCategory(currentGroup.key)}
                    disabled={
                      retryingCategory === currentGroup.key ||
                      retryingAll ||
                      currentGroup.items.some(
                        (a) => a.status === 'pending' || a.status === 'processing'
                      )
                    }
                    title="Regenerar todas as imagens desta categoria"
                    style={retryCategoryBtnStyle(retryingCategory === currentGroup.key || retryingAll)}
                  >
                    {retryingCategory === currentGroup.key ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RotateCcw size={12} />
                    )}
                    Regenerar categoria
                  </button>
                ) : null}
              </div>

              {!currentGroup || currentGroup.items.length === 0 ? (
                <div
                  style={{
                    border: `1px dashed ${monitorTheme.borderStrong}`,
                    borderRadius: monitorRadius.lg,
                    padding: 20,
                    color: monitorTheme.textMuted,
                    fontSize: 13,
                  }}
                >
                  Nenhum asset nesta categoria.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  {currentGroup.items.map((asset, index) => {
                    const ratio = ASPECT_RATIOS[asset.format] || ASPECT_RATIOS['1:1']
                    const isFailed = asset.status === 'failed'
                    const isPendingOrProcessing =
                      asset.status === 'pending' || asset.status === 'processing'
                    const isRetryingThis = retryingAssetId === asset.id

                    return (
                      <AssetCard
                        key={asset.id || `${asset.group_name}-${asset.format}-${index}`}
                        asset={asset}
                        ratio={ratio}
                        isFailed={isFailed}
                        isPendingOrProcessing={isPendingOrProcessing}
                        isRetryingThis={isRetryingThis}
                        retryingAll={retryingAll}
                        retryingCategory={retryingCategory}
                        onOpenViewer={onOpenViewer}
                        onRetrySingleAsset={onRetrySingleAsset}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}

      {/* ── DADOS DO ONBOARDING ───────────────────────────────────────────────── */}
      {activeTab === 'onboarding-data' ? (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* Painel esquerdo — dados editáveis */}
          <div style={panelStyle}>
            {/* Header do painel */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, color: monitorTheme.textPrimary, margin: 0 }}>
                Dados do Onboarding
              </h3>
              {!editMode ? (
                <button type="button" onClick={enterEdit} style={editBtnStyle}>
                  Editar
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={cancelEdit} style={cancelBtnStyle}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={savingEdits}
                    style={saveBtnStyle(savingEdits)}
                  >
                    {savingEdits ? (
                      <>
                        <Loader2 size={12} className="animate-spin" /> Salvando…
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Seção: Contrato */}
            <div style={{ marginBottom: 20 }}>
              <SectionHeader>Contrato</SectionHeader>
              <DataRow label="Cliente" value={onboarding?.client?.name} />
              <DataRow label="Celebridade" value={onboarding?.celebrity?.name} />
              {/* Status com badge */}
              <div style={dataRowWrapperStyle}>
                <div style={dataRowLabelStyle}>Pagamento</div>
                <div>
                  <FieldBadge value={onboarding?.compra?.checkout_status} />
                </div>
              </div>
              <div style={dataRowWrapperStyle}>
                <div style={dataRowLabelStyle}>Contrato</div>
                <div>
                  <FieldBadge value={onboarding?.compra?.clicksign_status} />
                </div>
              </div>
            </div>

            {/* Seção: Identidade */}
            <div style={{ marginBottom: 20 }}>
              <SectionHeader>Identidade Visual</SectionHeader>

              {editMode ? (
                <div style={dataRowWrapperStyle}>
                  <div style={dataRowLabelStyle}>Produção</div>
                  <select
                    value={draft.production_path}
                    onChange={(e) => setDraft((d) => ({ ...d, production_path: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="standard">standard</option>
                    <option value="hybrid">hybrid</option>
                  </select>
                </div>
              ) : (
                <DataRow label="Produção" value={identity?.production_path} />
              )}

              <DataRow label="Identidade" value={identity?.choice} />

              <DataRow
                label="Fonte"
                value={editMode ? draft.font_choice : identity?.font_choice}
                editable={editMode}
                onChange={(v) => setDraft((d) => ({ ...d, font_choice: v }))}
              />

              {/* Paleta com swatches */}
              {editMode ? (
                <>
                  <DataRow
                    label="Paleta"
                    value={draft.brand_palette}
                    editable
                    multiline
                    mono
                    onChange={(v) => setDraft((d) => ({ ...d, brand_palette: v }))}
                  />
                  <p
                    style={{
                      fontSize: 11,
                      color: monitorTheme.textMuted,
                      fontFamily: MONO,
                      padding: '4px 8px 8px 180px',
                      margin: 0,
                    }}
                  >
                    Uma cor por linha ou por vírgula. Ex: #384ffe
                  </p>
                </>
              ) : (
                <div style={dataRowWrapperStyle}>
                  <div style={dataRowLabelStyle}>Paleta</div>
                  <PaletteDisplay colors={identity?.brand_palette} />
                </div>
              )}

              <DataRow
                label="Site URL"
                value={editMode ? draft.site_url : identity?.site_url}
                editable={editMode}
                onChange={(v) => setDraft((d) => ({ ...d, site_url: v }))}
              />

              <DataRow
                label="Notas"
                value={editMode ? draft.campaign_notes : identity?.campaign_notes}
                editable={editMode}
                multiline={editMode}
                onChange={(v) => setDraft((d) => ({ ...d, campaign_notes: v }))}
              />
            </div>

            {/* Seção: Briefing */}
            <div style={{ marginBottom: 20 }}>
              <SectionHeader>Briefing</SectionHeader>

              <div style={dataRowWrapperStyle}>
                <div style={dataRowLabelStyle}>Perplexity</div>
                <div>
                  {briefing?.provider === 'perplexity' && briefing?.status === 'done' ? (
                    <FieldBadge value="done" />
                  ) : (
                    <span style={{ fontSize: 13, color: monitorTheme.textMuted }}>—</span>
                  )}
                </div>
              </div>

              <DataRow label="Modo" value={briefing?.mode} />

              <DataRow
                label="Briefing texto"
                value={editMode ? draft.brief_text : briefing?.brief_text}
                editable={editMode}
                multiline={editMode}
                onChange={(v) => setDraft((d) => ({ ...d, brief_text: v }))}
              />

              <DataRow label="Transcript" value={briefing?.transcript_status} />
            </div>

            {/* Ações pós-edição */}
            {!editMode ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onRerunAll}
                  disabled={retryingAll}
                  style={rerunBtnStyle(retryingAll)}
                >
                  {retryingAll ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Disparando…
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      Rodar job novamente
                    </>
                  )}
                </button>
              </div>
            ) : null}

            {savedOk ? (
              <p
                style={{
                  fontSize: 12,
                  color: monitorTheme.completedText,
                  marginTop: 10,
                  textAlign: 'right',
                  fontFamily: MONO,
                }}
              >
                ✓ Dados salvos — clique em &ldquo;Rodar job novamente&rdquo; para reprocessar.
              </p>
            ) : null}
          </div>

          {/* Painel direito — uploads */}
          <div style={panelStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: monitorTheme.textPrimary, margin: '0 0 20px' }}>
              Uploads & Anexos
            </h3>

            <div style={{ marginBottom: 20 }}>
              <SectionHeader>Arquivos</SectionHeader>
              <DataRow label="Logo path" value={identity?.uploads?.logo_path} mono />
              <DataRow
                label="Imagens"
                value={String(identity?.uploads?.campaign_images_paths?.length || 0) + ' enviadas'}
              />
              <DataRow label="Audio path" value={briefing?.audio_path} mono />
              <DataRow
                label="Duração (s)"
                value={String(briefing?.audio_duration_sec || '—')}
              />
            </div>

            {/* Preview logo */}
            {identity?.uploads?.logo_url ? (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader>Logo</SectionHeader>
                <button
                  type="button"
                  onClick={() => window.open(identity.uploads.logo_url, '_blank', 'noopener,noreferrer')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    cursor: 'pointer',
                    marginTop: 10,
                    display: 'block',
                  }}
                  title="Abrir logo em nova aba"
                >
                  <img
                    src={identity.uploads.logo_url}
                    alt="Logo enviado"
                    style={{
                      width: 100,
                      height: 100,
                      objectFit: 'contain',
                      borderRadius: monitorRadius.md,
                      border: `1px solid ${monitorTheme.border}`,
                      background: monitorTheme.cardMutedBg,
                      display: 'block',
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  />
                </button>
              </div>
            ) : null}

            {/* Grid de imagens da campanha */}
            {(identity?.uploads?.campaign_images_urls || []).length > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader>Imagens da campanha</SectionHeader>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))',
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  {identity.uploads.campaign_images_urls.map((imageUrl, index) => (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}
                      style={{
                        border: `1px solid ${monitorTheme.border}`,
                        background: 'transparent',
                        padding: 0,
                        cursor: 'pointer',
                        borderRadius: monitorRadius.sm,
                        overflow: 'hidden',
                        display: 'block',
                        transition: 'border-color 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = monitorTheme.borderStrong
                        e.currentTarget.style.transform = 'scale(1.03)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = monitorTheme.border
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={`Imagem ${index + 1}`}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Player de áudio */}
            {briefing?.audio_url ? (
              <div>
                <SectionHeader>Áudio</SectionHeader>
                <audio
                  controls
                  style={{
                    width: '100%',
                    marginTop: 10,
                    borderRadius: 8,
                    colorScheme: 'dark',
                  }}
                >
                  <source src={briefing.audio_url} />
                </audio>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ── ERROS ────────────────────────────────────────────────────────────── */}
      {activeTab === 'errors' ? (
        <section>
          {/* Diagnóstico resumido */}
          <div
            style={{
              border: `1px solid ${monitorTheme.dangerBorder}`,
              borderRadius: monitorRadius.xl,
              padding: '16px 18px',
              marginBottom: 16,
              background: monitorTheme.dangerBg,
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: monitorTheme.dangerTextStrong,
                margin: '0 0 12px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: MONO,
              }}
            >
              Diagnóstico do pipeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <DiagRow label="Falhas worker" value={String(diagnostics?.worker_failures_count || 0)} />
              <DiagRow label="Última origem" value={diagnostics?.last_failure_source || 'unknown'} />
              {lastError ? (
                <DiagRow
                  label="Último erro"
                  value={`${lastError.error_type} · ${lastError.created_at || 'sem data'}`}
                  danger
                />
              ) : null}
              {diagnosticFlags.length > 0 ? (
                <DiagRow label="Inconsistências" value={diagnosticFlags.join(', ')} danger />
              ) : null}
            </div>
          </div>

          {/* Lista de erros */}
          {data?.errors?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.errors.map((errorItem) => (
                <div
                  key={errorItem.id}
                  style={{
                    borderRadius: monitorRadius.lg,
                    background: monitorTheme.cardMutedBg,
                    border: `1px solid ${monitorTheme.dangerBorder}`,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: monitorTheme.dangerTextStrong,
                        fontFamily: MONO,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {errorItem.group_name}
                    </span>
                    <span style={{ color: monitorTheme.borderStrong }}>·</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: monitorTheme.textMuted,
                        fontFamily: MONO,
                      }}
                    >
                      {errorItem.format}
                    </span>
                    <span style={{ color: monitorTheme.borderStrong }}>·</span>
                    <span
                      style={{
                        fontSize: 11,
                        color: monitorTheme.textMuted,
                        fontFamily: MONO,
                      }}
                    >
                      tentativa {errorItem.attempt}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12,
                      color: monitorTheme.dangerText,
                      margin: 0,
                      lineHeight: 1.5,
                      fontFamily: MONO,
                      wordBreak: 'break-all',
                    }}
                  >
                    {errorItem.error_message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: monitorTheme.textMuted }}>
              Nenhum erro registrado para este job.
            </p>
          )}
        </section>
      ) : null}
    </>
  )
}

// ── Asset card (galeria) ──────────────────────────────────────────────────────
function AssetCard({
  asset,
  ratio,
  isFailed,
  isPendingOrProcessing,
  isRetryingThis,
  retryingAll,
  retryingCategory,
  onOpenViewer,
  onRetrySingleAsset,
}) {
  return (
    <div
      style={{
        border: `1px solid ${isFailed ? monitorTheme.dangerBorder : monitorTheme.border}`,
        borderRadius: monitorRadius.xl,
        overflow: 'hidden',
        background: monitorTheme.cardMutedBg,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isFailed ? monitorTheme.dangerText : monitorTheme.borderStrong
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isFailed ? monitorTheme.dangerBorder : monitorTheme.border
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <button
        type="button"
        onClick={() => onOpenViewer(asset)}
        style={{
          display: 'block',
          width: '100%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            aspectRatio: ratio,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {asset.image_url ? (
            <img
              src={asset.image_url}
              alt={`${asset.group_name} ${asset.format}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                color: monitorTheme.textMuted,
                background: monitorTheme.pageBg,
              }}
            >
              {isPendingOrProcessing ? (
                <Loader2 size={26} className="animate-spin" />
              ) : (
                <ImageIcon size={26} />
              )}
            </div>
          )}
          {/* Status overlay */}
          {isFailed ? (
            <div
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(248,81,73,0.85)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                fontFamily: MONO,
                letterSpacing: '0.06em',
                backdropFilter: 'blur(4px)',
              }}
            >
              ERRO
            </div>
          ) : null}
        </div>
      </button>

      <div
        style={{
          padding: '8px 10px',
          background: monitorTheme.pageBg,
          borderTop: `1px solid ${monitorTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: monitorTheme.textMuted,
              margin: 0,
              fontFamily: MONO,
            }}
          >
            {(asset.group_name || '—').toUpperCase()} · {asset.format || '—'}
          </p>
          <p
            style={{
              fontSize: 11,
              marginTop: 2,
              color: isFailed ? monitorTheme.failedText : monitorTheme.textMuted,
              fontFamily: MONO,
            }}
          >
            {asset.status || 'unknown'}
          </p>
        </div>
        {isFailed ? (
          <button
            type="button"
            onClick={() => onRetrySingleAsset(asset.id)}
            disabled={isRetryingThis || retryingAll || retryingCategory === asset.group_name}
            title="Reprocessar esta imagem"
            style={iconBtnStyle({ danger: true, disabled: isRetryingThis || retryingAll })}
          >
            {isRetryingThis ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          </button>
        ) : asset.status === 'completed' ? (
          <button
            type="button"
            onClick={() => onRetrySingleAsset(asset.id)}
            disabled={isRetryingThis || retryingAll || retryingCategory === asset.group_name}
            title="Regenerar imagem"
            style={iconBtnStyle({ danger: false, disabled: isRetryingThis || retryingAll })}
          >
            {isRetryingThis ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        ) : isPendingOrProcessing ? (
          <Loader2 size={13} className="animate-spin" style={{ color: monitorTheme.textMuted }} />
        ) : null}
      </div>
    </div>
  )
}

// ── Linha de diagnóstico ───────────────────────────────────────────────────────
function DiagRow({ label, value, danger = false }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: monitorTheme.textMuted,
          fontFamily: MONO,
          minWidth: 120,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: danger ? monitorTheme.dangerTextStrong : monitorTheme.textSecondary,
          fontFamily: MONO,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const panelStyle = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  padding: '20px 18px',
  background: monitorTheme.cardMutedBg,
}

const dataRowWrapperStyle = {
  display: 'grid',
  gridTemplateColumns: '160px minmax(0,1fr)',
  gap: 12,
  alignItems: 'center',
  padding: '7px 8px',
  borderRadius: 6,
  marginLeft: -8,
  marginRight: -8,
  borderBottom: `1px solid ${monitorTheme.borderSoft}`,
}

const dataRowLabelStyle = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: monitorTheme.textMuted,
  fontFamily: MONO,
  userSelect: 'none',
}

const statCardStyle = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  padding: '16px 18px',
  background: monitorTheme.cardMutedBg,
}

const editBtnStyle = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: 'transparent',
  color: monitorTheme.textSecondary,
  borderRadius: monitorRadius.md,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.02em',
  transition: 'border-color 0.15s, color 0.15s',
}

const cancelBtnStyle = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: 'transparent',
  color: monitorTheme.textMuted,
  borderRadius: monitorRadius.md,
  padding: '5px 12px',
  cursor: 'pointer',
  fontSize: 12,
}

const saveBtnStyle = (disabled) => ({
  border: 'none',
  background: disabled ? monitorTheme.borderStrong : monitorTheme.brand,
  color: '#fff',
  borderRadius: monitorRadius.md,
  padding: '5px 14px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  opacity: disabled ? 0.7 : 1,
  transition: 'opacity 0.15s',
})

const rerunBtnStyle = (disabled) => ({
  border: 'none',
  background: monitorTheme.brand,
  color: '#fff',
  borderRadius: monitorRadius.md,
  padding: '8px 16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  opacity: disabled ? 0.6 : 1,
  transition: 'opacity 0.15s',
})

const retryAllBtnStyle = (disabled) => ({
  border: `1px solid ${monitorTheme.dangerBorder}`,
  background: 'transparent',
  color: monitorTheme.dangerTextStrong,
  borderRadius: monitorRadius.md,
  padding: '7px 12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.7 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
})

const retryCategoryBtnStyle = (disabled) => ({
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: 'transparent',
  color: monitorTheme.textSecondary,
  borderRadius: monitorRadius.md,
  padding: '5px 10px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.7 : 1,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  fontWeight: 600,
})

const iconBtnStyle = ({ danger, disabled }) => ({
  border: `1px solid ${danger ? monitorTheme.dangerBorder : monitorTheme.borderStrong}`,
  background: danger ? monitorTheme.dangerBg : 'transparent',
  color: danger ? monitorTheme.dangerTextStrong : monitorTheme.textMuted,
  borderRadius: monitorRadius.sm,
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  flexShrink: 0,
  transition: 'opacity 0.15s',
})

const selectStyle = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: monitorTheme.cardMutedBg,
  color: monitorTheme.textPrimary,
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
}
