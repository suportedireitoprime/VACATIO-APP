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

const LousaMagicaModal = React.lazy(() => import('@/components/audioaulas/lousa/LousaMagicaModal'));

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
          style={{ paddingTop: 'max(0.75rem, var(--sai-top, env(safe-area-inset-top, 0px)))' }}
        >
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  onVoltar();
                }}
                aria-label="Voltar para Audioaulas"
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }}
                  />
                  <span
                    className="font-card text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: theme.primaryLight }}
                  >
                    Área do Direito
                  </span>
                </div>
                <h1 className="font-title text-xl sm:text-2xl font-bold text-white truncate tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                  {formatarTituloMateria(area)}
                </h1>
              </div>
            </div>

            {/* Badges de Contagem com Acento da Capa */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md font-card">
                <Layers className="w-3.5 h-3.5" style={{ color: theme.primaryLight }} />
                <span>{temas.length} matérias</span>
              </span>
              <span
                className="tag-narracoes-shine inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-bold shadow-md backdrop-blur-md font-card border"
                style={{
                  backgroundColor: theme.primaryAlpha15,
                  borderColor: theme.primaryAlpha40,
                  color: theme.primaryLight,
                }}
              >
                <Headphones className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primaryLight }} />
                <span>{aulas.length} aulas</span>
              </span>
            </div>
          </div>

          {/* Barra de Pesquisa Responsiva */}
          <div className="max-w-[1200px] mx-auto mt-3">
            <div className="relative flex items-center w-full">
              <Search
                className="w-5 h-5 absolute left-3.5 sm:left-4 pointer-events-none transition-colors"
                style={{ color: buscaMaterias ? theme.primaryLight : 'rgba(255,255,255,0.45)' }}
              />
              <input
                type="text"
                value={buscaMaterias}
                onChange={(e) => setBuscaMaterias(e.target.value)}
                placeholder={`Buscar matéria em ${formatarTituloMateria(area)}...`}
                className="w-full h-12 sm:h-13 min-h-[48px] sm:min-h-[52px] pl-11 sm:pl-12 pr-11 py-3 text-sm sm:text-base font-card font-medium bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] border border-white/12 rounded-2xl text-white placeholder-zinc-400 outline-none shadow-lg backdrop-blur-md transition-all duration-200"
                style={{
                  borderColor: buscaMaterias ? theme.primaryAlpha60 : undefined,
                }}
              />
              {buscaMaterias && (
                <button
                  type="button"
                  onClick={() => setBuscaMaterias('')}
                  aria-label="Limpar busca"
                  className="absolute right-3.5 p-1 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Lista de Matérias com Mesma Altura e Barra de Progresso */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
          <div className="max-w-[1200px] mx-auto space-y-3 pb-28">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="font-card text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span
                  className="w-1.5 h-4 rounded-full"
                  style={{ backgroundColor: theme.primary, boxShadow: `0 0 8px ${theme.primary}` }}
                />
                <span>Selecione uma matéria ({temasFiltrados.length})</span>
              </p>
              <span className="font-card text-xs text-zinc-500 hidden sm:inline">
                Toque para abrir as aulas
              </span>
            </div>

            {aulas.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center text-center font-card max-w-md mx-auto">
                <div className="w-40 sm:w-48 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/15 mb-5 relative group">
                  <CapaOtimizada
                    src={capaDaArea(area)}
                    alt={area}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-xs font-bold text-white text-center">
                    Área do Direito
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white mb-2">
                  {formatarTituloMateria(area)}
                </h3>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-3"
                  style={{
                    backgroundColor: theme.primaryAlpha15,
                    borderColor: theme.primaryAlpha40,
                    color: theme.primaryLight,
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Acervo em gravação
                </span>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  As audioaulas desta área estão sendo preparadas e gravadas por professores especialistas. Em breve estarão disponíveis para você ouvir!
                </p>
              </div>
            ) : temasFiltrados.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-400 bg-white/[0.02] border border-white/5 rounded-2xl p-6 font-card">
                Nenhuma matéria encontrada com o termo pesquisado.
              </div>
            ) : (
              temasFiltrados.map(([tema, listaAulas], idx) => {
                // Remove prefixos numéricos se houver e formata limpo
                const numMatch = tema.match(/^(\d+)\.\s*(.*)$/);
                const numeroExibicao = numMatch ? numMatch[1] : String(idx + 1).padStart(2, '0');
                const rawNome = numMatch ? numMatch[2] : tema;
                const nomeMateriaFormatado = formatarTituloMateria(rawNome);

                const temTocando = listaAulas.some((a) => a.id === atualId && tocando);

                // Cálculo de progresso consolidado para esta matéria
                const progressoMat = calcularProgressoMateria(listaAulas, progressoMap);

                return (
                  <motion.button
                    key={tema}
                    type="button"
                    whileHover={{ scale: 1.008, y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      haptic.selection();
                      setMateriaSelecionada(tema);
                      setBuscaAulas('');
                    }}
                    style={{
                      background: temTocando ? theme.cardActiveBg : undefined,
                      borderColor: temTocando ? theme.primaryAlpha60 : undefined,
                      boxShadow: temTocando ? theme.glowShadow : undefined,
                    }}
                    className={`w-full group rounded-2xl sm:rounded-3xl border transition-all duration-300 text-left cursor-pointer backdrop-blur-md shadow-md h-[86px] sm:h-[92px] min-h-[86px] sm:min-h-[92px] max-h-[86px] sm:max-h-[92px] px-3.5 sm:px-5 flex items-center justify-between gap-3 overflow-hidden ${
                      temTocando
                        ? 'ring-1'
                        : 'bg-gradient-to-r from-white/[0.05] via-white/[0.03] to-white/[0.02] hover:bg-white/[0.08] border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 h-full py-1">
                      {/* Badge numérico com a cor da capa */}
                      <div
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-card font-bold text-sm sm:text-base shrink-0 border transition-all duration-300"
                        style={{
                          backgroundColor: temTocando ? theme.primary : theme.primaryAlpha15,
                          borderColor: temTocando ? theme.primaryLight : theme.primaryAlpha30,
                          color: temTocando ? '#ffffff' : theme.primaryLight,
                          boxShadow: temTocando ? theme.glowShadow : undefined,
                        }}
                      >
                        {temTocando ? (
                          <Volume2 className="w-5 h-5 text-white animate-pulse" />
                        ) : (
                          numeroExibicao
                        )}
                      </div>

                      {/* Informações da Matéria e Barra de Progresso */}
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <h2 className="font-card text-[14px] sm:text-[16px] font-semibold text-white group-hover:text-white transition-colors truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {nomeMateriaFormatado}
                        </h2>

                        <div className="font-card text-xs sm:text-[13px] text-zinc-300 font-medium flex items-center gap-2 mt-0.5 drop-shadow-sm truncate">
                          <span className="flex items-center gap-1.5 shrink-0">
                            <Headphones className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primaryLight }} />
                            <span>
                              {listaAulas.length} {listaAulas.length === 1 ? 'aula' : 'aulas'}
                            </span>
                          </span>

                          {progressoMat.percent > 0 && (
                            <span
                              className="text-[11px] font-semibold flex items-center gap-1 shrink-0"
                              style={{ color: theme.primaryLight }}
                            >
                              • {progressoMat.percent}% concluído
                            </span>
                          )}
                        </div>

                        {/* Barra de Progresso da Matéria */}
                        <div className="mt-1.5 w-full h-1 bg-white/[0.08] rounded-full overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${Math.max(0, progressoMat.percent)}%`,
                              background: `linear-gradient(90deg, ${theme.primary}, ${theme.primaryLight})`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seta e Ação Circular */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-card text-xs font-semibold text-zinc-400 hidden sm:inline group-hover:text-white transition-colors">
                        Ver aulas
                      </span>
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 text-zinc-400 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-md group-hover:border-transparent"
                        style={{
                          backgroundColor: undefined,
                        }}
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TELA 2: LISTA DE AULAS DA MATÉRIA (COM CORES DA CAPA E MESMA ALTURA)
         ══════════════════════════════════════════════════════════════════ */}
        {materiaSelecionada && (
          <div
            className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col overflow-hidden"
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

            {/* Topbar da Matéria com Glassmorphism e Acentos da Capa */}
            <header
              className="relative z-20 shrink-0 px-4 sm:px-6 pb-3.5 border-b border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl shadow-lg"
              style={{ paddingTop: 'max(0.75rem, var(--sai-top, env(safe-area-inset-top, 0px)))' }}
            >
              <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setMateriaSelecionada(null);
                    }}
                    aria-label="Voltar para matérias"
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
                  </button>

                  <div className="min-w-0">
                    <p
                      className="font-card text-[11px] font-bold uppercase tracking-wider truncate"
                      style={{ color: theme.primaryLight }}
                    >
                      {formatarTituloMateria(area)}
                    </p>
                    <h2 className="font-card text-base sm:text-xl font-bold text-white truncate tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {formatarTituloMateria(materiaSelecionada)}
                    </h2>
                  </div>
                </div>

                {/* Botão de Tocar Todas estilizado com o gradiente da Capa */}
                <button
                  type="button"
                  onClick={handleTocarTodas}
                  style={{
                    background: theme.gradientButton,
                    boxShadow: theme.glowShadow,
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl active:scale-95 text-white font-card font-bold text-xs sm:text-sm transition shrink-0 cursor-pointer shadow-lg"
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
