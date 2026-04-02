import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import TopBarLogo from "../components/TopBarLogo";
import Icon from "../components/Icon";
import LottieImport from "lottie-react";
import celebrationAnimation from "../assets/lottie/celebration.json";

const Lottie =
  typeof LottieImport === "function"
    ? LottieImport
    : typeof LottieImport?.default === "function"
      ? LottieImport.default
      : null;

export default function TudoPronto() {
  const { userData, totalSteps } = useOnboarding();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at 50% 20%, #1a0800 0%, ${COLORS.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: `${COLORS.bg}EE`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TopBarLogo />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: `${COLORS.success}12`,
              border: `1px solid ${COLORS.success}25`,
              borderRadius: 100,
              padding: "3px 10px",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: COLORS.success,
                boxShadow: `0 0 6px ${COLORS.success}`,
              }}
            />
            <span
              style={{
                color: COLORS.success,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              CONCLUÍDO
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px 60px",
        }}
      >
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          {/* Ícone */}
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.red}20, ${COLORS.accent}15)`,
              border: `2px solid ${COLORS.accent}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 28px",
              boxShadow: `0 0 60px ${COLORS.accent}15, 0 0 120px ${COLORS.red}10`,
            }}
          >
            {Lottie ? (
              <Lottie
                animationData={celebrationAnimation}
                loop={false}
                style={{ width: 96, height: 96 }}
              />
            ) : (
              <Icon name="partyPopper" size={42} color={COLORS.accent} />
            )}
          </div>

          {/* Título */}
          <h1
            style={{
              color: COLORS.text,
              fontSize: 36,
              fontWeight: 900,
              margin: "0 0 12px 0",
              letterSpacing: "-0.04em",
            }}
          >
            Parabéns!
          </h1>

          <p
            style={{
              color: COLORS.textMuted,
              fontSize: 16,
              lineHeight: 1.7,
              margin: "0 auto 8px",
              maxWidth: 400,
            }}
          >
            Você está entre os poucos empresários do Brasil que contam com uma{" "}
            <span style={{ color: COLORS.text, fontWeight: 600 }}>
              celebridade na sua comunicação
            </span>.
          </p>

          <p
            style={{
              color: COLORS.accent,
              fontSize: 16,
              fontWeight: 700,
              margin: "0 0 32px 0",
            }}
          >
            Agora é hora de fazer esse investimento virar resultado.
          </p>

          {/* Progress dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 24,
                  height: 4,
                  borderRadius: 2,
                  background: COLORS.success,
                }}
              />
            ))}
          </div>

          <p
            style={{
              color: COLORS.success,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.1em",
              margin: "0 0 36px 0",
            }}
          >
            PRIMEIRO PASSO CONCLUIDO
          </p>

          {/* Card atendente */}
          <div
            style={{
              background: COLORS.card,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: `${COLORS.red}15`,
                border: `1.5px solid ${COLORS.red}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Icon name="hand" size={28} color={COLORS.red} />
            </div>
            <p
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                margin: "0 0 6px 0",
              }}
            >
              SUA ATENDENTE
            </p>
            <p
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: 800,
                margin: "0 0 6px 0",
              }}
            >
              {userData.atendente}
            </p>
            <p style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              Vai entrar em contato em até{" "}
              <span style={{ color: COLORS.accent, fontWeight: 700 }}>1 dia útil</span>{" "}
              pra iniciar a produção da sua campanha.
            </p>
          </div>

          {/* Mensagem final */}
          <p
            style={{
              color: COLORS.textDim,
              fontSize: 13,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            A gente está junto com você. Boa campanha!
          </p>
        </div>
      </div>
    </div>
  );
}
