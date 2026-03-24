import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"

export default function Etapa6() {
  const { userData, goNext } = useOnboarding()

  const [acknowledged, setAcknowledged] = useState(false)
  const [completed, setCompleted] = useState(false)

  // ── Completed ──
  if (completed) {
    return (
      <CompletionScreen
        icon="palette"
        title="Etapa 6 concluída!"
        description={`Seu atendente ${userData.atendente} vai te ajudar a organizar todos os materiais de identidade visual. Se tiver dúvidas sobre o que enviar, é só perguntar.`}
      />
    )
  }

  const items = [
    { icon: "palette", title: "Logo em alta resolução", desc: "PNG com fundo transparente, de preferência" },
    { icon: "palette", title: "Cores principais da marca", desc: "Códigos hex (ex: #FF0000) ou referência visual" },
    { icon: "type", title: "Fontes da comunicação", desc: "Nome das fontes usadas nos materiais da marca" },
    { icon: "camera", title: "Referências visuais", desc: "Exemplos de peças, posts ou anúncios que você gosta" },
  ]

  // ── Main Screen ──
  return (
    <PageLayout>
      <StepHeader
        title="Sua identidade visual"
        readTime="2 minutos"
        showPersonalized={true}
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
            Suas peças ficam muito melhores com a sua cara
          </h2>
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Para que os criativos da sua campanha fiquem{" "}
          <strong style={{ color: COLORS.text }}>alinhados com a identidade da sua marca</strong>,
          precisamos de algumas referências visuais. Quanto mais material você enviar, mais{" "}
          <strong style={{ color: COLORS.text }}>personalizado e profissional</strong> será o resultado.
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
          A DIFERENÇA NA PRÁTICA
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
                COM REFERÊNCIAS
              </span>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Peça alinhada com a identidade da sua marca, cores corretas, fontes consistentes e resultado profissional.
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
                SEM REFERÊNCIAS
              </span>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Produção genérica, sem personalidade da marca, cores e fontes aproximadas e resultado que não representa sua empresa.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Card 3 - Separe esses itens */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
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
            color: COLORS.text,
            fontSize: 15,
            fontWeight: 800,
            margin: "0 0 16px 0",
          }}
        >
          Separe esses itens
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 0",
                borderBottom: i < items.length - 1 ? `1px solid ${COLORS.border}` : "none",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${COLORS.magenta}12`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={item.icon} size={18} color={COLORS.magenta} />
              </div>
              <div>
                <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, margin: "0 0 3px 0" }}>
                  {item.title}
                </p>
                <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Reassuring box */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          background: `${COLORS.accent}10`,
          border: `1px solid ${COLORS.accent}25`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <p style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600, lineHeight: 1.6, margin: 0, textAlign: "center" }}>
          Não tem nada disso organizado? Sem problema! Seu atendente vai te ajudar a reunir tudo. O importante é começar.
        </p>
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
            Entendi que preciso separar os materiais de identidade visual da minha marca para enviar ao atendente.
          </p>
        </motion.button>
      </motion.div>

      {/* NavButtons */}
      <NavButtons
        onNext={() => setCompleted(true)}
        nextLabel="Confirmar e avançar"
        nextDisabled={!acknowledged}
      />
    </PageLayout>
  )
}
