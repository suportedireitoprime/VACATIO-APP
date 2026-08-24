import * as React from "react";

/**
 * Window size classes seguindo o padrão Android:
 * - compact: <600dp (celular em portrait)
 * - medium: 600–839dp (tablet em portrait / foldable aberto em portrait)
 * - expanded: ≥840dp (tablet em landscape / desktop)
 *
 * A conversão dp↔CSS px em WebView Android é 1:1 (a viewport CSS já é
 * dimensionada em dp lógicos). Usamos os breakpoints Tailwind mais próximos:
 * md=768, lg=1024.
 */
export type WindowSizeClass = "compact" | "medium" | "expanded";

const TABLET_MIN = 768;
const TABLET_MAX = 1023.98;

function readClass(): WindowSizeClass {
  if (typeof window === "undefined") return "compact";
  const w = window.innerWidth;
  if (w >= 1024) return "expanded";
  if (w >= TABLET_MIN) return "medium";
  return "compact";
}

export function useWindowSizeClass(): WindowSizeClass {
  const [cls, setCls] = React.useState<WindowSizeClass>(readClass);
  React.useEffect(() => {
    const onChange = () => setCls(readClass());
    window.addEventListener("resize", onChange, { passive: true });
    return () => window.removeEventListener("resize", onChange);
  }, []);
  return cls;
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= TABLET_MIN && window.innerWidth <= TABLET_MAX;
  });
  React.useEffect(() => {
    const mql = window.matchMedia(
      `(min-width: ${TABLET_MIN}px) and (max-width: ${TABLET_MAX}px)`
    );
    const onChange = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    mql.addEventListener("change", onChange);
    setIsTablet(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isTablet;
}
