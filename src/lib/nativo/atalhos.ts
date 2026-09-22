/**
 * Atalhos no ícone do app (long-press no Android / Quick Actions no iOS).
 * O clique navega para a rota correspondente via evento `app:atalho`.
 */
import { Capacitor } from '@capacitor/core';

export interface AtalhoApp {
  id: string;
  titulo: string;
  descricao: string;
  rota: string;
}

export const ATALHOS: AtalhoApp[] = [
  { id: 'vademecum', titulo: 'Vade Mecum', descricao: 'Leis e artigos', rota: '/vade-mecum' },
  { id: 'flashcards', titulo: 'Flashcards', descricao: 'Revisar hoje', rota: '/flashcards' },
  { id: 'assistente', titulo: 'Assistente', descricao: 'Perguntar à IA', rota: '/assistente' },
  { id: 'audio', titulo: 'Continuar áudio', descricao: 'Leis cantadas e aulas', rota: '/leis-cantadas' },
];

const ROTAS = new Map(ATALHOS.map((a) => [a.id, a.rota]));

let registrado = false;

/** Registra os atalhos e o listener de clique. Chame uma vez no boot. */
export async function registrarAtalhos(): Promise<void> {
  if (!Capacitor.isNativePlatform() || registrado) return;
  registrado = true;
  try {
    const { AppShortcuts } = await import('@capawesome/capacitor-app-shortcuts');
    await AppShortcuts.set({
      shortcuts: ATALHOS.map((a) => ({ id: a.id, title: a.titulo, description: a.descricao })),
    });
    await AppShortcuts.addListener('click', ({ shortcutId }) => {
      const rota = ROTAS.get(shortcutId);
      if (!rota) return;
      window.dispatchEvent(new CustomEvent('app:atalho', { detail: { rota } }));
    });
  } catch (e) {
    console.warn('[atalhos] indisponível', e);
  }
}

/** Remove todos os atalhos (ex.: logout). */
export async function limparAtalhos(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { AppShortcuts } = await import('@capawesome/capacitor-app-shortcuts');
    await AppShortcuts.clear();
  } catch {
    /* noop */
  }
}
