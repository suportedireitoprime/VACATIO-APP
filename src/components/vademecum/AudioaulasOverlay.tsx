import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Headphones,
  Play,
  Pause,
  Volume2,
  Clock,
  Sparkles,
  ChevronRight,
  Search,
  CheckCircle2,
  Music2,
  Radio,
  Info,
  Mic,
  ListMusic,
  FolderOpen,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioaulasPlayer, type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { AUDIOAULAS_ACERVO_INICIAL } from '@/data/audioaulasAcervo';
import type { ArtigoLei } from '@/data/mockData';
import { haptic } from '@/lib/nativeHaptics';

type ArtigoType = ArtigoLei | Record<string, any>;
type CapGroup = { capitulo: string; artigos: ArtigoType[]; titulo?: string };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

interface AudioaulasOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  leiSigla?: string;
  onClose: () => void;
  onArtigoSelect?: (artigo: ArtigoType) => void;
}

// Normalizador de texto para buscas e comparações resilientes
function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

import { formatCapituloDisplay } from '@/lib/capituloFormat';

/**
 * Verifica se uma audioaula pertence a uma determinada legislação.
 */
function matchAulaLei(leiId: string | undefined, leiNome: string, aula: AulaAudio): boolean {
  const normId = norm(leiId || '');
  const normNome = norm(leiNome);
  const t = norm(aula.titulo);
  const d = norm(aula.descricao || '');
  const ar = norm(aula.area || '');
  const tm = norm(aula.tema || '');

  // 1. Regras diretas por sigla/ID ou nome da lei
  if (normId === 'cp' || normNome.includes('codigo penal') || normNome.includes('decreto-lei no 2.848')) {
    if (ar.includes('penal') && !ar.includes('processo') && !ar.includes('especial')) return true;
  }
  if (normId === 'clt' || normNome.includes('trabalho') || normNome.includes('clt') || normNome.includes('consolidacao')) {
    if (ar.includes('trabalh') || t.includes('clt') || tm.includes('clt')) return true;
  }
  if (normId === 'cf88' || normNome.includes('constitui')) {
    if (ar.includes('constituc')) return true;
  }
  if (normId === 'cc' || normNome.includes('codigo civil') || normNome.includes('lei no 10.406')) {
    if (ar.includes('civil') && !ar.includes('processual') && !ar.includes('processo')) return true;
  }
  if (normId === 'cpc' || normNome.includes('processo civil')) {
    if (ar.includes('processual civil') || ar.includes('processo civil') || t.includes('cpc') || tm.includes('cpc')) return true;
  }
  if (normId === 'cpp' || normNome.includes('processo penal')) {
    if (ar.includes('processual penal') || ar.includes('processo penal') || t.includes('cpp') || tm.includes('cpp')) return true;
  }
  if (normId === 'eoab' || normNome.includes('oab') || normNome.includes('advocacia') || normNome.includes('lei 8.906')) {
    if (ar.includes('oab') || ar.includes('advocac') || t.includes('oab') || tm.includes('oab')) return true;
  }
  if (normId.includes('medico') || normNome.includes('medico')) {
    if (ar.includes('medico')) return true;
  }
  if (normId.includes('penal') && (normId.includes('especial') || normNome.includes('especial'))) {
    if (ar.includes('lei penal especial')) return true;
  }

  // 2. Fallback de correspondência por menção textual
  return (
    (normId.length >= 2 && (t.includes(normId) || tm.includes(normId))) ||
    (normNome.length >= 3 && (t.includes(normNome) || tm.includes(normNome)))
  );
}

/**
 * Associa uma audioaula a um capítulo específico da lei.
 */
function matchAulaCapitulo(
  aula: AulaAudio,
  capituloNome: string,
  tituloNome: string,
  artigosDoCapitulo: ArtigoType[]
): boolean {
  const tAula = norm(aula.titulo);
  const temaAula = norm(aula.tema || '');
  const descAula = norm(aula.descricao || '');
  const cap = norm(capituloNome);
  const tit = norm(tituloNome);

  // A. Correspondência direta por número de artigo
  const artNumsInCap = new Set(
    artigosDoCapitulo.map((a) => String(a.numero || '').replace(/\D/g, ''))
  );
  const mArt = tAula.match(/art(?:igo|\.)?\s*(\d+)/i) || descAula.match(/art(?:igo|\.)?\s*(\d+)/i);
  if (mArt && mArt[1] && artNumsInCap.has(mArt[1])) {
    return true;
  }

  // B. Padrão estruturado de tema (ex: "Tít. I — Cap. II" do Estatuto da OAB)
  const mTemaOab = temaAula.match(/t[ií]t\.?\s*([ivxlcdm]+)\s*—\s*cap\.?\s*([ivxlcdm]+)/i);
  if (mTemaOab) {
    const tNum = mTemaOab[1].toLowerCase();
    const cNum = mTemaOab[2].toLowerCase();
    const titHas = tit.includes(`titulo ${tNum}`) || tit.includes(`título ${tNum}`) || tit.startsWith(tNum);
    const capHas = cap.includes(`capitulo ${cNum}`) || cap.includes(`capítulo ${cNum}`) || cap.startsWith(cNum);
    if (titHas && capHas) return true;
    if (capHas) return true;
  }

  // C. Busca semântica por palavras-chave do título/capítulo
  const stopWords = new Set([
    'capitulo', 'capítulo', 'titulo', 'título', 'dos', 'das', 'da', 'do', 'de',
    'em', 'para', 'com', 'sem', 'ao', 'aos', 'e', 'ou', 'i', 'ii', 'iii', 'iv',
    'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'artigo', 'artigos'
  ]);
  const words = (cap + ' ' + tit)
    .split(/[\s\-—,.;:]+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  for (const w of words) {
    if (temaAula.includes(w) || tAula.includes(w) || descAula.includes(w)) {
      return true;
    }
  }

  return false;
}

export function AudioaulasOverlay({
  capituloGroups,
  leiNome,
  leiSigla,
  onClose,
  onArtigoSelect
}: AudioaulasOverlayProps) {
  const { aulas: contextAulas, atualId, tocando, tocar, togglePlay, tempo, dur } = useAudioaulasPlayer();
  const [selectedCapitulo, setSelectedCapitulo] = useState<{
    capitulo: string;
    tituloNome: string;
    artigos: ArtigoType[];
    aulas: AulaAudio[];
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'capitulos' | 'todas'>('capitulos');

  // Garante que temos as aulas do acervo inicial caso o contexto ainda esteja carregando
  const allAulas = useMemo(() => {
    return contextAulas.length > 0 ? contextAulas : AUDIOAULAS_ACERVO_INICIAL;
  }, [contextAulas]);

  // Todas as audioaulas que pertencem a esta legislação
  const aulasDaLei = useMemo(() => {
    return allAulas.filter((a) => matchAulaLei(leiSigla, leiNome, a));
  }, [allAulas, leiSigla, leiNome]);

  // Lista plana de todos os capítulos da legislação com suas audioaulas mapeadas
  const allCapitulos = useMemo(() => {
    const list: Array<{
      capitulo: string;
      tituloNome: string;
      artigos: ArtigoType[];
      aulas: AulaAudio[];
    }> = [];

    for (const t of capituloGroups) {
      for (const c of t.capitulos) {
        if (!c.artigos || c.artigos.length === 0) continue;
        const matchingAulas = aulasDaLei.filter((a) =>
          matchAulaCapitulo(a, c.capitulo, t.titulo, c.artigos)
        );
        list.push({
          capitulo: c.capitulo,
          tituloNome: t.titulo,
          artigos: c.artigos,
          aulas: matchingAulas
        });
      }
    }
    return list;
  }, [capituloGroups, aulasDaLei]);

  // Total de audioaulas disponíveis mapeadas ou gerais da lei
  const totalAulasDisponiveis = aulasDaLei.length;

  // Filtragem pela busca
  const capitulosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return allCapitulos;
    const q = norm(searchQuery);
    return allCapitulos.filter(
      (c) =>
        norm(c.capitulo).includes(q) ||
        norm(c.tituloNome).includes(q) ||
        c.aulas.some((a) => norm(a.titulo).includes(q) || norm(a.tema || '').includes(q))
    );
  }, [allCapitulos, searchQuery]);

  const aulasFiltradas = useMemo(() => {
    if (!searchQuery.trim()) return aulasDaLei;
    const q = norm(searchQuery);
    return aulasDaLei.filter(
      (a) =>
        norm(a.titulo).includes(q) ||
        norm(a.tema || '').includes(q) ||
        norm(a.descricao || '').includes(q)
    );
  }, [aulasDaLei, searchQuery]);

  // Tocar uma aula específica
  const handlePlayAula = (aula: AulaAudio, filaCustomizada?: AulaAudio[]) => {
    haptic.selection();
    if (atualId === aula.id) {
      togglePlay();
    } else {
      tocar(aula, filaCustomizada || aulasDaLei);
    }
  };

  // Tocar todas as aulas da lei em sequência
  const handlePlayAll = () => {
    if (aulasDaLei.length === 0) return;
    haptic.medium();
    handlePlayAula(aulasDaLei[0], aulasDaLei);
  };

  return (
    <div
      className="flex flex-col h-full relative w-full overflow-hidden select-none"
      style={{
        background:
          'linear-gradient(180deg, hsl(351 86% 36%) 0%, hsl(351 82% 42%) 45%, hsl(351 80% 24%) 100%)',
        paddingBottom: 'calc(var(--sai-bottom, env(safe-area-inset-bottom, 0px)) + 16px)'
      }}
    >
      {/* ──────────────── HEADER SUPERIOR COM O VERMELHO MARCANTE DAS AUDIOLEIS ──────────────── */}
      <section
        className="relative shrink-0 overflow-hidden pb-4 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+8px)] border-b border-white/[0.08]"
      >
        {/* Glow e radiais elegantes */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.22),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.35),transparent_70%)]" />

        {/* Drag handle no topo para mobile */}
        <div className="flex justify-center pt-1 pb-2 relative z-20">
          <div className="w-10 h-1 rounded-full bg-white/30 backdrop-blur-sm" />
        </div>

        <div className="relative px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {/* Botão Voltar */}
            <button
              onClick={() => {
                haptic.light();
                if (selectedCapitulo) {
                  setSelectedCapitulo(null);
                } else {
                  onClose();
                }
              }}
              className="w-10 h-10 rounded-full bg-black/25 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 active:scale-95 transition-all shadow-md shrink-0"
              aria-label={selectedCapitulo ? 'Voltar aos capítulos' : 'Voltar'}
            >
              <ArrowLeft className="w-5 h-5 text-white drop-shadow-md" />
            </button>

            {/* Título e Badge */}
            <div className="flex-1 min-w-0 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/30 border border-white/15 text-[10px] font-black uppercase tracking-wider text-white/90 shadow-sm">
                <Headphones className="w-3 h-3 text-red-200 animate-pulse" />
                Audioleis
              </div>
              <h1 className="font-card font-bold text-lg sm:text-xl text-white truncate drop-shadow-md mt-0.5">
                {selectedCapitulo
                  ? formatCapituloDisplay(selectedCapitulo.capitulo, selectedCapitulo.tituloNome).title
                  : leiNome}
              </h1>
              <p className="text-[11px] sm:text-xs text-white/80 font-medium truncate">
                {selectedCapitulo
                  ? `${selectedCapitulo.aulas.length} audioleis disponíveis neste capítulo`
                  : 'Aprenda e revise ouvindo por capítulos'}
              </p>
            </div>

            {/* Lado Direito: exibe fechar apenas quando dentro de capítulo, ou espaçador transparente no topo para manter simetria sem duplicidade */}
            {selectedCapitulo ? (
              <button
                onClick={() => {
                  haptic.light();
                  onClose();
                }}
                className="w-10 h-10 rounded-full bg-black/25 border border-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 active:scale-95 transition-all shadow-md shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-white drop-shadow-md" />
              </button>
            ) : (
              <div className="w-10 h-10 shrink-0" aria-hidden="true" />
            )}
          </div>

          {/* Cards de Resumo e Botão "Tocar Todas" */}
          {!selectedCapitulo && (
            <div className="mt-4 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-black/30 backdrop-blur-md border border-white/15 p-2.5 text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Capítulos
                  </span>
                  <span className="font-display text-lg sm:text-xl font-black text-white leading-none mt-0.5">
                    {allCapitulos.length}
                  </span>
                </div>
                <div className="rounded-xl bg-black/30 backdrop-blur-md border border-white/15 p-2.5 text-center flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                    Audioleis
                  </span>
                  <span className="font-display text-lg sm:text-xl font-black text-white leading-none mt-0.5 flex items-center gap-1">
                    {totalAulasDisponiveis > 0 ? (
                      <span className="text-white">{totalAulasDisponiveis}</span>
                    ) : (
                      <span className="text-xs font-semibold text-white/80">Em gravação</span>
                    )}
                  </span>
                </div>
              </div>

              {totalAulasDisponiveis > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-red-600 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all hover:bg-white/95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Reproduzir todas em sequência ({totalAulasDisponiveis})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ──────────────── CORPO PRINCIPAL ──────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* VIEW 1: DETALHES DE UM CAPÍTULO SELECIONADO */}
        {selectedCapitulo ? (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                  {formatCapituloDisplay(selectedCapitulo.capitulo, selectedCapitulo.tituloNome).tag}
                </span>
                <h3 className="font-card font-bold text-base text-white leading-snug">
                  {formatCapituloDisplay(selectedCapitulo.capitulo, selectedCapitulo.tituloNome).title}
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  {selectedCapitulo.artigos.length} artigos nesta seção
                </p>
              </div>

              <button
                onClick={() => setSelectedCapitulo(null)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition shrink-0"
              >
                Ver todos
              </button>
            </div>

            {/* Lista de Aulas do Capítulo */}
            {selectedCapitulo.aulas.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                    <ListMusic className="w-3.5 h-3.5 text-red-300" />
                    Audioleis deste capítulo ({selectedCapitulo.aulas.length})
                  </h4>
                  <button
                    onClick={() => handlePlayAula(selectedCapitulo.aulas[0], selectedCapitulo.aulas)}
                    className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Ouvir capítulo
                  </button>
                </div>

                {selectedCapitulo.aulas.map((aula, idx) => {
                  const isCurrent = atualId === aula.id;
                  const isPlaying = isCurrent && tocando;

                  return (
                    <div
                      key={aula.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                        isCurrent
                          ? 'bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/10'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      {/* Botão Play / Indicador Equalizer */}
                      <button
                        onClick={() => handlePlayAula(aula, selectedCapitulo.aulas)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
                          isCurrent
                            ? 'bg-red-500 text-white'
                            : 'bg-white/10 text-white hover:bg-red-500/80'
                        }`}
                        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                      >
                        {isPlaying ? (
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite]" />
                            <span className="w-1 bg-white rounded-full animate-[bounce_1.1s_infinite]" />
                            <span className="w-1 bg-white rounded-full animate-[bounce_0.6s_infinite]" />
                          </div>
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Informações da Aula */}
                      <div className="flex-1 min-w-0" onClick={() => handlePlayAula(aula, selectedCapitulo.aulas)}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                            Faixa {idx + 1}
                          </span>
                          {aula.tema && (
                            <span className="text-[10px] text-white/50 truncate max-w-[160px]">
                              • {aula.tema}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-sm text-white leading-snug truncate">
                          {aula.titulo}
                        </h4>
                        {aula.descricao && (
                          <p className="text-xs text-white/60 line-clamp-1 mt-0.5 font-body">
                            {aula.descricao}
                          </p>
                        )}
                      </div>

                      {/* Status pill */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          {isCurrent ? (isPlaying ? 'Tocando' : 'Pausado') : 'Áudio HD'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* AVISO ELEGANTE: CAPÍTULO EM GRAVAÇÃO */
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-inner">
                  <Mic className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/80 border border-white/15">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Em Gravação no Estúdio
                  </span>
                  <h4 className="font-display font-bold text-base text-white mt-2">
                    Audioleis deste capítulo em produção
                  </h4>
                  <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto leading-relaxed">
                    Nossa equipe de professores e narradores jurídicos está finalizando a gravação das audioleis deste capítulo.
                  </p>
                </div>

                {totalAulasDisponiveis > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCapitulo(null);
                      setActiveTab('todas');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:bg-red-600 active:scale-95 transition"
                  >
                    <Headphones className="w-4 h-4" />
                    Ver todas as {totalAulasDisponiveis} audioleis disponíveis
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: LISTAGEM GERAL DE CAPÍTULOS E AUDIOAULAS */
          <div className="space-y-4">
            {/* Barra de Busca Rápida */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar capítulo, tema ou aula..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/40 text-xs sm:text-sm focus:outline-none focus:border-red-500/60 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Alternador de Abas: Capítulos vs Todas as Audioaulas */}
            <div className="flex rounded-xl bg-white/[0.05] p-1 border border-white/10">
              <button
                onClick={() => {
                  haptic.selection();
                  setActiveTab('capitulos');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'capitulos'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Capítulos ({allCapitulos.length})</span>
              </button>

              <button
                onClick={() => {
                  haptic.selection();
                  setActiveTab('todas');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'todas'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Todas as Audioleis ({totalAulasDisponiveis})</span>
              </button>
            </div>

            {/* ABA 1: LISTAGEM DE CAPÍTULOS */}
            {activeTab === 'capitulos' && (
              <div className="space-y-3">
                {capitulosFiltrados.map((cap, idx) => {
                  const qtdAulas = cap.aulas.length;
                  const temAulas = qtdAulas > 0;

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        haptic.selection();
                        setSelectedCapitulo(cap);
                      }}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-3 text-left transition-all hover:bg-black/30 active:scale-[0.99] sm:p-3.5 shadow-sm"
                    >
                      {/* Ícone de Fones no estilo transparente padronizado */}
                      <div className="relative h-14 w-14 shrink-0 flex items-center justify-center sm:h-16 sm:w-16">
                        <Headphones className="h-9 w-9 text-[#F87171] drop-shadow-sm transition-transform group-hover:scale-110" strokeWidth={1.5} />
                      </div>

                      {/* Textos do Capítulo */}
                      <div className="min-w-0 flex-1">
                        {(() => {
                          const { tag, title } = formatCapituloDisplay(cap.capitulo, cap.tituloNome);
                          return (
                            <>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider truncate">
                                  {tag}
                                </span>
                                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-white/10 text-white/80 tabular-nums ml-auto">
                                  {cap.artigos.length} artigos
                                </span>
                              </div>
                              <p className="min-w-0 text-[14px] font-bold text-white sm:text-[15px] leading-snug drop-shadow-sm" style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
                                {title}
                              </p>
                            </>
                          );
                        })()}

                        <div className="mt-2 flex items-center gap-2">
                          {temAulas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white/90 border border-white/15">
                              <Volume2 className="w-3 h-3 text-[#F87171]" />
                              {qtdAulas} {qtdAulas === 1 ? 'audiolei' : 'audioleis'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-white/5 text-white/50 border border-white/10">
                              <Mic className="w-3 h-3" />
                              Em gravação
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}

                {capitulosFiltrados.length === 0 && (
                  <div className="text-center py-10 text-white/50 text-xs">
                    Nenhum capítulo encontrado para "{searchQuery}".
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: TODAS AS AUDIOAULAS DA LEI */}
            {activeTab === 'todas' && (
              <div className="space-y-2.5">
                {aulasFiltradas.length > 0 ? (
                  aulasFiltradas.map((aula, idx) => {
                    const isCurrent = atualId === aula.id;
                    const isPlaying = isCurrent && tocando;

                    return (
                      <div
                        key={aula.id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                          isCurrent
                            ? 'bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/10'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                        }`}
                      >
                        {/* Play button */}
                        <button
                          onClick={() => handlePlayAula(aula, aulasFiltradas)}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
                            isCurrent
                              ? 'bg-red-500 text-white'
                              : 'bg-white/10 text-white hover:bg-red-500'
                          }`}
                          aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                        >
                          {isPlaying ? (
                            <div className="flex items-end gap-0.5 h-4">
                              <span className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite]" />
                              <span className="w-1 bg-white rounded-full animate-[bounce_1.1s_infinite]" />
                              <span className="w-1 bg-white rounded-full animate-[bounce_0.6s_infinite]" />
                            </div>
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0" onClick={() => handlePlayAula(aula, aulasFiltradas)}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                              Aula {idx + 1}
                            </span>
                            {aula.tema && (
                              <span className="text-[10px] text-white/50 truncate max-w-[160px]">
                                • {aula.tema}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-white leading-snug truncate">
                            {aula.titulo}
                          </h4>
                          {aula.descricao && (
                            <p className="text-xs text-white/60 line-clamp-1 mt-0.5">
                              {aula.descricao}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                            {isCurrent ? (isPlaying ? 'Tocando' : 'Pausado') : 'Ouvir'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-3">
                    <Headphones className="w-8 h-8 text-white/30 mx-auto" />
                    <h4 className="font-bold text-sm text-white">
                      Nenhuma audioaula disponível para esta lei no momento
                    </h4>
                    <p className="text-xs text-white/50 max-w-xs mx-auto">
                      Estamos gravando constantemente novos episódios. Em breve as audioaulas de {leiNome} estarão no ar!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──────────────── MINI PLAYER INLINE FLUTUANTE ──────────────── */}
      {atualId && (
        <div className="px-4 pt-2 shrink-0">
          <div className="p-3 rounded-2xl bg-red-600/90 border border-red-400/40 text-white shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-black/30 flex items-center justify-center shrink-0">
                {tocando ? (
                  <div className="flex items-end gap-0.5 h-3.5">
                    <span className="w-0.5 bg-white rounded-full animate-[bounce_0.8s_infinite]" />
                    <span className="w-0.5 bg-white rounded-full animate-[bounce_1.1s_infinite]" />
                    <span className="w-0.5 bg-white rounded-full animate-[bounce_0.6s_infinite]" />
                  </div>
                ) : (
                  <Headphones className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  Tocando agora
                </p>
                <p className="text-xs font-bold text-white truncate">
                  {allAulas.find((a) => a.id === atualId)?.titulo || 'Audioaula'}
                </p>
              </div>
            </div>

            <button
              onClick={() => togglePlay()}
              className="w-9 h-9 rounded-full bg-white text-red-600 flex items-center justify-center shadow-md active:scale-95 transition shrink-0"
              aria-label={tocando ? 'Pausar' : 'Reproduzir'}
            >
              {tocando ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioaulasOverlay;
