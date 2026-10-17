import React from 'react';
import { ArrowLeft, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CAPA_HUB, capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import CassetteAnimation from './CassetteAnimation';
import { AudioNavigationSwitcher } from '@/components/audio/AudioNavigationSwitcher';

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
        <div className="flex items-center justify-between mb-6 -mr-4 sm:-mr-6 lg:-mr-10">
          <button
            onClick={() => (areaAtual ? navigate('/audioaulas') : navigate('/'))}
            aria-label="Voltar"
            className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition shrink-0 active:opacity-70"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
          </button>

          <AudioNavigationSwitcher active="aulas" infiniteRight />
        </div>

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
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-widest uppercase leading-none text-white drop-shadow-md">
              {heroTitulo}
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-zinc-300 mt-2 font-medium line-clamp-1">{heroSub}</p>
            {!loading && (
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 text-zinc-200 border border-white/15 font-bold text-xs sm:text-sm shadow-sm">
                  <Headphones className="w-3.5 h-3.5 text-zinc-300" />
                  {totalAulas} aulas
                </span>
                {areaAtual && (
                  <span className="text-xs text-zinc-400 font-medium">
                    em {areaAtual}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
