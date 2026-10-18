import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Play,
  Pause,
  Headphones,
  ChevronRight,
  BookOpen,
  Sparkles,
  Layers,
  Heart,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { BotaoDownloadAudio } from '@/components/audioaulas/home/BotaoDownloadAudio';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from '@/components/audioaulas/home/CapaOtimizada';
import ShapeGrid from '@/components/ui/ShapeGrid';
import { haptic } from '@/lib/nativeHaptics';

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
  // Matéria/Categoria selecionada (se null, exibe lista de matérias)
  const [materiaSelecionada, setMateriaSelecionada] = useState<string | null>(null);

  // Busca dentro das matérias
  const [buscaMaterias, setBuscaMaterias] = useState('');

  // Busca dentro das aulas da matéria ativa
  const [buscaAulas, setBuscaAulas] = useState('');

  // Descrição expandida de aula
  const [aulaExpandidaId, setAulaExpandidaId] = useState<number | null>(null);

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

  // Tocar todas as aulas da matéria em ordem sequencial
  const handleTocarTodas = () => {
    if (aulasDaMateriaAtiva.length > 0) {
      haptic.impactMedium();
      handleTocarAula(aulasDaMateriaAtiva[0], aulasDaMateriaAtiva);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════════
          TELA 1: LISTA DE MATÉRIAS DA ÁREA (COM SHAPEGRID E TIPOGRAFIA MODERNA)
         ══════════════════════════════════════════════════════════════════ */}
      <motion.div
        key="area-materias-view"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="flex-1 flex flex-col min-h-0 bg-[#070b14] relative overflow-hidden"
      >
        {/* Fundo de Quadrados Animados idêntico à Home (ShapeGrid) */}
        <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
          <ShapeGrid
            speed={0.5}
            squareSize={40}
            direction="diagonal"
            borderColor="rgba(255, 255, 255, 0.05)"
            hoverFillColor="rgba(59, 130, 246, 0.15)"
            shape="square"
            hoverTrailAmount={5}
          />
        </div>

        {/* Topbar com Glassmorphism e Safe Area */}
        <header
          className="relative z-20 shrink-0 px-4 sm:px-6 pb-3.5 border-b border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl shadow-lg"
          style={{ paddingTop: 'max(0.75rem, var(--sai-top, env(safe-area-inset-top, 0px)))' }}
        >
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onVoltar();
                }}
                aria-label="Voltar para Audioaulas"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-white transition shrink-0 shadow-md backdrop-blur-md cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                  <span className="font-card text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Área do Direito
                  </span>
                </div>
                <h1 className="font-card text-lg sm:text-2xl font-extrabold text-white truncate tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                  {formatarTituloMateria(area)}
                </h1>
              </div>
            </div>

            {/* Badges de Contagem com Efeito de Brilho */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300 shadow-sm backdrop-blur-md font-card">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>{temas.length} matérias</span>
              </span>
              <span className="tag-narracoes-shine inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs sm:text-[13px] font-bold text-blue-300 shadow-md backdrop-blur-md font-card">
                <Headphones className="w-3.5 h-3.5 text-sky-400" />
                <span>{aulas.length} aulas</span>
              </span>
            </div>
          </div>

          {/* Barra de Pesquisa Responsiva, Alta e Confortável */}
          <div className="max-w-[1200px] mx-auto mt-3">
            <div className="relative flex items-center w-full">
              <Search className="w-5 h-5 text-blue-400 absolute left-3.5 sm:left-4 pointer-events-none" />
              <input
                type="text"
                value={buscaMaterias}
                onChange={(e) => setBuscaMaterias(e.target.value)}
                placeholder={`Buscar matéria em ${formatarTituloMateria(area)}...`}
                className="w-full h-12 sm:h-13 min-h-[48px] sm:min-h-[52px] pl-11 sm:pl-12 pr-11 py-3 text-sm sm:text-base font-card font-medium bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] border border-white/12 focus:border-blue-500/60 rounded-2xl text-white placeholder-zinc-400 outline-none shadow-lg backdrop-blur-md transition-all duration-200"
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

        {/* Lista de Matérias com Tipografia Estilo Cards do Início */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
          <div className="max-w-[1200px] mx-auto space-y-3 pb-28">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="font-card text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-500" />
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold mb-3">
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
                    className={`w-full group flex items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-300 text-left cursor-pointer backdrop-blur-md shadow-md ${
                      temTocando
                        ? 'bg-gradient-to-r from-blue-900/40 via-blue-950/30 to-black/40 border-blue-500/50 shadow-xl shadow-blue-600/20 ring-1 ring-blue-500/30'
                        : 'bg-gradient-to-r from-white/[0.05] via-white/[0.03] to-white/[0.02] hover:bg-white/[0.08] border-white/10 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-950/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                      {/* Badge numérico elegante com gradiente azul */}
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-card font-bold text-sm sm:text-base shrink-0 border transition-all duration-300 ${
                          temTocando
                            ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/40 animate-pulse'
                            : 'bg-gradient-to-br from-blue-500/20 to-blue-600/5 text-blue-300 border-blue-400/25 group-hover:from-blue-500/30 group-hover:to-blue-600/20 group-hover:border-blue-400/50 group-hover:text-white shadow-sm'
                        }`}
                      >
                        {temTocando ? (
                          <Volume2 className="w-5 h-5 text-white animate-pulse" />
                        ) : (
                          numeroExibicao
                        )}
                      </div>

                      {/* Informações da Matéria com tipografia igual aos cards do início */}
                      <div className="min-w-0 flex-1">
                        <h2 className="font-card text-[15px] sm:text-lg font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {nomeMateriaFormatado}
                        </h2>
                        <div className="font-card text-xs sm:text-[13px] text-zinc-300 font-medium flex items-center gap-1.5 mt-1 drop-shadow-sm">
                          <Headphones className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>
                            {listaAulas.length} {listaAulas.length === 1 ? 'aula didática' : 'aulas didáticas'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Seta e Ação Circular */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-card text-xs font-semibold text-zinc-400 hidden sm:inline group-hover:text-white transition-colors">
                        Ver aulas
                      </span>
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/10 group-hover:bg-blue-600 group-hover:border-blue-500 text-zinc-400 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-md">
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════
          TELA 2: LISTA DE AULAS DA MATÉRIA SELECIONADA (DE BAIXO PRA CIMA)
         ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {materiaSelecionada && (
          <motion.div
            key="materia-aulas-view"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 290 }}
            className="fixed inset-0 z-50 bg-[#070b14] text-white flex flex-col overflow-hidden"
          >
            {/* Fundo de Quadrados Animados idêntico à Home (ShapeGrid) */}
            <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
              <ShapeGrid
                speed={0.5}
                squareSize={40}
                direction="diagonal"
                borderColor="rgba(255, 255, 255, 0.05)"
                hoverFillColor="rgba(59, 130, 246, 0.15)"
                shape="square"
                hoverTrailAmount={5}
              />
            </div>

            {/* Topbar da Matéria com Glassmorphism */}
            <header
              className="relative z-20 shrink-0 px-4 sm:px-6 pb-3.5 border-b border-white/[0.08] bg-[#080d19]/90 backdrop-blur-xl shadow-lg"
              style={{ paddingTop: 'max(0.75rem, var(--sai-top, env(safe-area-inset-top, 0px)))' }}
            >
              <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setMateriaSelecionada(null);
                    }}
                    aria-label="Voltar para matérias"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 flex items-center justify-center text-white transition shrink-0 shadow-md backdrop-blur-md cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
                  </button>

                  <div className="min-w-0">
                    <p className="font-card text-[11px] font-bold uppercase tracking-wider text-blue-400 truncate">
                      {formatarTituloMateria(area)}
                    </p>
                    <h2 className="font-card text-base sm:text-xl font-extrabold text-white truncate tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {formatarTituloMateria(materiaSelecionada)}
                    </h2>
                  </div>
                </div>

                {/* Botão de Tocar Todas / Reproduzir Sequência */}
                <button
                  type="button"
                  onClick={handleTocarTodas}
                  className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:scale-95 text-white font-card font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/35 transition shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span className="hidden sm:inline">Ouvir matéria completa</span>
                  <span className="sm:hidden">Ouvir todas</span>
                </button>
              </div>

              {/* Sub-barra de busca dentro da matéria: Alta e Responsiva */}
              <div className="max-w-[1200px] mx-auto mt-3 flex items-center justify-between gap-2">
                <div className="relative flex items-center flex-1">
                  <Search className="w-5 h-5 text-blue-400 absolute left-3.5 sm:left-4 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaAulas}
                    onChange={(e) => setBuscaAulas(e.target.value)}
                    placeholder="Buscar aula ou termo..."
                    className="w-full h-12 sm:h-13 min-h-[48px] sm:min-h-[52px] pl-11 sm:pl-12 pr-11 py-3 text-sm sm:text-base font-card font-medium bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] border border-white/12 focus:border-blue-500/60 rounded-2xl text-white placeholder-zinc-400 outline-none shadow-lg backdrop-blur-md transition-all duration-200"
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

                <div className="h-12 sm:h-13 min-h-[48px] sm:min-h-[52px] px-3.5 sm:px-4 rounded-2xl bg-white/[0.05] border border-white/12 flex items-center text-xs sm:text-sm font-card font-semibold text-zinc-300 shrink-0 shadow-md">
                  {aulasDaMateriaAtiva.length} {aulasDaMateriaAtiva.length === 1 ? 'aula' : 'aulas'}
                </div>
              </div>
            </header>

            {/* Lista das Aulas da Matéria */}
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

                    return (
                      <div
                        key={aula.id}
                        className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 backdrop-blur-md ${
                          isAtivo
                            ? 'bg-gradient-to-r from-blue-900/40 via-blue-950/30 to-black/40 border-blue-500/50 shadow-xl shadow-blue-500/20 ring-1 ring-blue-500/30'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4">
                          {/* Botão de Play / Pause */}
                          <button
                            type="button"
                            onClick={() => {
                              haptic.selection();
                              handleTocarAula(aula, aulasDaMateriaAtiva);
                            }}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer ${
                              isAtivo && tocando
                                ? 'bg-blue-600 text-white shadow-blue-600/40'
                                : isAtivo
                                ? 'bg-blue-600/70 text-white border border-blue-400/50'
                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                            }`}
                          >
                            {isAtivo && tocando ? (
                              <Pause className="w-5 h-5 fill-white" />
                            ) : (
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            )}
                          </button>

                          {/* Título e Faixa com font-card */}
                          <button
                            type="button"
                            onClick={() => {
                              haptic.selection();
                              handleTocarAula(aula, aulasDaMateriaAtiva);
                            }}
                            className="min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-card text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300">
                                Faixa {numFaixa}
                              </span>
                              {isAtivo && (
                                <span className="font-card text-[10px] font-bold uppercase tracking-wider text-sky-400 animate-pulse">
                                  {tocando ? 'Reproduzindo' : 'Pausado'}
                                </span>
                              )}
                            </div>
                            <h3
                              className={`font-card text-sm sm:text-base font-bold mt-1 line-clamp-2 transition-colors ${
                                isAtivo ? 'text-sky-300' : 'text-white'
                              }`}
                            >
                              {aula.titulo}
                            </h3>
                          </button>

                          {/* Ações: Download, Favorito e Resumo */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <BotaoDownloadAudio aula={aula} />

                            <button
                              type="button"
                              onClick={() => {
                                haptic.selection();
                                alternarFavorito(aula);
                              }}
                              aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer"
                            >
                              <Heart
                                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                                  isFav ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                                }`}
                              />
                            </button>

                            {aula.descricao && (
                              <button
                                type="button"
                                onClick={() => setAulaExpandidaId(isExp ? null : aula.id)}
                                aria-label="Ver resumo doutrinário"
                                className={`px-3 py-1.5 rounded-xl font-card text-xs font-semibold transition border cursor-pointer ${
                                  isExp
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-white/5 text-zinc-300 hover:text-white border-white/10'
                                }`}
                              >
                                {isExp ? 'Fechar' : 'Resumo'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Resumo doutrinário expandível */}
                        <AnimatePresence>
                          {isExp && aula.descricao && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden border-t border-white/[0.06] bg-black/40 px-4 py-3.5 rounded-b-2xl sm:rounded-b-3xl"
                            >
                              <p className="font-card text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                Síntese e Conteúdo Doutrinário
                              </p>
                              <div className="font-card text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-1">
                                {aula.descricao}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioaulasAreaView;
