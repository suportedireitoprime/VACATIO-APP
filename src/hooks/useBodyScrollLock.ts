import { useEffect } from 'react';

let lockCount = 0;
let saved: { overflow: string; touchAction: string; overscroll: string } | null = null;

const apply = () => {
  const b = document.body;
  const h = document.documentElement;
  if (lockCount === 1) {
    saved = {
      overflow: b.style.overflow,
      touchAction: b.style.touchAction,
      overscroll: b.style.overscrollBehavior,
    };
    b.style.overflow = 'hidden';
    b.style.touchAction = 'none';
    b.style.overscrollBehavior = 'none';
    h.style.overflow = 'hidden';
  }
};

const release = () => {
  const b = document.body;
  const h = document.documentElement;
  if (lockCount === 0 && saved) {
    b.style.overflow = saved.overflow;
    b.style.touchAction = saved.touchAction;
    b.style.overscrollBehavior = saved.overscroll;
    h.style.overflow = '';
    saved = null;
  }
};

/**
 * Impede que o conteúdo por trás (home do app, listas, etc.) role ou receba
 * gestos enquanto uma folha/overlay estiver aberta. Suporta folhas empilhadas.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockCount += 1;
    apply();
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      release();
    };
  }, [locked]);
}

export default useBodyScrollLock;
