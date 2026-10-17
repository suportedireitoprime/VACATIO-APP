import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resetGlobalScroll } from '@/lib/scrollUtils';

/**
 * Componente global de restauração de rolagem.
 * Escuta mudanças de rota (pathname e search) e força a tela para o topo
 * no instante síncrono (useLayoutEffect), no próximo frame (requestAnimationFrame)
 * e após a resolução de lazy chunks (Suspense) e consultas de dados assíncronas.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    // 1. Executa imediatamente antes do paint
    resetGlobalScroll();

    // 2. Executa no próximo frame de animação quando o novo DOM é acoplado
    const rafId = requestAnimationFrame(() => {
      resetGlobalScroll();
    });

    // 3. Executa em tempos escalonados para cobrir resolução de React.lazy,
    // animações CSS do PageTransition e renderização assíncrona de listas
    const t1 = setTimeout(resetGlobalScroll, 50);
    const t2 = setTimeout(resetGlobalScroll, 150);
    const t3 = setTimeout(resetGlobalScroll, 300);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, search]);

  return null;
}
