import React from 'react';
import BibliotecaHero from '@/components/biblioteca/BibliotecaHero';
import BibliotecaAtalhosBar from '@/components/biblioteca/BibliotecaAtalhosBar';
import RecomendacoesCarousel from '@/components/biblioteca/RecomendacoesCarousel';
import ContinuarLeituraCarousel from '@/components/biblioteca/ContinuarLeituraCarousel';
import FerramentasLivrosCarrossel from '@/components/ferramentas/FerramentasLivrosCarrossel';
import { BibliotecaAcervosRoleta } from './BibliotecaAcervosRoleta';
import type { LivroNormalizado } from '@/lib/bibliotecaColecoes';

interface BibliotecaMobileContentProps {
  counts: Record<string, number>;
  onAbrirLivro: (livro: LivroNormalizado) => void;
  onAbrirCustomPdf: (titulo: string, url: string) => void;
}

export const BibliotecaMobileContent: React.FC<BibliotecaMobileContentProps> = ({
  counts,
  onAbrirLivro,
  onAbrirCustomPdf,
}) => {
  return (
    <>
      {/* Hero marrom com Sócrates */}
      <BibliotecaHero />

      <div className="max-w-3xl mx-auto w-full">
        {/* Painéis hospedados pelos botões do hero (Leitura, Favoritos, Personalizado) */}
        <BibliotecaAtalhosBar
          onAbrirLivro={onAbrirLivro}
          onAbrirCustomPdf={onAbrirCustomPdf}
        />

        <div className="mt-8">
          <FerramentasLivrosCarrossel />
        </div>

        <div className="mt-8">
          <RecomendacoesCarousel onAbrirLivro={onAbrirLivro} />
        </div>

        <div className="mt-8">
          <ContinuarLeituraCarousel onAbrirLivro={onAbrirLivro} />
        </div>

        {/* Acervos de Livros em Roleta */}
        <BibliotecaAcervosRoleta counts={counts} />
      </div>
    </>
  );
};
