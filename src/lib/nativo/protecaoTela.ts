/**
 * Proteção de tela: bloqueia screenshot/gravação e esconde o conteúdo no
 * app switcher. Usado em conteúdo premium e no player de videoaulas.
 * Contagem de referências para várias telas simultâneas.
 */
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

const isNative = () => Capacitor.isNativePlatform();
const donos = new Set<string>();

async function aplicar() {
  if (!isNative()) return;
  try {
    const { PrivacyScreen } = await import('@capacitor-community/privacy-screen');
    if (donos.size > 0) await PrivacyScreen.enable();
    else await PrivacyScreen.disable();
  } catch {
    /* noop */
  }
}

export async function protegerTela(motivo: string): Promise<void> {
  donos.add(motivo);
  await aplicar();
}

export async function desprotegerTela(motivo: string): Promise<void> {
  donos.delete(motivo);
  await aplicar();
}

/** Hook: protege a tela enquanto o componente estiver montado e `ativo`. */
export function useProtecaoTela(motivo: string, ativo = true): void {
  useEffect(() => {
    if (!ativo) return;
    void protegerTela(motivo);
    return () => {
      void desprotegerTela(motivo);
    };
  }, [motivo, ativo]);
}
