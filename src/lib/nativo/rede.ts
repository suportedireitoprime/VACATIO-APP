import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Ponte de conectividade nativa.
 * No APK/IPA o `navigator.onLine` da WebView é pouco confiável, então usamos
 * @capacitor/network como fonte da verdade e reemitimos os eventos
 * `online`/`offline` no window para todo o app continuar funcionando.
 */
let conectadoAtual = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
let monitorIniciado = false;

/** Leitura síncrona do estado de conexão (use no lugar de navigator.onLine). */
export function conectado(): boolean {
  return conectadoAtual;
}

function definir(valor: boolean) {
  if (valor === conectadoAtual) return;
  conectadoAtual = valor;
  window.dispatchEvent(new Event(valor ? 'online' : 'offline'));
}

/** Inicia o monitor nativo de rede (chamar uma vez no boot do app). */
export async function iniciarMonitorRede(): Promise<void> {
  if (monitorIniciado || typeof window === 'undefined') return;
  monitorIniciado = true;

  window.addEventListener('online', () => {
    conectadoAtual = true;
  });
  window.addEventListener('offline', () => {
    conectadoAtual = false;
  });

  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    definir(status.connected);
    await Network.addListener('networkStatusChange', (s) => definir(s.connected));
  } catch (e) {
    console.warn('Plugin Network indisponível; usando navigator.onLine', e);
  }
}

/** Consulta pontual do estado de conexão. */
export async function estaOnline(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Network } = await import('@capacitor/network');
      const s = await Network.getStatus();
      conectadoAtual = s.connected;
      return s.connected;
    } catch {
      /* ignore */
    }
  }
  return conectado();
}

/** Estado reativo da conexão. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(conectado);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    void estaOnline().then(setOnline);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
