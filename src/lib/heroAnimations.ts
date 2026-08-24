import type { Transition } from 'framer-motion';

export type HeroAnimationPreset = {
  key: string;
  label: string;
  description: string;
  initial: Record<string, any>;
  animate: Record<string, any>;
  exit: Record<string, any>;
  transition?: Transition;
  /** Optional wrapper style (e.g. for clip-path). */
  wrapperClass?: string;
};

/**
 * Todas as animações partem do mesmo posicionamento absoluto usado pelo hero
 * (bottom-0, altura 88%, largura auto), então só precisamos definir
 * opacity / scale / translate / rotate / clipPath.
 */
export const HERO_ANIMATIONS: Record<string, HeroAnimationPreset> = {
  'ken-burns': {
    key: 'ken-burns',
    label: 'Ken Burns',
    description: 'Zoom lento com leve deriva lateral. Elegante e cinematográfico.',
    initial: { opacity: 0, scale: 0.85, x: 40 },
    animate: { opacity: 0.95, scale: 1.05, x: [-10, 10] },
    exit: { opacity: 0, scale: 1.15, x: -60 },
    transition: {
      opacity: { duration: 1.1, ease: 'easeInOut' },
      x: { duration: 6, ease: 'linear' },
      scale: { duration: 6, ease: 'linear' },
    },
  },
  'zoom-in': {
    key: 'zoom-in',
    label: 'Zoom In',
    description: 'A imagem cresce de dentro pra fora com fade.',
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1.15 },
    exit: { opacity: 0, scale: 1.25 },
    transition: { duration: 6, ease: 'easeOut' },
  },
  'zoom-out': {
    key: 'zoom-out',
    label: 'Zoom Out',
    description: 'Começa grande e recua, sensação de "chegando".',
    initial: { opacity: 0, scale: 1.25 },
    animate: { opacity: 1, scale: 1.0 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 6, ease: 'easeOut' },
  },
  'slide-left': {
    key: 'slide-left',
    label: 'Slide Esquerda',
    description: 'Entra deslizando pela direita, sai pela esquerda.',
    initial: { opacity: 0, x: 200, scale: 1 },
    animate: { opacity: 1, x: 0, scale: 1.02 },
    exit: { opacity: 0, x: -200 },
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  },
  'slide-right': {
    key: 'slide-right',
    label: 'Slide Direita',
    description: 'Entra pela esquerda, sai pela direita.',
    initial: { opacity: 0, x: -200, scale: 1 },
    animate: { opacity: 1, x: 0, scale: 1.02 },
    exit: { opacity: 0, x: 200 },
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  },
  'slide-up': {
    key: 'slide-up',
    label: 'Slide Sobe',
    description: 'Sobe de baixo com um leve overshoot.',
    initial: { opacity: 0, y: 120, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -80 },
    transition: { type: 'spring' as const, stiffness: 90, damping: 16 },
  },
  fade: {
    key: 'fade',
    label: 'Fade Puro',
    description: 'Cross-fade limpo, sem movimento. Sofisticado.',
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 1.4, ease: 'easeInOut' },
  },
  'tilt-wobble': {
    key: 'tilt-wobble',
    label: 'Tilt Wobble',
    description: 'Rotação 3D sutil no eixo Y, dá vida à imagem.',
    initial: { opacity: 0, rotateY: -6 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: 6 },
    transition: { duration: 1.2, ease: 'easeInOut' },
  },
  breathe: {
    key: 'breathe',
    label: 'Respiração',
    description: 'Escala 1.0 → 1.05 em loop suave. Muito discreto.',
    initial: { opacity: 0, scale: 1 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 },
    transition: { duration: 1.2, ease: 'easeInOut' },
  },
  'iris-reveal': {
    key: 'iris-reveal',
    label: 'Iris Reveal',
    description: 'Círculo abrindo do centro. Impacto de "abertura".',
    initial: { opacity: 1, clipPath: 'circle(0% at 50% 60%)' },
    animate: { opacity: 1, clipPath: 'circle(140% at 50% 60%)' },
    exit: { opacity: 0, clipPath: 'circle(140% at 50% 60%)' },
    transition: { duration: 1.6, ease: [0.65, 0, 0.35, 1] },
  },
  'mask-up': {
    key: 'mask-up',
    label: 'Reveal de baixo',
    description: 'Cortina revelando de baixo pra cima.',
    initial: { opacity: 1, clipPath: 'inset(100% 0 0 0)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0 0 0)' },
    exit: { opacity: 0, clipPath: 'inset(0% 0 100% 0)' },
    transition: { duration: 1.4, ease: [0.83, 0, 0.17, 1] },
  },
  'pop-bounce': {
    key: 'pop-bounce',
    label: 'Pop Bounce',
    description: 'Escala com spring pronunciado. Muito enérgico.',
    initial: { opacity: 0, scale: 0.4 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.4 },
    transition: { type: 'spring' as const, stiffness: 180, damping: 12 },
  },
  'rotate-in': {
    key: 'rotate-in',
    label: 'Rotate In',
    description: 'Entra rotacionada -8° e alinha ao chão.',
    initial: { opacity: 0, rotate: -8, y: 60, scale: 0.9 },
    animate: { opacity: 1, rotate: 0, y: 0, scale: 1 },
    exit: { opacity: 0, rotate: 8, y: -40 },
    transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
  },
  'shake-in': {
    key: 'shake-in',
    label: 'Shake In',
    description: 'Entra com micro-shake horizontal. Atenção rápida.',
    initial: { opacity: 0, x: 0 },
    animate: { opacity: 1, x: [0, -8, 8, -5, 5, 0] },
    exit: { opacity: 0, x: 0 },
    transition: {
      opacity: { duration: 0.4 },
      x: { duration: 0.9, ease: 'easeOut' },
    },
  },
  'ghost-trail': {
    key: 'ghost-trail',
    label: 'Ghost Trail',
    description: 'Rastro fantasma atrás da imagem (efeito duplo com blur).',
    initial: { opacity: 0, x: 60, filter: 'blur(12px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, x: -60, filter: 'blur(12px)' },
    transition: { duration: 1.2, ease: 'easeOut' },
  },
};

export const HERO_ANIMATION_LIST = Object.values(HERO_ANIMATIONS);

export function getHeroAnimation(key: string | null | undefined): HeroAnimationPreset {
  if (key && HERO_ANIMATIONS[key]) return HERO_ANIMATIONS[key];
  return HERO_ANIMATIONS['ken-burns'];
}
