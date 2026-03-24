import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"

const PRESET_COLORS = ["#E8356D", "#384FFE", "#111119"]

const FONT_OPTIONS = [
  { id: "inter", label: "Inter", preview: "Inter", family: "'Inter', sans-serif" },
  { id: "jetbrains", label: "JetBrains Mono", preview: "JetBrains Mono", family: "'JetBrains Mono', monospace" },
  { id: "georgia", label: "Georgia", preview: "Georgia", family: "Georgia, serif" },
]

export default function Etapa62() {
  const { userData, updateUserData } = useOnboarding()

  const [choice, setChoice] = useState(userData.identityBonusChoice || null)
  const [logoName, setLogoName] = useState(userData.identityBonusLogoName || "")
  const [colors, setColors] = useState(
    Array.isArray(userData.identityBonusColors) && userData.identityBonusColors.length > 0
      ? userData.identityBonusColors
      : PRESET_COLORS
  )
  const [selectedFont, setSelectedFont] = useState(userData.identityBonusFont || "")
  const [imagesCount, setImagesCount] = useState(Number(userData.identityBonusImagesCount || 0))
  const [completed, setCompleted] = useState(false)
  const [pendingMode, setPendingMode] = useState(false)

  const hasRequiredForAddNow = Boolean(logoName) && Boolean(selectedFont)
  const canConfirm = choice === "later" || (choice === "add_now" && hasRequiredForAddNow)
  const showContinueLater = choice === "add_now" && !hasRequiredForAddNow

  const colorsRemaining = useMemo(() => Math.max(0, 5 - colors.length), [colors.length])

  const persist = (partial) => {
    updateUserData({
      identityBonusChoice: choice,
      identityBonusLogoName: logoName,
      identityBonusColors: colors,
      identityBonusFont: selectedFont,
      identityBonusImagesCount: imagesCount,
      ...partial,
    })
  }

  const handleSelectChoice = (nextChoice) => {
    setChoice(nextChoice)
    updateUserData({ identityBonusChoice: nextChoice })
  }

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0]
    const nextLogo = file?.name || ""
    setLogoName(nextLogo)
    updateUserData({ identityBonusLogoName: nextLogo })
  }

  const handleImagesChange = (event) => {
    const nextCount = event.target.files?.length || 0
    setImagesCount(nextCount)
    updateUserData({ identityBonusImagesCount: nextCount })
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

  const handleConfirm = () => {
    if (!canConfirm) return
    if (choice === "later") {
      persist({ identityBonusPending: true })
      setPendingMode(true)
      setCompleted(true)
      return
    }

    persist({ identityBonusPending: false })
    setPendingMode(false)
    setCompleted(true)
  }

  const handleContinueLater = () => {
    persist({ identityBonusPending: true })
    setPendingMode(true)
    setCompleted(true)
  }

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
          COMO FUNCIONA?
        </p>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 10px 0" }}>
          Dentro do prazo de 15 dias após a assinatura do seu contrato, você recebe, ao final dos
          três meses de contrato, os dias que vc conseguiu antecipar de prazo.
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
          }}
        >
          <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
            ( ) Vou adicionar as minhas referências da identidade visual
          </p>
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
          }}
        >
          <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: 0 }}>
            ( ) Prefiro deixar para depois tendo ciência que o prazo do meu contrato está correndo
            desde já.
          </p>
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
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: "0 0 8px 0" }}>
              + Adicionar Logo (obrigatório)
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              style={{ width: "100%" }}
            />
            {logoName ? (
              <p style={{ color: COLORS.success, fontSize: 12, margin: "8px 0 0 0" }}>
                Arquivo selecionado: {logoName}
              </p>
            ) : (
              <p style={{ color: COLORS.warning, fontSize: 12, margin: "8px 0 0 0" }}>
                Selecione um arquivo de logo para concluir esta etapa.
              </p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: "0 0 8px 0" }}>
              + Adicionar Cores Principais (3 presets fixas, máximo 5)
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {colors.map((color, index) => (
                <div key={`${color}-${index}`} style={{ textAlign: "center" }}>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => handleColorChange(index, event.target.value)}
                    style={{
                      width: 44,
                      height: 44,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      background: "transparent",
                      padding: 2,
                    }}
                  />
                </div>
              ))}
              {colors.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddColor}
                  style={{
                    height: 44,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: `1px dashed ${COLORS.border}`,
                    background: "transparent",
                    color: COLORS.textMuted,
                    cursor: "pointer",
                  }}
                >
                  + cor
                </button>
              )}
            </div>
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: "8px 0 0 0" }}>
              Restantes: {colorsRemaining}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: "0 0 8px 0" }}>
              + Adicionar as minhas Fontes de texto (obrigatório)
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => handleSelectFont(font.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 12,
                    borderRadius: 10,
                    border: selectedFont === font.id ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                    background: selectedFont === font.id ? `${COLORS.accent}10` : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <p
                    style={{
                      color: COLORS.text,
                      fontSize: 16,
                      fontFamily: font.family,
                      margin: "0 0 4px 0",
                    }}
                  >
                    {font.preview}
                  </p>
                  <p style={{ color: COLORS.textDim, fontSize: 11, margin: 0 }}>{font.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: "0 0 8px 0" }}>
              + Adicionar imagens de peças de campanhas (opcional)
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesChange}
              style={{ width: "100%" }}
            />
            <p style={{ color: COLORS.textDim, fontSize: 11, margin: "8px 0 0 0" }}>
              {imagesCount > 0 ? `${imagesCount} imagem(ns) selecionada(s)` : "Nenhuma imagem selecionada"}
            </p>
          </div>
        </motion.div>
      )}

      <StickyFooter>
        <NavButtons
          onNext={handleConfirm}
          nextLabel={choice === "later" ? "Confirmar e avançar com pendência" : "Confirmar e avançar"}
          nextDisabled={!canConfirm}
        />
        {showContinueLater && (
          <button
            type="button"
            onClick={handleContinueLater}
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
              cursor: "pointer",
            }}
          >
            Continuar depois (marcar etapa como pendente)
          </button>
        )}
      </StickyFooter>
    </PageLayout>
  )
}
