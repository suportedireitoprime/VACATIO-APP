/**
 * Utilitário global para restaurar e forçar a rolagem para o topo absoluto (0, 0).
 * Atua de forma abrangente em todas as superfícies possíveis:
 * - window
 * - document.documentElement
 * - document.body
 * - #root e containers com scroll
 * - desfoca elementos ativos para evitar que o navegador force scroll até eles
 */
export function resetGlobalScroll() {
  if (typeof window === 'undefined') return;

  // Desfoca qualquer elemento ativo (botão clicado, input) para evitar que o navegador role para ele
  try {
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement)?.blur?.();
    }
  } catch {}

  // 1. Window
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, 0);
  }

  // 2. Document elements
  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }

  // 3. Root e wrappers
  const root = document.getElementById('root');
  if (root) {
    root.scrollTop = 0;
  }

  // 4. Containers de páginas ou scrolls principais
  const scrollContainers = document.querySelectorAll<HTMLElement>('main, [data-scroll-container], .overflow-y-auto');
  scrollContainers.forEach((el) => {
    if (el.classList.contains('min-h-dvh') || el.tagName.toLowerCase() === 'main') {
      el.scrollTop = 0;
    }
  });
}
