import { useCallback, useRef } from "react";

/**
 * Trigger dynamic-import prefetch of a route module on hover/touchstart.
 * Import factory MUST be a static arrow (Vite requires literal path in `import()`).
 *
 * Example:
 *   const prefetch = usePrefetchRoute(() => import("@/pages/Foo.tsx"));
 *   <Link to="/foo" onMouseEnter={prefetch} onTouchStart={prefetch} />
 */
export function usePrefetchRoute(importer: () => Promise<unknown>) {
  const fired = useRef(false);
  return useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    // Kick off in idle time so we never compete with the current interaction
    const run = () => {
      importer().catch(() => {
        fired.current = false; // allow retry on failure
      });
    };
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(run, { timeout: 500 });
    } else {
      setTimeout(run, 50);
    }
  }, [importer]);
}
