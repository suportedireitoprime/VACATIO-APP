/**
 * Coordenador global de mini-players flutuantes (Áudio Aulas e Narração).
 * Gerencia a variável CSS `--active-mini-player-offset` no `:root`
 * para que páginas e listas possam expandir o padding inferior automaticamente
 * quando um mini-player estiver visível, evitando qualquer colisão ou sobreposição.
 */

const activePlayers = new Set<string>();

export function registerMiniPlayer(id: string, active: boolean) {
  if (active) {
    activePlayers.add(id);
  } else {
    activePlayers.delete(id);
  }

  const isAnyActive = activePlayers.size > 0;
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(
      '--active-mini-player-offset',
      isAnyActive ? '4.75rem' : '0px'
    );
  }
}
