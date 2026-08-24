/**
 * Motion tokens — Apple-like spring curves.
 * Import from here so every animation stays consistent.
 */
import type { Transition, Variants } from "framer-motion";

/** iOS UINavigationController push/pop feel. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/** Snappier — for taps, chips, small toggles. */
export const springSnap: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 34,
  mass: 0.7,
};

/** Gentle fades for skeleton → content crossfade. */
export const easeApple: Transition = {
  duration: 0.28,
  ease: [0.22, 0.61, 0.36, 1], // ~ease-out-quart
};

/** List stagger container. */
export const listContainer: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

/** List child — subtle rise + fade. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: easeApple },
};

/** Tap feedback for buttons/cards. */
export const tapPress = { scale: 0.97 };
