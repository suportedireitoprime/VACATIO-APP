import { Suspense, useState, useEffect } from 'react';
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { useIsDesktop } from '@/hooks/use-desktop';
import { useTrackArea } from "@/hooks/useTrackArea";
import { useBibliotecasData } from '@/components/biblioteca/useBibliotecasData';
import { BibliotecaMobileContent } from '@/components/biblioteca/BibliotecaMobileContent';
import { BibliotecaModals } from '@/components/biblioteca/BibliotecaModals';
import BibliotecaBottomNav from '@/components/biblioteca/BibliotecaBottomNav';

const BibliotecasDesktop = lazyWithRetry(() => import('./BibliotecasDesktop'));
const ShapeGrid = lazyWithRetry(() => import('@/components/ui/ShapeGrid'));

const Bibliotecas = () => {
  useTrackArea("biblioteca_aberta");
  const isDesktop = useIsDesktop();
  // Adia o ShapeGrid para não competir com o primeiro paint da tela
  const [gridReady, setGridReady] = useState(false);
  useEffect(() => {
    // Força o topo assim que a página renderizar (evita scroll indesejado herdado)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    const t = setTimeout(() => setGridReady(true), 300);
    return () => clearTimeout(t);
  }, []);
  const {
    counts,
    materiaAberta,
    setMateriaAberta,
    livroAberto,
    setLivroAberto,
    customPdfUrl,
    setCustomPdfUrl,
    customPdfTitle,
    setCustomPdfTitle,
  } = useBibliotecasData();

  if (isDesktop) {
    return (
      <Suspense fallback={<div className="min-h-dvh bg-background" />}>
        <BibliotecasDesktop />
      </Suspense>
    );
  }

  return (
    <main className="min-h-dvh bg-zinc-950 pb-[calc(2.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] relative overflow-x-hidden">
      {/* Fundo ShapeGrid fixo em toda a viewport para cobrir 100% da tela sem cortes */}
      {gridReady && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Suspense fallback={null}>
            <ShapeGrid
              speed={0.5}
              squareSize={40}
              direction="diagonal"
              borderColor="rgba(255, 255, 255, 0.05)"
              hoverFillColor="rgba(255, 255, 255, 0.1)"
              shape="square"
              hoverTrailAmount={5}
            />
          </Suspense>
        </div>
      )}

      <div className="relative z-10">
        <BibliotecaMobileContent
          counts={counts}
          onAbrirLivro={(l) => setLivroAberto(l)}
          onAbrirCustomPdf={(titulo, url) => {
            setCustomPdfTitle(titulo);
            setCustomPdfUrl(url);
          }}
        />

        <BibliotecaModals
          materiaAberta={materiaAberta}
          onCloseMateria={() => setMateriaAberta(null)}
          livroAberto={livroAberto}
          onCloseLivro={() => setLivroAberto(null)}
          onAbrirLivro={(l) => setLivroAberto(l)}
          customPdfUrl={customPdfUrl}
          customPdfTitle={customPdfTitle}
          onCloseCustomPdf={() => {
            setCustomPdfUrl(null);
            setCustomPdfTitle('');
          }}
        />
        <BibliotecaBottomNav />
      </div>
    </main>
  );
};

export default Bibliotecas;
