import React from 'react';
import { ArrowLeft, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CAPA_HUB, capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import CassetteAnimation from './CassetteAnimation';

interface AudioaulasHeroProps {
  areaAtual: string | null;
  loading: boolean;
  totalAulas: number;
}

export const AudioaulasHero = React.memo(function AudioaulasHero({
  areaAtual,
  loading,
  totalAulas
}: AudioaulasHeroProps) {
  const navigate = useNavigate();
  const heroTitulo = areaAtual ?? 'Audioaulas';
  const heroSub = areaAtual ? 'Aulas em áudio para ouvir e revisar.' : 'Aprenda ouvindo, por área do Direito.';
  const capaImg = areaAtual ? capaDaArea(areaAtual) : CAPA_HUB;

  return (
    <div className="relative px-4 pt-[calc(2rem+var(--sai-top))] pb-6 overflow-visible sm:px-6 lg:px-10 lg:pt-[calc(3rem+var(--sai-top))] lg:pb-10">
      <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] relative z-10">
        <button
          onClick={() => (areaAtual ? navigate('/audioaulas') : navigate('/'))}
          aria-label="Voltar"
          className="mb-6 w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition shrink-0 active:opacity-70 z-10 relative"
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
        </button>

        <div className="flex items-center gap-4 lg:gap-8">
          <span className="relative h-24 w-24 sm:h-32 sm:w-32 lg:h-44 lg:w-44 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 bg-[#1c1c1c]">
            {!areaAtual ? (
              <CassetteAnimation />
            ) : (
              <CapaOtimizada
                src={capaImg}
                alt=""
                animacaoEntrada
              />
            )}
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-[11px] font-semibold uppercase tracking-widest mb-2 border border-primary/30">
              <Headphones className="h-3.5 w-3.5" /> {areaAtual ? 'Área' : 'Acervo'}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-widest uppercase leading-none text-white drop-shadow-md">
              {heroTitulo}
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-zinc-300 mt-2.5 font-medium">{heroSub}</p>
            {!loading && (
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                {totalAulas} aula(s) disponível(is)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
