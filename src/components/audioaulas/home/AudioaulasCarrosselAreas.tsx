import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Headphones, ChevronRight, ChevronLeft, Layers, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { capaDaArea } from '@/lib/audioaulasHelper';
import { CapaOtimizada } from './CapaOtimizada';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/nativeHaptics';

interface AudioaulasCarrosselAreasProps {
  areas: [string, number][];
}

export const AudioaulasCarrosselAreas = React.memo(function AudioaulasCarrosselAreas({
  areas
}: AudioaulasCarrosselAreasProps) {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [termoBuscaModal, setTermoBuscaModal] = useState('');

  const scroll = (direcao: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = direcao === 'left' ? -350 : 350;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const areasFiltradasModal = areas.filter(([nome]) =>
    nome.toLowerCase().includes(termoBuscaModal.toLowerCase().trim())
  );

  if (areas.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 space-y-8 mt-4 lg:px-10 2xl:max-w-[1600px]">
        <div className="rounded-2xl bg-white/[0.04] p-10 text-center border border-white/10">
          <Headphones className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma audioaula publicada ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 space-y-4 mt-2 lg:px-10 2xl:max-w-[1600px]">
      <section className="relative">
        {/* Cabeçalho: Risquinho vermelho antes do título à esquerda, Botão 'Ver todos' à direita */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2.5">
              <span className="w-1.5 h-6 rounded-full bg-primary shrink-0 shadow-sm shadow-primary/50" />
              <span>Áreas do Direito</span>
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-zinc-400 line-clamp-1">
              Aulas completas em áudio organizadas por área temática.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setModalAberto(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 shrink-0 shadow-sm"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Setas de rolagem para desktop */}
        <div className="hidden lg:flex items-center gap-2 absolute right-0 -top-12">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Rolar para a esquerda"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Rolar para a direita"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Carrossel Horizontal de Cards de Áreas */}
        <div
          ref={carouselRef}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-3 pt-1 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0"
        >
          {areas.map(([nome, total]) => {
            const nomeFormatado = nome.replace(/^Direitos?\s+(do\s+|da\s+|de\s+)?/i, '').trim();

            return (
              <motion.button
                key={nome}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  haptic.selection();
                  navigate(`/audioaulas/${encodeURIComponent(nome)}`);
                }}
                className="group relative w-[170px] sm:w-[200px] md:w-[220px] shrink-0 aspect-square rounded-2xl overflow-hidden text-left transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 border border-white/10 focus-visible:outline-none snap-start bg-zinc-900"
              >
                <CapaOtimizada
                  src={capaDaArea(nome)}
                  alt={nome}
                  animacaoEntrada
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-110 object-cover"
                />
                {/* Gradiente escuro no rodapé para máxima legibilidade do título */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
                <div className="absolute inset-0 p-3 sm:p-3.5 flex flex-col justify-between">
                  <span className="self-start h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-black/40">
                    <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="flex items-end justify-between gap-1.5">
                    <div className="min-w-0 pr-1">
                      {/* Tipografia maior, marcante e legível sem ocupar espaço excessivo */}
                      <p className="font-black leading-tight text-white text-base sm:text-lg md:text-xl line-clamp-2 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                        {nomeFormatado}
                      </p>
                      <p className="text-xs text-zinc-300 mt-1 font-semibold drop-shadow-sm">
                        {total} aulas
                      </p>
                    </div>
                    <span className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-full bg-white/20 text-white backdrop-blur group-hover:bg-primary group-hover:text-primary-foreground transition shadow-md">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Sheet Fullscreen "Ver todos" — Abre de baixo para cima cobrindo a tela toda por cima do rodapé */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {modalAberto && (
              <>
                {/* Backdrop escurecido cobrindo toda a janela */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setModalAberto(false)}
                  className="fixed inset-0 z-[1400] bg-black/85 backdrop-blur-md"
                />

                {/* Painel que sobe de baixo para cima cobrindo a tela toda */}
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

                  {/* Header do Drawer */}
                  <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                        <Layers className="w-5 h-5" />
                      </span>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-primary" />
                          <span>Todas as Áreas do Direito</span>
                        </h3>
                        <p className="text-xs text-zinc-400">{areas.length} áreas catalogadas</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalAberto(false)}
                      className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0"
                      aria-label="Fechar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Campo de Busca Rápida */}
                  <div className="p-3.5 sm:p-4 border-b border-white/5 bg-zinc-900/40">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={termoBuscaModal}
                        onChange={(e) => setTermoBuscaModal(e.target.value)}
                        placeholder="Filtrar áreas do Direito..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50"
                      />
                      {termoBuscaModal && (
                        <button
                          type="button"
                          onClick={() => setTermoBuscaModal('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista com a Capa no Lado Esquerdo e as Áreas */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-white/[0.06] space-y-1 pb-[calc(2.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
                    {areasFiltradasModal.length === 0 ? (
                      <div className="py-16 text-center text-zinc-500 text-sm">
                        Nenhuma área encontrada para "{termoBuscaModal}".
                      </div>
                    ) : (
                      areasFiltradasModal.map(([nome, total]) => {
                        const nomeFormatado = nome.replace(/^Direitos?\s+(do\s+|da\s+|de\s+)?/i, '').trim();
                        return (
                          <button
                            key={nome}
                            type="button"
                            onClick={() => {
                              haptic.selection();
                              setModalAberto(false);
                              navigate(`/audioaulas/${encodeURIComponent(nome)}`);
                            }}
                            className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/10 transition text-left group"
                          >
                            {/* Capa do lado esquerdo */}
                            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-md bg-zinc-950">
                              <CapaOtimizada
                                src={capaDaArea(nome)}
                                alt={nome}
                                animacaoEntrada={false}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <span className="absolute bottom-1 right-1 h-5 w-5 rounded-md bg-black/70 backdrop-blur grid place-items-center text-primary">
                                <Headphones className="w-3 h-3" />
                              </span>
                            </div>

                            {/* Informações da área */}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors">
                                {nomeFormatado}
                              </h4>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                {nome}
                              </p>
                              <span className="inline-block mt-1 text-[11px] font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                                {total} aulas
                              </span>
                            </div>

                            {/* Chevron à direita */}
                            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
});

export default AudioaulasCarrosselAreas;
