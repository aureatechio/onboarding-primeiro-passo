import { useEffect, useState } from 'react'
import { monitorTheme, monitorRadius } from '../../theme'
import { useOnboardingEdit } from '../../useOnboardingEdit'
import OnboardingDataCard from './OnboardingDataCard'
import EditableField from './EditableField'
import ReadOnlyBadge from './ReadOnlyBadge'
import PaletteEditor from './PaletteEditor'
import SiteInstagramEditor from './SiteInstagramEditor'
import LogoManager from './LogoManager'
import ChangeBanner, { readBannerState, setBannerState } from './ChangeBanner'

const MONO = `'JetBrains Mono', 'Fira Mono', monospace`

function FieldRow({ label, value, badge, mono }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
        borderBottom: `1px dashed ${monitorTheme.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: monitorTheme.textMuted,
          }}
        >
          {label}
        </span>
        {badge}
      </div>
      <span
        style={{
          fontSize: 13,
          color: value ? monitorTheme.textPrimary : monitorTheme.textMuted,
          fontFamily: mono ? MONO : undefined,
          textAlign: 'right',
          maxWidth: '60%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={value || ''}
      >
        {value || '—'}
      </span>
    </div>
  )
}

export default function OnboardingDataTab({
  compraId,
  jobId,
  onboarding,
  identity,
  briefing,
  reload,
  readOnly = false,
}) {
  const {
    savingField,
    uploadingLogo,
    busyLogoId,
    regenerating,
    lastError,
    saveIdentityField,
    uploadLogo,
    setActiveLogo,
    deleteLogoFromHistory,
    regenerateJobs,
  } = useOnboardingEdit({ compraId, jobId, onMutated: reload })

  const [bannerActive, setBannerActiveState] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    setBannerActiveState(readBannerState(compraId))
  }, [compraId])

  function markBanner(active) {
    setBannerState(compraId, active)
    setBannerActiveState(active)
  }

  const handleFieldSave = (field) => async (value, options) => {
    if (readOnly) return { ok: false, message: 'Somente admins podem editar dados do onboarding.' }
    const res = await saveIdentityField(field, value, options)
    if (res.ok) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }))
      markBanner(true)
    } else {
      setFieldErrors((prev) => ({ ...prev, [field]: res.message }))
    }
    return res
  }

  const handlePaletteSave = async (colors) => {
    if (readOnly) return { ok: false, message: 'Somente admins podem editar dados do onboarding.' }
    const res = await saveIdentityField('brand_palette', colors)
    if (res.ok) {
      setFieldErrors((prev) => ({ ...prev, brand_palette: null }))
      markBanner(true)
    } else {
      setFieldErrors((prev) => ({ ...prev, brand_palette: res.message }))
    }
    return res
  }

  const handleLogoUpload = async (file) => {
    if (readOnly) return { ok: false, message: 'Somente admins podem editar logos.' }
    const res = await uploadLogo(file)
    if (res.ok) markBanner(true)
    return res
  }

  const handleSetActive = async (id) => {
    if (readOnly) return { ok: false, message: 'Somente admins podem editar logos.' }
    const res = await setActiveLogo(id)
    if (res.ok) markBanner(true)
    return res
  }

  const handleDelete = async (id) => {
    if (readOnly) return { ok: false, message: 'Somente admins podem editar logos.' }
    if (!window.confirm('Deletar este logo do historico? Esta acao nao pode ser desfeita.')) {
      return { ok: false, message: 'cancelado' }
    }
    const res = await deleteLogoFromHistory(id)
    return res
  }

  const handleRegenerate = async () => {
    if (readOnly) return
    const res = await regenerateJobs()
    if (res.ok) markBanner(false)
  }

  const logoHistory = identity?.logo_history || []
  const activeLogoUrl =
    logoHistory.find((entry) => entry.is_active)?.logo_url || identity?.uploads?.logo_url || null

  return (
    <div>
      <ChangeBanner
        active={bannerActive && !readOnly}
        onRegenerate={handleRegenerate}
        onDismiss={() => markBanner(false)}
        regenerating={regenerating}
      />

      {readOnly && (
        <div
          style={{
            padding: '10px 14px',
            background: monitorTheme.neutralBadgeBg,
            border: `1px solid ${monitorTheme.border}`,
            borderRadius: 10,
            color: monitorTheme.textSecondary,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          Somente admins podem editar estes dados.
        </div>
      )}

      {lastError && lastError.field === 'regenerate' && (
        <div
          style={{
            padding: '10px 14px',
            background: monitorTheme.dangerBg,
            border: `1px solid ${monitorTheme.dangerBorder}`,
            borderRadius: 10,
            color: monitorTheme.dangerTextStrong,
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {lastError.message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OnboardingDataCard
            title="Marca"
            description="Nome exibido em prompts e criativos. Tem precedencia sobre o nome do cliente."
          >
            {readOnly ? (
              <FieldRow label="Nome da marca" value={identity?.brand_display_name || onboarding?.client?.name} />
            ) : (
            <EditableField
              label="Nome da marca"
              value={identity?.brand_display_name || ''}
              onSave={handleFieldSave('brand_display_name')}
              placeholder={onboarding?.client?.name || 'Nome da marca'}
              saving={savingField === 'brand_display_name'}
              error={fieldErrors.brand_display_name}
              maxLength={120}
              help="Se vazio, usa o nome do cliente."
            />
            )}
          </OnboardingDataCard>

          <OnboardingDataCard
            title="Contrato"
            description="Dados do contrato e pagamento."
            actions={<ReadOnlyBadge reason="Gerenciado pelo fluxo de checkout e assinatura." />}
          >
            <FieldRow label="Cliente" value={onboarding?.client?.name} />
            <FieldRow label="Celebridade" value={onboarding?.celebrity?.name} />
            <FieldRow label="Pagamento" value={onboarding?.compra?.checkout_status} />
            <FieldRow label="Contrato" value={onboarding?.compra?.clicksign_status} />
          </OnboardingDataCard>

          <OnboardingDataCard
            title="Identidade Visual"
            description="Fonte e paleta editaveis. Producao/identidade definidos no onboarding."
          >
            <FieldRow
              label="Producao"
              value={identity?.production_path}
              badge={<ReadOnlyBadge reason="Definido no onboarding." />}
            />
            <FieldRow
              label="Identidade"
              value={identity?.choice}
              badge={<ReadOnlyBadge reason="Escolha feita no onboarding." />}
            />
            <div style={{ marginTop: 14 }}>
              {readOnly ? (
                <FieldRow label="Fonte" value={identity?.font_choice} />
              ) : (
              <EditableField
                label="Fonte"
                value={identity?.font_choice || ''}
                onSave={handleFieldSave('font_choice')}
                placeholder="Ex: Inter, Roboto"
                saving={savingField === 'font_choice'}
                error={fieldErrors.font_choice}
                maxLength={80}
              />
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: monitorTheme.textMuted,
                  marginBottom: 8,
                }}
              >
                Paleta da marca
              </label>
              {readOnly ? (
                <FieldRow label="Cores" value={(identity?.brand_palette || []).join(', ')} />
              ) : (
              <PaletteEditor
                value={identity?.brand_palette || []}
                onSave={handlePaletteSave}
                saving={savingField === 'brand_palette'}
                error={fieldErrors.brand_palette}
              />
              )}
            </div>
          </OnboardingDataCard>

          <OnboardingDataCard
            title="Presenca Digital"
            description="Site e Instagram alimentam o briefing. Marque re-enriquecer para disparar onboarding-enrichment."
          >
            {readOnly ? (
              <>
                <FieldRow label="Site" value={identity?.site_url} />
                <FieldRow label="Instagram" value={identity?.instagram_handle} />
              </>
            ) : (
              <SiteInstagramEditor
                siteUrl={identity?.site_url || ''}
                instagramHandle={identity?.instagram_handle || ''}
                onSave={async (field, value, options) => handleFieldSave(field)(value, options)}
                saving={savingField === 'site_url' || savingField === 'instagram_handle'}
                fieldErrors={fieldErrors}
              />
            )}
          </OnboardingDataCard>

          <OnboardingDataCard
            title="Briefing"
            description="Notas internas e texto do briefing de campanha."
          >
            {readOnly ? (
              <FieldRow label="Notas da campanha" value={identity?.campaign_notes} />
            ) : (
            <EditableField
              label="Notas da campanha"
              value={identity?.campaign_notes || ''}
              onSave={handleFieldSave('campaign_notes')}
              placeholder="Observacoes internas sobre a campanha"
              saving={savingField === 'campaign_notes'}
              error={fieldErrors.campaign_notes}
              multiline
              rows={4}
              maxLength={2000}
            />
            )}
            <FieldRow
              label="Modo"
              value={briefing?.mode}
              badge={<ReadOnlyBadge reason="Definido pelo provider." />}
            />
            <FieldRow
              label="Transcript"
              value={briefing?.transcript_status}
              badge={<ReadOnlyBadge reason="Pipeline de transcricao." />}
            />
            <FieldRow
              label="Briefing"
              value={briefing?.brief_text ? `${briefing.brief_text.slice(0, 80)}…` : null}
              badge={<ReadOnlyBadge reason="Gerado pelo Perplexity. Edite via regenerar briefing." />}
            />
          </OnboardingDataCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <OnboardingDataCard
            title="Logo"
            description="Upload de novo logo ativa imediatamente. Historico preserva versoes anteriores."
          >
            <LogoManager
              activeLogoUrl={activeLogoUrl}
              logoHistory={logoHistory}
              onUpload={handleLogoUpload}
              onSetActive={handleSetActive}
              onDelete={handleDelete}
              uploading={uploadingLogo}
              busyLogoId={busyLogoId}
              error={lastError?.field?.startsWith('logo_') ? lastError.message : null}
              readOnly={readOnly}
            />
          </OnboardingDataCard>

          {(identity?.uploads?.campaign_images_urls || []).length > 0 && (
            <OnboardingDataCard
              title="Imagens da campanha"
              description={`${identity.uploads.campaign_images_urls.length} imagem(ns) enviadas no onboarding.`}
              actions={<ReadOnlyBadge reason="Uploads feitos no onboarding do cliente." />}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))',
                  gap: 8,
                }}
              >
                {identity.uploads.campaign_images_urls.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                    style={{
                      border: `1px solid ${monitorTheme.border}`,
                      background: 'transparent',
                      padding: 0,
                      cursor: 'pointer',
                      borderRadius: monitorRadius.sm,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Imagem ${idx + 1}`}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                    />
                  </button>
                ))}
              </div>
            </OnboardingDataCard>
          )}

          {briefing?.audio_url && (
            <OnboardingDataCard
              title="Audio do briefing"
              actions={<ReadOnlyBadge reason="Gravado pelo cliente no onboarding." />}
            >
              <audio controls style={{ width: '100%', colorScheme: 'dark', borderRadius: 8 }}>
                <source src={briefing.audio_url} />
              </audio>
              <div style={{ marginTop: 8, fontSize: 11, color: monitorTheme.textMuted }}>
                Duracao: {briefing?.audio_duration_sec || '—'}s
              </div>
            </OnboardingDataCard>
          )}
        </div>
      </div>
    </div>
  )
}
