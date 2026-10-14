import React from 'react';
import { ArrowLeft, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CassetteAnimation from '@/components/audioaulas/home/CassetteAnimation';
import { AudioNavigationSwitcher } from '@/components/audio/AudioNavigationSwitcher';

interface AudioLeisHeroProps {
  totalAudios: number;
  totalLeis: number;
}

export const AudioLeisHero: React.FC<AudioLeisHeroProps> = React.memo(function AudioLeisHero({
  totalAudios,
  totalLeis,
}) {
  const navigate = useNavigate();

  return (
    <div className="relative px-4 pt-[calc(2rem+var(--sai-top))] pb-6 overflow-visible sm:px-6 lg:px-10 lg:pt-[calc(3rem+var(--sai-top))] lg:pb-10">
      <div className="mx-auto w-full max-w-[1400px] 2xl:max-w-[1600px] relative z-10">
        {/* Barra Superior: Botão Voltar Circular Retrô + Switcher Cápsula Infinito à Direita */}
        <div className="flex items-center justify-between mb-6 -mr-4 sm:-mr-6 lg:-mr-10">
          <button
            onClick={() => navigate('/')}
            aria-label="Voltar para a página inicial"
            className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition shrink-0 active:opacity-70"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
          </button>

          <AudioNavigationSwitcher active="leis" infiniteRight />
        </div>

        {/* Bloco Hero Idêntico a Áudio Aulas com Fita Cassete */}
        <div className="flex items-center gap-4 lg:gap-8">
          <span className="relative h-24 w-24 sm:h-32 sm:w-32 lg:h-44 lg:w-44 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/70 border border-white/10 bg-[#1c1c1c]">
            <CassetteAnimation />
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-widest uppercase leading-none text-white drop-shadow-md">
              ÁUDIO LEIS
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-zinc-300 mt-2 font-medium line-clamp-1">
              Narrações oficiais artigo por artigo gravadas em estúdio com voz humana.
            </p>
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/20 text-primary border border-primary/30 font-bold text-xs sm:text-sm shadow-sm shadow-primary/20">
                <Headphones className="w-3.5 h-3.5" />
                {totalAudios > 0 ? `${totalAudios} áudios disponíveis` : 'Carregando áudios...'}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                em {totalLeis} legislação(ões)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AudioLeisHero;
