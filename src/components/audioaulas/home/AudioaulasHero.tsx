import React, { useState, useEffect } from 'react';
import { ArrowLeft, Headphones, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import HeroMotifs from '@/components/vademecum/HeroMotifs';
import { AudioActionShortcuts } from '@/components/audio/AudioActionShortcuts';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { haptic } from '@/lib/nativeHaptics';

const AudioFavoritosModal = React.lazy(() => import('@/components/audio/AudioFavoritosModal').then((m) => ({ default: m.AudioFavoritosModal })));
const AudioRecentesModal = React.lazy(() => import('@/components/audio/AudioRecentesModal').then((m) => ({ default: m.AudioRecentesModal })));
const AudioEstatisticasModal = React.lazy(() => import('@/components/audio/AudioEstatisticasModal').then((m) => ({ default: m.AudioEstatisticasModal })));
const AudioEmAltaModal = React.lazy(() => import('@/components/audio/AudioEmAltaModal').then((m) => ({ default: m.AudioEmAltaModal })));
const AudioTrilhasModal = React.lazy(() => import('@/components/audio/AudioTrilhasModal').then((m) => ({ default: m.AudioTrilhasModal })));

import cenarioOnibus from '@/assets/audio-cenarios/cenario-onibus.webp';
import cenarioAcademia from '@/assets/audio-cenarios/cenario-academia.webp';
import cenarioCaminhada from '@/assets/audio-cenarios/cenario-caminhada.webp';
import cenarioCafe from '@/assets/audio-cenarios/cenario-cafe.webp';
import cenarioTransito from '@/assets/audio-cenarios/cenario-transito.webp';
import cenarioDescanso from '@/assets/audio-cenarios/cenario-descanso.webp';

interface AudioaulasHeroProps {
  areaAtual: string | null;
  loading: boolean;
  totalAulas: number;
  totalAreas?: number;
  totalFavoritas?: number;
  aulasFavoritas?: AulaAudio[];
  totalRecentes?: number;
  aulasRecentes?: AulaAudio[];
  onTocarAula?: (aula: AulaAudio, fila?: AulaAudio[]) => void;
  onAlternarFavoritoAula?: (aula: AulaAudio) => void;
  aulas?: AulaAudio[];
  onBuscar?: () => void;
  onFavoritos?: () => void;
  onRecentes?: () => void;
  onLimparRecentes?: () => void;
  onEmAlta?: () => void;
  onEstatistica?: () => void;
  onTrilhas?: () => void;
}

const CENARIOS_AULAS = [
  {
    id: 'onibus',
    imagem: cenarioOnibus,
    tag: '🚌 No trajeto',
    descricao: 'Revisão ágil de cada matéria em qualquer lugar',
  },
  {
    id: 'academia',
    imagem: cenarioAcademia,
    tag: '💪 Na academia',
    descricao: 'Seu preparo teórico em ritmo acelerado',
  },
  {
    id: 'caminhada',
    imagem: cenarioCaminhada,
    tag: '🚶‍♀️ Caminhando',
    descricao: 'Aprenda ouvindo e fixe os conceitos chaves',
  },
  {
    id: 'cafe',
    imagem: cenarioCafe,
    tag: '☕ No café',
    descricao: 'Aproveite momentos de pausa para revisar conceitos',
  },
  {
    id: 'transito',
    imagem: cenarioTransito,
    tag: '🚗 No trânsito',
    descricao: 'Converta horas paradas em produtividade nos estudos',
  },
  {
    id: 'descanso',
    imagem: cenarioDescanso,
    tag: '🛋️ Em casa',
    descricao: 'Estudo contínuo e confortável no seu próprio ritmo',
  },
];

export const AudioaulasHero: React.FC<AudioaulasHeroProps> = React.memo(
  function AudioaulasHero({
    areaAtual,
    loading,
    totalAulas,
    totalAreas = 12,
    totalFavoritas = 0,
    aulasFavoritas = [],
    totalRecentes = 0,
    aulasRecentes = [],
    onTocarAula,
    onAlternarFavoritoAula,
    aulas = [],
    onBuscar,
    onFavoritos,
    onRecentes,
    onLimparRecentes,
    onEmAlta,
    onEstatistica,
    onTrilhas,
  }) {
    const navigate = useNavigate();
    const [cenarioIndex, setCenarioIndex] = useState(0);

    const [recentesOpen, setRecentesOpen] = useState(false);
    const [favoritosOpen, setFavoritosOpen] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [emAltaOpen, setEmAltaOpen] = useState(false);
    const [trilhasOpen, setTrilhasOpen] = useState(false);

    // Rotação suave automática das capas a cada 5 segundos
    useEffect(() => {
      const timer = setInterval(() => {
        setCenarioIndex((prev) => (prev + 1) % CENARIOS_AULAS.length);
      }, 5000);
      return () => clearInterval(timer);
    }, []);

    const cenarioAtual = CENARIOS_AULAS[cenarioIndex];
    const heroTitulo = areaAtual ?? 'Áudio Aulas';
    const heroSub = areaAtual ? `ÁREA: ${areaAtual.toUpperCase()}` : 'DOUTRINA EM ÁUDIO';

    return (
      <div className="relative mb-6">
        {/* Shell principal com bordas arredondadas idêntico ao painel da Home */}
        <div
          className="relative overflow-hidden rounded-b-[2rem] flex flex-col z-20 shadow-xl"
          style={{
            transform: 'translateZ(0)',
            backgroundColor: '#070f1e',
            paddingTop: 'var(--sai-top, env(safe-area-inset-top, 0px))',
          }}
        >
          {/* Blindagem de overscroll superior contra vazamento do fundo */}
          <div
            className="pointer-events-none absolute -top-[1200px] left-0 right-0 h-[1200px] z-0"
            style={{ backgroundColor: '#070f1e' }}
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#070f1e]/85 via-transparent to-transparent sm:hidden" />
            <div className="absolute inset-0 hidden sm:block bg-gradient-to-r from-[#070f1e]/60 via-transparent to-transparent" />

            {/* Badge do Cenário Atual flutuando no canto inferior direito */}
            <div className="absolute bottom-3 right-3 z-10 hidden sm:flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white shadow-xl">
              <span className="text-xs font-bold">{cenarioAtual.tag}</span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="text-[11px] text-zinc-300 font-medium">{cenarioAtual.descricao}</span>
            </div>

            {/* Indicadores de bolinha para alternar cenários */}
            <div className="absolute bottom-3 left-auto right-3 sm:right-3 sm:bottom-10 z-20 flex items-center gap-1.5 pointer-events-auto">
              {CENARIOS_AULAS.map((cen, idx) => (
                <button
                  key={cen.id}
                  onClick={() => setCenarioIndex(idx)}
                  aria-label={`Ver cenário ${cen.tag}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    idx === cenarioIndex
                      ? 'w-5 h-1.5 bg-sky-400 shadow-md shadow-sky-500/50'
                      : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Overlay Azul com gradiente e corte diagonal idêntico ao painel da Home */}
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
              {/* Gradiente Azul Luxuoso correspondente ao Ícone de Áudio Aulas */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, #2563eb 0%, #1d4ed8 45%, #1e40af 85%, #0f172a 100%)',
                }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(147,197,253,0.35),transparent_65%)]" />
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
                areaAtual ? navigate('/audioaulas') : navigate('/');
              }}
              aria-label="Voltar"
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
                aria-label="Pesquisar áudio aulas"
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
              >
                <Search className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
              </button>
            )}
          </header>

          {/* Conteúdo Principal do Painel Azul à Esquerda */}
          <div className="relative z-10 px-4 sm:px-6 lg:px-10 pt-4 sm:pt-5 pb-3 sm:pb-4 flex-1 flex flex-col justify-center max-w-[48%] sm:max-w-[44%] lg:max-w-[38%]">
            <h1 className="font-title italic text-white text-[24px] sm:text-[28px] leading-[1.05] font-semibold tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] whitespace-nowrap">
              {heroTitulo}
            </h1>

            <p className="font-body text-sky-200/90 text-[9px] sm:text-[10px] font-bold tracking-[0.25em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1">
              {heroSub}
            </p>

            {/* Lema com divisor vertical idêntico ao da Home */}
            <div className="mt-2 flex items-center text-left gap-2">
              <div className="w-[2px] h-6 bg-white/40 rounded-full shrink-0" />
              <p className="font-serif italic text-white/80 text-[11px] sm:text-[12px] leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                Aulas didáticas<br />por área do Direito.
              </p>
            </div>

            {/* Tag de Narrações Disponíveis com Altura Confortável e Animação de Reflexo */}
            <div className="mt-3.5 flex items-center">
              <span className="tag-narracoes-shine inline-flex items-center gap-2 px-4 py-2.5 sm:px-4.5 sm:py-3 min-h-[42px] sm:min-h-[46px] rounded-xl sm:rounded-2xl bg-black/45 text-white border border-white/20 font-bold text-xs sm:text-[13px] shadow-lg backdrop-blur-md">
                <Headphones className="w-4 h-4 text-sky-300 shrink-0" />
                <span className="tracking-wide">
                  {!loading && totalAulas > 0
                    ? `${totalAulas.toLocaleString('pt-BR')} áudio aulas`
                    : '133 áudio aulas'}
                </span>
              </span>
            </div>
          </div>

          {/* Atalhos Rápidos no Painel Hero: Recentes, Em alta, Estatística, Trilhas */}
          <div className="relative z-10 px-3 sm:px-6 lg:px-10 pb-3 pt-1">
            <AudioActionShortcuts
              colorScheme="blue"
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
              badgeRecentes={totalRecentes || aulasRecentes.length}
            />
          </div>
        </div>

        {/* Modais de Ações de Áudio com tema Azul (Carregados sob demanda) */}
        {recentesOpen && (
          <React.Suspense fallback={null}>
            <AudioRecentesModal
              isOpen={recentesOpen}
              onClose={() => setRecentesOpen(false)}
              colorScheme="blue"
              aulasRecentes={aulasRecentes}
              onTocarAula={onTocarAula}
              onLimparRecentes={onLimparRecentes}
              onAlternarFavoritoAula={onAlternarFavoritoAula}
            />
          </React.Suspense>
        )}
        {favoritosOpen && (
          <React.Suspense fallback={null}>
            <AudioFavoritosModal
              isOpen={favoritosOpen}
              onClose={() => setFavoritosOpen(false)}
              colorScheme="blue"
              aulasFavoritas={aulasFavoritas}
              onTocarAula={onTocarAula}
              onAlternarFavoritoAula={onAlternarFavoritoAula}
            />
          </React.Suspense>
        )}
        {statsOpen && (
          <React.Suspense fallback={null}>
            <AudioEstatisticasModal
              isOpen={statsOpen}
              onClose={() => setStatsOpen(false)}
              colorScheme="blue"
            />
          </React.Suspense>
        )}
        {emAltaOpen && (
          <React.Suspense fallback={null}>
            <AudioEmAltaModal
              isOpen={emAltaOpen}
              onClose={() => setEmAltaOpen(false)}
              colorScheme="blue"
              aulas={aulas}
              onTocarAula={onTocarAula}
            />
          </React.Suspense>
        )}
        {trilhasOpen && (
          <React.Suspense fallback={null}>
            <AudioTrilhasModal
              isOpen={trilhasOpen}
              onClose={() => setTrilhasOpen(false)}
              colorScheme="blue"
            />
          </React.Suspense>
        )}
      </div>
    );
  }
);

export default AudioaulasHero;
