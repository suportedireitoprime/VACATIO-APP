import { useEffect } from 'react';

/**
 * Fecha um overlay quando o usuário pressiona Esc.
 * Use apenas em overlays customizados (que não usam Radix Dialog/Sheet,
 * pois esses já tratam Esc nativamente).
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}
