import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Retorna a altura atual do teclado (em px) para ajustar padding-bottom
 * de sheets/modais no Android/iOS. Retorna 0 na web.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let showL: { remove: () => void } | undefined;
    let hideL: { remove: () => void } | undefined;

    (async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        showL = await Keyboard.addListener('keyboardWillShow', (info) => {
          setHeight(info.keyboardHeight || 0);
        });
        hideL = await Keyboard.addListener('keyboardWillHide', () => {
          setHeight(0);
        });
      } catch (e) {
        console.warn('Keyboard listeners falharam', e);
      }
    })();

    return () => {
      showL?.remove();
      hideL?.remove();
    };
  }, []);

  return height;
}
