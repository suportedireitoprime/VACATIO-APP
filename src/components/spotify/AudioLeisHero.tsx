import React, { useState, useEffect } from 'react';
import { ArrowLeft, Headphones, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HeroMotifs from '@/components/vademecum/HeroMotifs';
import { AudioActionShortcuts } from '@/components/audio/AudioActionShortcuts';
import { AudioFavoritosModal } from '@/components/audio/AudioFavoritosModal';
import { AudioRecentesModal } from '@/components/audio/AudioRecentesModal';
import { AudioEstatisticasModal } from '@/components/audio/AudioEstatisticasModal';
import { AudioEmAltaModal } from '@/components/audio/AudioEmAltaModal';
import { AudioTrilhasModal } from '@/components/audio/AudioTrilhasModal';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import { haptic } from '@/lib/nativeHaptics';

import cenarioOnibus from '@/assets/audio-cenarios/cenario-onibus.webp';
import cenarioAcademia from '@/assets/audio-cenarios/cenario-academia.webp';
import cenarioCaminhada from '@/assets/audio-cenarios/cenario-caminhada.webp';
import cenarioCafe from '@/assets/audio-cenarios/cenario-cafe.webp';
import cenarioTransito from '@/assets/audio-cenarios/cenario-transito.webp';
import cenarioDescanso from '@/assets/audio-cenarios/cenario-descanso.webp';

interface AudioLeisHeroProps {
  totalAudios: number;
  totalLeis: number;
  onBuscar?: () => void;
  onRecentes?: () => void;
  onFavoritos?: () => void;
  onEmAlta?: () => void;
  onEstatistica?: () => void;
  onTrilhas?: () => void;
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
    id: 'cafe',
    imagem: cenarioCafe,
    tag: '☕ No café',
    descricao: 'Revisão prática no seu momento de café',
  },
  {
    id: 'transito',
    imagem: cenarioTransito,
    tag: '🚗 No trânsito',
    descricao: 'Letra da lei no seu trajeto diário',
  },
  {
    id: 'descanso',
    imagem: cenarioDescanso,
    tag: '🛋️ Em casa',
    descricao: 'Legislação completa no conforto da sua rotina',
  },
];

export const AudioLeisHero: React.FC<AudioLeisHeroProps> = React.memo(function AudioLeisHero({
  totalAudios,
  totalLeis,
  onBuscar,
  onRecentes,
  onFavoritos,
  onEmAlta,
  onEstatistica,
  onTrilhas,
}) {
  const navigate = useNavigate();
  const { favoritos, historicoRecentes, setActiveTab } = useSpotifyAudioStore();
  const [cenarioIndex, setCenarioIndex] = useState(0);

  const [recentesOpen, setRecentesOpen] = useState(false);
  const [favoritosOpen, setFavoritosOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [emAltaOpen, setEmAltaOpen] = useState(false);
  const [trilhasOpen, setTrilhasOpen] = useState(false);

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
        className="relative overflow-hidden rounded-b-[2rem] flex flex-col z-20 shadow-xl"
        style={{
          transform: 'translateZ(0)',
          backgroundColor: '#120824',
          paddingTop: 'var(--sai-top, env(safe-area-inset-top, 0px))',
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
              className="absolute top-0 bottom-0 right-0 h-full w-[65%] sm:w-[62%] lg:w-[58%] object-cover object-center select-none"
            />
          </AnimatePresence>

          {/* Degradê lateral para fundir a imagem à direita no shell escuro */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#120824]/80 via-transparent to-transparent sm:hidden" />
          <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#120824]/60 via-transparent to-transparent" />

          {/* Badge do Cenário Atual flutuando no canto inferior direito */}
          <div className="absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white shadow-xl">
            <span className="text-xs font-bold">{cenarioAtual.tag}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-[11px] text-zinc-300 font-medium">{cenarioAtual.descricao}</span>
          </div>

          {/* Indicadores de bolinha para alternar cenários */}
          <div className="absolute bottom-3 left-auto right-3 sm:right-3 sm:bottom-10 z-20 flex items-center gap-1.5 pointer-events-auto">
            {CENARIOS.map((cen, idx) => (
              <button
                key={cen.id}
                onClick={() => setCenarioIndex(idx)}
                aria-label={`Ver cenário ${cen.tag}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === cenarioIndex
                    ? 'w-5 h-1.5 bg-purple-400 shadow-md shadow-purple-500/50'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Overlay Roxo com gradiente e sombra diagonal idêntica à divisória da Home */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            filter: 'drop-shadow(25px 0 25px rgba(0,0,0,0.85)) drop-shadow(8px 0 10px rgba(0,0,0,0.95))',
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, 49% 0, 37% 100%, 0% 100%)',
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

        {/* Barra Superior Padronizada: Botão Voltar e Botão Pesquisar */}
        <header className="relative z-20 px-4 sm:px-6 lg:px-10 pt-3.5 pb-2 flex items-center justify-between">
          <button
            onClick={() => {
              haptic.light();
              navigate('/');
            }}
            aria-label="Voltar para a página inicial"
            className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
          </button>

          {onBuscar && (
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                onBuscar();
              }}
              aria-label="Pesquisar áudio leis"
              className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
            >
              <Search className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
            </button>
          )}
        </header>

        {/* Conteúdo Principal do Painel Roxo à Esquerda — Mesma Tipografia e Proporção da Home */}
        <div className="relative z-10 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-5 pb-3 sm:pb-4 flex-1 flex flex-col justify-center max-w-[48%] sm:max-w-[44%] lg:max-w-[38%]">
          <h1 className="font-title italic text-white text-[24px] sm:text-[28px] leading-[1.05] font-semibold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] whitespace-nowrap">
            Áudio Leis
          </h1>

          <p className="font-body text-purple-200/90 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1">
            LEGISLAÇÃO EM ÁUDIO
          </p>

          {/* Lema com divisor vertical idêntico ao da Home */}
          <div className="mt-2 flex items-center text-left gap-2">
            <div className="w-[2px] h-6 bg-white/40 rounded-full shrink-0" />
            <p className="font-serif italic text-white/80 text-[11px] sm:text-[12px] leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
              Narrações oficiais<br />artigo por artigo.
            </p>
          </div>

          {/* Tag de Narrações Disponíveis com Altura Confortável e Animação de Reflexo */}
          <div className="mt-3.5 flex items-center">
            <span className="tag-narracoes-shine inline-flex items-center gap-2 px-4 py-2.5 sm:px-4.5 sm:py-3 min-h-[42px] sm:min-h-[46px] rounded-xl sm:rounded-2xl bg-black/45 text-white border border-white/20 font-bold text-xs sm:text-[13px] shadow-lg backdrop-blur-md">
              <Headphones className="w-4 h-4 text-purple-300 shrink-0" />
              <span className="tracking-wide">
                {totalAudios > 0 ? `${totalAudios.toLocaleString('pt-BR')} narrações` : '9.684 narrações'}
              </span>
            </span>
          </div>
        </div>

        {/* Atalhos Rápidos no Painel Hero: Favoritos, Em alta, Estatística, Trilhas */}
        <div className="relative z-10 px-3 sm:px-6 lg:px-10 pb-3 pt-1">
          <AudioActionShortcuts
            colorScheme="purple"
            onRecentes={() => {
              if (onRecentes) onRecentes();
              else setRecentesOpen(true);
            }}
            onEmAlta={() => {
              if (onEmAlta) onEmAlta();
              else setEmAltaOpen(true);
            }}
            onEstatistica={() => {
              if (onEstatistica) onEstatistica();
              else setStatsOpen(true);
            }}
            onTrilhas={() => {
              if (onTrilhas) onTrilhas();
              else setTrilhasOpen(true);
            }}
            badgeRecentes={historicoRecentes.length}
          />
        </div>
      </div>

      {/* Modais de Ações de Áudio em Tela Cheia Sobre o Menu de Rodapé */}
      <AudioRecentesModal
        isOpen={recentesOpen}
        onClose={() => setRecentesOpen(false)}
        colorScheme="purple"
      />
      <AudioFavoritosModal
        isOpen={favoritosOpen}
        onClose={() => setFavoritosOpen(false)}
        colorScheme="purple"
      />
      <AudioEstatisticasModal
        isOpen={statsOpen}
        onClose={() => setStatsOpen(false)}
        colorScheme="purple"
      />
      <AudioEmAltaModal
        isOpen={emAltaOpen}
        onClose={() => setEmAltaOpen(false)}
        colorScheme="purple"
      />
      <AudioTrilhasModal
        isOpen={trilhasOpen}
        onClose={() => setTrilhasOpen(false)}
        colorScheme="purple"
      />
    </div>
  );
});

export default AudioLeisHero;
