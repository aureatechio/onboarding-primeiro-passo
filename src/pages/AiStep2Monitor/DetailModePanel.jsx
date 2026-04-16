import { useState } from 'react'
import { AlertTriangle, Image as ImageIcon, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <h3 style={{ ...TYPE.h3, color: monitorTheme.textPrimary, margin: 0 }}>
                  {currentGroup?.label || 'Categoria'}
                </h3>
                {currentGroup && currentGroup.items.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => onRetryCategory(currentGroup.key)}
                    disabled={
                      retryingCategory === currentGroup.key || retryingAll ||
                      currentGroup.items.some((a) => a.status === 'pending' || a.status === 'processing')
                    }
                    title="Regenerar todas as imagens desta categoria"
                    style={{
                      border: `1px solid ${monitorTheme.borderStrong}`,
                      background: monitorTheme.pageBg,
                      color: monitorTheme.textSecondary,
                      borderRadius: monitorRadius.md,
                      padding: '6px 10px',
                      cursor:
                        retryingCategory === currentGroup.key || retryingAll
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: retryingCategory === currentGroup.key || retryingAll ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {retryingCategory === currentGroup.key ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <RotateCcw size={13} />
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
                    const isPendingOrProcessing =
                      asset.status === 'pending' || asset.status === 'processing'
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
                                {isPendingOrProcessing ? (
                                  <Loader2 size={28} className="animate-spin" />
                                ) : (
                                  <ImageIcon size={28} />
                                )}
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
                              disabled={isRetryingThis || retryingAll || retryingCategory === asset.group_name}
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
                          ) : asset.status === 'completed' ? (
                            <button
                              type="button"
                              onClick={() => onRetrySingleAsset(asset.id)}
                              disabled={isRetryingThis || retryingAll || retryingCategory === asset.group_name}
                              title="Regenerar imagem — gera uma nova versao"
                              style={{
                                border: `1px solid ${monitorTheme.borderStrong}`,
                                background: monitorTheme.pageBg,
                                color: monitorTheme.textMuted,
                                borderRadius: monitorRadius.md,
                                width: 30,
                                height: 30,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isRetryingThis || retryingAll ? 'not-allowed' : 'pointer',
                                opacity: isRetryingThis || retryingAll ? 0.6 : 1,
                              }}
                            >
                              {isRetryingThis ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                            </button>
                          ) : isPendingOrProcessing ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                              style={{ color: monitorTheme.textMuted }}
                            />
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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <h3 style={{ ...TYPE.h3, color: monitorTheme.textPrimary }}>Dados do onboarding</h3>
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
                    style={saveBtnStyle}
                  >
                    {savingEdits ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Salvando…
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              )}
            </div>

            <DataRow label="Cliente" value={onboarding?.client?.name} />
            <DataRow label="Celebridade" value={onboarding?.celebrity?.name} />
            <DataRow label="Status pagamento" value={onboarding?.compra?.checkout_status} />
            <DataRow label="Status contrato" value={onboarding?.compra?.clicksign_status} />

            {editMode ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px minmax(0,1fr)',
                  gap: 10,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: `1px solid ${monitorTheme.borderSoft}`,
                }}
              >
                <div style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>Producao</div>
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
              <DataRow label="Producao" value={identity?.production_path} />
            )}

            <DataRow label="Escolha identidade" value={identity?.choice} />

            <DataRow
              label="Fonte"
              value={editMode ? draft.font_choice : identity?.font_choice}
              editable={editMode}
              onChange={(v) => setDraft((d) => ({ ...d, font_choice: v }))}
            />

            <DataRow
              label="Paleta"
              value={
                editMode ? draft.brand_palette : (identity?.brand_palette || []).join(', ')
              }
              editable={editMode}
              multiline={editMode}
              mono
              onChange={(v) => setDraft((d) => ({ ...d, brand_palette: v }))}
            />
            {editMode ? (
              <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, padding: '4px 0 8px 190px' }}>
                Uma cor por linha ou separadas por vírgula. Ex: #384ffe
              </p>
            ) : null}

            <DataRow
              label="Notas"
              value={editMode ? draft.campaign_notes : identity?.campaign_notes}
              editable={editMode}
              multiline={editMode}
              onChange={(v) => setDraft((d) => ({ ...d, campaign_notes: v }))}
            />

            <DataRow
              label="Site URL"
              value={editMode ? draft.site_url : identity?.site_url}
              editable={editMode}
              onChange={(v) => setDraft((d) => ({ ...d, site_url: v }))}
            />

            <DataRow
              label="Briefing Perplexity"
              value={
                briefing?.provider === 'perplexity' && briefing?.status === 'done'
                  ? 'Sim (done)'
                  : 'Nao'
              }
            />
            <DataRow label="Briefing modo" value={briefing?.mode} />

            <DataRow
              label="Briefing texto"
              value={editMode ? draft.brief_text : briefing?.brief_text}
              editable={editMode}
              multiline={editMode}
              onChange={(v) => setDraft((d) => ({ ...d, brief_text: v }))}
            />

            <DataRow label="Transcript status" value={briefing?.transcript_status} />

            {!editMode ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={onRerunAll}
                  disabled={retryingAll}
                  style={rerunBtnStyle}
                >
                  {retryingAll ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Disparando…
                    </>
                  ) : (
                    'Rodar job novamente'
                  )}
                </button>
              </div>
            ) : null}

            {savedOk ? (
              <p
                style={{
                  ...TYPE.caption,
                  color: monitorTheme.completedText,
                  marginTop: 8,
                  textAlign: 'right',
                }}
              >
                Dados salvos. Clique em &ldquo;Rodar job novamente&rdquo; para reprocessar.
              </p>
            ) : null}
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
          <div
            style={{
              border: `1px solid ${monitorTheme.border}`,
              borderRadius: monitorRadius.md,
              padding: 10,
              marginBottom: 10,
              background: monitorTheme.pageBg,
            }}
          >
            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted }}>
              Falhas worker: {diagnostics?.worker_failures_count || 0}
            </p>
            <p style={{ ...TYPE.caption, color: monitorTheme.textMuted, marginTop: 2 }}>
              Origem da ultima falha: {diagnostics?.last_failure_source || 'unknown'}
            </p>
            {lastError ? (
              <p style={{ ...TYPE.caption, color: monitorTheme.dangerTextStrong, marginTop: 2 }}>
                Ultimo erro: {lastError.error_type} ({lastError.created_at || 'sem data'})
              </p>
            ) : null}
            {diagnosticFlags.length > 0 ? (
              <p style={{ ...TYPE.caption, color: monitorTheme.dangerTextStrong, marginTop: 2 }}>
                Flags de inconsistencia: {diagnosticFlags.join(', ')}
              </p>
            ) : null}
          </div>
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

const editBtnStyle = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: monitorTheme.pageBg,
  color: monitorTheme.textPrimary,
  borderRadius: monitorRadius.md,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
}

const cancelBtnStyle = {
  border: `1px solid ${monitorTheme.borderStrong}`,
  background: monitorTheme.pageBg,
  color: monitorTheme.textMuted,
  borderRadius: monitorRadius.md,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 13,
}

const saveBtnStyle = {
  border: 'none',
  background: '#384ffe',
  color: '#fff',
  borderRadius: monitorRadius.md,
  padding: '6px 14px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const rerunBtnStyle = {
  border: 'none',
  background: '#384ffe',
  color: '#fff',
  borderRadius: monitorRadius.md,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
}

const selectStyle = {
  border: `1px solid ${monitorTheme.border}`,
  background: monitorTheme.cardMutedBg,
  color: monitorTheme.textPrimary,
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 13,
  width: '100%',
}
