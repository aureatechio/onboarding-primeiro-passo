import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "../context/OnboardingContext";
import { COLORS } from "../theme/colors";
import Icon from "./Icon";

export default function StepDrawer({ isOpen, onClose }) {
  const { currentStep, completedSteps, totalSteps, stepTitles, goToStep, userData } =
    useOnboarding();

  const handleSelect = (step) => {
    if (completedSteps.has(step) || step === currentStep) {
      goToStep(step);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 50,
            }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 51,
              background: COLORS.card,
              borderRadius: "20px 20px 0 0",
              padding: "20px 24px",
              paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))",
              maxHeight: "60vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: COLORS.border,
                margin: "0 auto 20px",
              }}
            />

            <p
              style={{
                color: COLORS.textDim,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 16,
              }}
            >
              NAVEGAÇÃO
            </p>

            {Array.from({ length: totalSteps }).map((_, i) => {
              const step = i + 1;
              const isCompleted = completedSteps.has(step);
              const isCurrent = step === currentStep;
              const isAccessible = isCompleted || isCurrent;
              const isBonusPending = step === 7 && userData.identityBonusPending;

              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleSelect(step)}
                  disabled={!isAccessible}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 0",
                    border: "none",
                    borderBottom: i < totalSteps - 1 ? `1px solid ${COLORS.border}` : "none",
                    background: "transparent",
                    cursor: isAccessible ? "pointer" : "default",
                    opacity: isAccessible ? 1 : 0.4,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isCompleted
                        ? `${COLORS.success}20`
                        : isCurrent
                          ? `${COLORS.red}20`
                          : COLORS.border,
                      border: `2px solid ${
                        isCompleted ? COLORS.success : isCurrent ? COLORS.red : COLORS.border
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? (
                      <Icon name="check" size={13} color={COLORS.success} />
                    ) : (
                      <span
                        style={{
                          color: isCurrent ? COLORS.red : COLORS.textDim,
                          fontSize: 12,
                          fontWeight: 700,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {step}
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: "left" }}>
                    <p
                      style={{
                        color: isCurrent ? COLORS.text : isCompleted ? COLORS.textMuted : COLORS.textDim,
                        fontSize: 14,
                        fontWeight: isCurrent ? 700 : 500,
                        margin: 0,
                      }}
                    >
                      {stepTitles[step]}
                    </p>
                    {isBonusPending && !isCurrent && (
                      <span
                        style={{
                          color: COLORS.warning,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        PENDENTE
                      </span>
                    )}
                    {isCurrent && (
                      <span
                        style={{
                          color: COLORS.red,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        ATUAL
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
