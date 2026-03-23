import { useState } from "react";
import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import TopBar from "../components/TopBar";

export default function EtapaFinal() {
  const { userData, totalSteps } = useOnboarding();
  const [finished, setFinished] = useState(false);

  // ════════════════════════════════════════════════
  // TELA FINAL — "Parabéns!" (sem motion, 100% estático)
  // ════════════════════════════════════════════════
  if (finished) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg }}>
        {/* Top bar CONCLUÍDO */}
        <div style={{
          background: `${COLORS.bg}EE`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "12px 24px",
        }}>
          <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: COLORS.accent, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>
              PRIMEIRO PASSO
            </span>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: `${COLORS.success}12`, border: `1px solid ${COLORS.success}25`,
              borderRadius: 100, padding: "3px 10px",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success, boxShadow: `0 0 6px ${COLORS.success}` }} />
              <span style={{ color: COLORS.success, fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                CONCLUÍDO
              </span>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
          {/* Ícone */}
          <div style={{
            width: 96, height: 96, borderRadius: "50%",
            background: `linear-gradient(135deg, ${COLORS.red}20, ${COLORS.accent}15)`,
            border: `2px solid ${COLORS.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px",
            boxShadow: `0 0 60px ${COLORS.accent}15`,
          }}>
            <span style={{ fontSize: 48 }}>🎉</span>
          </div>

          <h1 style={{ color: COLORS.text, fontSize: 36, fontWeight: 900, margin: "0 0 12px 0", letterSpacing: "-0.04em" }}>
            Parabéns!
          </h1>

          <p style={{ color: COLORS.textMuted, fontSize: 16, lineHeight: 1.7, margin: "0 auto 8px", maxWidth: 400 }}>
            Você está entre os poucos empresários do Brasil que contam com uma{" "}
            <span style={{ color: COLORS.text, fontWeight: 600 }}>celebridade na sua comunicação</span>.
          </p>

          <p style={{ color: COLORS.accent, fontSize: 16, fontWeight: 700, margin: "0 0 32px 0" }}>
            Agora é hora de fazer esse investimento virar resultado.
          </p>

          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{ width: 24, height: 4, borderRadius: 2, background: COLORS.success }} />
            ))}
          </div>
          <p style={{ color: COLORS.success, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", margin: "0 0 36px 0" }}>
            PRIMEIRO PASSO CONCLUÍDO ✓
          </p>

          {/* Card atendente */}
          <div style={{
            background: COLORS.card, border: `1px solid ${COLORS.border}`,
            borderRadius: 16, padding: 24, marginBottom: 20,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `${COLORS.red}15`, border: `1.5px solid ${COLORS.red}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <span style={{ fontSize: 28 }}>👋</span>
            </div>
            <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", margin: "0 0 6px 0" }}>
              SUA ATENDENTE
            </p>
            <p style={{ color: COLORS.text, fontSize: 22, fontWeight: 800, margin: "0 0 6px 0" }}>
              {userData.atendente}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              Vai entrar em contato em até{" "}
              <span style={{ color: COLORS.accent, fontWeight: 700 }}>1 dia útil</span>{" "}
              pra iniciar a produção da sua campanha.
            </p>
          </div>

          <p style={{ color: COLORS.textDim, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            A gente está junto com você. Boa campanha!
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // TELA DE RESUMO
  // ════════════════════════════════════════════════
  const summaryRows = [
    { label: "Celebridade", value: userData.celebName, icon: "⭐", color: COLORS.text },
    { label: "Praça", value: userData.praca, icon: "📍", color: COLORS.accent },
    { label: "Segmento", value: userData.segmento, icon: "🏷", color: COLORS.warning },
    { label: "Pacote", value: "2 vídeos + 4 estáticas", icon: "🎬", color: COLORS.text },
    { label: "Vigência", value: userData.vigencia, icon: "📅", color: COLORS.text },
    { label: "Preparação", value: "15 dias (ativados)", icon: "⏱", color: COLORS.warning },
  ];

  const nextSteps = [
    { num: "1", title: `Sua atendente ${userData.atendente} vai entrar em contato`, desc: "Em até 1 dia útil pra iniciar a produção da sua campanha", color: COLORS.red },
    { num: "2", title: "Tenha esses materiais prontos", desc: "Informações sobre sua empresa, ideias pra campanha e sua identidade visual", color: COLORS.accent },
    { num: "3", title: "Responda rápido", desc: "Quanto mais ágil for a comunicação, mais rápido suas peças ficam prontas", color: COLORS.warning },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, padding: "0 0 40px 0" }}>
      <TopBar />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 24px 0" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `${COLORS.accent}12`, border: `1.5px solid ${COLORS.accent}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <span style={{ fontSize: 30 }}>✅</span>
          </div>
          <h1 style={{ color: COLORS.text, fontSize: 28, fontWeight: 900, margin: "0 0 6px 0", letterSpacing: "-0.03em" }}>
            Tudo pronto. Sua campanha vai começar.
          </h1>
          <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>
            Você completou todas as etapas. Aqui está o resumo.
          </p>
        </div>

        {/* Resumo */}
        <div style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 16 }}>
          <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", margin: "0 0 14px 0" }}>
            RESUMO DA SUA CAMPANHA
          </p>
          {summaryRows.map((row, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: i < summaryRows.length - 1 ? `1px solid ${COLORS.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14 }}>{row.icon}</span>
                <span style={{ color: COLORS.textDim, fontSize: 12, fontWeight: 600 }}>{row.label}</span>
              </div>
              <span style={{ color: row.color, fontSize: 13, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Próximos passos */}
        <div style={{ background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 16 }}>
          <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", margin: "0 0 14px 0" }}>
            PRÓXIMOS PASSOS
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {nextSteps.map((step) => (
              <div key={step.num} style={{
                display: "flex", gap: 14, alignItems: "flex-start",
                background: COLORS.inputBg, borderRadius: 12, padding: 16,
                border: `1px solid ${COLORS.border}`,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${step.color}12`, border: `1px solid ${step.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: step.color, fontSize: 13, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}>
                    {step.num}
                  </span>
                </div>
                <div>
                  <p style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, margin: "0 0 3px 0" }}>{step.title}</p>
                  <p style={{ color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card atendente */}
        <div style={{
          background: `linear-gradient(145deg, ${COLORS.red}08, ${COLORS.card})`,
          border: `1px solid ${COLORS.red}20`, borderRadius: 14,
          padding: 20, marginBottom: 24,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: `${COLORS.red}15`, border: `1.5px solid ${COLORS.red}30`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 24 }}>👋</span>
          </div>
          <div>
            <p style={{ color: COLORS.textDim, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", margin: "0 0 4px 0" }}>SUA ATENDENTE</p>
            <p style={{ color: COLORS.text, fontSize: 18, fontWeight: 800, margin: "0 0 4px 0" }}>{userData.atendente}</p>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>
              Entrará em contato em até <span style={{ color: COLORS.accent, fontWeight: 600 }}>1 dia útil</span>
            </p>
          </div>
        </div>

        {/* Botão */}
        <button
          type="button"
          onClick={() => setFinished(true)}
          style={{
            width: "100%", padding: 18, borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${COLORS.red}, #FF4444)`,
            color: COLORS.text, fontSize: 16, fontWeight: 900, cursor: "pointer",
            boxShadow: `0 4px 24px ${COLORS.red}30`,
          }}
        >
          Concluir Primeiro Passo ✓
        </button>
        <p style={{ color: COLORS.textDim, fontSize: 11, textAlign: "center", marginTop: 12 }}>
          Ao concluir, seu perfil completo é gerado automaticamente.
        </p>
      </div>
    </div>
  );
}
