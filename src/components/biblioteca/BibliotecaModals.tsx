import React, { Suspense, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import type { LivroNormalizado } from '@/lib/bibliotecaColecoes';

const LivroDetailSheet = lazyWithRetry(() => import('@/components/biblioteca/LivroDetailSheet'));
const BibliotecaBuscaOverlay = lazyWithRetry(() => import('@/components/biblioteca/BibliotecaBuscaOverlay'));
const PdfScrollReader = lazyWithRetry(() => import('@/components/biblioteca/PdfScrollReader'));
const BibliotecaMateriaSheet = lazyWithRetry(() => import('@/components/biblioteca/BibliotecaMateriaSheet'));

interface BibliotecaModalsProps {
  materiaAberta: string | null;
  onCloseMateria: () => void;
  livroAberto: LivroNormalizado | null;
  onCloseLivro: () => void;
  onAbrirLivro: (livro: LivroNormalizado) => void;
  customPdfUrl: string | null;
  customPdfTitle: string;
  onCloseCustomPdf: () => void;
}

export const BibliotecaModals: React.FC<BibliotecaModalsProps> = ({
  materiaAberta,
  onCloseMateria,
  livroAberto,
  onCloseLivro,
  onAbrirLivro,
  customPdfUrl,
  customPdfTitle,
  onCloseCustomPdf,
}) => {
  const [buscaOpen, setBuscaOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setBuscaOpen(true);
    window.addEventListener('biblioteca-abrir-pesquisa', onOpen);
    return () => window.removeEventListener('biblioteca-abrir-pesquisa', onOpen);
  }, []);

  return (
    <>
      {/* Matéria: bottom sheet sob demanda */}
      <Suspense fallback={null}>
        <BibliotecaMateriaSheet
          materiaAberta={materiaAberta}
          onClose={onCloseMateria}
          onAbrirLivro={onAbrirLivro}
        />
      </Suspense>

      {/* Detalhes do Livro sob demanda */}
      <Suspense fallback={null}>
        {livroAberto && (
          <LivroDetailSheet
            livro={livroAberto}
            open={!!livroAberto}
            onClose={onCloseLivro}
          />
        )}
      </Suspense>

      {/* Leitor de PDF sob demanda */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {customPdfUrl && (
            <PdfScrollReader
              url={customPdfUrl}
              titulo={customPdfTitle}
              onClose={onCloseCustomPdf}
            />
          )}
        </AnimatePresence>
      </Suspense>

      {/* Busca Overlay sob demanda */}
      <Suspense fallback={null}>
        <BibliotecaBuscaOverlay
          open={buscaOpen}
          onClose={() => setBuscaOpen(false)}
          onAbrirLivro={onAbrirLivro}
        />
      </Suspense>
    </>
  );
};
