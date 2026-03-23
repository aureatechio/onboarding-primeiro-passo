import { useState } from "react";
import { COLORS } from "../theme/colors";
import { motion, AnimatePresence } from "framer-motion";

export default function QuizConfirmation({
  questions,
  icon = "✓",
  title = "Confirme o entendimento",
  subtitle = "Marque todos para avançar",
  iconBg,
  onAllConfirmed,
  confirmMessage,
}) {
  const [confirmations, setConfirmations] = useState(
    new Array(questions.length).fill(false)
  );

  const allConfirmed = confirmations.every(Boolean);
  const confirmedCount = confirmations.filter(Boolean).length;

  const handleConfirm = (i) => {
    const updated = [...confirmations];
    updated[i] = !updated[i];
    setConfirmations(updated);
    if (updated.every(Boolean)) {
      onAllConfirmed?.(true);
    } else {
      onAllConfirmed?.(false);
    }
  };

  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        padding: 24,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: iconBg || `${COLORS.accent}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div>
          <p
            style={{
              color: COLORS.text,
              fontSize: 16,
              fontWeight: 800,
              margin: 0,
            }}
          >
            {title}
          </p>
          <p
            style={{
              color: COLORS.textDim,
              fontSize: 12,
              margin: "3px 0 0 0",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {questions.map((q, i) => (
          <motion.button
            key={i}
            onClick={() => handleConfirm(i)}
            whileTap={{ scale: 0.98 }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              padding: 14,
              borderRadius: 12,
              textAlign: "left",
              border: `1.5px solid ${confirmations[i] ? COLORS.success + "60" : COLORS.border}`,
              background: confirmations[i]
                ? `${COLORS.success}06`
                : COLORS.inputBg,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <motion.div
              animate={{
                borderColor: confirmations[i] ? COLORS.success : COLORS.textDim,
                backgroundColor: confirmations[i] ? COLORS.success : "transparent",
              }}
              transition={{ duration: 0.2 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                flexShrink: 0,
                marginTop: 0,
                border: `2px solid ${COLORS.textDim}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatePresence>
                {confirmations[i] && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    style={{
                      color: COLORS.bg,
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
            <span
              style={{
                color: confirmations[i] ? COLORS.text : COLORS.textMuted,
                fontSize: 13,
                lineHeight: 1.5,
                transition: "color 0.2s",
              }}
            >
              {q}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {allConfirmed ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: `${COLORS.success}08`,
              border: `1px solid ${COLORS.success}20`,
              borderRadius: 10,
              padding: 12,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            <span
              style={{ color: COLORS.success, fontSize: 13, fontWeight: 600 }}
            >
              {confirmMessage || "Tudo confirmado."}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="counter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: "center", marginTop: 16 }}
          >
            <span
              style={{
                color: COLORS.textDim,
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {confirmedCount} DE {questions.length} CONFIRMADOS
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
