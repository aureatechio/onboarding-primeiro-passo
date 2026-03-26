import { useMemo, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"
import ProcessingOverlay from "../components/ProcessingOverlay"
import { validateLogoFile, validateAiStep2Inputs } from "../lib/ai-step2-validation"

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

const PRESET_COLORS = ["#E8356D", "#384FFE", "#111119"]

const FONT_OPTIONS = [
  { id: "inter", label: "Inter", preview: "Aa Bb Cc 123", family: "'Inter', sans-serif" },
  { id: "jetbrains", label: "JetBrains Mono", preview: "Aa Bb Cc 123", family: "'JetBrains Mono', monospace" },
  { id: "georgia", label: "Georgia", preview: "Aa Bb Cc 123", family: "Georgia, serif" },
]

function StatusChip({ done, requiredLabel = "Obrigatório", optionalLabel = "Opcional", isOptional = false }) {
  if (isOptional) {
    return (
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: "2px 8px",
        borderRadius: 100,
        background: `${COLORS.textDim}20`,
        color: COLORS.textDim,
      }}>
        {optionalLabel}
      </span>
    )
  }

  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.04em",
      padding: "2px 8px",
      borderRadius: 100,
      background: done ? `${COLORS.success}18` : `${COLORS.warning}18`,
      color: done ? COLORS.success : COLORS.warning,
    }}>
      {done ? "Concluído" : requiredLabel}
    </span>
  )
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  const allDone = done === total

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 18,
      padding: "10px 14px",
      background: allDone ? `${COLORS.success}10` : `${COLORS.accent}08`,
      border: `1px solid ${allDone ? COLORS.success : COLORS.accent}20`,
      borderRadius: 10,
    }}>
      <Icon name={allDone ? "circleCheck" : "target"} size={16} color={allDone ? COLORS.success : COLORS.accent} />
      <div style={{ flex: 1 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5,
        }}>
          <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 700 }}>
            {allDone ? "Tudo preenchido" : `Obrigatórios: ${done}/${total}`}
          </span>
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>
            {Math.round(pct)}%
          </span>
        </div>
        <div style={{
          height: 4, borderRadius: 2, background: COLORS.border, overflow: "hidden",
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              height: "100%",
              borderRadius: 2,
              background: allDone
                ? COLORS.success
                : `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent}AA)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default function Etapa62() {
  const { userData, updateUserData, hydrationCompraId } = useOnboarding()

  const [choice, setChoice] = useState(userData.identityBonusChoice || null)
  const [logoName, setLogoName] = useState(userData.identityBonusLogoName || "")
  const [logoFile, setLogoFile] = useState(null)
  const [logoValidationError, setLogoValidationError] = useState(null)
  const [colors, setColors] = useState(
    Array.isArray(userData.identityBonusColors) && userData.identityBonusColors.length > 0
      ? userData.identityBonusColors
      : PRESET_COLORS
  )
  const [selectedFont, setSelectedFont] = useState(userData.identityBonusFont || "")
  const [imagesCount, setImagesCount] = useState(Number(userData.identityBonusImagesCount || 0))
  const [imagesFiles, setImagesFiles] = useState([])
  const [campaignNotes, setCampaignNotes] = useState(userData.campaignNotes || "")
  const [completed, setCompleted] = useState(false)
  const [pendingMode, setPendingMode] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const logoInputRef = useRef(null)
  const imagesInputRef = useRef(null)
  const logoSectionRef = useRef(null)
  const fontSectionRef = useRef(null)

  const hasRequiredForAddNow = Boolean(logoName) && Boolean(selectedFont)
  const canConfirm = choice === "later" || (choice === "add_now" && hasRequiredForAddNow)
  const showContinueLater = choice === "add_now" && !hasRequiredForAddNow

  const logoError = (submitted && choice === "add_now" && !logoName) || logoValidationError
  const logoErrorMessage = logoValidationError || (submitted && choice === "add_now" && !logoName ? "Envie o logo para avançar." : null)
  const fontError = submitted && choice === "add_now" && !selectedFont

  const requiredDone = Number(Boolean(logoName)) + Number(Boolean(selectedFont))
  const requiredTotal = 2

  const colorsRemaining = useMemo(() => Math.max(0, 5 - colors.length), [colors.length])

  const persist = (partial) => {
    updateUserData({
      identityBonusChoice: choice,
      identityBonusLogoName: logoName,
      identityBonusColors: colors,
      identityBonusFont: selectedFont,
      identityBonusImagesCount: imagesCount,
      campaignNotes,
      ...partial,
    })
  }

  const handleSelectChoice = (nextChoice) => {
    setChoice(nextChoice)
    setSubmitted(false)
    updateUserData({ identityBonusChoice: nextChoice })
  }

  const handleLogoChange = (event) => {
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
  }

  const handleRemoveLogo = () => {
    setLogoName("")
    setLogoFile(null)
    setLogoValidationError(null)
    updateUserData({ identityBonusLogoName: "" })
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleImagesChange = (event) => {
    const files = event.target.files ? Array.from(event.target.files) : []
    setImagesFiles(files)
    setImagesCount(files.length)
    updateUserData({ identityBonusImagesCount: files.length })
  }

  const handleRemoveImages = () => {
    setImagesFiles([])
    setImagesCount(0)
    updateUserData({ identityBonusImagesCount: 0 })
    if (imagesInputRef.current) imagesInputRef.current.value = ""
  }

  const handleColorChange = (index, value) => {
    const nextColors = colors.map((color, i) => (i === index ? value : color))
    setColors(nextColors)
    updateUserData({ identityBonusColors: nextColors })
  }

  const handleAddColor = () => {
    if (colors.length >= 5) return
    const nextColors = [...colors, "#000000"]
    setColors(nextColors)
    updateUserData({ identityBonusColors: nextColors })
  }

  const handleSelectFont = (fontId) => {
    setSelectedFont(fontId)
    updateUserData({ identityBonusFont: fontId })
  }

  const scrollToFirstError = () => {
    if (!logoName && logoSectionRef.current) {
      logoSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    if (!selectedFont && fontSectionRef.current) {
      fontSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const handleConfirm = useCallback(async () => {
    if (choice === "add_now") {
      const validation = validateAiStep2Inputs({
        logoFile,
        logoName,
        colors,
        fontId: selectedFont,
      })
      if (!validation.valid) {
        setSubmitted(true)
        if (validation.errors.logo) setLogoValidationError(validation.errors.logo)
        scrollToFirstError()
        return
      }
    }
    if (!canConfirm) return

    setSaveError(null)
    setIsSaving(true)

    try {
      if (hydrationCompraId) {
        const result = await saveIdentityToBackend(hydrationCompraId, {
          choice,
          logoFile: choice === "add_now" ? logoFile : null,
          colors: choice === "add_now" ? colors : [],
          fontId: choice === "add_now" ? selectedFont : "",
          imagesFiles: choice === "add_now" ? imagesFiles : [],
          campaignNotes: choice === "add_now" ? campaignNotes : "",
        })
        if (!result.success && !result.skipped) {
          setSaveError(result.message || result.error || "Erro ao salvar identidade visual.")
          setIsSaving(false)
          return
        }
      }

      if (choice === "later") {
        persist({ identityBonusPending: true })
        setPendingMode(true)
      } else {
        persist({ identityBonusPending: false })
        setPendingMode(false)
      }
      setCompleted(true)
    } finally {
      setIsSaving(false)
    }
  }, [choice, canConfirm, logoFile, colors, selectedFont, imagesFiles, campaignNotes, hydrationCompraId, logoName, persist])

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

  if (completed) {
    return (
      <CompletionScreen
        icon={pendingMode ? "clock" : "circleCheck"}
        title={pendingMode ? "Etapa 6.2 marcada como pendente" : "Etapa 6.2 concluída!"}
        description={
          pendingMode
            ? "Você decidiu continuar depois. O prazo do contrato segue correndo e você pode completar os itens de identidade visual na sequência com seu atendente."
            : "Perfeito. Sua etapa de bonificação foi preenchida e isso agiliza o atendimento para envio do seu Start Kit."
        }
        badge={pendingMode ? "PENDENTE" : "BONIFICAÇÃO ATIVA"}
        badgeColor={pendingMode ? COLORS.warning : COLORS.success}
      />
    )
  }

  return (
    <PageLayout>
      <StepHeader
        title="Bonificação de prazo da sua campanha"
        readTime="2 minutos"
        showPersonalized={true}
        stepLabel="ETAPA 6.2 DE 8"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
          border: `1px solid ${COLORS.accent}25`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 16,
        }}
      >
        <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 900, margin: "0 0 10px 0" }}>
          GANHE UMA BONIFICAÇÃO DE PRAZO DE VEICULAÇÃO DA SUA CAMPANHA
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: COLORS.text }}>O QUE VC PRECISA CONCLUIR?</strong> Adicione os
          arquivos nos campos abaixo e agilize o atendimento.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 800, margin: "0 0 8px 0" }}>
          Como funciona
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 10px 0" }}>
          Dentro do prazo de 15 dias após a assinatura do seu contrato, você recebe, ao final dos
          três meses de contrato, os dias que você conseguiu antecipar de prazo.
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 6px 0" }}>
          <strong style={{ color: COLORS.text }}>Exemplo A):</strong> Preenchendo ainda hoje (DIA DO
          PRIMEIRO PASSO) você ganha + 15 dias de bonificação.
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: COLORS.text }}>Exemplo B):</strong> Preenchendo 5 dias corridos a
          partir da data do contrato, você ganha + 10 dias de bonificação.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: `${COLORS.success}10`,
          border: `1px solid ${COLORS.success}25`,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <p style={{ color: COLORS.success, fontSize: 13, fontWeight: 700, lineHeight: 1.6, margin: 0 }}>
          <strong>O QUE VOCÊ VAI RECEBER?</strong> Em até 24h, você receberá o START KIT com 4
          peças estáticas com conteúdo da sua campanha gerado por IA.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        role="radiogroup"
        aria-label="Escolha de identidade visual"
        style={{ marginBottom: 16 }}
      >
        <motion.button
          type="button"
          onClick={() => handleSelectChoice("add_now")}
          role="radio"
          aria-checked={choice === "add_now"}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 12,
            border: choice === "add_now" ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
            background: choice === "add_now" ? `${COLORS.accent}12` : COLORS.card,
            cursor: "pointer",
            textAlign: "left",
            marginBottom: 10,
            outline: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              border: choice === "add_now" ? `2px solid ${COLORS.accent}` : `2px solid ${COLORS.textDim}`,
              background: choice === "add_now" ? COLORS.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}>
              {choice === "add_now" && <Icon name="check" size={11} color={COLORS.bg} />}
            </div>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
              Vou adicionar as minhas referências da identidade visual
            </p>
          </div>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => handleSelectChoice("later")}
          role="radio"
          aria-checked={choice === "later"}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 12,
            border: choice === "later" ? `2px solid ${COLORS.warning}` : `1px solid ${COLORS.border}`,
            background: choice === "later" ? `${COLORS.warning}10` : COLORS.card,
            cursor: "pointer",
            textAlign: "left",
            outline: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
              border: choice === "later" ? `2px solid ${COLORS.warning}` : `2px solid ${COLORS.textDim}`,
              background: choice === "later" ? COLORS.warning : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s ease",
            }}>
              {choice === "later" && <Icon name="check" size={11} color={COLORS.bg} />}
            </div>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
              Prefiro deixar para depois tendo ciência que o prazo do meu contrato está correndo
              desde já.
            </p>
          </div>
        </motion.button>
      </motion.div>

      {choice === "add_now" && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <ProgressBar done={requiredDone} total={requiredTotal} />

          {/* --- Logo section --- */}
          <fieldset
            ref={logoSectionRef}
            style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}
            aria-describedby="logo-help"
          >
            <legend style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
              color: COLORS.text, fontSize: 13, fontWeight: 700,
            }}>
              <Icon name="palette" size={15} color={COLORS.text} />
              Logo
              <StatusChip done={Boolean(logoName)} />
            </legend>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ display: "none" }}
              id="logo-upload"
              aria-invalid={logoError}
            />

            {logoName ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: `${COLORS.success}10`,
                border: `1px solid ${COLORS.success}25`,
                borderRadius: 10, padding: "10px 14px",
              }}>
                <Icon name="circleCheck" size={16} color={COLORS.success} />
                <span style={{ flex: 1, color: COLORS.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {logoName}
                </span>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    background: "transparent", border: "none",
                    color: COLORS.accent, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  style={{
                    background: "transparent", border: "none",
                    color: COLORS.danger, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  Remover
                </button>
              </div>
            ) : (
              <label
                htmlFor="logo-upload"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, padding: "18px 14px",
                  border: `1px dashed ${logoError ? COLORS.danger : COLORS.border}`,
                  borderRadius: 10, cursor: "pointer",
                  transition: "border-color 0.2s ease",
                }}
              >
                <Icon name="camera" size={22} color={logoError ? COLORS.danger : COLORS.textDim} />
                <span style={{ color: logoError ? COLORS.danger : COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>
                  Selecionar logo
                </span>
                <span id="logo-help" style={{ color: COLORS.textDim, fontSize: 11 }}>
                  Formatos aceitos: PNG, JPG, SVG
                </span>
              </label>
            )}

            <AnimatePresence>
              {logoError && logoErrorMessage && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600, margin: "8px 0 0 0" }}
                  role="alert"
                >
                  {logoErrorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </fieldset>

          {/* --- Colors section --- */}
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
            <legend style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
              color: COLORS.text, fontSize: 13, fontWeight: 700,
            }}>
              <Icon name="penLine" size={15} color={COLORS.text} />
              Cores principais
              <StatusChip isOptional={false} done={true} requiredLabel="Pré-definidas" />
            </legend>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              {colors.map((color, index) => (
                <div key={`${color}-${index}`} style={{ position: "relative" }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => handleColorChange(index, event.target.value)}
                    aria-label={`Cor ${index + 1}`}
                    style={{
                      width: 44,
                      height: 44,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      background: "transparent",
                      padding: 2,
                      cursor: "pointer",
                    }}
                  />
                  {index < PRESET_COLORS.length && (
                    <span style={{
                      position: "absolute", top: -6, right: -4,
                      fontSize: 8, fontWeight: 700, letterSpacing: "0.05em",
                      background: COLORS.border, color: COLORS.textDim,
                      padding: "1px 4px", borderRadius: 4,
                    }}>
                      PRESET
                    </span>
                  )}
                </div>
              ))}
              {colors.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddColor}
                  aria-label="Adicionar cor"
                  style={{
                    height: 44,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: `1px dashed ${COLORS.border}`,
                    background: "transparent",
                    color: COLORS.textMuted,
                    cursor: "pointer",
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  + cor
                </button>
              )}
            </div>
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: "8px 0 0 0" }}>
              Máximo 5 cores {colorsRemaining > 0 && `\u00B7 Restantes: ${colorsRemaining}`}
            </p>
          </fieldset>

          {/* --- Fonts section --- */}
          <fieldset
            ref={fontSectionRef}
            style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}
            aria-describedby="font-help"
          >
            <legend style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
              color: COLORS.text, fontSize: 13, fontWeight: 700,
            }}>
              <Icon name="type" size={15} color={COLORS.text} />
              Fonte de texto
              <StatusChip done={Boolean(selectedFont)} />
            </legend>

            <div style={{ display: "grid", gap: 10 }}>
              {FONT_OPTIONS.map((font) => {
                const isSelected = selectedFont === font.id
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => handleSelectFont(font.id)}
                    aria-pressed={isSelected}
                    aria-invalid={fontError && !isSelected}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: isSelected
                        ? `2px solid ${COLORS.accent}`
                        : fontError
                          ? `1px solid ${COLORS.danger}50`
                          : `1px solid ${COLORS.border}`,
                      background: isSelected ? `${COLORS.accent}10` : "transparent",
                      cursor: "pointer",
                      outline: "none",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{
                        color: COLORS.text, fontSize: 16, fontFamily: font.family,
                        margin: "0 0 2px 0",
                      }}>
                        {font.preview}
                      </p>
                      <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0 }}>{font.label}</p>
                    </div>
                    {isSelected && (
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: COLORS.accent,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon name="check" size={12} color={COLORS.bg} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <AnimatePresence>
              {fontError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ color: COLORS.danger, fontSize: 12, fontWeight: 600, margin: "8px 0 0 0" }}
                  id="font-help"
                  role="alert"
                >
                  Selecione uma fonte para avançar.
                </motion.p>
              )}
            </AnimatePresence>
          </fieldset>

          {/* --- Images section --- */}
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 20px 0" }}>
            <legend style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
              color: COLORS.text, fontSize: 13, fontWeight: 700,
            }}>
              <Icon name="camera" size={15} color={COLORS.text} />
              Imagens de campanha
              <StatusChip isOptional />
            </legend>

            <input
              ref={imagesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              style={{ display: "none" }}
              id="images-upload"
            />

            {imagesCount > 0 ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: `${COLORS.success}10`,
                border: `1px solid ${COLORS.success}25`,
                borderRadius: 10, padding: "10px 14px",
              }}>
                <Icon name="circleCheck" size={16} color={COLORS.success} />
                <span style={{ flex: 1, color: COLORS.text, fontSize: 13 }}>
                  {imagesCount} imagem{imagesCount > 1 ? "ns" : ""} selecionada{imagesCount > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => imagesInputRef.current?.click()}
                  style={{
                    background: "transparent", border: "none",
                    color: COLORS.accent, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImages}
                  style={{
                    background: "transparent", border: "none",
                    color: COLORS.danger, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", padding: "4px 8px",
                  }}
                >
                  Remover
                </button>
              </div>
            ) : (
              <label
                htmlFor="images-upload"
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, padding: "18px 14px",
                  border: `1px dashed ${COLORS.border}`,
                  borderRadius: 10, cursor: "pointer",
                }}
              >
                <Icon name="camera" size={22} color={COLORS.textDim} />
                <span style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600 }}>
                  Selecionar imagens
                </span>
                <span style={{ color: COLORS.textDim, fontSize: 11 }}>
                  Peças da campanha para referência
                </span>
              </label>
            )}
          </fieldset>

          {/* --- Campaign notes section --- */}
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: 0,
              color: COLORS.text, fontSize: 13, fontWeight: 700,
            }}>
              <Icon name="penLine" size={15} color={COLORS.text} />
              Observações para a campanha
              <StatusChip isOptional />
            </legend>

            <textarea
              value={campaignNotes}
              onChange={(e) => {
                const val = e.target.value.slice(0, 500)
                setCampaignNotes(val)
                updateUserData({ campaignNotes: val })
              }}
              placeholder="Descreva o objetivo, tom ou qualquer detalhe que ajude na criação das peças..."
              maxLength={500}
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${COLORS.border}`,
                background: "transparent",
                color: COLORS.text,
                fontSize: 13,
                lineHeight: 1.6,
                resize: "vertical",
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: "6px 0 0 0", textAlign: "right" }}>
              {campaignNotes.length}/500
            </p>
          </fieldset>
        </motion.div>
      )}

      {saveError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
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
          onNext={handleConfirm}
          nextLabel={isSaving ? "Salvando..." : choice === "later" ? "Confirmar e avançar com pendência" : "Confirmar e avançar"}
          nextDisabled={isSaving || (!canConfirm && !(choice === "add_now" && !hasRequiredForAddNow))}
        />
        {showContinueLater && (
          <button
            type="button"
            onClick={handleContinueLater}
            disabled={isSaving}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${COLORS.warning}40`,
              background: `${COLORS.warning}10`,
              color: COLORS.warning,
              fontSize: 13,
              fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            {isSaving ? "Salvando..." : "Continuar depois (marcar etapa como pendente)"}
          </button>
        )}
      </StickyFooter>

      <ProcessingOverlay
        show={isSaving}
        messages={[
          "Enviando identidade visual...",
          "Salvando logo e cores...",
          "Quase pronto...",
        ]}
        duration={4000}
      />
    </PageLayout>
  )
}
