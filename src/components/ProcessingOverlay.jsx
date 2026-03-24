import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "../theme/colors";

export default function ProcessingOverlay({
  show,
  messages = [],
  duration = 2000,
  onComplete,
}) {
  const [currentMsg, setCurrentMsg] = useState(0);

  useEffect(() => {
    if (!show) {
      setCurrentMsg(0);
      return;
    }

    if (!messages.length) {
      onComplete?.();
      return;
    }

    const interval = duration / messages.length;
    const timer = setInterval(() => {
      setCurrentMsg((prev) => {
        if (prev >= messages.length - 1) {
          clearInterval(timer);
          setTimeout(() => onComplete?.(), 400);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [show, messages, duration, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `${COLORS.bg}F5`,
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `3px solid ${COLORS.border}`,
              borderTopColor: COLORS.accent,
              marginBottom: 24,
            }}
          />

          <AnimatePresence mode="wait">
            <motion.p
              key={currentMsg}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{
                color: COLORS.textMuted,
                fontSize: 14,
                fontWeight: 600,
                textAlign: "center",
                padding: "0 40px",
              }}
            >
              {messages[currentMsg]}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
