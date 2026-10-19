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
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LEIS_CATALOG } from '@/data/leisCatalog';
import { SUMULA_TRIBUNAIS } from '@/services/sumulasService';
import { getLeiCover } from '@/lib/leiTheme';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { CapaOtimizada } from './CapaOtimizada';
import { motion } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';
import {
  AudioaulasLegislacaoVerTodosModal,
  type ModalTipo,
  type ItemDetalhe,
} from './AudioaulasLegislacaoVerTodosModal';
import { AudioaulasLegislacaoDrawerDetalhes } from './AudioaulasLegislacaoDrawerDetalhes';

interface AudioaulasSecaoLegislacaoProps {
  aulas: AulaAudio[];
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
}

export const AudioaulasSecaoLegislacao: React.FC<AudioaulasSecaoLegislacaoProps> = React.memo(({
  aulas,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula,
}) => {
  // Estados dos modais de "Ver todos"
  const [modalAtivo, setModalAtivo] = useState<ModalTipo>(null);

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
            <AudioaulasLegislacaoVerTodosModal
              modalAtivo={modalAtivo}
              onFechar={() => setModalAtivo(null)}
              onSelecionarItem={handleItemClick}
              codigos={codigos}
              estatutos={estatutos}
              leisEspeciais={leisEspeciais}
            />

            <AudioaulasLegislacaoDrawerDetalhes
              itemSelecionado={itemSelecionado}
              onFechar={() => setItemSelecionado(null)}
              aulasDoItem={aulasDoItem}
              atualId={atualId}
              tocando={tocando}
              favoritos={favoritos}
              alternarFavorito={alternarFavorito}
              handleTocarAula={handleTocarAula}
            />
          </>,
          document.body
        )}
    </div>
  );
});

export default AudioaulasSecaoLegislacao;
