// Seletor de rotas por dispositivo — mobile/tablet e desktop têm árvores de
// componentes isoladas. IndexMobile é carregado de forma síncrona/eager no mobile
// para eliminar completamente spinners e cascatas de carregamento na tela inicial.
import { lazy, Suspense } from 'react';
import { useIsDesktop } from '@/hooks/use-desktop';
import IndexMobile from './IndexMobile';

const IndexDesktop = lazy(() => import('./IndexDesktop'));

const IndexFallback = () => (
  <div className="min-h-dvh flex items-center justify-center bg-background" />
);

const Index = () => {
  const isDesktop = useIsDesktop();
  if (!isDesktop) {
    return <IndexMobile />;
  }
  return (
    <Suspense fallback={<IndexFallback />}>
      <IndexDesktop />
    </Suspense>
  );
};

export default Index;

