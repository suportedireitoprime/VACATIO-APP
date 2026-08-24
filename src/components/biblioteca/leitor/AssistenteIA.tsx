import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpenText, FileText, MessageCircle } from 'lucide-react';
import type { Tema } from '@/hooks/useLeitorPrefs';
import AbaTermos from './AbaTermos';
import AbaResumo from './AbaResumo';
import AbaChatPagina from './AbaChatPagina';

interface Props {
  open: boolean;
  onClose: () => void;
  paginaMd: string;
  livroTitulo: string;
  capituloTitulo: string;
  paginaNum: number;
  livroId: string;
  tema: Tema;
  fonteFamily: string;
}

type Aba = 'termos' | 'resumo' | 'chat';

const TABS: Array<{ id: Aba; label: string; icon: typeof BookOpenText }> = [
  { id: 'termos', label: 'Termos', icon: BookOpenText },
  { id: 'resumo', label: 'Resumo', icon: FileText },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

export default function AssistenteIA({
  open,
  onClose,
  paginaMd,
  livroTitulo,
  capituloTitulo,
  paginaNum,
  livroId,
  tema,
  fonteFamily,
}: Props) {
  const [aba, setAba] = useState<Aba>('termos');
  const dark = tema.isDark;

  // Trava scroll do body quando aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const cacheKeyTermos = useMemo(() => `ia-termos:${livroId}:${paginaNum}`, [livroId, paginaNum]);
  const cacheKeyResumo = useMemo(() => `ia-resumo:${livroId}:${paginaNum}`, [livroId, paginaNum]);
  const chaveContexto = useMemo(() => `ia-chat:${livroId}:${paginaNum}`, [livroId, paginaNum]);

  const conteudo = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[1400] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[1401] flex flex-col rounded-t-3xl shadow-2xl overflow-hidden"
            style={{
              background: tema.bg,
              color: tema.text,
              height: '88dvh',
              maxHeight: '88dvh',
              borderTop: `1px solid ${tema.border}`,
            }}
          >
            {/* Handle */}
            <div className="pt-2 pb-1 flex justify-center shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }}
              />
            </div>

            {/* Header */}
            <div
              className="px-4 pt-2 pb-3 flex items-start gap-3 shrink-0 border-b"
              style={{ borderColor: tema.border }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.15em] opacity-60">
                  Assistente de leitura
                </p>
                <h2 className="text-[15px] font-semibold truncate mt-0.5" style={{ fontFamily: fonteFamily }}>
                  {capituloTitulo}
                </h2>
                <p className="text-[11px] opacity-60 mt-0.5">Página {paginaNum}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition"
                style={{
                  background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: tema.text,
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs (segmented control) */}
            <div className="px-4 pt-3 pb-2 shrink-0">
              <div
                className="flex p-1 rounded-full"
                style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
              >
                {TABS.map((t) => {
                  const ativo = aba === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setAba(t.id)}
                      className="relative flex-1 h-9 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      style={{
                        color: ativo ? 'hsl(var(--primary-foreground))' : tema.text,
                        opacity: ativo ? 1 : 0.75,
                      }}
                    >
                      {ativo && (
                        <motion.div
                          layoutId="assistente-tab-pill"
                          className="absolute inset-0 rounded-full"
                          style={{ background: 'hsl(var(--primary))' }}
                          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo da aba */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {aba === 'termos' && (
                <div className="h-full overflow-y-auto">
                  <AbaTermos
                    paginaMd={paginaMd}
                    livroTitulo={livroTitulo}
                    capituloTitulo={capituloTitulo}
                    paginaNum={paginaNum}
                    cacheKey={cacheKeyTermos}
                    tema={tema}
                  />
                </div>
              )}
              {aba === 'resumo' && (
                <div className="h-full overflow-y-auto">
                  <AbaResumo
                    paginaMd={paginaMd}
                    livroTitulo={livroTitulo}
                    capituloTitulo={capituloTitulo}
                    paginaNum={paginaNum}
                    cacheKey={cacheKeyResumo}
                    tema={tema}
                    fonteFamily={fonteFamily}
                  />
                </div>
              )}
              {aba === 'chat' && (
                <AbaChatPagina
                  paginaMd={paginaMd}
                  livroTitulo={livroTitulo}
                  capituloTitulo={capituloTitulo}
                  paginaNum={paginaNum}
                  chaveContexto={chaveContexto}
                  tema={tema}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document === 'undefined' ? conteudo : createPortal(conteudo, document.body);
}
