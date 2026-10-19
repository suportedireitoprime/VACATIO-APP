import React, { useState } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { SUMULA_TRIBUNAIS } from '@/services/sumulasService';
import { getLeiCover } from '@/lib/leiTheme';
import { CapaOtimizada } from './CapaOtimizada';

export type ModalTipo = 'codigos' | 'estatutos' | 'sumulas' | 'leis-especiais' | null;

export interface ItemDetalhe {
  id: string;
  nome: string;
  sigla: string;
  descricao: string;
  tipo: 'codigo' | 'estatuto' | 'sumula' | 'lei-especial';
  cover?: string;
  iconColor?: string;
}

interface AudioaulasLegislacaoVerTodosModalProps {
  modalAtivo: ModalTipo;
  onFechar: () => void;
  onSelecionarItem: (item: ItemDetalhe) => void;
  codigos: LeiCatalogItem[];
  estatutos: LeiCatalogItem[];
  leisEspeciais: LeiCatalogItem[];
}

export const AudioaulasLegislacaoVerTodosModal: React.FC<AudioaulasLegislacaoVerTodosModalProps> = ({
  modalAtivo,
  onFechar,
  onSelecionarItem,
  codigos,
  estatutos,
  leisEspeciais,
}) => {
  const [buscaModal, setBuscaModal] = useState('');

  return (
    <AnimatePresence>
      {modalAtivo && (
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
                onClick={onFechar}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0 cursor-pointer"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
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
                        onFechar();
                        onSelecionarItem({
                          id: sum.id,
                          nome: sum.nome,
                          sigla: sum.tribunal,
                          descricao: sum.descricao,
                          tipo: 'sumula',
                          iconColor: sum.iconColor,
                        });
                      }}
                      className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/10 transition text-left group cursor-pointer"
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
                        onFechar();
                        onSelecionarItem({
                          id: l.id,
                          nome: l.nome,
                          sigla: l.sigla,
                          descricao: l.descricao,
                          tipo: l.tipo as 'codigo' | 'estatuto' | 'lei-especial',
                          cover: capa,
                          iconColor: l.iconColor,
                        });
                      }}
                      className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/[0.06] active:bg-white/10 transition text-left group cursor-pointer"
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
  );
};
