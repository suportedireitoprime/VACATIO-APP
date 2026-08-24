// Cascata padronizada para listas do Vade Mecum.
// Use cascadeContainer no wrapper (initial="hidden" animate="show") e
// cascadeItem em cada filho.
import type { Variants } from "framer-motion";

export const CASCADE_EASE = [0.22, 1, 0.36, 1] as const;

export const cascadeContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
};

export const cascadeItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: CASCADE_EASE },
  },
};
