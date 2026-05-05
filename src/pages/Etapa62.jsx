import { useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { useCopy } from "../context/CopyContext"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"
import ProcessingOverlay from "../components/ProcessingOverlay"
import ColorSwatch from "../components/ColorSwatch"
import { extractColorsFromFile } from "../lib/color-extractor"
import { stripTrackingParams } from "../lib/url-utils"

async function saveIdentityToBackend(compraId, { choice, logoFile, siteUrl, instagramHandle, brandColors }) {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim()
  if (!supabaseUrl) {
    console.warn("[etapa62] VITE_SUPABASE_URL missing, skipping identity save")
    return { success: true, skipped: true }
  }

  const formData = new FormData()
  formData.append("compra_id", compraId)
  formData.append("choice", choice)

  if (choice === "add_now") {
    if (logoFile) formData.append("logo", logoFile)
    if (siteUrl) formData.append("site_url", siteUrl)
    if (instagramHandle) formData.append("instagram_handle", instagramHandle)
    if (brandColors?.length) formData.append("brand_palette", JSON.stringify(brandColors))

    const parts = []
    if (siteUrl) parts.push(`Site: ${siteUrl}`)
    if (instagramHandle) parts.push(`Instagram: https://www.instagram.com/${instagramHandle}`)
    if (parts.length) formData.append("campaign_notes", parts.join(' | '))
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/save-onboarding-identity`, {
      method: "POST",
      body: formData,
    })
    return await res.json()
  } catch (err) {
    console.error("[etapa62] identity save failed:", err)
    return { success: false, error: "network" }
  }
}

function validateUrl(value) {
  if (!value) return true
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try { new URL(withProtocol); return true } catch { return false }
}

function extractInstagramHandle(raw) {
  let value = raw.trim()

  if (/instagram\.com/i.test(value)) {
    try {
      const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
      const url = new URL(withProtocol)
      const segments = url.pathname.split('/').filter(Boolean)
      if (segments.length > 0) value = segments[0]
    } catch {
      // fall through to string cleanup
    }
  }

  value = value.replace(/^@/, '')
  value = value.split('?')[0].split('#')[0].replace(/\/+$/, '')
  if (value.includes('/')) value = value.split('/').filter(Boolean)[0] || ''
  value = value.replace(/[^a-zA-Z0-9._]/g, '')

  return value.slice(0, 30)
}

function validateInstagramHandle(value) {
  if (!value) return true
  return /^[a-zA-Z0-9][a-zA-Z0-9._]{0,28}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(value) &&
    !/\.\./.test(value)
}

function validateLogoFile(file) {
  if (!file) return { valid: true, error: null }
  const allowed = [
    'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp',
    'image/heic', 'image/heif', 'application/pdf',
  ]
  const ext = (file.name || '').split('.').pop()?.toLowerCase()
  const heicByExtension = ['heic', 'heif'].includes(ext)
  if (!allowed.includes(file.type) && !heicByExtension) {
    return { valid: false, error: `Formato não suportado. Use PNG, JPG, PDF, WebP, SVG, HEIC ou HEIF.` }
  }
  if (file.size > 5 * 1024 * 1024) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `Arquivo muito grande (${sizeMB} MB). Máximo: 5 MB.` }
  }
  return { valid: true, error: null }
}

export default function Etapa62() {
  const { userData, updateUserData, hydrationCompraId, isReviewMode, goNext } = useOnboarding()
  const { ETAPA62 } = useCopy()

  const alreadyDone = Boolean(userData.identityBonusChoice)
  const showReadOnlyReview = isReviewMode && alreadyDone
  const [completed, setCompleted] = useState(alreadyDone)
  const [pendingMode, setPendingMode] = useState(alreadyDone ? userData.identityBonusPending : false)

  const [showSimpleMode, setShowSimpleMode] = useState(false)
  const [logoName, setLogoName] = useState("")
  const [logoFile, setLogoFile] = useState(null)
  const [logoValidationError, setLogoValidationError] = useState(null)
  const [siteUrl, setSiteUrl] = useState(userData.siteUrl || '')
  const [siteUrlError, setSiteUrlError] = useState(null)
  const [instagramHandle, setInstagramHandle] = useState(userData.instagramHandle || '')
  const [instagramUrlError, setInstagramUrlError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [brandColors, setBrandColors] = useState(userData.brandPalette || [])
  const [isExtractingColors, setIsExtractingColors] = useState(false)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null)

  const logoInputRef = useRef(null)

  const handleLogoChange = useCallback(async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const result = validateLogoFile(file)
    if (!result.valid) {
      setLogoValidationError(result.error)
      setLogoName("")
      setLogoFile(null)
      if (logoInputRef.current) logoInputRef.current.value = ""
      return
    }
    setLogoValidationError(null)
    setLogoName(file.name)
    setLogoFile(file)

    // Preview with background removal attempt
    const isPdf = file.type === 'application/pdf'
    const isSvg = file.type === 'image/svg+xml'
    if (!isPdf) {
      if (!isSvg) {
        try {
          const { removeSimpleBackground } = await import('../lib/logo-bg-remover')
          const processedBlob = await removeSimpleBackground(file)
          if (processedBlob) {
            setLogoPreviewUrl(URL.createObjectURL(processedBlob))
          } else {
            setLogoPreviewUrl(URL.createObjectURL(file))
          }
        } catch {
          setLogoPreviewUrl(URL.createObjectURL(file))
        }
      } else {
        setLogoPreviewUrl(URL.createObjectURL(file))
      }
    } else {
      setLogoPreviewUrl(null)
    }

    // Extract colors
    setIsExtractingColors(true)
    try {
      const colors = await extractColorsFromFile(file, 2)
      if (colors.length > 0) setBrandColors(colors)
    } catch {
      // silent — user can add colors manually
    } finally {
      setIsExtractingColors(false)
    }
  }, [])

  const handleColorChange = useCallback((index, newColor) => {
    setBrandColors((prev) => prev.map((c, i) => (i === index ? newColor : c)))
  }, [])

  const handleRemoveColor = useCallback((index) => {
    setBrandColors((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleAddColor = useCallback(() => {
    if (brandColors.length >= 8) return
    setBrandColors((prev) => [...prev, '#E8356D'])
  }, [brandColors.length])

  const handleRemoveLogo = useCallback(() => {
    setLogoName("")
    setLogoFile(null)
    setLogoValidationError(null)
    if (logoInputRef.current) logoInputRef.current.value = ""
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(null)
    setBrandColors([])
  }, [logoPreviewUrl])

  const handleContinueLater = useCallback(async () => {
    setSaveError(null)
    setIsSaving(true)
    try {
      if (hydrationCompraId) {
        await saveIdentityToBackend(hydrationCompraId, {
          choice: "later",
          logoFile: null,
          campaignNotes: "",
        })
      }
      updateUserData({ identityBonusChoice: "later", identityBonusPending: true })
      setPendingMode(true)
      setCompleted(true)
    } finally {
      setIsSaving(false)
    }
  }, [hydrationCompraId, updateUserData])

  const handleConfirm = useCallback(async () => {
    const siteValid = validateUrl(siteUrl)
    const igValid = validateInstagramHandle(instagramHandle)
    setSiteUrlError(siteUrl && !siteValid ? ETAPA62.modoSimplificado.siteError : null)
    setInstagramUrlError(instagramHandle && !igValid ? ETAPA62.modoSimplificado.instagramError : null)
    if ((siteUrl && !siteValid) || (instagramHandle && !igValid)) return

    setSaveError(null)
    setIsSaving(true)
    try {
      if (hydrationCompraId) {
        const result = await saveIdentityToBackend(hydrationCompraId, {
          choice: 'add_now',
          logoFile,
          siteUrl,
          instagramHandle,
          brandColors,
        })
        if (!result.success && !result.skipped) {
          setSaveError(result.message || result.error || 'Erro ao salvar identidade visual.')
          setIsSaving(false)
          return
        }
      }
      updateUserData({ identityBonusChoice: "add_now", identityBonusPending: false, siteUrl, instagramHandle, brandPalette: brandColors })
      setPendingMode(false)
      setCompleted(true)
    } finally {
      setIsSaving(false)
    }
  }, [
    hydrationCompraId,
    logoFile,
    siteUrl,
    instagramHandle,
    brandColors,
    updateUserData,
    ETAPA62.modoSimplificado.siteError,
    ETAPA62.modoSimplificado.instagramError,
  ])

  if (showReadOnlyReview) {
    const statusCopy = pendingMode ? ETAPA62.completionPending : ETAPA62.completionDone
    const statusColor = pendingMode ? COLORS.warning : COLORS.success

    return (
      <PageLayout>
        <StepHeader
          title={ETAPA62.header.title}
          readTime={ETAPA62.header.readTime}
          showPersonalized={true}
          stepLabel={ETAPA62.header.stepLabel}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
            border: `1px solid ${COLORS.accent}25`,
            borderRadius: 16, padding: 22, marginBottom: 16,
          }}
        >
          <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 900, margin: "0 0 10px 0" }}>
            {ETAPA62.bonificacaoTitle}
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            {ETAPA62.bonificacaoBody}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 20, marginBottom: 16,
          }}
        >
          <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 800, margin: "0 0 8px 0" }}>
            {ETAPA62.comoFunciona.title}
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 10px 0" }}>
            {ETAPA62.comoFunciona.body}
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 6px 0" }}>
            {ETAPA62.comoFunciona.exemploA}
          </p>
          <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            {ETAPA62.comoFunciona.exemploB}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: COLORS.card,
            border: `1px solid ${statusColor}30`,
            borderRadius: 14, padding: 20, marginBottom: 16,
          }}
        >
          <p style={{
            color: COLORS.textDim,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            margin: "0 0 12px 0",
          }}>
            {ETAPA62.reviewMode.statusLabel}
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `${statusColor}14`,
              border: `1px solid ${statusColor}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon name={pendingMode ? "clock" : "circleCheck"} size={18} color={statusColor} />
            </div>
            <div>
              <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: "0 0 6px 0" }}>
                {statusCopy.title}
              </p>
              <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: "0 0 10px 0" }}>
                {statusCopy.description}
              </p>
              <span style={{
                display: "inline-flex",
                color: statusColor,
                background: `${statusColor}10`,
                border: `1px solid ${statusColor}25`,
                borderRadius: 100,
                padding: "5px 10px",
                fontSize: 11,
                fontWeight: 800,
              }}>
                {statusCopy.badge}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{
            background: `${COLORS.success}10`,
            border: `1px solid ${COLORS.success}25`,
            borderRadius: 14, padding: 16, marginBottom: 16,
          }}
        >
          <p style={{ color: COLORS.success, fontSize: 13, fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
            {ETAPA62.startKitInfo}
          </p>
        </motion.div>

        <StickyFooter>
          <NavButtons
            onNext={goNext}
            nextLabel={ETAPA62.reviewMode.cta}
          />
        </StickyFooter>
      </PageLayout>
    )
  }

  if (completed) {
    return (
      <CompletionScreen
        icon={pendingMode ? "clock" : "circleCheck"}
        title={pendingMode ? ETAPA62.completionPending.title : ETAPA62.completionDone.title}
        description={pendingMode ? ETAPA62.completionPending.description : ETAPA62.completionDone.description}
        badge={pendingMode ? ETAPA62.completionPending.badge : ETAPA62.completionDone.badge}
        badgeColor={pendingMode ? COLORS.warning : COLORS.success}
      />
    )
  }

  return (
    <PageLayout>
      <StepHeader
        title={ETAPA62.header.title}
        readTime={ETAPA62.header.readTime}
        showPersonalized={true}
        stepLabel={ETAPA62.header.stepLabel}
      />

      {!showSimpleMode && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
              border: `1px solid ${COLORS.accent}25`,
              borderRadius: 16, padding: 22, marginBottom: 16,
            }}
          >
            <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 900, margin: "0 0 10px 0" }}>
              {ETAPA62.bonificacaoTitle}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              {ETAPA62.bonificacaoBody}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: 20, marginBottom: 16,
            }}
          >
            <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 800, margin: "0 0 8px 0" }}>
              {ETAPA62.comoFunciona.title}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 10px 0" }}>
              {ETAPA62.comoFunciona.body}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 6px 0" }}>
              {ETAPA62.comoFunciona.exemploA}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              {ETAPA62.comoFunciona.exemploB}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: `${COLORS.success}10`,
              border: `1px solid ${COLORS.success}25`,
              borderRadius: 14, padding: 16, marginBottom: 16,
            }}
          >
            <p style={{ color: COLORS.success, fontSize: 13, fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
              {ETAPA62.startKitInfo}
            </p>
          </motion.div>

          <StickyFooter>
            <NavButtons
              onNext={() => setShowSimpleMode(true)}
              nextLabel={ETAPA62.navConfirmPending}
              nextDisabled={isSaving}
            />
            <button
              type="button"
              onClick={handleContinueLater}
              disabled={isSaving}
              style={{
                marginTop: 10, width: "100%",
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${COLORS.warning}40`,
                background: "transparent",
                color: COLORS.warning,
                fontSize: 13, fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? ETAPA62.navSaving : ETAPA62.navContinueLater}
            </button>
          </StickyFooter>
        </>
      )}

      {showSimpleMode && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Logo */}
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 20, marginBottom: 16,
          }}>
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
                color: COLORS.text, fontSize: 14, fontWeight: 700,
              }}>
                <Icon name="palette" size={16} color={COLORS.text} />
                {ETAPA62.logoLabel}
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                  padding: "2px 8px", borderRadius: 100,
                  background: `${COLORS.textDim}20`, color: COLORS.textDim,
                }}>
                  OPCIONAL
                </span>
              </legend>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf"
                onChange={handleLogoChange}
                style={{ display: "none" }}
                id="logo-upload"
              />

              {logoFile ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: `${COLORS.success}10`,
                  border: `1px solid ${COLORS.success}25`,
                  borderRadius: 12, padding: 14,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: COLORS.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px 0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {logoName}
                    </p>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        style={{
                          background: "transparent", border: "none",
                          color: COLORS.accent, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", padding: 0,
                        }}
                      >
                        {ETAPA62.logoChangeButton}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        style={{
                          background: "transparent", border: "none",
                          color: COLORS.danger, fontSize: 12, fontWeight: 700,
                          cursor: "pointer", padding: 0,
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  {logoPreviewUrl ? (
                    <div style={{
                      width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                      overflow: 'hidden', border: `1px solid ${COLORS.border}`,
                      background: 'repeating-conic-gradient(#222 0% 25%, #333 0% 50%) 50% / 10px 10px',
                    }}>
                      <img
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      background: `${COLORS.success}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name="check" size={18} color={COLORS.success} />
                    </div>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="logo-upload"
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 8, padding: "24px 14px",
                    border: `1px dashed ${logoValidationError ? COLORS.danger : COLORS.border}`,
                    borderRadius: 12, cursor: "pointer",
                  }}
                >
                  <Icon name="camera" size={26} color={logoValidationError ? COLORS.danger : COLORS.textDim} />
                  <span style={{
                    color: logoValidationError ? COLORS.danger : COLORS.textMuted,
                    fontSize: 14, fontWeight: 600,
                  }}>
                    {ETAPA62.logoPlaceholder}
                  </span>
                  <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                    {ETAPA62.logoHint}
                  </span>
                </label>
              )}

              <AnimatePresence>
                {logoValidationError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600, margin: "8px 0 0 0" }}
                    role="alert"
                  >
                    {logoValidationError}
                  </motion.p>
                )}
              </AnimatePresence>
            </fieldset>
          </div>

          {/* Color Palette */}
          <AnimatePresence>
            {(brandColors.length > 0 || isExtractingColors) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{
                  background: COLORS.card, border: `1px solid ${COLORS.border}`,
                  borderRadius: 14, padding: 20, marginBottom: 16,
                }}>
                  <p style={{
                    display: "flex", alignItems: "center", gap: 8,
                    color: COLORS.text, fontSize: 14, fontWeight: 700, margin: "0 0 6px 0",
                  }}>
                    <Icon name="palette" size={16} color={COLORS.text} />
                    {ETAPA62.colorPaletteLabel}
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                      padding: "2px 8px", borderRadius: 100,
                      background: `${COLORS.textDim}20`, color: COLORS.textDim,
                    }}>
                      OPCIONAL
                    </span>
                  </p>

                  <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.6, margin: "0 0 14px 0" }}>
                    {ETAPA62.colorPaletteHint}
                  </p>

                  {isExtractingColors && (
                    <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "0 0 8px 0" }}>
                      {ETAPA62.colorPaletteExtracting}
                    </p>
                  )}

                  {brandColors.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
                      {brandColors.map((color, i) => (
                        <ColorSwatch
                          key={i}
                          value={color}
                          onChange={(newColor) => handleColorChange(i, newColor)}
                          onRemove={() => handleRemoveColor(i)}
                          removable
                        />
                      ))}
                    </div>
                  )}

                  {brandColors.length < 8 ? (
                    <button
                      type="button"
                      onClick={handleAddColor}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", borderRadius: 8,
                        border: `1px dashed ${COLORS.border}`,
                        background: "transparent",
                        color: COLORS.textMuted, fontSize: 12, fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      + {ETAPA62.colorPaletteAddButton}
                    </button>
                  ) : (
                    <p style={{ color: COLORS.textDim, fontSize: 11, margin: "4px 0 0 0" }}>
                      {ETAPA62.colorPaletteMax}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Site */}
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 20, marginBottom: 16,
          }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              color: COLORS.text, fontSize: 14, fontWeight: 700,
            }}>
              <Icon name="penLine" size={16} color={COLORS.text} />
              {ETAPA62.modoSimplificado.siteLabel}
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                padding: "2px 8px", borderRadius: 100,
                background: `${COLORS.textDim}20`, color: COLORS.textDim,
              }}>
                OPCIONAL
              </span>
            </label>
            <div style={{
              display: "flex", alignItems: "center",
              border: `1px solid ${siteUrlError ? COLORS.danger : COLORS.border}`,
              borderRadius: 10, overflow: "hidden",
            }}>
              <span style={{
                padding: "12px 6px 12px 14px", background: `${COLORS.textDim}18`,
                color: COLORS.textDim, fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", flexShrink: 0, userSelect: "none",
              }}>
                https://
              </span>
              <input
                type="url"
                value={siteUrl.replace(/^https?:\/\//i, '')}
                placeholder={ETAPA62.modoSimplificado.sitePlaceholder}
                onChange={(e) => {
                  const raw = e.target.value.replace(/^https?:\/\//i, '')
                  const full = raw ? `https://${raw}` : ''
                  setSiteUrl(full ? stripTrackingParams(full) : '')
                  setSiteUrlError(null)
                }}
                onBlur={() => {
                  if (siteUrl && !validateUrl(siteUrl)) setSiteUrlError(ETAPA62.modoSimplificado.siteError)
                }}
                style={{
                  flex: 1, padding: "12px 14px 12px 8px", border: "none",
                  background: "transparent", color: COLORS.text,
                  fontSize: 13, fontFamily: "inherit", minWidth: 0,
                }}
              />
            </div>
            <AnimatePresence>
              {siteUrlError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600, margin: "6px 0 0 0" }}
                  role="alert"
                >
                  {siteUrlError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Instagram */}
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 20, marginBottom: 16,
          }}>
            <p style={{
              display: "flex", alignItems: "center", gap: 8,
              color: COLORS.text, fontSize: 14, fontWeight: 700, margin: "0 0 10px 0",
            }}>
              <Icon name="camera" size={16} color={COLORS.text} />
              {ETAPA62.modoSimplificado.instagramLabel}
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                padding: "2px 8px", borderRadius: 100,
                background: `${COLORS.textDim}20`, color: COLORS.textDim,
              }}>
                OPCIONAL
              </span>
            </p>
            <div style={{
              display: "flex", alignItems: "center",
              border: `1px solid ${instagramUrlError ? COLORS.danger : COLORS.border}`,
              borderRadius: 10, overflow: "hidden",
            }}>
              <span style={{
                padding: "12px 10px 12px 14px", background: `${COLORS.textDim}18`,
                color: COLORS.textDim, fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", flexShrink: 0, userSelect: "none",
              }}>
                {ETAPA62.modoSimplificado.instagramPrefix}
              </span>
              <input
                type="text"
                value={instagramHandle}
                placeholder={ETAPA62.modoSimplificado.instagramPlaceholder}
                onChange={(e) => {
                  const sanitized = extractInstagramHandle(e.target.value)
                  setInstagramHandle(sanitized)
                  setInstagramUrlError(null)
                }}
                onBlur={() => {
                  if (instagramHandle && !validateInstagramHandle(instagramHandle))
                    setInstagramUrlError(ETAPA62.modoSimplificado.instagramError)
                }}
                style={{
                  flex: 1, padding: "12px 14px 12px 8px", border: "none",
                  background: "transparent", color: COLORS.text,
                  fontSize: 13, fontFamily: "inherit", minWidth: 0,
                }}
              />
            </div>
            <AnimatePresence>
              {instagramUrlError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600, margin: "6px 0 0 0" }}
                  role="alert"
                >
                  {instagramUrlError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10,
                background: `${COLORS.danger}10`,
                border: `1px solid ${COLORS.danger}25`,
                marginBottom: 12,
              }}
            >
              <Icon name="alertTriangle" size={14} color={COLORS.danger} />
              <span style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600 }}>{saveError}</span>
            </motion.div>
          )}

          <StickyFooter>
            <NavButtons
              onPrev={() => setShowSimpleMode(false)}
              onNext={handleConfirm}
              nextLabel={isSaving ? ETAPA62.navSaving : ETAPA62.navConfirm}
              nextDisabled={isSaving}
            />
          </StickyFooter>
        </motion.div>
      )}

      <ProcessingOverlay
        show={isSaving}
        messages={ETAPA62.processingMessages}
        duration={4000}
      />
    </PageLayout>
  )
}
