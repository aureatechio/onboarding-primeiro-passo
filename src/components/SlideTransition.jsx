import { motion, AnimatePresence } from "framer-motion";

export default function SlideTransition({ children, slideKey, direction = 1 }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={slideKey}
        initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
