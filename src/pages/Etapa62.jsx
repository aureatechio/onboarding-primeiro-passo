import { useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { ETAPA62 } from "../copy"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"
import SlideDots from "../components/SlideDots"
import SlideTransition from "../components/SlideTransition"
import ProcessingOverlay from "../components/ProcessingOverlay"
import ThumbnailPreview from "../components/ThumbnailPreview"
import ColorSwatch from "../components/ColorSwatch"
import { validateLogoFile, validateAiStep2Inputs } from "../lib/ai-step2-validation"
import { extractColorsFromImage } from "../lib/color-extractor"

async function saveIdentityToBackend(compraId, { choice, logoFile, colors, fontId, imagesFiles, campaignNotes }) {
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
    formData.append("brand_palette", JSON.stringify(colors))
    if (fontId) formData.append("font_choice", fontId)
    if (campaignNotes) formData.append("campaign_notes", campaignNotes)
    if (imagesFiles?.length) {
      for (const img of imagesFiles) {
        formData.append("campaign_images", img)
      }
    }
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

const TOTAL_SLIDES = 5

function validateUrl(value) {
  if (!value) return true
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try { new URL(withProtocol); return true } catch { return false }
}

function sanitizeInstagramHandle(raw) {
  return raw.replace(/@/g, '').replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30)
}

function validateInstagramHandle(value) {
  if (!value) return true
  return /^[a-zA-Z0-9][a-zA-Z0-9._]{0,28}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(value) &&
    !/\.\./.test(value)
}

function StatusChip({ done, requiredLabel = ETAPA62.statusObrigatorio, optionalLabel = ETAPA62.statusOpcional, isOptional = false }) {
  if (isOptional) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
        padding: "2px 8px", borderRadius: 100,
        background: `${COLORS.textDim}20`, color: COLORS.textDim,
      }}>
        {optionalLabel}
      </span>
    )
  }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: 100,
      background: done ? `${COLORS.success}18` : `${COLORS.warning}18`,
      color: done ? COLORS.success : COLORS.warning,
    }}>
      {done ? ETAPA62.statusConcluido : requiredLabel}
    </span>
  )
}

export default function Etapa62() {
  const { userData, updateUserData, hydrationCompraId } = useOnboarding()

  const [choice, setChoice] = useState(userData.identityBonusChoice || null)
  const [logoName, setLogoName] = useState(userData.identityBonusLogoName || "")
  const [logoFile, setLogoFile] = useState(null)
  const [logoValidationError, setLogoValidationError] = useState(null)
  const [extractedColors, setExtractedColors] = useState(
    Array.isArray(userData.identityBonusExtractedColors) && userData.identityBonusExtractedColors.length > 0
      ? userData.identityBonusExtractedColors
      : []
  )
  const [customColors, setCustomColors] = useState(
    Array.isArray(userData.identityBonusCustomColors) && userData.identityBonusCustomColors.length > 0
      ? userData.identityBonusCustomColors
      : []
  )
  const [selectedFont, setSelectedFont] = useState(userData.identityBonusFont || "")
  const [imagesFiles, setImagesFiles] = useState([])
  const [campaignNotes, setCampaignNotes] = useState(userData.campaignNotes || "")
  const [completed, setCompleted] = useState(false)
  const [pendingMode, setPendingMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [isExtracting, setIsExtracting] = useState(false)

  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)

  const [showSimpleMode, setShowSimpleMode] = useState(false)
  const [siteUrl, setSiteUrl] = useState(userData.siteUrl || '')
  const [siteUrlError, setSiteUrlError] = useState(null)
  const [instagramHandle, setInstagramHandle] = useState(userData.instagramHandle || '')
  const [instagramUrlError, setInstagramUrlError] = useState(null)

  const logoInputRef = useRef(null)
  const imagesInputRef = useRef(null)

  const allColors = useMemo(() => [...extractedColors, ...customColors], [extractedColors, customColors])
  const maxCustom = useMemo(() => Math.max(0, 5 - extractedColors.length), [extractedColors.length])

  const canAdvanceSlide = useCallback((slide) => {
    if (slide === 0) return Boolean(logoFile || logoName)
    if (slide === 2) return Boolean(selectedFont)
    return true
  }, [logoFile, logoName, selectedFont])

  const persistColors = useCallback((nextExtracted, nextCustom) => {
    const combined = [...nextExtracted, ...nextCustom]
    updateUserData({
      identityBonusExtractedColors: nextExtracted,
      identityBonusCustomColors: nextCustom,
      identityBonusColors: combined,
    })
  }, [updateUserData])

  const persist = useCallback((partial) => {
    updateUserData({
      identityBonusChoice: choice,
      identityBonusLogoName: logoName,
      identityBonusColors: allColors,
      identityBonusExtractedColors: extractedColors,
      identityBonusCustomColors: customColors,
      identityBonusFont: selectedFont,
      identityBonusImagesCount: imagesFiles.length,
      campaignNotes,
      ...partial,
    })
  }, [choice, logoName, allColors, extractedColors, customColors, selectedFont, imagesFiles, campaignNotes, updateUserData])

  const goToSlide = useCallback((index) => {
    for (let i = 0; i < index; i++) {
      if (!canAdvanceSlide(i)) return
    }
    setSlideDirection(index > currentSlide ? 1 : -1)
    setCurrentSlide(index)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentSlide, canAdvanceSlide])

  const nextSlide = useCallback(() => {
    if (!canAdvanceSlide(currentSlide)) return
    if (currentSlide < TOTAL_SLIDES - 1) {
      setSlideDirection(1)
      setCurrentSlide((prev) => prev + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentSlide, canAdvanceSlide])

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setSlideDirection(-1)
      setCurrentSlide((prev) => prev - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentSlide])

  const handleSelectChoice = (nextChoice) => {
    setChoice(nextChoice)
    updateUserData({ identityBonusChoice: nextChoice })
  }

  const handleLogoChange = useCallback(async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const result = validateLogoFile(file)
    if (!result.valid) {
      setLogoValidationError(result.error)
      setLogoName("")
      setLogoFile(null)
      updateUserData({ identityBonusLogoName: "" })
      if (logoInputRef.current) logoInputRef.current.value = ""
      return
    }
    setLogoValidationError(null)
    setLogoName(file.name)
    setLogoFile(file)
    updateUserData({ identityBonusLogoName: file.name })

    setIsExtracting(true)
    try {
      const colors = await extractColorsFromImage(file, 3)
      setExtractedColors(colors)
      persistColors(colors, customColors)
    } catch {
      setExtractedColors([])
    } finally {
      setIsExtracting(false)
    }
  }, [customColors, persistColors, updateUserData])

  const handleRemoveLogo = useCallback(() => {
    setLogoName("")
    setLogoFile(null)
    setLogoValidationError(null)
    setExtractedColors([])
    updateUserData({ identityBonusLogoName: "" })
    persistColors([], customColors)
    if (logoInputRef.current) logoInputRef.current.value = ""
  }, [customColors, persistColors, updateUserData])

  const handleExtractedColorChange = useCallback((index, value) => {
    const next = extractedColors.map((c, i) => (i === index ? value : c))
    setExtractedColors(next)
    persistColors(next, customColors)
  }, [extractedColors, customColors, persistColors])

  const handleCustomColorChange = useCallback((index, value) => {
    const next = customColors.map((c, i) => (i === index ? value : c))
    setCustomColors(next)
    persistColors(extractedColors, next)
  }, [customColors, extractedColors, persistColors])

  const handleAddCustomColor = useCallback(() => {
    if (customColors.length >= maxCustom) return
    const next = [...customColors, "#000000"]
    setCustomColors(next)
    persistColors(extractedColors, next)
  }, [customColors, maxCustom, extractedColors, persistColors])

  const handleRemoveCustomColor = useCallback((index) => {
    const next = customColors.filter((_, i) => i !== index)
    setCustomColors(next)
    persistColors(extractedColors, next)
  }, [customColors, extractedColors, persistColors])

  const handleSelectFont = (fontId) => {
    setSelectedFont(fontId)
    updateUserData({ identityBonusFont: fontId })
  }

  const handleAddImage = useCallback((event) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    if (!files.length) return
    const next = [...imagesFiles, ...files].slice(0, 5)
    setImagesFiles(next)
    updateUserData({ identityBonusImagesCount: next.length })
    if (imagesInputRef.current) imagesInputRef.current.value = ""
  }, [imagesFiles, updateUserData])

  const handleRemoveImage = useCallback((index) => {
    const next = imagesFiles.filter((_, i) => i !== index)
    setImagesFiles(next)
    updateUserData({ identityBonusImagesCount: next.length })
  }, [imagesFiles, updateUserData])

  const handleConfirm = useCallback(async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      if (hydrationCompraId) {
        const result = await saveIdentityToBackend(hydrationCompraId, {
          choice: "later",
          logoFile: null,
          colors: [],
          fontId: "",
          imagesFiles: [],
          campaignNotes: "",
        })
        if (!result.success && !result.skipped) {
          setSaveError(result.message || result.error || "Erro ao salvar identidade visual.")
          setIsSaving(false)
          return
        }
      }

      persist({ identityBonusPending: true })
      setPendingMode(true)
      setCompleted(true)
    } finally {
      setIsSaving(false)
    }
  }, [hydrationCompraId, persist])

  const handleContinueLater = useCallback(async () => {
    setSaveError(null)
    setIsSaving(true)
    try {
      if (hydrationCompraId) {
        await saveIdentityToBackend(hydrationCompraId, {
          choice: "later",
          logoFile: null,
          colors: [],
          fontId: "",
          imagesFiles: [],
          campaignNotes: "",
        })
      }
      persist({ identityBonusPending: true })
      setPendingMode(true)
      setCompleted(true)
    } finally {
      setIsSaving(false)
    }
  }, [hydrationCompraId, persist])

  const handleConfirmSimplificado = useCallback(async () => {
    const siteValid = validateUrl(siteUrl)
    const igValid = validateInstagramHandle(instagramHandle)
    setSiteUrlError(siteUrl && !siteValid ? ETAPA62.modoSimplificado.siteError : null)
    setInstagramUrlError(instagramHandle && !igValid ? ETAPA62.modoSimplificado.instagramError : null)

    setSaveError(null)
    setIsSaving(true)
    try {
      if (hydrationCompraId) {
        const instagramFullUrl = instagramHandle ? `https://www.instagram.com/${instagramHandle}` : ''
        const parts = []
        if (siteUrl) parts.push(`Site: ${siteUrl}`)
        if (instagramFullUrl) parts.push(`Instagram: ${instagramFullUrl}`)
        const result = await saveIdentityToBackend(hydrationCompraId, {
          choice: 'add_now',
          logoFile,
          colors: allColors,
          fontId: '',
          imagesFiles: [],
          campaignNotes: parts.join(' | '),
        })
        if (!result.success && !result.skipped) {
          setSaveError(result.message || result.error || 'Erro ao salvar identidade visual.')
          setIsSaving(false)
          return
        }
      }
      persist({ siteUrl, instagramHandle, identityBonusPending: false })
      setPendingMode(false)
      setCompleted(true)
    } finally {
      setIsSaving(false)
    }
  }, [hydrationCompraId, logoFile, allColors, siteUrl, instagramHandle, persist])

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

  const isLastSlide = currentSlide === TOTAL_SLIDES - 1
  const showMultistep = choice === "add_now"

  // --- Slide contents ---

  const slideLogoContent = (
    <div>
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
        border: `1px solid ${COLORS.accent}25`,
        borderRadius: 16, padding: 22, marginBottom: 16,
      }}>
        <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 900, margin: "0 0 10px 0" }}>
          {ETAPA62.bonificacaoTitle}
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          {ETAPA62.bonificacaoBody}
        </p>
      </div>

      <div style={{
        background: `${COLORS.success}10`,
        border: `1px solid ${COLORS.success}25`,
        borderRadius: 14, padding: 16, marginBottom: 16,
      }}>
        <p style={{ color: COLORS.success, fontSize: 13, fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
          {ETAPA62.startKitInfo}
        </p>
      </div>

      <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
        <legend style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
          color: COLORS.text, fontSize: 14, fontWeight: 700,
        }}>
          <Icon name="palette" size={16} color={COLORS.text} />
          {ETAPA62.logoLabel}
          <StatusChip done={Boolean(logoName)} />
        </legend>

        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
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
            <ThumbnailPreview file={logoFile} onRemove={handleRemoveLogo} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                color: COLORS.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px 0",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {logoName}
              </p>
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
            </div>
            {isExtracting && (
              <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {ETAPA62.extractingColors}
              </span>
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
              transition: "border-color 0.2s ease",
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
  )

  const slideColorsContent = (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        color: COLORS.text, fontSize: 14, fontWeight: 700,
      }}>
        <Icon name="penLine" size={16} color={COLORS.text} />
        {ETAPA62.coresTitle}
      </div>

      {extractedColors.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{
            color: COLORS.textMuted, fontSize: 12, fontWeight: 600, margin: "0 0 10px 0",
          }}>
            {ETAPA62.coresExtracted(extractedColors.length)}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {extractedColors.map((color, index) => (
              <ColorSwatch
                key={`ext-${index}`}
                value={color}
                onChange={(val) => handleExtractedColorChange(index, val)}
                removable={false}
                badge="LOGO"
                badgeColor={COLORS.accent}
              />
            ))}
          </div>
        </div>
      )}

      {extractedColors.length === 0 && (
        <div style={{
          background: `${COLORS.warning}10`,
          border: `1px solid ${COLORS.warning}25`,
          borderRadius: 10, padding: 14, marginBottom: 16,
        }}>
          <p style={{ color: COLORS.warning, fontSize: 12, fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
            {ETAPA62.coresNoExtraction}
          </p>
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <p style={{
          color: COLORS.textMuted, fontSize: 12, fontWeight: 600, margin: "0 0 10px 0",
        }}>
          {ETAPA62.coresCustomLabel(customColors.length)}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {customColors.map((color, index) => (
            <ColorSwatch
              key={`cust-${index}`}
              value={color}
              onChange={(val) => handleCustomColorChange(index, val)}
              onRemove={() => handleRemoveCustomColor(index)}
              removable={true}
            />
          ))}
          {customColors.length < maxCustom && (
            <button
              type="button"
              onClick={handleAddCustomColor}
              aria-label="Adicionar cor"
              style={{
                width: 48, height: 48, borderRadius: 10,
                border: `1px dashed ${COLORS.border}`,
                background: "transparent",
                color: COLORS.textMuted,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.2s ease",
              }}
            >
              <Icon name="plus" size={18} color={COLORS.textMuted} />
            </button>
          )}
        </div>
      </div>

      <p style={{ color: COLORS.textDim, fontSize: 11, margin: "10px 0 0 0" }}>
        {ETAPA62.coresLimit(Math.max(0, 5 - allColors.length))}
      </p>
    </div>
  )

  const slideFontContent = (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        color: COLORS.text, fontSize: 14, fontWeight: 700,
      }}>
        <Icon name="type" size={16} color={COLORS.text} />
        {ETAPA62.fonteTitle}
        <StatusChip done={Boolean(selectedFont)} />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {ETAPA62.fontOptions.map((font) => {
          const isSelected = selectedFont === font.id
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => handleSelectFont(font.id)}
              aria-pressed={isSelected}
              style={{
                width: "100%", textAlign: "left",
                padding: "14px 16px", borderRadius: 12,
                border: isSelected ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                background: isSelected ? `${COLORS.accent}10` : "transparent",
                cursor: "pointer", outline: "none",
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{
                  color: COLORS.text, fontSize: 18, fontFamily: font.family,
                  margin: "0 0 3px 0",
                }}>
                  {font.preview}
                </p>
                <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0 }}>{font.label}</p>
              </div>
              {isSelected && (
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: COLORS.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name="check" size={13} color={COLORS.bg} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  const slideImagesContent = (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        color: COLORS.text, fontSize: 14, fontWeight: 700,
      }}>
        <Icon name="camera" size={16} color={COLORS.text} />
        {ETAPA62.imagensTitle}
        <StatusChip isOptional />
      </div>

      <input
        ref={imagesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddImage}
        style={{ display: "none" }}
        id="images-upload"
      />

      {imagesFiles.length > 0 && (
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14,
        }}>
          <AnimatePresence>
            {imagesFiles.map((file, index) => (
              <ThumbnailPreview
                key={`img-${file.name}-${index}`}
                file={file}
                onRemove={() => handleRemoveImage(index)}
                size={72}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {imagesFiles.length < 5 && (
        <label
          htmlFor="images-upload"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 8, padding: "20px 14px",
            border: `1px dashed ${COLORS.border}`,
            borderRadius: 12, cursor: "pointer",
          }}
        >
          <Icon name="camera" size={24} color={COLORS.textDim} />
          <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>
            {imagesFiles.length > 0 ? ETAPA62.imagensAdd : ETAPA62.imagensSelect}
          </span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>
            {ETAPA62.imagensHint}
          </span>
        </label>
      )}
    </div>
  )

  const slideNotesContent = (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
        color: COLORS.text, fontSize: 14, fontWeight: 700,
      }}>
        <Icon name="penLine" size={16} color={COLORS.text} />
        {ETAPA62.notesTitle}
        <StatusChip isOptional />
      </div>

      <textarea
        value={campaignNotes}
        onChange={(e) => {
          const val = e.target.value.slice(0, 500)
          setCampaignNotes(val)
          updateUserData({ campaignNotes: val })
        }}
        placeholder={ETAPA62.notesPlaceholder}
        maxLength={500}
        rows={5}
        style={{
          width: "100%", padding: "14px 16px",
          borderRadius: 12,
          border: `1px solid ${COLORS.border}`,
          background: "transparent",
          color: COLORS.text, fontSize: 13, lineHeight: 1.6,
          resize: "vertical", fontFamily: "inherit",
          outline: "none", boxSizing: "border-box",
        }}
      />
      <p style={{ color: COLORS.textDim, fontSize: 11, margin: "6px 0 0 0", textAlign: "right" }}>
        {campaignNotes.length}/500
      </p>

      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px", borderRadius: 10,
            background: `${COLORS.danger}10`,
            border: `1px solid ${COLORS.danger}25`,
            marginTop: 12,
          }}
        >
          <Icon name="alertTriangle" size={14} color={COLORS.danger} />
          <span style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600 }}>{saveError}</span>
        </motion.div>
      )}
    </div>
  )

  const slideContents = [
    slideLogoContent,
    slideColorsContent,
    slideFontContent,
    slideImagesContent,
    slideNotesContent,
  ]

  return (
    <PageLayout>
      <StepHeader
        title={ETAPA62.header.title}
        readTime={ETAPA62.header.readTime}
        showPersonalized={true}
        stepLabel={ETAPA62.header.stepLabel}
      />

      {!showMultistep && !showSimpleMode && (
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
              nextDisabled={false}
            />
          </StickyFooter>
        </>
      )}

      {!showMultistep && showSimpleMode && (
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
                <StatusChip isOptional />
              </legend>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                style={{ display: "none" }}
                id="logo-upload-simple"
              />

              {logoFile ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: `${COLORS.success}10`,
                  border: `1px solid ${COLORS.success}25`,
                  borderRadius: 12, padding: 14,
                }}>
                  <ThumbnailPreview file={logoFile} onRemove={handleRemoveLogo} size={64} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      color: COLORS.text, fontSize: 13, fontWeight: 600, margin: "0 0 4px 0",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {logoName}
                    </p>
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
                  </div>
                  {isExtracting && (
                    <span style={{ color: COLORS.accent, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {ETAPA62.extractingColors}
                    </span>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="logo-upload-simple"
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
                  <span style={{ color: COLORS.textDim, fontSize: 11 }}>{ETAPA62.logoHint}</span>
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

          {/* Cores — aparece após upload do logo */}
          <AnimatePresence>
            {logoFile && (
              <motion.div
                key="colors-simple"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  background: COLORS.card, border: `1px solid ${COLORS.border}`,
                  borderRadius: 14, padding: 20, marginBottom: 16,
                }}
              >
                {slideColorsContent}
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
              <StatusChip isOptional />
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
                  setSiteUrl(raw ? `https://${raw}` : '')
                  setSiteUrlError(null)
                }}
                onBlur={() => {
                  if (siteUrl && !validateUrl(siteUrl)) setSiteUrlError(ETAPA62.modoSimplificado.siteError)
                }}
                style={{
                  flex: 1, padding: "12px 14px 12px 8px", border: "none",
                  background: "transparent", color: COLORS.text,
                  fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 0,
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
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              color: COLORS.text, fontSize: 14, fontWeight: 700, margin: "0 0 10px 0",
            }}>
              <Icon name="camera" size={16} color={COLORS.text} />
              {ETAPA62.modoSimplificado.instagramLabel}
              <StatusChip isOptional />
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
                  const sanitized = sanitizeInstagramHandle(e.target.value)
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
                  fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 0,
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
              onNext={handleConfirmSimplificado}
              nextLabel={isSaving ? ETAPA62.navSaving : ETAPA62.navConfirm}
              nextDisabled={isSaving}
            />
          </StickyFooter>
        </motion.div>
      )}

      {showMultistep && (
        <>
          <SlideDots
            total={TOTAL_SLIDES}
            current={currentSlide}
            onSelect={goToSlide}
          />

          <p style={{
            color: COLORS.textDim, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.06em", margin: "0 0 6px 0",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {ETAPA62.slideLabels[currentSlide]?.toUpperCase()} ({currentSlide + 1}/{TOTAL_SLIDES})
          </p>

          <SlideTransition
            slideKey={currentSlide}
            direction={slideDirection}
            onSwipeLeft={canAdvanceSlide(currentSlide) && currentSlide < TOTAL_SLIDES - 1 ? nextSlide : undefined}
            onSwipeRight={currentSlide > 0 ? prevSlide : undefined}
          >
            <div style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14, padding: 20, marginBottom: 16,
              minHeight: 200,
            }}>
              {slideContents[currentSlide]}
            </div>
          </SlideTransition>

          <StickyFooter>
            <NavButtons
              onPrev={currentSlide > 0 ? prevSlide : undefined}
              onNext={isLastSlide ? handleConfirm : nextSlide}
              nextLabel={
                isSaving
                  ? ETAPA62.navSaving
                  : isLastSlide
                    ? ETAPA62.navConfirm
                    : ETAPA62.slideLabels[currentSlide + 1] ?? ETAPA62.navConfirm
              }
              nextDisabled={isSaving || !canAdvanceSlide(currentSlide)}
            />
            {!canAdvanceSlide(currentSlide) && currentSlide === 0 && (
              <button
                type="button"
                onClick={handleContinueLater}
                disabled={isSaving}
                style={{
                  marginTop: 10, width: "100%",
                  padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${COLORS.warning}40`,
                  background: `${COLORS.warning}10`,
                  color: COLORS.warning,
                  fontSize: 13, fontWeight: 700,
                  cursor: isSaving ? "not-allowed" : "pointer",
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                {isSaving ? ETAPA62.navSaving : ETAPA62.navContinueLater}
              </button>
            )}
          </StickyFooter>
        </>
      )}

      <ProcessingOverlay
        show={isSaving}
        messages={ETAPA62.processingMessages}
        duration={4000}
      />
    </PageLayout>
  )
}
