import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { DashboardButton, InlineNotice } from '../../components/dashboard'
import { TYPE, designTokens } from '../../theme/design-tokens'
import DetailModePanel from './DetailModePanel'
import ListModePanel from './ListModePanel'
import ImageViewer from './components/ImageViewer'
import StatusBadge from './components/StatusBadge'
import { DETAIL_TABS, GALLERY_CATEGORY_TABS } from './constants'
import { useAiCampaignMonitor } from './useAiCampaignMonitor'
import { formatDate, resolveDetailCompraId } from './utils'
import { monitorRadius, monitorTheme } from './theme'
import MonitorLayout from './MonitorLayout'
import { useAuth } from '../../context/AuthContext'

export default function AiStep2Monitor() {
  const { isAdmin, isOperator } = useAuth()
  const canOperate = isAdmin || isOperator
  const canAdminMutate = isAdmin
  const {
    data,
    loading,
    refreshing,
    error,
    actionError,
    actionSuccess,
    retryingAssetId,
    retryingAll,
    retryingCategory,
    lastUpdatedAt,
    compraId,
    jobId,
    isListMode,
    listPage,
    listStatus,
    listCelebrity,
    listCompra,
    eligiblePurchases,
    availablePurchases,
    releaseOnboarding,
    updateListFilters,
    openJobDetail,
    backToList,
    goHome,
    reload,
    retrySingleAsset,
    retryFailedAssets,
    retryCategory,
    savingEdits,
    saveOnboardingEdits,
    rerunAllAssets,
  } = useAiCampaignMonitor()

  const [viewerIndex, setViewerIndex] = useState(-1)
  const [zoom, setZoom] = useState(1)
  const [activeTab, setActiveTab] = useState(DETAIL_TABS[0].id)
  const [activeGalleryCategory, setActiveGalleryCategory] = useState(GALLERY_CATEGORY_TABS[0].id)

  const assets = data?.assets || []
  const listItems = data?.items || []
  const listSummary = data?.summary || {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    partial: 0,
    failed: 0,
  }
  const pagination = data?.pagination || { page: listPage, total_pages: 1 }
  const onboarding = data?.onboarding || {}
  const identity = onboarding?.identity || null
  const briefing = onboarding?.briefing || null
  const job = data?.job || null
  const effectiveCompraId = resolveDetailCompraId({
    urlCompraId: compraId,
    data,
    job,
    onboarding,
  })
  const progress = data?.progress || { total_expected: 12, total_generated: 0, percent: 0 }

  const currentAsset = viewerIndex >= 0 ? assets[viewerIndex] : null

  useEffect(() => {
    if (isListMode) setActiveTab(DETAIL_TABS[0].id)
  }, [isListMode])

  useEffect(() => {
    if (isListMode) setActiveGalleryCategory(GALLERY_CATEGORY_TABS[0].id)
  }, [isListMode])

  useEffect(() => {
    if (!isListMode || loading) return
    if (typeof window === 'undefined' || typeof performance === 'undefined') return

    // Tracks time-to-usable list view after nav/fetch.
    window.requestAnimationFrame(() => {
      performance.mark('ai-step2-list-render-ready')
      const hasNavStart = performance.getEntriesByName('ai-step2-nav-start').length > 0
      if (hasNavStart) {
        performance.measure('ai-step2:nav-to-render-ready', 'ai-step2-nav-start', 'ai-step2-list-render-ready')
        const entries = performance.getEntriesByName('ai-step2:nav-to-render-ready')
        const duration = entries[entries.length - 1]?.duration
        if (import.meta.env.DEV && typeof duration === 'number') {
          console.debug(`[ai-step2-monitor][perf] ai-step2:nav-to-render-ready: ${Math.round(duration)}ms`)
        }
      }
    })
  }, [isListMode, loading, listItems.length])

  const openViewerByAsset = (asset) => {
    const nextIndex = assets.findIndex((candidate) => candidate.id === asset.id)
    if (nextIndex < 0) return
    setViewerIndex(nextIndex)
    setZoom(1)
  }

  const closeViewer = () => {
    setViewerIndex(-1)
    setZoom(1)
  }

  return (
    <MonitorLayout>
            <section
              id="overview"
              style={{
                border: `1px solid ${monitorTheme.border}`,
                borderRadius: monitorRadius.xxl,
                padding: designTokens.space[8],
                marginBottom: designTokens.space[7],
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <h1 style={{ ...TYPE.h2, color: monitorTheme.textPrimary }}>Geração de imagens IA</h1>
                <p style={{ ...TYPE.bodySmall, color: monitorTheme.textMuted, marginTop: 4 }}>
                  {isListMode
                    ? 'Painel de controle com visão geral de todos os jobs.'
                    : 'Acompanhe status, previews, downloads e dados coletados no onboarding.'}
                </p>
                {lastUpdatedAt ? (
                  <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginTop: 8 }}>
                    Última atualização: {formatDate(lastUpdatedAt)}
                  </p>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!isListMode ? <StatusBadge status={job?.status} /> : null}
                {!isListMode ? (
                  <DashboardButton type="button" onClick={backToList} variant="secondary">
                    Voltar para lista
                  </DashboardButton>
                ) : null}
                <DashboardButton type="button" onClick={() => reload({ silent: true })} variant="secondary">
                  {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Atualizar
                </DashboardButton>
              </div>
            </section>

            {error ? (
              <InlineNotice tone="error" style={{ marginBottom: 16 }}>
                <strong>Erro:</strong> {error}
              </InlineNotice>
            ) : null}

            {actionError ? (
              <InlineNotice tone="error" style={{ marginBottom: 16 }}>
                <strong>Falha no reprocessamento:</strong> {actionError}
              </InlineNotice>
            ) : null}

            {actionSuccess ? (
              <InlineNotice tone="success" style={{ marginBottom: 16 }}>
                {actionSuccess}
              </InlineNotice>
            ) : null}

            {loading ? (
              <div className="animate-pulse" style={{ display: 'grid', gap: 14 }}>
                <div style={{ height: 100, borderRadius: monitorRadius.xl, background: monitorTheme.borderSoft }} />
                <div style={{ height: 280, borderRadius: monitorRadius.xl, background: monitorTheme.borderSoft }} />
              </div>
            ) : isListMode ? (
              <ListModePanel
                listSummary={listSummary}
                listItems={listItems}
                pagination={pagination}
                listStatus={listStatus}
                listCelebrity={listCelebrity}
                listCompra={listCompra}
                availablePurchases={availablePurchases}
                releaseOnboarding={canAdminMutate ? releaseOnboarding : null}
                openJobDetail={openJobDetail}
                updateListFilters={updateListFilters}
                canMutate={canAdminMutate}
              />
            ) : (
              <DetailModePanel
                data={data}
                assets={assets}
                onboarding={onboarding}
                identity={identity}
                briefing={briefing}
                progress={progress}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                activeGalleryCategory={activeGalleryCategory}
                onGalleryCategoryChange={setActiveGalleryCategory}
                onOpenViewer={openViewerByAsset}
                onRetrySingleAsset={canOperate ? retrySingleAsset : null}
                onRetryFailedAssets={canOperate ? retryFailedAssets : null}
                onRetryCategory={canOperate ? retryCategory : null}
                retryingAssetId={retryingAssetId}
                retryingAll={retryingAll}
                retryingCategory={retryingCategory}
                savingEdits={savingEdits}
                onSaveEdits={saveOnboardingEdits}
                onRerunAll={rerunAllAssets}
                compraId={effectiveCompraId}
                jobId={jobId}
                reload={reload}
                canMutate={canAdminMutate}
                canOperate={canOperate}
              />
            )}
      {!isListMode && currentAsset ? (
        <ImageViewer
          assets={assets}
          viewerIndex={viewerIndex}
          zoom={zoom}
          onZoomIn={() => setZoom((value) => Math.min(3, Number((value + 0.2).toFixed(2))))}
          onZoomOut={() => setZoom((value) => Math.max(0.6, Number((value - 0.2).toFixed(2))))}
          onClose={closeViewer}
          onPrevious={() => setViewerIndex((index) => (index <= 0 ? assets.length - 1 : index - 1))}
          onNext={() => setViewerIndex((index) => (index >= assets.length - 1 ? 0 : index + 1))}
        />
      ) : null}
    </MonitorLayout>
  )
}
