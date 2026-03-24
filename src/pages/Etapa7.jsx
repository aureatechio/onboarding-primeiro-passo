import { useState } from "react"
import { COLORS } from "../theme/colors"
import { useOnboarding } from "../context/OnboardingContext"
import { motion } from "framer-motion"
import PageLayout from "../components/PageLayout"
import StepHeader from "../components/StepHeader"
import NavButtons from "../components/NavButtons"
import CompletionScreen from "../components/CompletionScreen"
import Icon from "../components/Icon"
import BulletList from "../components/BulletList"
import StickyFooter from "../components/StickyFooter"

export default function Etapa7() {
  const { userData, goNext, updateUserData } = useOnboarding()

  const [productionPath, setProductionPath] = useState(null)
  const [completed, setCompleted] = useState(false)

  // ── Completed ──
  if (completed) {
    const isHybrid = productionPath === "hybrid"
    return (
      <CompletionScreen
        icon="trendingUp"
        title="Etapa 8 concluída!"
        description={
          isHybrid
            ? "Você escolheu a produção híbrida. Lembre-se das regras de aprovação e prazos. Seu atendente vai orientar todo o processo."
            : "Ótima escolha! A equipe Aceleraí cuida de toda a produção dos seus criativos com qualidade profissional. Vamos para a etapa final!"
        }
        badge={isHybrid ? "PRODUÇÃO HÍBRIDA" : "PRODUÇÃO ACELERAÍ"}
        badgeColor={isHybrid ? COLORS.accent : COLORS.red}
      >
        {/* Override button text via children - the CompletionScreen already has a button,
            but we note the desired label. Since CompletionScreen uses goNext internally
            with fixed text, we pass the override intent. The button text is hardcoded
            in CompletionScreen, so this is informational. */}
      </CompletionScreen>
    )
  }

  // ── Main Screen ──
  return (
    <PageLayout>
      <StepHeader
        title="Modo avançado"
        readTime="3 minutos"
        showPersonalized={true}
        stepLabel="ETAPA 8 DE 8"
      />

      {/* Card 1 - Intro */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}05)`,
          border: `1px solid ${COLORS.accent}25`,
          borderRadius: 16,
          padding: 22,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Icon name="clapperboard" size={20} color={COLORS.text} />
          <h2 style={{ color: COLORS.text, fontSize: 17, fontWeight: 800, margin: 0 }}>
            Você tem estrutura para ir além?
          </h2>
        </div>
        <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          Alguns clientes possuem equipe de design ou produção própria e preferem ter{" "}
          <strong style={{ color: COLORS.text }}>mais controle sobre os criativos finais</strong>.
          Se esse é o seu caso, temos uma opção avançada para você.
        </p>
      </motion.div>

      {/* Card 2 - Escolha seu caminho */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: 20 }}
      >
        <p style={{ color: COLORS.text, fontSize: 15, fontWeight: 800, margin: "0 0 14px 0" }}>
          Escolha seu caminho de produção:
        </p>

        {/* Option: Standard */}
        <motion.button
          onClick={() => setProductionPath("standard")}
          role="radio"
          aria-checked={productionPath === "standard"}
          aria-label="Produção pela Aceleraí"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: productionPath === "standard"
              ? `2px solid ${COLORS.red}`
              : `1px solid ${COLORS.border}`,
            background: productionPath === "standard" ? `${COLORS.red}12` : COLORS.card,
            cursor: "pointer",
            textAlign: "left",
            marginBottom: 12,
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: productionPath === "standard"
                  ? `2px solid ${COLORS.red}`
                  : `2px solid ${COLORS.textDim}`,
                background: productionPath === "standard" ? COLORS.red : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {productionPath === "standard" && (
                <Icon name="check" size={12} color={COLORS.text} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon name="clapperboard" size={16} color={COLORS.text} />
                <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 700 }}>
                  Produção pela Aceleraí
                </span>
                <span
                  style={{
                    background: `${COLORS.red}20`,
                    color: COLORS.red,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 100,
                    letterSpacing: "0.05em",
                  }}
                >
                  PADRÃO
                </span>
              </div>
              <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                Nossa equipe cuida de tudo: roteiro, edição, design e entrega final dos criativos.
              </p>
            </div>
          </div>
        </motion.button>

        {/* Option: Hybrid */}
        <motion.button
          onClick={() => setProductionPath("hybrid")}
          role="radio"
          aria-checked={productionPath === "hybrid"}
          aria-label="Produção híbrida"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: productionPath === "hybrid"
              ? `2px solid ${COLORS.accent}`
              : `1px solid ${COLORS.border}`,
            background: productionPath === "hybrid" ? `${COLORS.accent}12` : COLORS.card,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: productionPath === "hybrid"
                  ? `2px solid ${COLORS.accent}`
                  : `2px solid ${COLORS.textDim}`,
                background: productionPath === "hybrid" ? COLORS.accent : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {productionPath === "hybrid" && (
                <Icon name="check" size={12} color={COLORS.bg} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Icon name="handshake" size={16} color={COLORS.text} />
                <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 700 }}>
                  Produção híbrida
                </span>
                <span
                  style={{
                    background: `${COLORS.accent}20`,
                    color: COLORS.accent,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 100,
                    letterSpacing: "0.05em",
                  }}
                >
                  AVANÇADO
                </span>
              </div>
              <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                Você recebe os materiais brutos e sua equipe faz a edição final, seguindo nossas regras.
              </p>
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* Conditional: Hybrid rules */}
      {productionPath === "hybrid" && (
        <motion.div
          initial={{ opacity: 0, y: 20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ marginBottom: 20, overflow: "hidden" }}
        >
          {/* Mandatory approval rule */}
          <div
            style={{
              background: `${COLORS.danger}10`,
              border: `1px solid ${COLORS.danger}25`,
              borderRadius: 14,
              padding: 18,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="ban" size={16} color={COLORS.danger} />
              <span style={{ color: COLORS.danger, fontSize: 13, fontWeight: 800 }}>
                Aprovação obrigatória
              </span>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Todo material editado pela sua equipe <strong style={{ color: COLORS.text }}>precisa ser aprovado pela Aceleraí</strong> antes
              de ir ao ar. Publicar sem aprovação pode resultar em suspensão da campanha.
            </p>
          </div>

          {/* Timeline rule */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 18,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="clock" size={16} color={COLORS.text} />
              <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 800 }}>
                3 dias úteis por lote
              </span>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Cada lote de materiais enviado para aprovação tem um prazo de até{" "}
              <strong style={{ color: COLORS.text }}>3 dias úteis</strong> para revisão e feedback.
            </p>
          </div>

          {/* What celebrity can reject */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 18,
              marginBottom: 12,
            }}
          >
            <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 800, margin: "0 0 12px 0" }}>
              A celebridade pode rejeitar materiais que:
            </p>
            <BulletList
              items={[
                "Alterem a aparência ou voz da celebridade de forma inadequada",
                "Associem a imagem a conteúdo ofensivo ou polêmico",
                "Desrespeitem as diretrizes de uso da imagem",
                "Incluam promessas ou alegações não autorizadas",
              ]}
              color={COLORS.danger}
              iconSize={12}
              itemColor={COLORS.textMuted}
            />
          </div>

          {/* Recommendations */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 18,
              marginBottom: 12,
            }}
          >
            <p style={{ color: COLORS.accent, fontSize: 13, fontWeight: 800, margin: "0 0 12px 0" }}>
              Recomendações para produção híbrida:
            </p>
            <BulletList
              items={[
                "Mantenha a qualidade visual dos materiais originais",
                "Não distorça ou altere as proporções dos vídeos/fotos",
                "Use as fontes e cores da marca de forma consistente",
                "Envie os materiais para aprovação com antecedência",
              ]}
              color={COLORS.accent}
              iconSize={12}
              itemColor={COLORS.textMuted}
            />
          </div>

          {/* Briefing avançado box */}
          <div
            style={{
              background: `${COLORS.accent}10`,
              border: `1px solid ${COLORS.accent}25`,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <p style={{ color: COLORS.accent, fontSize: 12, fontWeight: 700, margin: "0 0 6px 0" }}>
              Briefing avançado
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              Na produção híbrida, você receberá um briefing avançado com todas as especificações técnicas, formatos aceitos e diretrizes de edição para sua equipe seguir.
            </p>
          </div>
        </motion.div>
      )}

      {/* Conditional: Standard confirmation */}
      {productionPath === "standard" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: `${COLORS.success}10`,
            border: `1px solid ${COLORS.success}25`,
            borderRadius: 14,
            padding: 18,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="circleCheck" size={18} color={COLORS.success} />
            <div>
              <p style={{ color: COLORS.success, fontSize: 14, fontWeight: 700, margin: "0 0 4px 0" }}>
                Produção completa pela Aceleraí
              </p>
              <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                Nossa equipe vai cuidar de toda a produção dos seus criativos. Você só precisa enviar o briefing e aprovar os materiais finais.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* NavButtons */}
      <StickyFooter>
        <NavButtons
          onNext={() => {
            updateUserData({ productionPath })
            setCompleted(true)
          }}
          nextLabel="Concluir e avançar"
          nextDisabled={!productionPath}
        />
      </StickyFooter>
    </PageLayout>
  )
}
