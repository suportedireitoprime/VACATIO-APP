import { ReactNode } from "react";
import { useNavigationType } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Page transition — CSS-only. Substituiu o framer-motion.
 * Em navegações POP (voltar do browser/gesto/back button), pulamos a animação
 * de entrada para dar sensação instantânea — comportamento nativo esperado.
 * Em PUSH/REPLACE mantemos o fade sutil de 240ms.
 *
 * O keyframe `page-in` está definido em index.css e respeita
 * `prefers-reduced-motion` via media query.
 */
const PageTransition = ({ children }: PageTransitionProps) => {
  const navType = useNavigationType();
  const cls = navType === "POP" ? "min-h-dvh" : "min-h-dvh animate-page-in";
  return <div className={cls}>{children}</div>;
};

export default PageTransition;
