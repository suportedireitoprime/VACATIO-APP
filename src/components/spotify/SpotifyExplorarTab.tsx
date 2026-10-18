import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Headphones,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  BookMarked,
  Scale,
  Shield,
  Sparkles,
  Award,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpotifyAudioStore } from '@/stores/useSpotifyAudioStore';
import {
  fetchLeisDisponiveisComAudio,
  CATALOGO_OFICIAL_AUDIO_LEIS,
  type LeiNarracaoItem,
} from '@/services/narracaoArtigosSyncService';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { getLeiCover } from '@/lib/leiTheme';
import { SpotifyRecentTracks } from './SpotifyRecentTracks';
import { haptic } from '@/lib/nativeHaptics';

export type CategoryFilter = 'todos' | 'constituicao' | 'codigos' | 'estatutos' | 'especiais';

interface SpotifyExplorarTabProps {
  onSelectLei: (lei: { id: string; nome: string; slug: string; categoria?: string }) => void;
  activeCategory?: CategoryFilter;
  onSelectCategory?: (cat: CategoryFilter) => void;
}

const getSiglaFromLei = (lei: { slug?: string; nome?: string }): string => {
  const s = (lei.slug || '').toLowerCase();
  const n = (lei.nome || '').toLowerCase();
  if (s === 'cc' || n.includes('código civil')) return 'CC';
  if (s === 'cpc' || n.includes('processo civil')) return 'CPC';
  if (s === 'cp' || n === 'código penal') return 'CP';
  if (s === 'cpp' || n.includes('processo penal')) return 'CPP';
  if (s === 'clt' || n.includes('trabalho')) return 'CLT';
  if (s === 'cdc' || n.includes('consumidor')) return 'CDC';
  if (s === 'ctn' || n.includes('tributário')) return 'CTN';
  if (s === 'ctb' || n.includes('trânsito')) return 'CTB';
  if (s === 'ce' || n.includes('eleitoral')) return 'CE';
  if (s === 'cpm') return 'CPM';
  if (s === 'cppm') return 'CPPM';
  if (s.includes('oab') || n.includes('advocacia')) return 'OAB';
  if (s.includes('eca') || n.includes('criança')) return 'ECA';
  if (s.includes('idoso')) return 'Idoso';
  if (s.includes('deficiencia')) return 'PCD';
  if (s.includes('cidade')) return 'Cidade';
  if (s.includes('servidor')) return 'Lei 8.112';
  if (s.includes('desarmamento')) return 'Desarm.';
  if (s.includes('racial')) return 'Ig. Racial';
  if (s.includes('torcedor')) return 'Torcedor';
  if (s.includes('terra')) return 'Terra';
  if (s.includes('cancer')) return 'Câncer';
  if (s.includes('refugiado')) return 'Refugiados';
  if (s.includes('seguranca-privada')) return 'Seg. Privada';
  if (s.includes('mpe')) return 'Microempresa';
  if (s === 'eggm') return 'Guardas Mun.';
  if (s === 'emot') return 'Motorista';
  if (s === 'cf' || s === 'cf88' || n.includes('constitui')) return 'CF/88';
  if (s.includes('licitac') || s === '14133') return 'Licitações';
  if (s.includes('improbidade')) return 'Improbidade';
  if (s.includes('maria-da-penha')) return 'M. da Penha';
  if (s.includes('drogas')) return 'Drogas';
  if (s.includes('execucao-penal') || s === 'lep') return 'LEP';
  if (s.includes('hediondos')) return 'C. Hediondos';
  if (s.includes('abuso')) return 'Abuso Aut.';
  if (s.includes('lgpd')) return 'LGPD';
  return (lei.nome || '').substring(0, 10);
};

export const SpotifyExplorarTab: React.FC<SpotifyExplorarTabProps> = ({
  onSelectLei,
  activeCategory = 'todos',
  onSelectCategory,
}) => {
  const { audioMode } = useSpotifyAudioStore();
  const [leis, setLeis] = useState<LeiNarracaoItem[]>(CATALOGO_OFICIAL_AUDIO_LEIS);

  // Refs de rolagem para os carrosséis
  const carrosselCodigosRef = useRef<HTMLDivElement | null>(null);
  const carrosselEstatutosRef = useRef<HTMLDivElement | null>(null);
  const carrosselConstRef = useRef<HTMLDivElement | null>(null);
  const carrosselEspeciaisRef = useRef<HTMLDivElement | null>(null);

  const scrollCarrossel = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return;
    const offset = dir === 'left' ? -380 : 380;
    ref.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await fetchLeisDisponiveisComAudio(audioMode);
        if (isMounted && data.length > 0) {
          setLeis(data);
        }
      } catch (err) {
        console.warn('[SpotifyExplorarTab] Erro ao carregar leis com áudio:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [audioMode]);

  // 1. CÓDIGOS (11 Códigos)
  const codigos = useMemo(() => {
    return leis.filter((lei) => {
      const cat = (lei.categoria || '').toLowerCase();
      const catFmt = (lei.categoriaFormatada || '').toLowerCase();
      const nome = (lei.nome || '').toLowerCase();
      const s = (lei.slug || '').toLowerCase();
      return (
        cat === 'codigo' ||
        catFmt.includes('código') ||
        catFmt.includes('codigo') ||
        nome.includes('código') ||
        ['cc', 'cpc', 'cp', 'cpp', 'clt', 'cdc', 'ctn', 'ctb', 'ce', 'cpm', 'cppm'].includes(s)
      );
    });
  }, [leis]);

  // 2. ESTATUTOS (20 Estatutos)
  const estatutos = useMemo(() => {
    return leis.filter((lei) => {
      const cat = (lei.categoria || '').toLowerCase();
      const catFmt = (lei.categoriaFormatada || '').toLowerCase();
      const nome = (lei.nome || '').toLowerCase();
      const s = (lei.slug || '').toLowerCase();
      return (
        cat === 'estatuto' ||
        catFmt.includes('estatuto') ||
        nome.includes('estatuto') ||
        s.startsWith('estatuto-') ||
        s === 'lei-servidor' ||
        s === 'eggm' ||
        s === 'emot'
      );
    });
  }, [leis]);

  // 3. CONSTITUIÇÃO
  const constituicao = useMemo(() => {
    const list = leis.filter((lei) => {
      const nome = (lei.nome || '').toLowerCase();
      const s = (lei.slug || '').toLowerCase();
      return s === 'cf' || s === 'cf88' || nome.includes('constitui');
    });
    if (list.length > 0) return list;
    // Se não estiver no catálogo gravado, puxa do LEIS_CATALOG
    const cfItem = LEIS_CATALOG.find((l) => l.id === 'cf88' || l.tipo === 'constituicao');
    if (cfItem) {
      return [
        {
          id: cfItem.id,
          nome: cfItem.nome,
          slug: cfItem.id,
          categoria: 'constituicao',
          categoriaFormatada: 'Constituição',
          totalArtigos: 250,
          totalComAudio: 250,
          totalPendentes: 0,
          percentual: 100,
        },
      ];
    }
    return [];
  }, [leis]);

  // 4. LEIS ESPECIAIS & ADMINISTRATIVO
  const especiais = useMemo(() => {
    const fromLeis = leis.filter((lei) => {
      const cat = (lei.categoria || '').toLowerCase();
      const catFmt = (lei.categoriaFormatada || '').toLowerCase();
      return cat === 'lei-especial' || catFmt.includes('especiais') || catFmt.includes('ordinária');
    });
    if (fromLeis.length > 0) return fromLeis;
    // Puxa do LEIS_CATALOG
    return LEIS_CATALOG.filter((l) => l.tipo === 'lei-especial' || l.tipo === 'administrativo').map((item) => ({
      id: item.id,
      nome: item.nome,
      slug: item.id,
      categoria: 'lei-especial',
      categoriaFormatada: 'Leis Especiais',
      totalArtigos: 100,
      totalComAudio: 100,
      totalPendentes: 0,
      percentual: 100,
    }));
  }, [leis]);

  // Renderizador unificado de Card de Carrossel estilo Áudio Aulas
  const renderCard = (lei: LeiNarracaoItem, i: number, corDestaque = 'purple') => {
    const cover = getLeiCover(lei.slug || lei.id);
    const totalAudios = typeof lei.totalComAudio === 'number' ? lei.totalComAudio : 0;
    const totalArts = typeof lei.totalArtigos === 'number' ? lei.totalArtigos : 0;
    const sigla = getSiglaFromLei(lei);

    return (
      <motion.button
        key={lei.id || `lei-${i}`}
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          haptic.selection();
          onSelectLei({
            id: lei.id,
            nome: lei.nome,
            slug: lei.slug,
            categoria: lei.categoriaFormatada || lei.categoria,
          });
        }}
        className="group relative w-[165px] sm:w-[195px] md:w-[215px] shrink-0 aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 border border-white/10 focus-visible:outline-none snap-start bg-zinc-900 select-none cursor-pointer"
      >
        <img
          src={cover}
          alt={lei.nome}
          className="absolute inset-0 w-full h-full object-cover object-right transition-transform duration-500 group-hover:scale-105 origin-right"
          loading="lazy"
        />
        {/* Degradê apenas de baixo para cima para destacar o texto sem escurecer o restante da capa */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 via-35% to-transparent to-65%" />

        <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between">
          {/* Topo do card: Sigla da lei + Chip de áudios */}
          <div className="flex items-center justify-between gap-1.5">
            <span
              className={`px-2 py-1 rounded-lg font-black text-[11px] uppercase tracking-wider shadow-md text-white ${
                corDestaque === 'blue'
                  ? 'bg-blue-600/90'
                  : corDestaque === 'emerald'
                  ? 'bg-emerald-600/90'
                  : corDestaque === 'amber'
                  ? 'bg-amber-600/90'
                  : 'bg-purple-600/90'
              }`}
            >
              {sigla}
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/15">
              <Headphones className="w-3 h-3 text-purple-300" />
              <span>{totalAudios > 0 ? `${totalAudios.toLocaleString('pt-BR')}` : `${totalArts}`}</span>
            </span>
          </div>

          {/* Rodapé do card: Nome da lei + botão play hover */}
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0 pr-1">
              <h4 className="font-bold leading-tight text-white text-sm sm:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {lei.nome}
              </h4>
              <p className="text-[11px] text-zinc-300 mt-1 font-medium flex items-center gap-1 drop-shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>100% gravado</span>
              </p>
            </div>

            <span className="shrink-0 h-8 w-8 grid place-items-center rounded-full bg-white/20 text-white backdrop-blur group-hover:bg-purple-600 group-hover:text-white transition shadow-lg">
              <Play className="h-4 w-4 ml-0.5 fill-current" />
            </span>
          </div>
        </div>
      </motion.button>
    );
  };

  return (
    <div className="space-y-10">
      {/* Seção Tocados Recentemente (Aparece se houver histórico) */}
      <SpotifyRecentTracks />

      {/* ──────────────── 1. SEÇÃO DE CÓDIGOS (CARROSSEL) ──────────────── */}
      {(activeCategory === 'todos' || activeCategory === 'codigos') && codigos.length > 0 && (
        <section className="relative">
          <div className="flex items-center justify-between gap-4 mb-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-5 px-2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <Scale className="w-3 h-3" />
                  Códigos
                </span>
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                  &bull; 11 Códigos completos
                </span>
              </div>
              <h3 className="font-card text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-normal">
                <span className="w-1.5 h-6 rounded-full bg-blue-500 shrink-0" />
                <span>Códigos da Legislação</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                Narrações oficiais completas artigo por artigo: CC, CPC, CP, CPP, CLT, CDC e mais.
              </p>
            </div>

            {/* Setas de rolagem para desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselCodigosRef, 'left')}
                aria-label="Rolar códigos para a esquerda"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselCodigosRef, 'right')}
                aria-label="Rolar códigos para a direita"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Carrossel Horizontal de Códigos */}
          <div
            ref={carrosselCodigosRef}
            className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-3 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
          >
            {codigos.map((cod, i) => renderCard(cod, i, 'blue'))}
          </div>
        </section>
      )}

      {/* ──────────────── 2. SEÇÃO DE ESTATUTOS (CARROSSEL) ──────────────── */}
      {(activeCategory === 'todos' || activeCategory === 'estatutos') && estatutos.length > 0 && (
        <section className="relative pt-2">
          <div className="flex items-center justify-between gap-4 mb-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-5 px-2 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <Shield className="w-3 h-3" />
                  Estatutos
                </span>
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                  &bull; 20 Estatutos oficiais
                </span>
              </div>
              <h3 className="font-card text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-normal">
                <span className="w-1.5 h-6 rounded-full bg-purple-500 shrink-0" />
                <span>Estatutos Oficiais</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                Estatuto da OAB, ECA, Idoso, PCD, Servidores Públicos (Lei 8.112) e outros.
              </p>
            </div>

            {/* Setas de rolagem para desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselEstatutosRef, 'left')}
                aria-label="Rolar estatutos para a esquerda"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselEstatutosRef, 'right')}
                aria-label="Rolar estatutos para a direita"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Carrossel Horizontal de Estatutos */}
          <div
            ref={carrosselEstatutosRef}
            className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-3 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
          >
            {estatutos.map((est, i) => renderCard(est, i, 'purple'))}
          </div>
        </section>
      )}

      {/* ──────────────── 3. CONSTITUIÇÃO & DIREITOS FUNDAMENTAIS ──────────────── */}
      {(activeCategory === 'todos' || activeCategory === 'constituicao') && constituicao.length > 0 && (
        <section className="relative pt-2">
          <div className="flex items-center justify-between gap-4 mb-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-5 px-2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <Award className="w-3 h-3" />
                  Carta Magna
                </span>
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                  &bull; Constituição de 1988
                </span>
              </div>
              <h3 className="font-card text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-normal">
                <span className="w-1.5 h-6 rounded-full bg-emerald-500 shrink-0" />
                <span>Constituição Federal</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                Áudio oficial de todos os artigos da CF/88 e direitos fundamentais.
              </p>
            </div>

            {/* Setas de rolagem para desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselConstRef, 'left')}
                aria-label="Rolar constituição para a esquerda"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselConstRef, 'right')}
                aria-label="Rolar constituição para a direita"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={carrosselConstRef}
            className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-3 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
          >
            {constituicao.map((item, i) => renderCard(item, i, 'emerald'))}
          </div>
        </section>
      )}

      {/* ──────────────── 4. LEIS ESPECIAIS & ADMINISTRATIVO ──────────────── */}
      {(activeCategory === 'todos' || activeCategory === 'especiais') && especiais.length > 0 && (
        <section className="relative pt-2">
          <div className="flex items-center justify-between gap-4 mb-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="h-5 px-2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                  <BookMarked className="w-3 h-3" />
                  Legislação Especial
                </span>
                <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                  &bull; Leis ordinárias e complementares
                </span>
              </div>
              <h3 className="font-card text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-normal">
                <span className="w-1.5 h-6 rounded-full bg-amber-500 shrink-0" />
                <span>Leis Especiais & Administrativo</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                Lei de Licitações (14.133), Improbidade, Maria da Penha, Drogas, LEP e mais.
              </p>
            </div>

            {/* Setas de rolagem para desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselEspeciaisRef, 'left')}
                aria-label="Rolar leis especiais para a esquerda"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarrossel(carrosselEspeciaisRef, 'right')}
                aria-label="Rolar leis especiais para a direita"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={carrosselEspeciaisRef}
            className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-3 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
          >
            {especiais.map((esp, i) => renderCard(esp, i, 'amber'))}
          </div>
        </section>
      )}
    </div>
  );
};

export default SpotifyExplorarTab;
