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
  ListMusic,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { BotaoDownloadAudio } from '@/components/audioaulas/home/BotaoDownloadAudio';
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
  // Matéria/Categoria selecionada (se null, exibe lista de categorias)
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
    // Ordena por sequência
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
    <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col overflow-hidden">
      {/* ══════════════════════════════════════════════════════════════════
          TELA 1: LISTA DE CATEGORIAS / MATÉRIAS DA ÁREA (SEM A CAPA)
         ══════════════════════════════════════════════════════════════════ */}
      <motion.div
        key="area-materias-view"
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="flex-1 flex flex-col min-h-0 bg-[#07090e] overflow-hidden"
      >
        {/* Topbar elegante e compacto */}
        <header className="shrink-0 px-4 sm:px-6 pt-3 pb-3 border-b border-white/[0.08] bg-[#0c101a]/95 backdrop-blur-md">
          <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  onVoltar();
                }}
                aria-label="Voltar para Audioaulas"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-white transition shrink-0 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Área do Direito
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white truncate tracking-tight">
                  {area}
                </h1>
              </div>
            </div>

            {/* Badges de Contagem */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold text-zinc-300">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                {temas.length} matérias
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-xs font-semibold text-blue-300">
                <Headphones className="w-3.5 h-3.5 text-blue-400" />
                {aulas.length} aulas
              </span>
            </div>
          </div>

          {/* Campo de Busca de Matérias */}
          <div className="max-w-[1200px] mx-auto mt-3">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={buscaMaterias}
                onChange={(e) => setBuscaMaterias(e.target.value)}
                placeholder={`Buscar matéria em ${area}...`}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 rounded-xl text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition"
              />
              {buscaMaterias && (
                <button
                  type="button"
                  onClick={() => setBuscaMaterias('')}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 p-1 text-zinc-400 hover:text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Lista de Matérias / Categorias */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
          <div className="max-w-[1200px] mx-auto space-y-2.5 pb-24">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Selecione uma matéria ({temasFiltrados.length})
              </p>
              <span className="text-xs text-zinc-500">
                Toque para abrir as aulas
              </span>
            </div>

            {temasFiltrados.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-400 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                Nenhuma matéria encontrada com o termo pesquisado.
              </div>
            ) : (
              temasFiltrados.map(([tema, listaAulas], idx) => {
                // Remove prefixos numéricos redundantes se houver para exibir mais limpo
                const numMatch = tema.match(/^(\d+)\.\s*(.*)$/);
                const numeroExibicao = numMatch ? numMatch[1] : String(idx + 1).padStart(2, '0');
                const nomeMateria = numMatch ? numMatch[2] : tema;

                const temTocando = listaAulas.some((a) => a.id === atualId && tocando);

                return (
                  <motion.button
                    key={tema}
                    type="button"
                    whileHover={{ scale: 1.008 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      haptic.selection();
                      setMateriaSelecionada(tema);
                      setBuscaAulas('');
                    }}
                    className={`w-full group flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition text-left ${
                      temTocando
                        ? 'bg-blue-950/40 border-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Badge com número da matéria */}
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 border transition ${
                          temTocando
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                            : 'bg-white/[0.06] text-zinc-300 border-white/10 group-hover:bg-blue-500/20 group-hover:text-blue-300 group-hover:border-blue-500/30'
                        }`}
                      >
                        {temTocando ? (
                          <Volume2 className="w-5 h-5 text-white animate-pulse" />
                        ) : (
                          numeroExibicao
                        )}
                      </div>

                      {/* Informações da Matéria */}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm sm:text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                          {nomeMateria}
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                          <Headphones className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{listaAulas.length} {listaAulas.length === 1 ? 'aula' : 'aulas'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Seta e Tag */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-zinc-400 hidden sm:inline group-hover:text-white transition-colors">
                        Ver aulas
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/15 flex items-center justify-center text-zinc-400 group-hover:text-white transition">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
            className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col overflow-hidden"
          >
            {/* Topbar da Matéria */}
            <header className="shrink-0 px-4 sm:px-6 pt-3 pb-3 border-b border-white/[0.08] bg-[#0c101a]/95 backdrop-blur-md">
              <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setMateriaSelecionada(null);
                    }}
                    aria-label="Voltar para matérias"
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-white transition shrink-0 shadow-sm"
                  >
                    <ArrowLeft className="w-5 h-5" strokeWidth={2.2} />
                  </button>

                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 truncate">
                      {area}
                    </p>
                    <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white truncate tracking-tight">
                      {materiaSelecionada}
                    </h2>
                  </div>
                </div>

                {/* Botão de Tocar Todas / Reproduzir Sequência */}
                <button
                  type="button"
                  onClick={handleTocarTodas}
                  className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition shrink-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span className="hidden sm:inline">Ouvir matéria</span>
                  <span className="sm:hidden">Tocar</span>
                </button>
              </div>

              {/* Sub-barra de busca dentro da matéria */}
              <div className="max-w-[1200px] mx-auto mt-3 flex items-center justify-between gap-2">
                <div className="relative flex items-center flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaAulas}
                    onChange={(e) => setBuscaAulas(e.target.value)}
                    placeholder="Buscar aula ou termo..."
                    className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.08] border border-white/10 rounded-xl text-white placeholder-zinc-500 outline-none focus:border-blue-500/50 transition"
                  />
                  {buscaAulas && (
                    <button
                      type="button"
                      onClick={() => setBuscaAulas('')}
                      aria-label="Limpar busca de aulas"
                      className="absolute right-2.5 p-1 text-zinc-400 hover:text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-zinc-300 shrink-0">
                  {aulasDaMateriaAtiva.length} {aulasDaMateriaAtiva.length === 1 ? 'aula' : 'aulas'}
                </div>
              </div>
            </header>

            {/* Lista das Aulas da Matéria */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain">
              <div className="max-w-[1200px] mx-auto space-y-2 pb-28">
                {aulasDaMateriaAtiva.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
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
                        className={`rounded-2xl border transition-all ${
                          isAtivo
                            ? 'bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-500/10'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3 p-3 sm:p-3.5">
                          {/* Botão de Play / Pause */}
                          <button
                            type="button"
                            onClick={() => {
                              haptic.selection();
                              handleTocarAula(aula, aulasDaMateriaAtiva);
                            }}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
                              isAtivo && tocando
                                ? 'bg-blue-500 text-white shadow-blue-500/40'
                                : isAtivo
                                ? 'bg-blue-600/60 text-white border border-blue-400/50'
                                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                            }`}
                          >
                            {isAtivo && tocando ? (
                              <Pause className="w-5 h-5 fill-white" />
                            ) : (
                              <Play className="w-5 h-5 fill-white ml-0.5" />
                            )}
                          </button>

                          {/* Título e Faixa */}
                          <button
                            type="button"
                            onClick={() => {
                              haptic.selection();
                              handleTocarAula(aula, aulasDaMateriaAtiva);
                            }}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/[0.06] text-blue-300">
                                Faixa {numFaixa}
                              </span>
                              {isAtivo && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 animate-pulse">
                                  {tocando ? 'Reproduzindo' : 'Pausado'}
                                </span>
                              )}
                            </div>
                            <h3
                              className={`text-sm sm:text-base font-bold mt-1 line-clamp-2 transition-colors ${
                                isAtivo ? 'text-blue-300' : 'text-white'
                              }`}
                            >
                              {aula.titulo}
                            </h3>
                          </button>

                          {/* Ações: Download, Favorito e Detalhes */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <BotaoDownloadAudio aula={aula} />

                            <button
                              type="button"
                              onClick={() => {
                                haptic.selection();
                                alternarFavorito(aula);
                              }}
                              aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
                              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-90"
                            >
                              <Heart
                                className={`w-4 h-4 ${
                                  isFav ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                                }`}
                              />
                            </button>

                            {aula.descricao && (
                              <button
                                type="button"
                                onClick={() => setAulaExpandidaId(isExp ? null : aula.id)}
                                aria-label="Ver resumo doutrinário"
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                                  isExp
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-white/5 text-zinc-400 hover:text-white border-white/10'
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
                              className="overflow-hidden border-t border-white/[0.06] bg-black/30 px-4 py-3"
                            >
                              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5" />
                                Síntese e Conteúdo Doutrinário
                              </p>
                              <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-1">
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
