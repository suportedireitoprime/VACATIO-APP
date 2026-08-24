// Seletor de rotas por dispositivo — mobile/tablet e desktop têm árvores de
// componentes isoladas (chunks separados), evitando que celulares carreguem
// código exclusivo do desktop e vice-versa. Ver: split de rotas mobile/desktop.
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-desktop';

const IndexDesktop = lazy(() => import('./IndexDesktop'));
const IndexMobile = lazy(() => import('./IndexMobile'));

const IndexFallback = () => (
  <div className="min-h-dvh flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const Index = () => {
  const isDesktop = useIsDesktop();
  return (
    <Suspense fallback={<IndexFallback />}>
      {isDesktop ? <IndexDesktop /> : <IndexMobile />}
    </Suspense>
  );
};

export default Index;
