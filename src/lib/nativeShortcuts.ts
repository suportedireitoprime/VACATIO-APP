// Home shortcuts (long-press no ícone do app).
// Android → shortcuts.xml estático montado no workflow build-android.yml.
// Dinâmico (último livro lido) fica pra V2 — precisa de plugin community
// que ainda não está no ecossistema Capacitor oficial.
//
// Este módulo só cuida do lado JS: registrar qual atalho o usuário abriu
// (via App URL) pra levar direto à rota.

import { Capacitor } from '@capacitor/core';

const SHORTCUT_PATHS: Record<string, string> = {
  'audio': '/anotacoes/audio',
  'buscar': '/?openSearch=1',
  'lembretes': '/meus-lembretes',
  'leitura': '/biblioteca?continuar=1',
};

/**
 * Chamado pelo listener global de deep-links (nativeDeepLinks.ts) quando
 * a URL começar com vacatio://shortcut/<slug>. Devolve a rota interna.
 */
export function resolveShortcut(slug: string): string | null {
  return SHORTCUT_PATHS[slug] ?? null;
}

/** Ping opcional — hoje só log; útil quando plugarmos dynamic shortcuts. */
export async function updateDynamicShortcut(_livroId: string, _titulo: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  // No-op por ora. Ao adotar `@capacitor-community/app-shortcuts`, aqui
  // faríamos AppShortcuts.setDynamic({ shortcuts: [...] }).
}
