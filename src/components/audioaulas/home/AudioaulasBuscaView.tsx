import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Play, Pause, Heart, ArrowLeft, Sparkles, BookOpen, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';
import { CapaOtimizada } from './CapaOtimizada';
import { capaDaArea, fmt, normalizar, AUDIOAULAS_CATALOGO_AREAS } from '@/lib/audioaulasHelper';
import { BotaoDownloadAudio } from './BotaoDownloadAudio';
import { haptic } from '@/lib/nativeHaptics';

interface AudioaulasBuscaViewProps {
  aulas: AulaAudio[];
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio, filaCustom?: AulaAudio[]) => void;
  onVoltar: () => void;
}

const SUGESTOES_BUSCA = [
  'Direito Constitucional',
  'Direito Penal',
  'Processo Penal',
  'Controle de Constitucionalidade',
  'CLT',
  'Direito Civil',
  'Prisão Preventiva',
  'Recurso Ordinário',
  'Tributário',
  'Habeas Corpus',
  'Crimes Contra a Vida',
  'Direito Administrativo',
];

export const AudioaulasBuscaView: React.FC<AudioaulasBuscaViewProps> = ({
  aulas,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula,
  onVoltar,
}) => {
  const [termo, setTermo] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Foca o input automaticamente ao abrir
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);
    return () => clearTimeout(t);
  }, []);

  // Filtra as aulas em tempo real
  const resultados = useMemo(() => {
    const q = normalizar(termo);
    if (!q) return [];
    return aulas.filter((a) => {
      const tit = normalizar(a.titulo || '');
      const desc = normalizar(a.descricao || '');
      const area = normalizar(a.area || '');
      const tema = normalizar(a.tema || '');
      return tit.includes(q) || desc.includes(q) || area.includes(q) || tema.includes(q);
    });
  }, [termo, aulas]);

  const handleSelecionarSugestao = (sug: string) => {
    haptic.selection();
    setTermo(sug);
    inputRef.current?.focus();
  };

  return (
    <div
      className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pb-28 text-white"
      style={{
        paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.875rem)',
      }}
    >
      {/* Cabeçalho da Busca com Botão Voltar Padronizado */}
      <div className="flex items-center gap-3.5 mb-6">
        <button
          type="button"
          onClick={() => {
            haptic.light();
            onVoltar();
          }}
          aria-label="Voltar para o início de áudio aulas"
          className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:scale-95 transition touch-manipulation select-none shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 text-white drop-shadow" strokeWidth={2.2} />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
            <span>Pesquisar Áudio Aulas</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 truncate">
            Busque por temas, aulas, matérias ou palavras-chave
          </p>
        </div>
      </div>

      {/* Campo de Pesquisa em Destaque */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-sky-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="O que você quer ouvir agora? Ex: Homicídio, CLT, CF/88..."
          className="w-full h-14 sm:h-16 pl-12 pr-12 text-sm sm:text-base font-medium rounded-2xl sm:rounded-3xl bg-zinc-900/90 border border-white/15 text-white placeholder-zinc-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 shadow-2xl backdrop-blur-md outline-none transition-all"
        />
        {termo && (
          <button
            type="button"
            onClick={() => {
              setTermo('');
              inputRef.current?.focus();
            }}
            aria-label="Limpar pesquisa"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Se não digitou nada ainda: Sugestões e Áreas Populares */}
      {!termo.trim() ? (
        <div className="space-y-6">
          {/* Termos em Alta */}
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Pesquisas em alta</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES_BUSCA.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSelecionarSugestao(sug)}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Áreas do Direito como Atalhos Rápidos */}
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Explorar por Área do Direito</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {AUDIOAULAS_CATALOGO_AREAS.slice(0, 12).map((item) => (
                <button
                  key={item.nome}
                  type="button"
                  onClick={() => handleSelecionarSugestao(item.nome)}
                  className="p-3 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/10 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group shadow-md"
                >
                  <p className="text-xs sm:text-sm font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                    {item.nome}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Toque para buscar</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Resultados da Busca */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-zinc-400 uppercase tracking-wider">
              {resultados.length === 1
                ? '1 aula encontrada'
                : `${resultados.length} aulas encontradas`}
            </span>
          </div>

          {resultados.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 bg-white/[0.02] border border-white/5 rounded-3xl p-8">
              <Search className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Nenhuma aula encontrada para &ldquo;{termo}&rdquo;
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mb-4">
                Tente buscar por termos mais genéricos, como o nome da matéria (Penal, Civil, OAB) ou do tema.
              </p>
              <button
                type="button"
                onClick={() => setTermo('')}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Limpar pesquisa
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {resultados.map((aula, idx) => {
                const isAtivo = aula.id === atualId;
                const isFav = favoritos.has(audioIdOf(aula));
                const capa = capaDaArea(aula.area || '');

                return (
                  <div
                    key={aula.id}
                    className={`rounded-2xl border transition-all duration-300 backdrop-blur-md overflow-hidden ${
                      isAtivo
                        ? 'bg-sky-500/15 border-sky-500/40 shadow-lg shadow-sky-950/50'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                      {/* Botão de Play / Pause */}
                      <button
                        type="button"
                        onClick={() => {
                          haptic.selection();
                          handleTocarAula(aula, resultados);
                        }}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer border ${
                          isAtivo
                            ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/40'
                            : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
                        }`}
                      >
                        {isAtivo && tocando ? (
                          <Pause className="w-5 h-5 fill-white" />
                        ) : (
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        )}
                      </button>

                      {/* Informações da Aula */}
                      <button
                        type="button"
                        onClick={() => {
                          haptic.selection();
                          handleTocarAula(aula, resultados);
                        }}
                        className="min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-[10px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                            {aula.area || 'Geral'}
                          </span>
                          {aula.tema && (
                            <span className="text-[10px] text-zinc-400 font-medium truncate">
                              • {aula.tema}
                            </span>
                          )}
                          {isAtivo && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 animate-pulse ml-auto">
                              {tocando ? 'Tocando' : 'Pausado'}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`font-semibold text-sm sm:text-base leading-snug line-clamp-1 ${
                            isAtivo ? 'text-sky-300' : 'text-white'
                          }`}
                        >
                          {aula.titulo}
                        </h3>

                        {aula.descricao && (
                          <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                            {aula.descricao}
                          </p>
                        )}
                      </button>

                      {/* Ações: Download e Favorito */}
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
