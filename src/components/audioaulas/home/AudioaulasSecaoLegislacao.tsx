import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Shield,
  Scale,
  FileText,
  Headphones,
  X,
  Search,
  Volume2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { SUMULA_TRIBUNAIS } from '@/services/sumulasService';
import { getLeiCover } from '@/lib/leiTheme';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { CapaOtimizada } from './CapaOtimizada';
import { LinhaAula } from './AudioaulasListaAulas';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

interface AudioaulasSecaoLegislacaoProps {
  aulas: AulaAudio[];
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio) => void;
}

type ModalTipo = 'codigos' | 'estatutos' | 'sumulas' | 'leis-especiais' | null;

interface ItemDetalhe {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  tipo: 'codigo' | 'estatuto' | 'sumula' | 'lei-especial';
  cover?: string;
  iconColor?: string;
}

export const AudioaulasSecaoLegislacao = React.memo(function AudioaulasSecaoLegislacao({
  aulas,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula
}: AudioaulasSecaoLegislacaoProps) {
  const navigate = useNavigate();

  // Estados dos modais de "Ver todos"
  const [modalAtivo, setModalAtivo] = useState<ModalTipo>(null);
  const [buscaModal, setBuscaModal] = useState('');

  // Item selecionado para o Drawer de Detalhes/Aulas
  const [itemSelecionado, setItemSelecionado] = useState<ItemDetalhe | null>(null);

  // Refs de rolagem para os 4 carrosséis
  const carrosselCodigosRef = useRef<HTMLDivElement | null>(null);
  const carrosselEstatutosRef = useRef<HTMLDivElement | null>(null);
  const carrosselSumulasRef = useRef<HTMLDivElement | null>(null);
  const carrosselLeisEspRef = useRef<HTMLDivElement | null>(null);

  const scrollCarrossel = (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => {
    if (!ref.current) return;
    const offset = dir === 'left' ? -350 : 350;
    ref.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Listas de cada categoria
  const codigos = useMemo(() => LEIS_CATALOG.filter((l) => l.tipo === 'codigo'), []);
  const estatutos = useMemo(() => LEIS_CATALOG.filter((l) => l.tipo === 'estatuto'), []);
  const leisEspeciais = useMemo(() => LEIS_CATALOG.filter((l) => l.tipo === 'lei-especial'), []);

  // Encontra aulas associadas ao item selecionado
  const aulasDoItem = useMemo(() => {
    if (!itemSelecionado) return [];
    const normId = itemSelecionado.id.toLowerCase();
    const normSigla = itemSelecionado.sigla.toLowerCase();

    return aulas.filter((a) => {
      const t = (a.titulo || '').toLowerCase();
      const d = (a.descricao || '').toLowerCase();
      const ar = (a.area || '').toLowerCase();
      const tm = (a.tema || '').toLowerCase();

      if (normId === 'cp' && ar.includes('penal')) return true;
      if (normId === 'clt' && (ar.includes('trabalh') || t.includes('clt'))) return true;
      if (normId === 'cf88' && ar.includes('constituc')) return true;
      if (normId === 'cc' && ar.includes('civil') && !ar.includes('processual')) return true;
      if (normId === 'cpc' && (ar.includes('processual civil') || t.includes('cpc'))) return true;
      if (normId === 'cpp' && (ar.includes('processual penal') || t.includes('cpp'))) return true;
      if (normId === 'ctn' && ar.includes('tribut')) return true;
      if (normId === 'cdc' && (ar.includes('consumidor') || t.includes('cdc'))) return true;
      if (normId === 'eca' && (ar.includes('criança') || t.includes('eca'))) return true;
      if (normId === 'eoab' && (ar.includes('oab') || ar.includes('advocac') || t.includes('oab'))) return true;
      if (normId.includes('sumula') && (t.includes('súmula') || t.includes('sumula'))) return true;

      return t.includes(normSigla) || tm.includes(normSigla) || d.includes(normSigla);
    });
  }, [itemSelecionado, aulas]);

  // Handler ao clicar em um card
  const handleItemClick = (item: ItemDetalhe) => {
    haptic.selection();
    setItemSelecionado(item);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 space-y-10 mt-8 mb-6 lg:px-10 2xl:max-w-[1600px]">
      {/* ──────────────── DIVISOR E HEADER DA CATEGORIA LEGISLAÇÃO ──────────────── */}
      <div className="relative pt-6 border-t border-white/[0.08]">
        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
          <span className="w-1.5 h-7 rounded-full bg-primary shrink-0" />
          <span>Legislação & Vade Mecum</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
          Aulas conceituais e narrações organizadas por códigos, estatutos, súmulas e leis.
        </p>
      </div>

      {/* ──────────────── 1. CÓDIGOS ──────────────── */}
      <section className="relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-primary shrink-0" />
              <span>Códigos</span>
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-1">
              Principais códigos do ordenamento jurídico brasileiro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setModalAtivo('codigos');
              setBuscaModal('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 shrink-0"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4 text-blue-400" />
          </button>
        </div>

        {/* Setas desktop */}
        <div className="hidden lg:flex items-center gap-2 absolute right-0 -top-10">
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselCodigosRef, 'left')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselCodigosRef, 'right')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carrossel Códigos */}
        <div
          ref={carrosselCodigosRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
        >
          {codigos.map((cod) => {
            const capa = getLeiCover(cod.id);
            return (
              <motion.button
                key={cod.id}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  handleItemClick({
                    id: cod.id,
                    nome: cod.nome,
                    sigla: cod.sigla,
                    descricao: cod.descricao,
                    tipo: 'codigo',
                    cover: capa,
                    iconColor: cod.iconColor
                  })
                }
                className="group relative w-[160px] sm:w-[190px] md:w-[210px] shrink-0 aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 border border-white/10 focus-visible:outline-none snap-start bg-zinc-900"
              >
                <CapaOtimizada
                  src={capa}
                  alt={cod.nome}
                  animacaoEntrada
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-110 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
                <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between">
                  <span className="self-start px-2 py-1 rounded-lg bg-blue-600/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    {cod.sigla}
                  </span>
                  <div>
                    <h4 className="font-black leading-tight text-white text-sm sm:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {cod.nome}
                    </h4>
                    <p className="text-[10px] text-zinc-300 mt-1 line-clamp-1">{cod.descricao}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                      <span className="text-[10px] text-blue-300 font-medium flex items-center gap-1">
                        <Headphones className="w-3 h-3" />
                        Áudio disponível
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ──────────────── 2. ESTATUTOS ──────────────── */}
      <section className="relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-primary shrink-0" />
              <span>Estatutos</span>
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-1">
              Estatutos temáticos, OAB, direitos fundamentais e cidadania.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setModalAtivo('estatutos');
              setBuscaModal('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 shrink-0"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>

        {/* Setas desktop */}
        <div className="hidden lg:flex items-center gap-2 absolute right-0 -top-10">
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselEstatutosRef, 'left')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselEstatutosRef, 'right')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carrossel Estatutos */}
        <div
          ref={carrosselEstatutosRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
        >
          {estatutos.map((est) => {
            const capa = getLeiCover(est.id);
            return (
              <motion.button
                key={est.id}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  handleItemClick({
                    id: est.id,
                    nome: est.nome,
                    sigla: est.sigla,
                    descricao: est.descricao,
                    tipo: 'estatuto',
                    cover: capa,
                    iconColor: est.iconColor
                  })
                }
                className="group relative w-[160px] sm:w-[190px] md:w-[210px] shrink-0 aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/20 border border-white/10 focus-visible:outline-none snap-start bg-zinc-900"
              >
                <CapaOtimizada
                  src={capa}
                  alt={est.nome}
                  animacaoEntrada
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-110 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
                <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between">
                  <span className="self-start px-2 py-1 rounded-lg bg-rose-600/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    {est.sigla}
                  </span>
                  <div>
                    <h4 className="font-black leading-tight text-white text-sm sm:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {est.nome}
                    </h4>
                    <p className="text-[10px] text-zinc-300 mt-1 line-clamp-1">{est.descricao}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                      <span className="text-[10px] text-rose-300 font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Estatuto
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ──────────────── 3. SÚMULAS ──────────────── */}
      <section className="relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-primary shrink-0" />
              <span>Súmulas dos Tribunais</span>
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-1">
              Súmulas Vinculantes, STF, STJ, TST, TSE e Justiça Militar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setModalAtivo('sumulas');
              setBuscaModal('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 shrink-0"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        {/* Setas desktop */}
        <div className="hidden lg:flex items-center gap-2 absolute right-0 -top-10">
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselSumulasRef, 'left')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselSumulasRef, 'right')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carrossel Súmulas */}
        <div
          ref={carrosselSumulasRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
        >
          {SUMULA_TRIBUNAIS.map((sum) => (
            <motion.button
              key={sum.id}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                handleItemClick({
                  id: sum.id,
                  nome: sum.nome,
                  sigla: sum.tribunal,
                  descricao: sum.descricao,
                  tipo: 'sumula',
                  iconColor: sum.iconColor
                })
              }
              className="group relative w-[160px] sm:w-[190px] md:w-[210px] shrink-0 aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 border border-white/10 focus-visible:outline-none snap-start bg-gradient-to-b from-zinc-800 to-zinc-950 p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-1 rounded-lg text-white font-black text-xs uppercase tracking-wider shadow-md"
                  style={{ backgroundColor: sum.iconColor || '#d97706' }}
                >
                  {sum.tribunal}
                </span>
                <span className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition">
                  <Scale className="w-4 h-4" />
                </span>
              </div>

              <div>
                <h4 className="font-black leading-snug text-white text-sm sm:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {sum.nome}
                </h4>
                <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{sum.descricao}</p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                  <span className="text-[11px] text-amber-300 font-bold">
                    {sum.count} enunciados
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ──────────────── 4. LEIS ESPECIAIS ──────────────── */}
      <section className="relative">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-primary shrink-0" />
              <span>Leis Especiais</span>
            </h3>
            <p className="text-xs text-zinc-400 line-clamp-1">
              Legislação extravagante, leis penais especiais e normas setoriais.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setModalAtivo('leis-especiais');
              setBuscaModal('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 shrink-0"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Setas desktop */}
        <div className="hidden lg:flex items-center gap-2 absolute right-0 -top-10">
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselLeisEspRef, 'left')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarrossel(carrosselLeisEspRef, 'right')}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carrossel Leis Especiais */}
        <div
          ref={carrosselLeisEspRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
        >
          {leisEspeciais.map((lei) => {
            const capa = getLeiCover(lei.id);
            return (
              <motion.button
                key={lei.id}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  handleItemClick({
                    id: lei.id,
                    nome: lei.nome,
                    sigla: lei.sigla,
                    descricao: lei.descricao,
                    tipo: 'lei-especial',
                    cover: capa,
                    iconColor: lei.iconColor
                  })
                }
                className="group relative w-[160px] sm:w-[190px] md:w-[210px] shrink-0 aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20 border border-white/10 focus-visible:outline-none snap-start bg-zinc-900"
              >
                <CapaOtimizada
                  src={capa}
                  alt={lei.nome}
                  animacaoEntrada
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-110 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
                <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between">
                  <span className="self-start px-2 py-1 rounded-lg bg-emerald-600/90 text-white font-black text-[11px] uppercase tracking-wider shadow-md">
                    {lei.sigla}
                  </span>
                  <div>
                    <h4 className="font-black leading-tight text-white text-sm sm:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {lei.nome}
                    </h4>
                    <p className="text-[10px] text-zinc-300 mt-1 line-clamp-1">{lei.descricao}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                      <span className="text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Lei Especial
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ──────────────── MODAL "VER TODOS" E DRAWER DE DETALHES VIA PORTAL SOBRE O RODAPÉ ──────────────── */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Modal "Ver todos" com Lista e Capa do Lado Esquerdo */}
            <AnimatePresence>
              {modalAtivo && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setModalAtivo(null)}
                    className="fixed inset-0 z-[1400] bg-black/85 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                    className="fixed inset-0 sm:inset-y-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-[1401] flex flex-col bg-zinc-950 border-t sm:border border-white/10 sm:rounded-3xl shadow-2xl overflow-hidden"
                  >
                    {/* Pílula superior para arraste no mobile */}
                    <div className="flex items-center justify-center pt-3 pb-1 sm:hidden">
                      <div className="w-12 h-1.5 rounded-full bg-white/25" />
                    </div>

                    {/* Header do modal */}
                    <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-primary" />
                          <span>
                            {modalAtivo === 'codigos'
                              ? 'Todos os Códigos'
                              : modalAtivo === 'estatutos'
                              ? 'Todos os Estatutos'
                              : modalAtivo === 'sumulas'
                              ? 'Todas as Súmulas'
                              : 'Todas as Leis Especiais'}
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {modalAtivo === 'codigos'
                            ? `${codigos.length} códigos cadastrados`
                            : modalAtivo === 'estatutos'
                            ? `${estatutos.length} estatutos cadastrados`
                            : modalAtivo === 'sumulas'
                            ? `${SUMULA_TRIBUNAIS.length} tribunais com súmulas`
                            : `${leisEspeciais.length} leis especiais cadastradas`}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setModalAtivo(null)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0"
                        aria-label="Fechar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Campo de filtro */}
                    <div className="p-3.5 sm:p-4 border-b border-white/5 bg-zinc-900/40">
                      <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={buscaModal}
                          onChange={(e) => setBuscaModal(e.target.value)}
                          placeholder="Filtrar por nome, sigla ou número..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50"
                        />
                        {buscaModal && (
                          <button
                            type="button"
                            onClick={() => setBuscaModal('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Lista com Capa no lado esquerdo */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-white/[0.06] space-y-1 pb-[calc(2.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
                      {(() => {
                        const termo = buscaModal.toLowerCase().trim();
                        if (modalAtivo === 'sumulas') {
                          const filtradas = SUMULA_TRIBUNAIS.filter(
                            (s) =>
                              s.nome.toLowerCase().includes(termo) ||
                              s.tribunal.toLowerCase().includes(termo) ||
                              s.descricao.toLowerCase().includes(termo)
                          );
                          return filtradas.map((sum) => (
                            <button
                              key={sum.id}
                              type="button"
                              onClick={() => {
                                setModalAtivo(null);
                                handleItemClick({
                                  id: sum.id,
                                  nome: sum.nome,
                                  sigla: sum.tribunal,
                                  descricao: sum.descricao,
                                  tipo: 'sumula',
                                  iconColor: sum.iconColor
                                });
                              }}
                              className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/10 transition text-left group"
                            >
                              <div
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-md border border-white/10"
                                style={{ backgroundColor: sum.iconColor || '#d97706' }}
                              >
                                {sum.tribunal}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors">
                                  {sum.nome}
                                </h4>
                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{sum.descricao}</p>
                                <span className="inline-block mt-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                  {sum.count} enunciados
                                </span>
                              </div>
                              <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-primary transition shrink-0" />
                            </button>
                          ));
                        }

                        const listaAtual =
                          modalAtivo === 'codigos'
                            ? codigos
                            : modalAtivo === 'estatutos'
                            ? estatutos
                            : leisEspeciais;

                        const filtradas = listaAtual.filter(
                          (l) =>
                            l.nome.toLowerCase().includes(termo) ||
                            l.sigla.toLowerCase().includes(termo) ||
                            l.descricao.toLowerCase().includes(termo)
                        );

                        if (filtradas.length === 0) {
                          return (
                            <div className="py-16 text-center text-zinc-500 text-sm">
                              Nenhum item encontrado para "{buscaModal}".
                            </div>
                          );
                        }

                        return filtradas.map((l) => {
                          const capa = getLeiCover(l.id);
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => {
                                setModalAtivo(null);
                                handleItemClick({
                                  id: l.id,
                                  nome: l.nome,
                                  sigla: l.sigla,
                                  descricao: l.descricao,
                                  tipo: l.tipo as 'codigo' | 'estatuto' | 'lei-especial',
                                  cover: capa,
                                  iconColor: l.iconColor
                                });
                              }}
                              className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/10 transition text-left group"
                            >
                              {/* Capa no lado esquerdo */}
                              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md bg-zinc-950">
                                <CapaOtimizada
                                  src={capa}
                                  alt={l.nome}
                                  animacaoEntrada={false}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[10px] font-black text-white">
                                  {l.sigla}
                                </span>
                              </div>

                              {/* Dados da legislação */}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors">
                                  {l.nome}
                                </h4>
                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{l.descricao}</p>
                                <span className="inline-block mt-1 text-[11px] font-semibold text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                                  Sigla: {l.sigla}
                                </span>
                              </div>

                              <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-primary transition shrink-0" />
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Drawer de Detalhes do Item Clicado */}
            <AnimatePresence>
              {itemSelecionado && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setItemSelecionado(null)}
                    className="fixed inset-0 z-[1400] bg-black/85 backdrop-blur-md"
                  />
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                    className="fixed inset-0 sm:inset-y-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-[1401] flex flex-col bg-zinc-950 border-t sm:border border-white/10 sm:rounded-3xl shadow-2xl overflow-hidden"
                  >
                    {/* Pílula de arraste no mobile */}
                    <div className="flex items-center justify-center pt-3 pb-1 sm:hidden">
                      <div className="w-12 h-1.5 rounded-full bg-white/25" />
                    </div>

                    {/* Header do item */}
                    <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-zinc-900/60">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {itemSelecionado.cover ? (
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md bg-zinc-950">
                            <CapaOtimizada
                              src={itemSelecionado.cover}
                              alt={itemSelecionado.nome}
                              animacaoEntrada={false}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-md"
                            style={{ backgroundColor: itemSelecionado.iconColor || '#d97706' }}
                          >
                            {itemSelecionado.sigla}
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-wider mb-1">
                            {itemSelecionado.sigla}
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                            {itemSelecionado.nome}
                          </h3>
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                            {itemSelecionado.descricao}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setItemSelecionado(null)}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0"
                        aria-label="Fechar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Corpo: Aulas disponíveis ou Opções de Áudio Leis / Vade Mecum */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[calc(2.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
                      {/* Seções com Aulas Conceituais */}
                      {aulasDoItem.length > 0 ? (
                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5 text-primary" />
                            {aulasDoItem.length} audioaulas disponíveis
                          </h4>
                          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-2 divide-y divide-white/[0.06]">
                            {aulasDoItem.map((aula) => (
                              <LinhaAula
                                key={aula.id}
                                a={aula}
                                atualId={atualId}
                                tocando={tocando}
                                favoritos={favoritos}
                                alternarFavorito={alternarFavorito}
                                handleTocarAula={handleTocarAula}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-white">
                            Áudio Aulas Conceituais em Gravação
                          </h4>
                          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                            Novas aulas explicativas sobre {itemSelecionado.nome} estão sendo preparadas pelos professores. Você já pode ouvir os artigos narrados ou consultar a lei!
                          </p>
                        </div>
                      )}

                      {/* Ações Rápidas: Áudio Leis & Vade Mecum */}
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            setItemSelecionado(null);
                            navigate(`/audio-leis`);
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-white transition active:scale-[0.99] group shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-md">
                              <Volume2 className="w-5 h-5" />
                            </span>
                            <div className="text-left">
                              <h5 className="text-sm font-bold text-white">Ouvir no Áudio Leis</h5>
                              <p className="text-xs text-zinc-300">Narrações dos artigos da legislação</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setItemSelecionado(null);
                            navigate(`/legislacao/${itemSelecionado.id}`);
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white transition active:scale-[0.99] group shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-white/10 text-zinc-200 grid place-items-center">
                              <BookOpen className="w-5 h-5" />
                            </span>
                            <div className="text-left">
                              <h5 className="text-sm font-bold text-white">Ler no Vade Mecum</h5>
                              <p className="text-xs text-zinc-400">Texto completo, notas e artigos</p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-white transition" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}
    </div>
  );
});

export default AudioaulasSecaoLegislacao;
