import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Headphones, Sparkles, Volume2, BookOpen, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type AulaAudio } from '@/contexts/AudioaulasPlayerContext';
import { CapaOtimizada } from './CapaOtimizada';
import { LinhaAula } from './AudioaulasListaAulas';
import { type ItemDetalhe } from './AudioaulasLegislacaoVerTodosModal';

interface AudioaulasLegislacaoDrawerDetalhesProps {
  itemSelecionado: ItemDetalhe | null;
  onFechar: () => void;
  aulasDoItem: AulaAudio[];
  atualId: string | number | null;
  tocando: boolean;
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  handleTocarAula: (a: AulaAudio) => void;
}

export const AudioaulasLegislacaoDrawerDetalhes: React.FC<AudioaulasLegislacaoDrawerDetalhesProps> = ({
  itemSelecionado,
  onFechar,
  aulasDoItem,
  atualId,
  tocando,
  favoritos,
  alternarFavorito,
  handleTocarAula,
}) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {itemSelecionado && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
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
                onClick={onFechar}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0 cursor-pointer"
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
                    onFechar();
                    navigate(`/audio-leis`);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-white transition active:scale-[0.99] group shadow-sm cursor-pointer"
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
                    onFechar();
                    navigate(`/legislacao/${itemSelecionado.id}`);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white transition active:scale-[0.99] group shadow-sm cursor-pointer"
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
  );
};
