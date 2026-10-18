import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
import { haptic } from '@/lib/nativeHaptics';

interface AudioEmAltaModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorScheme?: 'purple' | 'blue';
  onPlayTrack?: (track: SpotifyTrack) => void;
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
    titulo: 'Art. 155 - Furto, qualificadoras e repouso noturno',
    leiNome: 'Código Penal',
    leiSlug: 'codigo-penal',
    reproducoes: '84.100',
    minutosTotais: '3.200h',
    posicaoBusca: 4,
    badge: '⚡ Top Concursos',
    tipo: 'lei',
  },
  {
    id: 'cc::1',
    posicao: 4,
    artigoNumero: 'Art. 1º',
    titulo: 'Art. 1º - Da Personalidade e da Capacidade Civil',
    leiNome: 'Código Civil',
    leiSlug: 'codigo-civil',
    reproducoes: '72.400',
    minutosTotais: '2.650h',
    posicaoBusca: 3,
    badge: '📚 Top Civil',
    tipo: 'lei',
  },
  {
    id: 'cdc::14',
    posicao: 5,
    artigoNumero: 'Art. 14',
    titulo: 'Art. 14 - Responsabilidade pelo Fato do Serviço',
    leiNome: 'Código de Defesa do Consumidor',
    leiSlug: 'codigo-de-defesa-do-consumidor',
    reproducoes: '63.800',
    minutosTotais: '2.180h',
    posicaoBusca: 5,
    badge: '⚖️ Top OAB 1ª Fase',
    tipo: 'lei',
  },
  {
    id: 'clt::477',
    posicao: 6,
    artigoNumero: 'Art. 477',
    titulo: 'Art. 477 - Rescisão Contratual e Prazos de Pagamento',
    leiNome: 'CLT',
    leiSlug: 'clt',
    reproducoes: '58.900',
    minutosTotais: '1.940h',
    posicaoBusca: 6,
    badge: '💼 Top Trabalhista',
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
    titulo: 'Art. 306 - Condução com Capacidade Psicomotora Alterada',
    leiNome: 'Código de Trânsito Brasileiro',
    leiSlug: 'codigo-de-transito-brasileiro',
    reproducoes: '42.100',
    minutosTotais: '1.390h',
    posicaoBusca: 10,
    badge: '🚗 Top Trânsito',
    tipo: 'lei',
  },
];

export const AudioEmAltaModal: React.FC<AudioEmAltaModalProps> = ({
  isOpen,
  onClose,
  colorScheme = 'purple',
  onPlayTrack,
}) => {
  const isPurple = colorScheme === 'purple';
  const { playTrack } = useSpotifyAudioStore();
  const [filtro, setFiltro] = useState<FiltroEmAlta>('mais_acessados');

  if (!isOpen) return null;

  const itensOrdenados = [...ITENS_EM_ALTA].sort((a, b) => {
    if (filtro === 'mais_buscados') {
      return a.posicaoBusca - b.posicaoBusca;
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Backdrop escuro com blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Painel Modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
        >
          {/* Header com degradê dinâmico no tema */}
          <div
            className={`p-5 sm:p-6 pb-4 border-b border-white/10 relative overflow-hidden ${
              isPurple
                ? 'bg-gradient-to-r from-purple-950/70 via-zinc-900 to-black'
                : 'bg-gradient-to-r from-blue-950/70 via-zinc-900 to-black'
            }`}
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg bg-orange-600/20 border-orange-500/40 text-orange-400">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Em Alta no Vade Mecum
                  </h2>
                  <p className="text-xs text-zinc-400 font-medium">
                    Artigos com mais minutos reproduzidos, mais acessados e mais buscados.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-white border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros no topo da lista */}
            <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-none pt-1">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setFiltro('mais_acessados');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  filtro === 'mais_buscados'
                    ? 'bg-white text-zinc-950 shadow-md'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-purple-400" />
                <span>Mais Procurados</span>
              </button>
            </div>
          </div>

          {/* Lista de Artigos Em Alta */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 scrollbar-none">
            {itensOrdenados.map((item, index) => {
              const isTop3 = index < 3;
              return (
                <div
                  key={item.id}
                  onClick={() => handleTocar(item)}
                  className={`group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                    isTop3
                      ? 'bg-white/[0.04] border-white/15 hover:border-white/30 shadow-lg'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Medalha / Número de classificação */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-md ${
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
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition truncate">
                        {item.titulo}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate flex items-center gap-2 mt-0.5">
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AudioEmAltaModal;
