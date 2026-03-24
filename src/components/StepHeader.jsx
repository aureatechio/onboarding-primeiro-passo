import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import Icon from "./Icon";

export default function StepHeader({
  title,
  readTime,
  alert,
  tag,
  showPersonalized = false,
  stepLabel,
}) {
  const { currentStep, totalSteps } = useOnboarding();
  const stepNum = typeof currentStep === "number" ? currentStep : totalSteps;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: `${COLORS.red}15`,
            border: `1px solid ${COLORS.red}30`,
            borderRadius: 100,
            padding: "4px 12px",
          }}
        >
          <span
            style={{
              color: COLORS.red,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {stepLabel || `ETAPA ${stepNum} DE ${totalSteps}`}
          </span>
        </div>
        {showPersonalized && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: `${COLORS.magenta}12`,
              border: `1px solid ${COLORS.magenta}25`,
              borderRadius: 100,
              padding: "4px 10px",
            }}
          >
            <span
              style={{
                color: COLORS.magenta,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              PERSONALIZADA
            </span>
          </div>
        )}
      </div>

      <h1
        style={{
          color: COLORS.text,
          fontSize: 28,
          fontWeight: 900,
          margin: "0 0 4px 0",
          letterSpacing: "-0.03em",
        }}
      >
        {title}
      </h1>

      {readTime && (
        <p style={{ color: COLORS.textDim, fontSize: 13, margin: "0 0 12px 0" }}>
          Tempo de leitura: {readTime}
        </p>
      )}

      {tag && (
        <p
          style={{
            color: COLORS.textDim,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            margin: "0 0 6px 0",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {tag}
        </p>
      )}

      {alert && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: `${COLORS.warning}10`,
            border: `1px solid ${COLORS.warning}25`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <Icon name="clock" size={14} color={COLORS.warning} />
          <span
            style={{
              color: COLORS.warning,
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {alert}
          </span>
        </div>
      )}
    </div>
  );
}
