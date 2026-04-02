import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SlideTransition({
  children,
  slideKey,
  direction = 1,
  onSwipeLeft,
  onSwipeRight,
}) {
  const [isDragging, setIsDragging] = useState(false);

  const swipeThreshold = 50;
  const swipeVelocity = 200;

  const handleDragEnd = (_event, info) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    if (offset.x > swipeThreshold || velocity.x > swipeVelocity) {
      onSwipeRight?.();
    } else if (offset.x < -swipeThreshold || velocity.x < -swipeVelocity) {
      onSwipeLeft?.();
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={slideKey}
        initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{
          touchAction: "pan-y",
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
