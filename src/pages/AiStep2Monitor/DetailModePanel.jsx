import { AlertTriangle, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react'
import { TYPE, designTokens } from '../../theme/design-tokens'
import { ASPECT_RATIOS, ASSET_GROUPS, DETAIL_TABS, GALLERY_CATEGORY_TABS } from './constants'
import DataRow from './components/DataRow'
import ProgressBar from './components/ProgressBar'
import TabBar from './components/TabBar'
import { normalizeGroupName } from './utils'
import { monitorRadius, monitorTheme } from './theme'

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
  retryingAssetId,
  retryingAll,
}) {
  const groupedAssets = ASSET_GROUPS.map((group) => ({
    ...group,
    items: assets.filter((asset) => normalizeGroupName(asset.group_name) === group.key),
  }))
  const currentGroup =
    groupedAssets.find((group) => group.key === activeGalleryCategory) || groupedAssets[0]
  const failedAssets = assets.filter((asset) => asset.status === 'failed')

  return (
    <>
      <TabBar tabs={DETAIL_TABS} activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === 'gallery' ? (
        <section>
          {failedAssets.length > 0 ? (
            <div
              style={{
                border: `1px solid ${monitorTheme.dangerBorder}`,
                background: monitorTheme.dangerBg,
                color: monitorTheme.dangerTextStrong,
                borderRadius: monitorRadius.xl,
                padding: designTokens.space[5],
                marginBottom: designTokens.space[6],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertTriangle size={18} style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ ...TYPE.bodySmall, color: monitorTheme.dangerTextStrong }}>
                      Tivemos uma instabilidade temporaria no provedor de imagens.
                    </p>
                    <p style={{ ...TYPE.caption, color: monitorTheme.dangerText, marginTop: 2 }}>
                      {failedAssets.length} asset(s) com falha. Voce pode tentar novamente agora.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRetryFailedAssets}
                  disabled={retryingAll}
                  style={{
                    border: `1px solid ${monitorTheme.dangerBorder}`,
                    background: monitorTheme.pageBg,
                    color: monitorTheme.dangerTextStrong,
                    borderRadius: monitorRadius.md,
                    padding: '8px 10px',
                    cursor: retryingAll ? 'not-allowed' : 'pointer',
                    opacity: retryingAll ? 0.7 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                  }}
                >
                  {retryingAll ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Reprocessar todas com erro
                </button>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: designTokens.space[5],
              marginBottom: designTokens.space[7],
            }}
          >
            {[
              { label: 'Total esperado', value: progress.total_expected ?? 12 },
              { label: 'Total gerado', value: progress.total_generated ?? 0 },
              { label: 'Percentual', value: `${progress.percent ?? 0}%` },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  border: `1px solid ${monitorTheme.border}`,
                  borderRadius: monitorRadius.xl,
                  padding: designTokens.space[6],
                }}
              >
                <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>{item.label}</p>
                <p style={{ ...TYPE.h3, color: monitorTheme.textPrimary, marginTop: 8 }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              border: `1px solid ${monitorTheme.border}`,
              borderRadius: monitorRadius.xl,
              padding: designTokens.space[6],
              marginBottom: designTokens.space[8],
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>Andamento</span>
              <span style={{ ...TYPE.caption, color: monitorTheme.textSecondary }}>{progress.percent ?? 0}%</span>
            </div>
            <ProgressBar percent={progress.percent} animated showLabel={false} height={10} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ ...TYPE.h3, color: monitorTheme.textPrimary }}>Previews por categoria</h2>
            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>{assets.length} assets</p>
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
                padding: 20,
                textAlign: 'center',
                color: monitorTheme.textMuted,
              }}
            >
              Nenhum preview disponivel ainda.
            </div>
          ) : (
            <div>
              <h3 style={{ ...TYPE.h3, color: monitorTheme.textPrimary, marginBottom: 10 }}>
                {currentGroup?.label || 'Categoria'}
              </h3>
              {!currentGroup || currentGroup.items.length === 0 ? (
                <div
                  style={{
                    border: `1px dashed ${monitorTheme.borderStrong}`,
                    borderRadius: monitorRadius.lg,
                    padding: 14,
                    color: monitorTheme.textMuted,
                  }}
                >
                  Nenhum asset nesta categoria.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: designTokens.space[5],
                  }}
                >
                  {currentGroup.items.map((asset, index) => {
                    const ratio = ASPECT_RATIOS[asset.format] || ASPECT_RATIOS['1:1']
                    const isFailed = asset.status === 'failed'
                    const isRetryingThis = retryingAssetId === asset.id

                    return (
                      <div
                        key={asset.id || `${asset.group_name}-${asset.format}-${index}`}
                        style={{
                          border: `1px solid ${isFailed ? monitorTheme.dangerBorder : monitorTheme.border}`,
                          borderRadius: monitorRadius.xl,
                          overflow: 'hidden',
                          background: monitorTheme.cardMutedBg,
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
                                  color: monitorTheme.sidebarTextMuted,
                                  background: monitorTheme.pageBg,
                                }}
                              >
                                <ImageIcon size={28} />
                              </div>
                            )}
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
                            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, margin: 0 }}>
                              {(asset.group_name || '-').toUpperCase()} · {asset.format || '-'}
                            </p>
                            <p
                              style={{
                                ...TYPE.caption,
                                marginTop: 3,
                                color: isFailed ? monitorTheme.failedText : monitorTheme.textMuted,
                              }}
                            >
                              {asset.status || 'unknown'}
                            </p>
                          </div>
                          {isFailed ? (
                            <button
                              type="button"
                              onClick={() => onRetrySingleAsset(asset.id)}
                              disabled={isRetryingThis || retryingAll}
                              title="Reprocessar esta imagem"
                              style={{
                                border: `1px solid ${monitorTheme.dangerBorder}`,
                                background: monitorTheme.dangerBg,
                                color: monitorTheme.dangerTextStrong,
                                borderRadius: monitorRadius.md,
                                width: 30,
                                height: 30,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isRetryingThis || retryingAll ? 'not-allowed' : 'pointer',
                                opacity: isRetryingThis || retryingAll ? 0.7 : 1,
                              }}
                            >
                              {isRetryingThis ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RotateCcw size={14} />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'onboarding-data' ? (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
            gap: designTokens.space[5],
          }}
        >
          <div style={panelStyles}>
            <h3 style={{ ...TYPE.h3, color: monitorTheme.textPrimary, marginBottom: 10 }}>
              Dados do onboarding
            </h3>
            <DataRow label="Cliente" value={onboarding?.client?.name} />
            <DataRow label="Celebridade" value={onboarding?.celebrity?.name} />
            <DataRow label="Status pagamento" value={onboarding?.compra?.checkout_status} />
            <DataRow label="Status contrato" value={onboarding?.compra?.clicksign_status} />
            <DataRow label="Producao" value={identity?.production_path} />
            <DataRow label="Escolha identidade" value={identity?.choice} />
            <DataRow label="Fonte" value={identity?.font_choice} />
            <DataRow label="Paleta" value={(identity?.brand_palette || []).join(', ')} mono />
            <DataRow label="Notas" value={identity?.campaign_notes} />
            <DataRow
              label="Briefing Perplexity"
              value={
                briefing?.provider === 'perplexity' && briefing?.status === 'done'
                  ? 'Sim (done)'
                  : 'Nao'
              }
            />
            <DataRow label="Briefing modo" value={briefing?.mode} />
            <DataRow label="Briefing texto" value={briefing?.brief_text} />
            <DataRow label="Transcript status" value={briefing?.transcript_status} />
          </div>

          <div style={panelStyles}>
            <h3 style={{ ...TYPE.h3, color: monitorTheme.textPrimary, marginBottom: 10 }}>
              Uploads e anexos
            </h3>
            <DataRow label="Logo path" value={identity?.uploads?.logo_path} mono />
            <DataRow
              label="Imagens enviadas"
              value={String(identity?.uploads?.campaign_images_paths?.length || 0)}
            />
            <DataRow label="Audio path" value={briefing?.audio_path} mono />
            <DataRow label="Audio duracao (s)" value={String(briefing?.audio_duration_sec || '-')} />

            {identity?.uploads?.logo_url ? (
              <div style={{ marginTop: 12 }}>
                <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginBottom: 8 }}>
                  Preview logo
                </p>
                <img
                  src={identity.uploads.logo_url}
                  alt="Logo enviado"
                  style={{
                    width: 120,
                    aspectRatio: '1 / 1',
                    objectFit: 'contain',
                    borderRadius: monitorRadius.md,
                    border: `1px solid ${monitorTheme.border}`,
                    background: monitorTheme.cardMutedBg,
                    cursor: 'pointer',
                  }}
                  onClick={() => window.open(identity.uploads.logo_url, '_blank', 'noopener,noreferrer')}
                />
              </div>
            ) : null}

            {(identity?.uploads?.campaign_images_urls || []).length > 0 ? (
              <div style={{ marginTop: 12 }}>
                <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginBottom: 8 }}>
                  Previews das imagens da campanha
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill,minmax(92px,1fr))',
                    gap: 8,
                  }}
                >
                  {identity.uploads.campaign_images_urls.map((imageUrl, index) => (
                    <img
                      key={`${imageUrl}-${index}`}
                      src={imageUrl}
                      alt={`Imagem de campanha ${index + 1}`}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        borderRadius: monitorRadius.sm,
                        border: `1px solid ${monitorTheme.border}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {briefing?.audio_url ? (
              <audio controls style={{ width: '100%', marginTop: 12 }}>
                <source src={briefing.audio_url} />
              </audio>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === 'errors' ? (
        <section
          style={{
            border: `1px solid ${monitorTheme.dangerBorder}`,
            borderRadius: monitorRadius.xl,
            padding: designTokens.space[6],
          }}
        >
          <h3 style={{ ...TYPE.h3, color: monitorTheme.dangerText, marginBottom: 10 }}>
            Erros do pipeline
          </h3>
          {data?.errors?.length > 0 ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {data.errors.map((errorItem) => (
                <div
                  key={errorItem.id}
                  style={{
                    borderRadius: monitorRadius.md,
                    background: monitorTheme.dangerBg,
                    border: `1px solid ${monitorTheme.dangerBorder}`,
                    padding: 10,
                  }}
                >
                  <p style={{ ...TYPE.caption, color: monitorTheme.dangerTextStrong }}>
                    {errorItem.group_name} · {errorItem.format} · tentativa {errorItem.attempt}
                  </p>
                  <p style={{ ...TYPE.bodySmall, color: monitorTheme.dangerText, marginTop: 4 }}>
                    {errorItem.error_message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ ...TYPE.bodySmall, color: monitorTheme.dangerText }}>
              Nenhum erro registrado para este job.
            </p>
          )}
        </section>
      ) : null}
    </>
  )
}

const panelStyles = {
  border: `1px solid ${monitorTheme.border}`,
  borderRadius: monitorRadius.xl,
  padding: designTokens.space[6],
}
