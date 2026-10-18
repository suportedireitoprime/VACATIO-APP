import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Flame,
  Clock,
  Search,
  Play,
  TrendingUp,
  Headphones,
  Sparkles,
  Award,
} from 'lucide-react';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';

interface AudioEmAltaModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme?: 'purple' | 'blue';
  onPlayTrack?: (track: SpotifyTrack) => void;
  aulas?: AulaAudio[];
  onTocarAula?: (aula: AulaAudio) => void;
}

type FiltroEmAlta = 'mais_acessados' | 'mais_minutos' | 'mais_buscados';

interface ItemEmAlta {
  id: string;
  posicao: number;
  artigoNumero: string;
  titulo: string;
  leiNome: string;
  leiSlug: string;
  reproducoes: string;
  minutosTotais: string;
  posicaoBusca: number;
  badge: string;
  tipo: 'lei' | 'aula';
}

const ITENS_EM_ALTA: ItemEmAlta[] = [
  {
    id: 'cf::5',
    posicao: 1,
    artigoNumero: 'Art. 5º',
    titulo: 'Art. 5º - Dos Direitos e Deveres Individuais e Coletivos',
    leiNome: 'Constituição Federal de 1988',
    leiSlug: 'constituicao-federal',
    reproducoes: '124.500',
    minutosTotais: '5.120h',
    posicaoBusca: 1,
    badge: '👑 Mais Ouvido do Brasil',
    tipo: 'lei',
  },
  {
    id: 'cp::121',
    posicao: 2,
    artigoNumero: 'Art. 121',
    titulo: 'Art. 121 - Homicídio simples, qualificado e feminicídio',
    leiNome: 'Código Penal',
    leiSlug: 'codigo-penal',
    reproducoes: '98.200',
    minutosTotais: '3.840h',
    posicaoBusca: 2,
    badge: '🔥 Top Penal',
    tipo: 'lei',
  },
  {
    id: 'cp::155',
    posicao: 3,
    artigoNumero: 'Art. 155',
    titulo: 'Art. 155 - Furto e qualificadoras',
    leiNome: 'Código Penal',
    leiSlug: 'codigo-penal',
    reproducoes: '84.100',
    minutosTotais: '3.100h',
    posicaoBusca: 3,
    badge: '⚡ Essencial OAB',
    tipo: 'lei',
  },
  {
    id: 'cc::186',
    posicao: 4,
    artigoNumero: 'Art. 186',
    titulo: 'Art. 186 - Dos Atos Ilícitos e Responsabilidade Civil',
    leiNome: 'Código Civil',
    leiSlug: 'codigo-civil',
    reproducoes: '73.900',
    minutosTotais: '2.950h',
    posicaoBusca: 4,
    badge: '⚖️ Campeão Civil',
    tipo: 'lei',
  },
  {
    id: 'clt::482',
    posicao: 5,
    artigoNumero: 'Art. 482',
    titulo: 'Art. 482 - Justa Causa para Rescisão do Contrato pelo Empregador',
    leiNome: 'Consolidação das Leis do Trabalho',
    leiSlug: 'clt',
    reproducoes: '67.400',
    minutosTotais: '2.480h',
    posicaoBusca: 5,
    badge: '💼 Top Trabalhista',
    tipo: 'lei',
  },
  {
    id: 'cf::1',
    posicao: 6,
    artigoNumero: 'Art. 1º ao 4º',
    titulo: 'Dos Princípios Fundamentais da República Federativa',
    leiNome: 'Constituição Federal de 1988',
    leiSlug: 'constituicao-federal',
    reproducoes: '59.800',
    minutosTotais: '2.190h',
    posicaoBusca: 6,
    badge: '🏛️ Base Constitucional',
    tipo: 'lei',
  },
  {
    id: 'cp::312',
    posicao: 7,
    artigoNumero: 'Art. 312',
    titulo: 'Art. 312 - Peculato e Desvio Praticado por Funcionário',
    leiNome: 'Código Penal',
    leiSlug: 'codigo-penal',
    reproducoes: '51.300',
    minutosTotais: '1.810h',
    posicaoBusca: 7,
    badge: '👮 Carreiras Policiais',
    tipo: 'lei',
  },
  {
    id: 'cpc::300',
    posicao: 8,
    artigoNumero: 'Art. 300',
    titulo: 'Art. 300 - Tutela Provisória de Urgência e Requisitos',
    leiNome: 'Código de Processo Civil',
    leiSlug: 'codigo-de-processo-civil',
    reproducoes: '49.700',
    minutosTotais: '1.620h',
    posicaoBusca: 8,
    badge: '🏛️ Top Prática Jurídica',
    tipo: 'lei',
  },
  {
    id: 'cf::37',
    posicao: 9,
    artigoNumero: 'Art. 37',
    titulo: 'Art. 37 - Princípios da Administração Pública (LIMPE)',
    leiNome: 'Constituição Federal de 1988',
    leiSlug: 'constituicao-federal',
    reproducoes: '47.200',
    minutosTotais: '1.540h',
    posicaoBusca: 9,
    badge: '📝 Top Direito Administrativo',
    tipo: 'lei',
  },
  {
    id: 'ctb::306',
    posicao: 10,
    artigoNumero: 'Art. 306',
    titulo: 'Art. 306 - Condução de Veículo com Capacidade Psicomotora Alterada',
    leiNome: 'Código de Trânsito Brasileiro',
    leiSlug: 'codigo-de-transito-brasileiro',
    reproducoes: '43.900',
    minutosTotais: '1.410h',
    posicaoBusca: 10,
    badge: '🚗 Mais Procurado',
    tipo: 'lei',
  },
];

export const AudioEmAltaModal: React.FC<AudioEmAltaModalProps> = ({
  isOpen,
  onClose,
  colorScheme = 'purple',
  onPlayTrack,
  aulas = [],
  onTocarAula,
}) => {
  const isPurple = colorScheme === 'purple';
  const { playTrack } = useSpotifyAudioStore();
  const [filtro, setFiltro] = useState<FiltroEmAlta>('mais_acessados');

  if (!isOpen) return null;

  const itensOrdenados = [...ITENS_EM_ALTA].sort((a, b) => {
    if (filtro === 'mais_acessados') {
      return parseInt(b.reproducoes.replace('.', '')) - parseInt(a.reproducoes.replace('.', ''));
    }
    if (filtro === 'mais_minutos') {
      return parseInt(b.minutosTotais) - parseInt(a.minutosTotais);
    }
    return a.posicao - b.posicao;
  });

  const handleTocar = (item: ItemEmAlta) => {
    haptic.light();
    const trackMock: SpotifyTrack = {
      id: item.id,
      tipo: item.tipo,
      leiId: item.leiSlug,
      leiSlug: item.leiSlug,
      leiNome: item.leiNome,
      artigoNumero: item.artigoNumero,
      numeroFormatado: item.artigoNumero,
      titulo: item.titulo,
      subtitulo: `${item.leiNome} • Narração Oficial`,
      texto: item.titulo,
      audioUrl: '',
      coverUrl: '',
      ordem: item.posicao,
    };

    if (onPlayTrack) {
      onPlayTrack(trackMock);
    } else {
      playTrack(trackMock);
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col bg-[#070b14] select-none text-white">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-[#070b14]"
        >
          {/* Fundo com ShapeGrid animado */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <ShapeGrid
              speed={0.4}
              squareSize={42}
              direction="diagonal"
              borderColor="rgba(255, 255, 255, 0.04)"
              hoverFillColor={isPurple ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)'}
              shape="square"
              hoverTrailAmount={5}
            />
          </div>

          {/* Topbar com Glassmorphism e Safe Area */}
          <header
            className={`relative z-20 shrink-0 px-4 sm:px-6 pb-3.5 border-b border-white/[0.08] backdrop-blur-xl shadow-lg ${
              isPurple
                ? 'bg-gradient-to-r from-purple-950/70 via-[#0a0715]/95 to-black'
                : 'bg-gradient-to-r from-blue-950/70 via-[#070d1a]/95 to-black'
            }`}
            style={{ paddingTop: 'max(0.75rem, var(--sai-top, env(safe-area-inset-top, 0px)))' }}
          >
            <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    haptic.selection();
                    onClose();
                  }}
                  aria-label="Voltar"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-white transition shrink-0 shadow-md backdrop-blur-md cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0 animate-pulse" />
                    <span className="font-card text-[11px] font-bold uppercase tracking-wider text-orange-400">
                      Tendências & Destaques
                    </span>
                  </div>
                  <h1 className="font-card text-lg sm:text-2xl font-extrabold text-white truncate tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                    Em Alta no App
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-xs sm:text-[13px] font-bold text-orange-300 shadow-md backdrop-blur-md font-card">
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  <span>Top 10 Brasil</span>
                </span>
              </div>
            </div>

            {/* Filtros no topo da lista */}
            <div className="max-w-[1200px] mx-auto flex items-center gap-2 mt-3.5 overflow-x-auto scrollbar-none pt-0.5">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('mais_acessados');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  filtro === 'mais_acessados'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>Mais Acessados</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('mais_minutos');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  filtro === 'mais_minutos'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Mais Minutos Ouvidos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('mais_buscados');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  filtro === 'mais_buscados'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-purple-400" />
                <span>Mais Procurados</span>
              </button>
            </div>
          </header>

          {/* Conteúdo Principal Rolável */}
          <div
            className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain"
            style={{ paddingBottom: 'calc(2.5rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
          >
            <div className="max-w-[1200px] mx-auto space-y-2.5">
              {itensOrdenados.map((item, index) => {
                const isTop3 = index < 3;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleTocar(item)}
                    className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] backdrop-blur-md ${
                      isTop3
                        ? 'bg-white/[0.05] border-white/15 hover:border-white/30 shadow-lg'
                        : 'bg-white/[0.03] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Medalha / Número de classificação */}
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ${
                          index === 0
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-amber-500/20'
                            : index === 1
                            ? 'bg-gradient-to-br from-zinc-300 to-zinc-500 text-black shadow-zinc-400/20'
                            : index === 2
                            ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-amber-800/20'
                            : 'bg-white/5 text-zinc-400 border border-white/10'
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                            {item.badge}
                          </span>
                        </div>
                        <h4 className="font-card text-xs sm:text-sm font-bold text-white group-hover:text-orange-300 transition truncate">
                          {item.titulo}
                        </h4>
                        <p className="font-card text-[11px] text-zinc-400 truncate flex items-center gap-2 mt-0.5">
                          <span>{item.leiNome}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-600" />
                          <span className="text-orange-400 font-semibold flex items-center gap-0.5">
                            <Flame className="w-3 h-3 inline" />
                            {item.reproducoes} plays
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-600 hidden sm:inline" />
                          <span className="text-zinc-400 hidden sm:inline">⏱️ {item.minutosTotais}</span>
                        </p>
                      </div>
                    </div>

                    {/* Botão Play */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 active:scale-95 ${
                          isPurple
                            ? 'bg-gradient-to-tr from-purple-700 to-indigo-500 shadow-purple-900/40'
                            : 'bg-gradient-to-tr from-blue-700 to-sky-500 shadow-blue-900/40'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default AudioEmAltaModal;
