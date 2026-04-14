import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { useCopy } from "../context/CopyContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import StickyFooter from "../components/StickyFooter"

export default function Etapa6() {
  const { userData, goNext } = useOnboarding()
  const { ETAPA6 } = useCopy()

  const [acknowledged, setAcknowledged] = useState(false)
  const [completed, setCompleted] = useState(false)

  // ── Completed ──
  if (completed) {
    return (
      <CompletionScreen
        icon="palette"
        title={ETAPA6.completionTitle}
        description={ETAPA6.completionDescription(userData.atendente)}
      />
    )
  }

  // ── Main Screen ──
  return (
    <PageLayout>
      <StepHeader
        title={ETAPA6.header.title}
        readTime={ETAPA6.header.readTime}
        showPersonalized={true}
        stepLabel={ETAPA6.header.stepLabel}
      />

      {/* Card 1 - Intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: `linear-gradient(135deg, ${COLORS.magenta}12, ${COLORS.magenta}05)`,
          border: `1px solid ${COLORS.magenta}25`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Icon name="palette" size={20} color={COLORS.text} />
          <h2 style={{ color: COLORS.text, fontSize: 17, fontWeight: 800, margin: 0 }}>
            {ETAPA6.intro.title}
          </h2>
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          {ETAPA6.intro.body}
        </p>
      </motion.div>

      {/* Card 2 - A DIFERENÇA NA PRÁTICA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <p
          style={{
            color: COLORS.textDim,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            margin: "0 0 16px 0",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {ETAPA6.diferenca.label}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* COM REFERÊNCIAS */}
          <div
            style={{
              background: `${COLORS.success}08`,
              border: `1px solid ${COLORS.success}20`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name="circleCheck" size={14} color={COLORS.success} />
              <span style={{ color: COLORS.success, fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>
                {ETAPA6.diferenca.comReferencias.label}
              </span>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {ETAPA6.diferenca.comReferencias.desc}
            </p>
          </div>

          {/* SEM REFERÊNCIAS */}
          <div
            style={{
              background: `${COLORS.danger}08`,
              border: `1px solid ${COLORS.danger}20`,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name="alertTriangle" size={14} color={COLORS.danger} />
              <span style={{ color: COLORS.danger, fontSize: 12, fontWeight: 800, letterSpacing: "0.05em" }}>
                {ETAPA6.diferenca.semReferencias.label}
              </span>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {ETAPA6.diferenca.semReferencias.desc}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Confirmation checkbox button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{ marginBottom: 20 }}
      >
        <motion.button
          onClick={() => setAcknowledged(!acknowledged)}
          role="checkbox"
          aria-checked={acknowledged}
          aria-label="Confirmar entendimento sobre envio dos materiais de identidade visual"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 12,
            border: acknowledged
              ? `2px solid ${COLORS.accent}`
              : `1px solid ${COLORS.border}`,
            background: acknowledged ? `${COLORS.accent}12` : COLORS.card,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 12,
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: acknowledged
                ? `2px solid ${COLORS.accent}`
                : `2px solid ${COLORS.textDim}`,
              background: acknowledged ? COLORS.accent : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s ease",
            }}
          >
            {acknowledged && (
              <Icon name="check" size={13} color={COLORS.bg} />
            )}
          </div>
          <p style={{ color: acknowledged ? COLORS.text : COLORS.textMuted, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            {ETAPA6.acknowledgement}
          </p>
        </motion.button>
      </motion.div>

      {/* NavButtons */}
      <StickyFooter>
        <NavButtons
          onNext={() => setCompleted(true)}
          nextLabel={ETAPA6.navConfirm}
          nextDisabled={!acknowledged}
        />
      </StickyFooter>
    </PageLayout>
  )
}
