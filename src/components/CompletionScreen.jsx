import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import { motion } from "framer-motion";
import TopBar from "./TopBar";

export default function CompletionScreen({
  icon = "✓",
  title,
  description,
  badge,
  badgeColor,
  summaryItems,
  children,
  buttonLabel = "Continuar para a próxima etapa →",
  onContinue,
}) {
  const { currentStep, totalSteps, goNext } = useOnboarding();
  const stepNum = typeof currentStep === "number" ? currentStep : totalSteps;

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      goNext();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at 50% 0%, #001a00 0%, ${COLORS.bg} 70%)`,
      }}
    >
      <TopBar />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "48px 24px 40px",
          textAlign: "center",
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            background: `${COLORS.success}15`,
            border: `2px solid ${COLORS.success}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: `0 0 40px ${COLORS.success}15`,
          }}
        >
          <span style={{ fontSize: 34 }}>{icon}</span>
        </motion.div>

        <h2
          style={{
            color: COLORS.text,
            fontSize: 26,
            fontWeight: 900,
            margin: "0 0 8px 0",
            letterSpacing: "-0.03em",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            color: COLORS.textMuted,
            fontSize: 15,
            lineHeight: 1.6,
            margin: "0 0 20px 0",
          }}
        >
          {description}
        </p>

        {badge && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `${badgeColor || COLORS.accent}10`,
              border: `1px solid ${badgeColor || COLORS.accent}25`,
              borderRadius: 100,
              padding: "8px 18px",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                color: badgeColor || COLORS.accent,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {badge}
            </span>
          </div>
        )}

        {summaryItems && (
          <div
            style={{
              background: COLORS.card,
              borderRadius: 14,
              border: `1px solid ${COLORS.border}`,
              padding: 22,
              textAlign: "left",
              marginBottom: 28,
            }}
          >
            <p
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                margin: "0 0 16px 0",
              }}
            >
              RESUMO
            </p>
            {summaryItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom:
                    i < summaryItems.length - 1
                      ? `1px solid ${COLORS.border}`
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  <span style={{ color: COLORS.textDim, fontSize: 12, fontWeight: 600 }}>
                    {item.label}
                  </span>
                </div>
                <span style={{ color: item.color || COLORS.text, fontSize: 13, fontWeight: 600 }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {children}

        <button
          type="button"
          onClick={handleContinue}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(135deg, #CC2222, ${COLORS.red})`,
            color: COLORS.text,
            fontSize: 15,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: `0 4px 20px ${COLORS.red}25`,
            letterSpacing: "0.01em",
          }}
        >
          {buttonLabel}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 20,
            marginBottom: 6,
          }}
        >
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i < stepNum ? 24 : 8,
                height: 4,
                borderRadius: 2,
                background: i < stepNum ? COLORS.success : COLORS.border,
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
        <p
          style={{
            color: COLORS.textDim,
            fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ETAPA {stepNum} DE {totalSteps} ✓
        </p>
      </motion.div>
    </div>
  );
}
