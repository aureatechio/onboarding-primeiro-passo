import { AlertTriangle, Image as ImageIcon, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { useLocation } from 'react-router'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { ASPECT_RATIOS, ASSET_GROUPS, DETAIL_TABS, GALLERY_CATEGORY_TABS } from './constants'
import DataRow from './components/DataRow'
import ProgressBar from './components/ProgressBar'
import TabBar from './components/TabBar'
import { normalizeGroupName } from './utils'
import { monitorRadius, monitorTheme } from './theme'
import OnboardingDataTab from './components/onboarding-edit/OnboardingDataTab'

const MONO = `'JetBrains Mono', 'Fira Mono', monospace`


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
  compraId,
  jobId,
  reload,
  canMutate = false,
  canOperate = canMutate,
}) {
  const location = useLocation()
  const hrefWithParam = (key, value) => {
    const next = new URLSearchParams(location.search)
    next.set(key, value)
    if (key === 'tab' && value !== 'gallery') {
      next.delete('gallery')
    }
    const query = next.toString()
    return `${location.pathname}${query ? `?${query}` : ''}`
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
      <TabBar
        tabs={DETAIL_TABS}
        activeTab={activeTab}
        onTabChange={onTabChange}
        getHref={(tab) => hrefWithParam('tab', tab.id)}
      />

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
              {canOperate ? (
                <button
                  type="button"
                  onClick={onRetryFailedAssets}
                  disabled={retryingAll}
                  style={retryAllBtnStyle(retryingAll)}
                >
                  {retryingAll ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                  Reprocessar todas com erro
                </button>
              ) : null}
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
            getHref={(tab) => hrefWithParam('gallery', tab.id)}
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
                {canOperate && currentGroup && currentGroup.items.length > 0 ? (
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
                        canMutate={canOperate}
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
        <OnboardingDataTab
          compraId={compraId}
          jobId={jobId}
          onboarding={onboarding}
          identity={identity}
          briefing={briefing}
          reload={reload}
          readOnly={!canMutate}
        />
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
  canMutate = false,
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
        {canMutate && isFailed ? (
          <button
            type="button"
            onClick={() => onRetrySingleAsset(asset.id)}
            disabled={isRetryingThis || retryingAll || retryingCategory === asset.group_name}
            title="Reprocessar esta imagem"
            style={iconBtnStyle({ danger: true, disabled: isRetryingThis || retryingAll })}
          >
            {isRetryingThis ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          </button>
        ) : canMutate && asset.status === 'completed' ? (
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

const statCardStyle = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  padding: '16px 18px',
  background: monitorTheme.cardMutedBg,
}

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
