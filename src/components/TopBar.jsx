import { COLORS } from "../theme/colors";
import { useOnboarding } from "../context/OnboardingContext";
import TopBarLogo from "./TopBarLogo";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import StepDrawer from "./StepDrawer";

// TEMP-TEST-ONLY: desligar/remover antes de produção.
const ENABLE_TEST_TRIPLE_TAP_RESET = true;
const TRIPLE_TAP_WINDOW_MS = 700;

export default function TopBar({ showCompleted = false }) {
  const { currentStep, completedSteps, totalSteps } = useOnboarding();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logoTapCountRef = useRef(0);
  const logoTapTimerRef = useRef(null);

  const stepNum = typeof currentStep === "number" ? currentStep : totalSteps;
  const progress = Math.max(0, Math.min(100, (stepNum / totalSteps) * 100));

  const handleLogoTap = () => {
    if (!ENABLE_TEST_TRIPLE_TAP_RESET) return;

    logoTapCountRef.current += 1;
    if (logoTapTimerRef.current) {
      clearTimeout(logoTapTimerRef.current);
    }

    logoTapTimerRef.current = setTimeout(() => {
      logoTapCountRef.current = 0;
      logoTapTimerRef.current = null;
    }, TRIPLE_TAP_WINDOW_MS);

    if (logoTapCountRef.current >= 3) {
      logoTapCountRef.current = 0;
      if (logoTapTimerRef.current) {
        clearTimeout(logoTapTimerRef.current);
        logoTapTimerRef.current = null;
      }

      window.localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: "env(safe-area-inset-top, 0px)",
          zIndex: 100,
          background: COLORS.border,
          height: "calc(3px + env(safe-area-inset-top, 0px))",
        }}
      >
        <motion.div
          initial={false}
          role="progressbar"
          aria-valuenow={stepNum}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Progresso: etapa ${stepNum} de ${totalSteps}`}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            height: 3,
            marginTop: "env(safe-area-inset-top, 0px)",
            background: `linear-gradient(90deg, ${COLORS.red}, ${COLORS.accent})`,
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      <div
        style={{
          position: "sticky",
          top: "calc(3px + env(safe-area-inset-top, 0px))",
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
          {ENABLE_TEST_TRIPLE_TAP_RESET ? (
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="Logo Aceleraí (triplo clique para reset de teste)"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                margin: 0,
              }}
            >
              <TopBarLogo />
            </button>
          ) : (
            <TopBarLogo />
          )}

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
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir navegação entre etapas"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 0",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
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
            </button>
          )}
        </div>
      </div>
      <StepDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
