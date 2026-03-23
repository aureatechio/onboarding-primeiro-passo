import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"

export default function Etapa5() {
  const { userData, goNext, updateUserData } = useOnboarding()

  const [trafficChoice, setTrafficChoice] = useState(null)
  const [completed, setCompleted] = useState(false)

  // ── Completed ──
  if (completed) {
    return (
      <CompletionScreen
        icon="📱"
        title="Etapa 5 concluída!"
        description={
          trafficChoice === "yes"
            ? "Excelente escolha! Você vai receber o PDF com as 10 superdicas de tráfego pago diretamente no seu WhatsApp. Enquanto isso, vamos seguir para a próxima etapa."
            : "Sem problemas! Você pode solicitar o material sobre tráfego a qualquer momento com seu atendente. Vamos seguir para a próxima etapa."
        }
        badge={trafficChoice === "yes" ? "PDF SUPERDICAS SOLICITADO" : undefined}
        badgeColor={COLORS.accent}
      />
    )
  }

  // ── Main Screen ──
  return (
    <PageLayout>
      <StepHeader
        title="Sua presença digital"
        readTime="2 minutos"
        showPersonalized={true}
      />

      {/* Card 1 - Seus criativos precisam de um palco */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: `linear-gradient(135deg, ${COLORS.red}18, ${COLORS.red}08)`,
          border: `1px solid ${COLORS.red}25`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>📱</span>
          <h2 style={{ color: COLORS.text, fontSize: 17, fontWeight: 800, margin: 0 }}>
            Seus criativos precisam de um palco
          </h2>
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          De nada adianta ter vídeos incríveis com uma celebridade se seus{" "}
          <strong style={{ color: COLORS.text }}>canais digitais não estão preparados</strong> para
          receber essa audiência. Suas redes sociais, site e landing pages precisam estar{" "}
          <strong style={{ color: COLORS.text }}>prontos para converter</strong>.
        </p>
      </motion.div>

      {/* Card 2 - PENSE ASSIM */}
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
          PENSE ASSIM
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${COLORS.magenta}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
              }}
            >
              <span style={{ fontSize: 22 }}>⭐</span>
            </div>
            <p
              style={{
                color: COLORS.magenta,
                fontSize: 11,
                fontWeight: 800,
                margin: "0 0 2px 0",
                letterSpacing: "0.05em",
              }}
            >
              A CELEBRIDADE
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              Atrai os olhares
            </p>
          </div>

          <span style={{ color: COLORS.textDim, fontSize: 20, flexShrink: 0 }}>→</span>

          <div style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${COLORS.accent}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 8px",
              }}
            >
              <span style={{ fontSize: 22 }}>📱</span>
            </div>
            <p
              style={{
                color: COLORS.accent,
                fontSize: 11,
                fontWeight: 800,
                margin: "0 0 2px 0",
                letterSpacing: "0.05em",
              }}
            >
              SEUS CANAIS
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              Convertem em resultado
            </p>
          </div>
        </div>

        {/* Warning box */}
        <div
          style={{
            background: `${COLORS.warning}10`,
            border: `1px solid ${COLORS.warning}25`,
            borderRadius: 10,
            padding: 14,
            marginTop: 16,
          }}
        >
          <p style={{ color: COLORS.warning, fontSize: 12, fontWeight: 600, lineHeight: 1.5, margin: 0, textAlign: "center" }}>
            Imagine investir em uma vitrine incrível... e manter a loja trancada. Seus canais digitais são a porta de entrada.
          </p>
        </div>
      </motion.div>

      {/* Card 3 - Traffic section */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
          border: `1px solid ${COLORS.accent}25`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <h3 style={{ color: COLORS.accent, fontSize: 16, fontWeight: 800, margin: 0 }}>
            Como acelerar seus resultados
          </h3>
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: "0 0 16px 0" }}>
          Empresas que investem em <strong style={{ color: COLORS.text }}>tráfego pago</strong> junto
          com criativos de celebridade têm até{" "}
          <strong style={{ color: COLORS.accent }}>21x mais visibilidade</strong> do que quem apenas
          posta organicamente.
        </p>

        <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, margin: "0 0 12px 0" }}>
          Quer aprender mais sobre tráfego?
        </p>

        {/* Option: Yes */}
        <button
          onClick={() => setTrafficChoice("yes")}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: trafficChoice === "yes"
              ? `2px solid ${COLORS.accent}`
              : `1px solid ${COLORS.border}`,
            background: trafficChoice === "yes" ? `${COLORS.accent}15` : COLORS.card,
            cursor: "pointer",
            textAlign: "left",
            marginBottom: 10,
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: trafficChoice === "yes"
                  ? `2px solid ${COLORS.accent}`
                  : `2px solid ${COLORS.textDim}`,
                background: trafficChoice === "yes" ? COLORS.accent : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {trafficChoice === "yes" && (
                <span style={{ color: COLORS.bg, fontSize: 11, fontWeight: 900 }}>✓</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: "0 0 2px 0" }}>
                Sim, quero receber as 10 superdicas de tráfego pago
              </p>
              <span
                style={{
                  display: "inline-block",
                  background: `${COLORS.accent}20`,
                  color: COLORS.accent,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 100,
                  letterSpacing: "0.05em",
                  marginTop: 4,
                }}
              >
                PDF GRATUITO
              </span>
            </div>
          </div>
        </button>

        {/* Option: No */}
        <button
          onClick={() => setTrafficChoice("no")}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: trafficChoice === "no"
              ? `2px solid ${COLORS.textMuted}`
              : `1px solid ${COLORS.border}`,
            background: trafficChoice === "no" ? `${COLORS.textMuted}10` : COLORS.card,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: trafficChoice === "no"
                  ? `2px solid ${COLORS.textMuted}`
                  : `2px solid ${COLORS.textDim}`,
                background: trafficChoice === "no" ? COLORS.textMuted : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {trafficChoice === "no" && (
                <span style={{ color: COLORS.bg, fontSize: 11, fontWeight: 900 }}>✓</span>
              )}
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600, margin: 0 }}>
              Agora não, quero seguir para a próxima etapa
            </p>
          </div>
        </button>
      </motion.div>

      {/* NavButtons */}
      <NavButtons
        onNext={() => {
          updateUserData({ trafficChoice })
          setCompleted(true)
        }}
        nextLabel="Concluir e avançar →"
        nextDisabled={!trafficChoice}
      />
    </PageLayout>
  )
}
