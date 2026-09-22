import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Search, X, Sparkles, Check, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { LEIS_CATALOG, type LeiCatalogItem } from '@/data/leisCatalog';
import { fetchArtigosInstant } from '@/services/legislacaoService';
import { haptic } from '@/lib/nativeHaptics';

export interface SelecaoLeiArtigo {
  lei: LeiCatalogItem;
  artigoNumero: string;
  artigoTexto?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (selecao: SelecaoLeiArtigo) => void;
}

const PRINCIPAIS_LEIS = [
  'cf88',
  'cp',
  'cc',
  'clt',
  'cpc',
  'cpp',
  'cdc',
  'ctn',
  'eca',
  'eoab',
];

const ARTIGOS_NOTAVEIS: Record<string, string[]> = {
  cf88: ['1º', '5º', '6º', '37', '60', '133', '144'],
  cp: ['1º', '14', '20', '23', '25', '121', '155', '157', '171'],
  cc: ['1º', '186', '421', '927', '1228', '1511'],
  clt: ['2º', '3º', '7º', '442', '468', '477', '482'],
  cpc: ['1º', '485', '489', '994', '1015'],
  cpp: ['5º', '158', '310', '312', '386'],
  cdc: ['2º', '3º', '6º', '12', '14', '18', '26', '39'],
  ctn: ['3º', '97', '106', '142', '150'],
  eca: ['1º', '4º', '18', '103', '112'],
  eoab: ['1º', '7º', '22', '34'],
};

export default function LeisSelectorModal({ open, onClose, onConfirm }: Props) {
  const [busca, setBusca] = useState('');
  const [leiSelecionada, setLeiSelecionada] = useState<LeiCatalogItem>(() => {
    return LEIS_CATALOG.find((l) => l.id === 'cf88') ?? LEIS_CATALOG[0];
  });
  const [artigoNumero, setArtigoNumero] = useState('5º');
  const [carregandoTexto, setCarregandoTexto] = useState(false);
  const [artigoTexto, setArtigoTexto] = useState<string>('');

  // Filtra as leis para a busca
  const leisFiltradas = useMemo(() => {
    if (!busca.trim()) {
      return LEIS_CATALOG.filter((l) => PRINCIPAIS_LEIS.includes(l.id));
    }
    const q = busca.toLowerCase().trim();
    return LEIS_CATALOG.filter(
      (l) =>
        l.nome.toLowerCase().includes(q) ||
        l.sigla.toLowerCase().includes(q) ||
        l.descricao.toLowerCase().includes(q) ||
        l.tags?.some((t) => t.toLowerCase().includes(q)),
    ).slice(0, 15);
  }, [busca]);

  // Carrega prévia do artigo se disponível
  useEffect(() => {
    if (!leiSelecionada || !artigoNumero) return;
    let cancel = false;
    (async () => {
      setCarregandoTexto(true);
      try {
        const arts = await fetchArtigosInstant(leiSelecionada.tabela_nome, 40);
        if (cancel) return;
        const limpo = artigoNumero.replace(/[^0-9]/g, '');
        const achado = arts.find((a) => {
          const numLimpo = a.numero.replace(/[^0-9]/g, '');
          return numLimpo === limpo;
        });
        if (achado) {
          setArtigoTexto(achado.texto);
        } else {
          setArtigoTexto('');
        }
      } catch {
        if (!cancel) setArtigoTexto('');
      } finally {
        if (!cancel) setCarregandoTexto(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [leiSelecionada, artigoNumero]);

  if (!open) return null;

  const handleConfirmar = () => {
    if (!leiSelecionada || !artigoNumero.trim()) return;
    void haptic.medium();
    onConfirm({
      lei: leiSelecionada,
      artigoNumero: artigoNumero.trim(),
      artigoTexto: artigoTexto || undefined,
    });
  };

  const artigosSugeridos = ARTIGOS_NOTAVEIS[leiSelecionada.id] || ['1º', '2º', '3º', '4º', '5º'];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative z-10 w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 p-5 sm:p-6 shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <Scale className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                  Me Explique de Leis
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecione a lei e o artigo para ouvir o professor explicar
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                void haptic.light();
                onClose();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-4 py-4 pr-1 [scrollbar-width:none]">
            {/* 1. Seleção da Lei */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  1. Escolha a Lei
                </label>
                <span className="text-xs font-bold text-primary">
                  {leiSelecionada.sigla} — {leiSelecionada.nome}
                </span>
              </div>

              {/* Input de Busca de Lei */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Pesquise por nome, sigla ou tema (ex: Código Penal, CLT...)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              {/* Chips de Leis */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-1">
                {leisFiltradas.map((l) => {
                  const ativa = l.id === leiSelecionada.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        void haptic.selection();
                        setLeiSelecionada(l);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        ativa
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800/80'
                      }`}
                    >
                      {ativa && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{l.sigla}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Seleção do Artigo */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  2. Qual Artigo deseja entender?
                </label>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                    Art.
                  </span>
                  <input
                    type="text"
                    value={artigoNumero}
                    onChange={(e) => setArtigoNumero(e.target.value)}
                    placeholder="Ex: 5º, 121, 157, 186..."
                    className="w-full h-11 pl-12 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-base font-semibold text-white placeholder:text-zinc-500 focus:outline-none focus:border-primary/60"
                  />
                </div>
              </div>

              {/* Sugestões de Artigos Notáveis */}
              <div className="space-y-1">
                <span className="text-[11px] text-zinc-500">Artigos mais estudados:</span>
                <div className="flex flex-wrap gap-1.5">
                  {artigosSugeridos.map((art) => (
                    <button
                      key={art}
                      onClick={() => {
                        void haptic.selection();
                        setArtigoNumero(art);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        artigoNumero === art
                          ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                      }`}
                    >
                      Art. {art}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Prévia do Artigo */}
            {(artigoTexto || carregandoTexto) && (
              <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {leiSelecionada.sigla} — Artigo {artigoNumero}
                  </span>
                </div>
                {carregandoTexto ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Carregando redação do artigo…</span>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed italic">
                    "{artigoTexto}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Button */}
          <div className="pt-3 border-t border-zinc-800/80 shrink-0">
            <button
              onClick={handleConfirmar}
              disabled={!artigoNumero.trim()}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-98 disabled:opacity-50 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Explicar Art. {artigoNumero || '...'} da {leiSelecionada.sigla}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
