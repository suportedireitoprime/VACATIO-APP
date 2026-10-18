import React, { useState, useEffect } from 'react';
import { ArrowLeft, Headphones, Sparkles, BookOpen, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioNavigationSwitcher } from '@/components/audio/AudioNavigationSwitcher';
import HeroMotifs from '@/components/vademecum/HeroMotifs';

import cenarioOnibus from '@/assets/audio-cenarios/cenario-onibus.webp';
import cenarioAcademia from '@/assets/audio-cenarios/cenario-academia.webp';
import cenarioCaminhada from '@/assets/audio-cenarios/cenario-caminhada.webp';
import cenarioEstudo from '@/assets/audio-cenarios/cenario-estudo.webp';
import cenarioFoco from '@/assets/audio-cenarios/cenario-foco.webp';

interface AudioLeisHeroProps {
  totalAudios: number;
  totalLeis: number;
}

const CENARIOS = [
  {
    id: 'onibus',
    imagem: cenarioOnibus,
    tag: '🚌 No transporte',
    descricao: 'Transforme o trajeto em tempo de aprovação',
  },
  {
    id: 'academia',
    imagem: cenarioAcademia,
    tag: '💪 Na academia',
    descricao: 'Mente e corpo em ritmo de fixação',
  },
  {
    id: 'caminhada',
    imagem: cenarioCaminhada,
    tag: '🚶‍♀️ Caminhando',
    descricao: 'A legislação na sua rotina diária',
  },
  {
    id: 'estudo',
    imagem: cenarioEstudo,
    tag: '📚 Na biblioteca',
    descricao: 'Foco total com áudio oficial artigo por artigo',
  },
  {
    id: 'foco',
    imagem: cenarioFoco,
    tag: '⚖️ Foco absoluto',
    descricao: 'Fixação acelerada da letra da lei',
  },
];

export const AudioLeisHero: React.FC<AudioLeisHeroProps> = React.memo(function AudioLeisHero({
  totalAudios,
  totalLeis,
}) {
  const navigate = useNavigate();
  const [cenarioIndex, setCenarioIndex] = useState(0);

  // Rotação suave automática das capas a cada 5 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCenarioIndex((prev) => (prev + 1) % CENARIOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const cenarioAtual = CENARIOS[cenarioIndex];

  return (
    <div className="relative mb-6">
      {/* Shell principal com bordas arredondadas idêntico ao painel da Home */}
      <div
        className="relative overflow-hidden rounded-b-[2rem] pt-[var(--sai-top)] flex flex-col z-20 shadow-2xl min-h-[380px] sm:min-h-[420px] lg:min-h-[460px]"
        style={{
          transform: 'translateZ(0)',
          backgroundColor: '#120824',
        }}
      >
        {/* Blindagem de overscroll superior contra vazamento do fundo */}
        <div
          className="pointer-events-none absolute -top-[1200px] left-0 right-0 h-[1200px] z-0"
          style={{ backgroundColor: '#120824' }}
          aria-hidden="true"
        />

        {/* Imagem de Capa do Painel do Início (Lado Direito) com Transição Suave */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={cenarioAtual.id}
              src={cenarioAtual.imagem}
              alt={cenarioAtual.tag}
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7, ease: 'easeInOut' }}
              className="absolute top-0 bottom-0 right-0 h-full w-full sm:w-[62%] lg:w-[58%] object-cover object-center select-none"
            />
          </AnimatePresence>

          {/* Degradê lateral para fundir a imagem à direita no shell escuro */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#120824] via-transparent to-transparent sm:hidden" />
          <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#120824]/60 via-transparent to-transparent" />

          {/* Badge do Cenário Atual flutuando no canto inferior direito */}
          <div className="absolute bottom-4 right-4 z-10 hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white shadow-xl">
            <span className="text-xs font-bold">{cenarioAtual.tag}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[11px] text-zinc-300 font-medium">{cenarioAtual.descricao}</span>
          </div>

          {/* Indicadores de bolinha para alternar cenários */}
          <div className="absolute bottom-4 left-4 sm:left-auto sm:right-4 sm:bottom-12 z-20 flex items-center gap-1.5 pointer-events-auto">
            {CENARIOS.map((cen, idx) => (
              <button
                key={cen.id}
                onClick={() => setCenarioIndex(idx)}
                aria-label={`Ver cenário ${cen.tag}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === cenarioIndex
                    ? 'w-6 h-2 bg-purple-400 shadow-md shadow-purple-500/50'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Overlay Roxo com gradiente e sombra diagonal dupla idêntica à divisória da Home */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            filter: 'drop-shadow(25px 0 25px rgba(0,0,0,0.85)) drop-shadow(8px 0 10px rgba(0,0,0,0.95))',
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, 58% 0, 42% 100%, 0% 100%)',
            }}
          >
            {/* Gradiente Roxo Real Luxuoso */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 45%, #4c1d95 85%, #2e1065 100%)',
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(216,180,254,0.35),transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.6),transparent_70%)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Motifs jurídicos clássicos */}
            <HeroMotifs />

            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>
        </div>

        {/* Barra Superior: Botão Voltar Circular Retrô + Switcher Cápsula Infinito à Direita */}
        <header className="relative z-20 px-4 sm:px-6 lg:px-10 pt-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            aria-label="Voltar para a página inicial"
            className="w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full bg-[#1C1C1E]/80 border border-white/10 flex items-center justify-center text-white backdrop-blur-md hover:bg-[#2C2C2E] transition shrink-0 active:scale-95 shadow-lg"
          >
            <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
          </button>

          <AudioNavigationSwitcher active="leis" infiniteRight />
        </header>

        {/* Conteúdo Principal do Painel Roxo à Esquerda */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 pb-10 flex-1 flex flex-col justify-center max-w-[56%] sm:max-w-[48%] lg:max-w-[42%]">
          {/* Tag de destaque */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase backdrop-blur-md w-fit shadow-md mb-3">
            <Sparkles className="w-3.5 h-3.5 text-purple-200" />
            <span>Estude Onde Estiver</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase leading-[0.95] text-white drop-shadow-md">
            ÁUDIO LEIS
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-purple-100/90 mt-2.5 font-medium leading-relaxed drop-shadow line-clamp-3">
            Narrações completas artigo por artigo gravadas em estúdio com voz humana. Otimize sua
            rotina no ônibus, na academia ou caminhando.
          </p>

          {/* Chips de Informações e Métricas */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 text-white border border-white/20 font-bold text-xs sm:text-sm shadow-md backdrop-blur-md">
              <Headphones className="w-4 h-4 text-purple-300" />
              <span>{totalAudios > 0 ? `${totalAudios.toLocaleString('pt-BR')} áudios` : '9.684 áudios'}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 text-white border border-white/20 font-bold text-xs sm:text-sm shadow-md backdrop-blur-md">
              <BookOpen className="w-4 h-4 text-purple-300" />
              <span>{totalLeis > 0 ? `${totalLeis} legislações` : '31 legislações'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AudioLeisHero;
