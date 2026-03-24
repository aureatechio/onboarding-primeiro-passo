import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import TopBarLogo from "./TopBarLogo";
import { motion } from "framer-motion";

export default function TopBar({ showCompleted = false }) {
  const { currentStep, completedSteps, totalSteps } = useOnboarding();

  const stepNum = typeof currentStep === "number" ? currentStep : totalSteps;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
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

        {showCompleted ? (
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
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: totalSteps }).map((_, i) => {
              const isCompleted = completedSteps.has(i + 1);
              const isCurrent = i + 1 === stepNum;
              const isActive = i + 1 <= stepNum;

              return (
                <motion.div
                  key={i}
                  layoutId={`progress-dot-${i}`}
                  style={{
                    width: isActive ? 16 : 6,
                    height: 3,
                    borderRadius: 2,
                    background: isCompleted
                      ? COLORS.success
                      : isCurrent
                        ? COLORS.red
                        : COLORS.border,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
