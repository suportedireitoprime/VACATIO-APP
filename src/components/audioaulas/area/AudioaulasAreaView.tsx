import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Headphones,
  ChevronRight,
  Sparkles,
  Layers,
  Volume2,
  Play,
  Pause,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AulaAudio, audioIdOf, useAudioaulasPlayer } from '@/contexts/AudioaulasPlayerContext';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from '@/components/audioaulas/home/CapaOtimizada';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';
import { getAreaTheme } from '@/lib/audioaulasThemes';
import { useAudioaulasProgresso, calcularProgressoMateria } from '@/lib/audioaulasProgresso';
import { AudioaulasMateriaAulaItem } from './AudioaulasMateriaAulaItem';

import { lazyWithRetry } from '@/lib/lazyWithRetry';
const LousaMagicaModal = lazyWithRetry(() => import('@/components/audioaulas/lousa/LousaMagicaModal'));

interface AudioaulasAreaViewProps {
  area: string;
  aulas: AulaAudio[];
  temas: [string, AulaAudio[]][];
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio, filaCustom?: AulaAudio[]) => void;
  onVoltar: () => void;
}

/**
 * Formata títulos de matérias que chegam em caixa alta para Title Case elegante,
 * preservando siglas jurídicas (OAB, CLT, CPC, STF, etc.) e preposições minúsculas.
 */
const formatarTituloMateria = (nome: string): string => {
  if (!nome) return '';
  const minusculas = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
    'e', 'a', 'o', 'as', 'os', 'para', 'com', 'por', 'ou'
  ]);
  const siglas = new Set(['oab', 'clt', 'cpc', 'cpp', 'cc', 'cp', 'eca', 'cdc', 'ctn', 'stf', 'stj', 'tst']);

  return nome
    .split(' ')
    .map((palavra, idx) => {
      const pLower = palavra.toLowerCase();
      if (siglas.has(pLower)) return palavra.toUpperCase();
      if (idx > 0 && minusculas.has(pLower)) return pLower;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(' ');
};

export const AudioaulasAreaView: React.FC<AudioaulasAreaViewProps> = ({
  area,
  aulas,
  temas,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula,
  onVoltar,
}) => {
  // Acesso ao player para progresso ao vivo em tempo real e controle
  const { tempo, dur, togglePlay } = useAudioaulasPlayer();

  // Progresso persistente gravado por aula e consolidado
  const { progressoMap } = useAudioaulasProgresso();

  // Tema cromático predominante extraído da capa da área selecionada
  const theme = useMemo(() => getAreaTheme(area), [area]);

  // Matéria/Categoria selecionada (se null, exibe lista de matérias)
  const [materiaSelecionada, setMateriaSelecionada] = useState<string | null>(null);

  // Busca dentro das matérias
  const [buscaMaterias, setBuscaMaterias] = useState('');

  // Busca dentro das aulas da matéria ativa
  const [buscaAulas, setBuscaAulas] = useState('');

  // Descrição expandida de aula
  const [aulaExpandidaId, setAulaExpandidaId] = useState<number | null>(null);

  // Modal de Lousa Mágica (Modo Dinâmico)
  const [lousaModalAula, setLousaModalAula] = useState<AulaAudio | null>(null);

  // Filtra matérias
  const temasFiltrados = useMemo(() => {
    const q = buscaMaterias.trim().toLowerCase();
    if (!q) return temas;
    return temas.filter(([tema]) => tema.toLowerCase().includes(q));
  }, [temas, buscaMaterias]);

  // Aulas da matéria selecionada
  const aulasDaMateriaAtiva = useMemo(() => {
    if (!materiaSelecionada) return [];
    const temaEncontrado = temas.find(([t]) => t === materiaSelecionada);
    const lista = temaEncontrado ? temaEncontrado[1] : [];
    const sorted = [...lista].sort((a, b) => (a.sequencia ?? 0) - (b.sequencia ?? 0));
    const q = buscaAulas.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        (a.descricao && a.descricao.toLowerCase().includes(q))
    );
  }, [temas, materiaSelecionada, buscaAulas]);

  // Verifica se alguma aula da matéria ativa está tocando atualmente
  const isMateriaTocando = useMemo(() => {
    if (!tocando || !atualId) return false;
    return aulasDaMateriaAtiva.some((a) => a.id === atualId || audioIdOf(a) === String(atualId));
  }, [tocando, atualId, aulasDaMateriaAtiva]);

  // Tocar todas as aulas da matéria em ordem sequencial ou pausar se já tocando
  const handleTocarTodas = () => {
    if (aulasDaMateriaAtiva.length === 0) return;
    haptic.impactMedium();
    if (isMateriaTocando) {
      togglePlay();
      return;
    }
    handleTocarAula(aulasDaMateriaAtiva[0], aulasDaMateriaAtiva);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════════
          TELA 1: LISTA DE MATÉRIAS DA ÁREA (COM COR BASEADA NA CAPA)
         ══════════════════════════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col min-h-0 bg-[#070b14] relative overflow-hidden"
      >
        {/* Fundo de Quadrados Animados com cor sutil da capa */}
        <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
          <ShapeGrid
            speed={0.5}
            squareSize={40}
            direction="diagonal"
            borderColor="rgba(255, 255, 255, 0.05)"
            hoverFillColor={theme.primaryAlpha25}
            shape="square"
            hoverTrailAmount={5}
          />
        </div>

        {/* Topbar com Glassmorphism, Safe Area e Acentos da Capa */}
        <header
          className="relative z-20 shrink-0 px-4 sm:px-6 pb-3.5 border-b border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl shadow-lg"
          style={{ paddingTop: 'max(1.25rem, calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.85rem))' }}
        >
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                  type="button"
                  onClick={handleTocarTodas}
                  className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full active:scale-95 text-white font-card font-semibold text-xs sm:text-sm transition shrink-0 cursor-pointer shadow-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-600"
                >
                  {isMateriaTocando ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                  <span className="hidden sm:inline">
                    {isMateriaTocando ? 'Pausar matéria' : 'Ouvir matéria completa'}
                  </span>
                  <span className="sm:hidden">
                    {isMateriaTocando ? 'Pausar' : 'Ouvir todas'}
                  </span>
                </button>
              </div>

              {/* Sub-barra de busca dentro da matéria */}
              <div className="max-w-[1200px] mx-auto mt-3 flex items-center justify-between gap-2">
                <div className="relative flex items-center flex-1">
                  <Search
                    className="w-5 h-5 absolute left-3.5 sm:left-4 pointer-events-none transition-colors"
                    style={{ color: buscaAulas ? theme.primaryLight : 'rgba(255,255,255,0.45)' }}
                  />
                  <input
                    type="text"
                    value={buscaAulas}
                    onChange={(e) => setBuscaAulas(e.target.value)}
                    placeholder="Buscar aula ou termo..."
                    className="w-full h-12 sm:h-13 min-h-[48px] sm:min-h-[52px] pl-11 sm:pl-12 pr-11 py-3 text-sm sm:text-base font-card font-medium bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] border border-white/12 rounded-2xl text-white placeholder-zinc-400 outline-none shadow-lg backdrop-blur-md transition-all duration-200"
                    style={{
                      borderColor: buscaAulas ? theme.primaryAlpha60 : undefined,
                    }}
                  />
                  {buscaAulas && (
                    <button
                      type="button"
                      onClick={() => setBuscaAulas('')}
                      aria-label="Limpar busca de aulas"
                      className="absolute right-3.5 p-1 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div
                  className="h-12 sm:h-13 min-h-[48px] sm:min-h-[52px] px-3.5 sm:px-4 rounded-2xl border flex items-center text-xs sm:text-sm font-card font-semibold shrink-0 shadow-md backdrop-blur-md"
                  style={{
                    backgroundColor: theme.primaryAlpha15,
                    borderColor: theme.primaryAlpha30,
                    color: theme.primaryLight,
                  }}
                >
                  {aulasDaMateriaAtiva.length} {aulasDaMateriaAtiva.length === 1 ? 'aula' : 'aulas'}
                </div>
              </div>
            </header>

            {/* Lista das Aulas da Matéria: Mesma Altura, Tipografia Não-Negrito e Progresso */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
              <div className="max-w-[1200px] mx-auto space-y-2.5 pb-28">
                {aulasDaMateriaAtiva.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400 bg-white/[0.02] border border-white/5 rounded-2xl p-6 font-card">
                    Nenhuma aula encontrada nesta matéria.
                  </div>
                ) : (
                  aulasDaMateriaAtiva.map((aula, i) => {
                    const isAtivo = aula.id === atualId;
                    const isFav = favoritos.has(audioIdOf(aula));
                    const isExp = aulaExpandidaId === aula.id;
                    const numFaixa = aula.sequencia ?? i + 1;

                    // Progresso individual da aula
                    const chaveAula = audioIdOf(aula);
                    const salvo = progressoMap[chaveAula];
                    const aulaPercent =
                      isAtivo && dur > 0
                        ? Math.min(100, Math.round((tempo / dur) * 100))
                        : salvo?.percent || 0;
                    const concluida = Boolean(salvo?.concluida) || aulaPercent >= 90;

                    return (
                      <AudioaulasMateriaAulaItem
                        key={aula.id}
                        aula={aula}
                        indice={numFaixa}
                        atualId={atualId}
                        tocando={tocando}
                        dur={dur}
                        tempo={tempo}
                        aulaPercent={aulaPercent}
                        concluida={concluida}
                        isFav={isFav}
                        isExp={isExp}
                        theme={theme}
                        onTocarAula={(a) => {
                          haptic.selection();
                          handleTocarAula(a, aulasDaMateriaAtiva);
                        }}
                        onAlternarFavorito={(a) => {
                          haptic.selection();
                          alternarFavorito(a);
                        }}
                        onToggleExpandir={() => setAulaExpandidaId(isExp ? null : aula.id)}
                        onAbrirLousa={(a) => {
                          haptic.impactMedium();
                          if (a.id !== atualId) {
                            handleTocarAula(a, aulasDaMateriaAtiva);
                          }
                          setLousaModalAula(a);
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      {/* Modal Interativo da Lousa Mágica (Carregado dinamicamente sob demanda) */}
      {Boolean(lousaModalAula) && (
        <React.Suspense fallback={null}>
          <LousaMagicaModal
            aberto={Boolean(lousaModalAula)}
            aula={lousaModalAula}
            onFechar={() => setLousaModalAula(null)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default AudioaulasAreaView;
