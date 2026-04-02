import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import InfoCard from "../components/InfoCard"
import { Smartphone } from "lucide-react"
import StickyFooter from "../components/StickyFooter"

const DEFAULT_MATERIAL_WEBHOOK_ENDPOINT =
  "https://hub.aureatech.io/webhook-test/primeirospassos-envio-material"

function isValidHttpUrl(value) {
  if (!value) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

async function sendTrafficMaterialWebhook(endpoint, url) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error(`Material webhook failed: ${response.status}`)
  }
}

export default function Etapa5() {
  const { updateUserData } = useOnboarding()

  const [trafficChoice, setTrafficChoice] = useState(null)
  const [completed, setCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const configuredTrafficMaterialUrl = String(
    import.meta.env.VITE_TRAFFIC_MATERIAL_URL || ""
  ).trim()
  const configuredMaterialWebhookEndpoint = String(
    import.meta.env.VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT || ""
  ).trim()
  const materialWebhookEndpoint = isValidHttpUrl(configuredMaterialWebhookEndpoint)
    ? configuredMaterialWebhookEndpoint
    : DEFAULT_MATERIAL_WEBHOOK_ENDPOINT
  const fallbackMaterialUrl =
    typeof window !== "undefined" ? String(window.location.href || "").trim() : ""
  const trafficMaterialUrl = isValidHttpUrl(configuredTrafficMaterialUrl)
    ? configuredTrafficMaterialUrl
    : fallbackMaterialUrl

  // ── Completed ──
  if (completed) {
    return (
      <CompletionScreen
        icon="smartphone"
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: 16 }}>
        <InfoCard
          icon={Smartphone}
          title="Seus criativos precisam de um palco"
          iconColor={COLORS.red}
          borderColor={`${COLORS.red}25`}
          bgTint={`linear-gradient(135deg, ${COLORS.red}18, ${COLORS.red}08)`}
        >
          <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            De nada adianta ter vídeos incríveis com uma celebridade se seus{" "}
            <strong style={{ color: COLORS.text }}>canais digitais não estão preparados</strong> para
            receber essa audiência. Suas redes sociais, site e landing pages precisam estar{" "}
            <strong style={{ color: COLORS.text }}>prontos para converter</strong>.
          </p>
        </InfoCard>
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
              <Icon name="star" size={22} color={COLORS.magenta} />
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

          <Icon name="arrowRight" size={20} color={COLORS.textDim} />

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
              <Icon name="smartphone" size={22} color={COLORS.accent} />
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
          <Icon name="trendingUp" size={20} color={COLORS.accent} />
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
        <motion.button
          onClick={() => setTrafficChoice("yes")}
          role="radio"
          aria-checked={trafficChoice === "yes"}
          aria-label="Sim, quero receber as 10 superdicas de tráfego pago"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                <Icon name="check" size={11} color={COLORS.bg} />
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
        </motion.button>

        {/* Option: No */}
        <motion.button
          onClick={() => setTrafficChoice("no")}
          role="radio"
          aria-checked={trafficChoice === "no"}
          aria-label="Agora não, quero seguir para a próxima etapa"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                <Icon name="check" size={11} color={COLORS.bg} />
              )}
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: 600, margin: 0 }}>
              Agora não, quero seguir para a próxima etapa
            </p>
          </div>
        </motion.button>
      </motion.div>

      {/* NavButtons */}
      <StickyFooter>
        <NavButtons
          onNext={async () => {
            if (isSubmitting) return
            setIsSubmitting(true)
            try {
              updateUserData({ trafficChoice })
              if (trafficChoice === "yes") {
                if (!isValidHttpUrl(configuredMaterialWebhookEndpoint)) {
                  console.warn(
                    "[onboarding][etapa5] VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT missing/invalid, using default webhook endpoint"
                  )
                }
                if (!isValidHttpUrl(configuredTrafficMaterialUrl)) {
                  console.warn(
                    "[onboarding][etapa5] VITE_TRAFFIC_MATERIAL_URL missing/invalid, using current page URL fallback"
                  )
                }
                if (isValidHttpUrl(trafficMaterialUrl)) {
                  try {
                    await sendTrafficMaterialWebhook(materialWebhookEndpoint, trafficMaterialUrl)
                  } catch (error) {
                    console.error("[onboarding][etapa5] failed to trigger material webhook", error)
                  }
                } else {
                  console.warn(
                    "[onboarding][etapa5] skipped material webhook due to missing valid URL payload"
                  )
                }
              }
              setCompleted(true)
            } finally {
              setIsSubmitting(false)
            }
          }}
          nextLabel={isSubmitting ? "Enviando..." : "Concluir e avançar"}
          nextDisabled={!trafficChoice || isSubmitting}
        />
      </StickyFooter>
    </PageLayout>
  )
}
