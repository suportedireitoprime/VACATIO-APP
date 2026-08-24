import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, ImageIcon, History, ArrowRight, ChevronLeft, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface CitacaoIdentificada {
  numero_artigo: string | null;
  titulo: string;
  trecho: string;
  confianca?: 'alta' | 'media' | 'baixa';
}

interface HistoryEntry {
  id: string;
  createdAt: number;
  thumbnail: string;
  citacoes: CitacaoIdentificada[];
}

interface OcrScannerProps {
  open: boolean;
  onClose: () => void;
  leiNome?: string;
  leiSlug?: string;
  onArtigoSelect?: (numero: string) => void;
}

const historyKey = (slug?: string) => `ocr_scan_history_${slug || 'geral'}`;

const readImageAsBase64 = (file: File): Promise<{ data: string; mime: string; thumb: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const b64 = dataUrl.split(',')[1];
      resolve({ data: b64, mime: file.type || 'image/jpeg', thumb: dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const OcrScanner = ({ open, onClose, leiNome, leiSlug, onArtigoSelect }: OcrScannerProps) => {
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<'scan' | 'history'>('scan');
  const [result, setResult] = useState<{ citacoes: CitacaoIdentificada[]; thumb: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(historyKey(leiSlug));
      setHistory(raw ? JSON.parse(raw) : []);
    } catch { setHistory([]); }
    setResult(null);
    setTab('scan');
  }, [open, leiSlug]);

  const saveHistory = (entry: HistoryEntry) => {
    const next = [entry, ...history].slice(0, 20);
    setHistory(next);
    try { localStorage.setItem(historyKey(leiSlug), JSON.stringify(next)); } catch {}
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(historyKey(leiSlug)); } catch {}
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    setProcessing(true);
    try {
      const { data: b64, mime, thumb } = await readImageAsBase64(file);
      const { data, error } = await supabase.functions.invoke('identificar-artigos-foto', {
        body: { imageBase64: b64, mimeType: mime, leiNome },
      });
      if (error) throw error;
      const citacoes: CitacaoIdentificada[] = Array.isArray(data?.citacoes) ? data.citacoes : [];
      if (citacoes.length === 0) {
        toast.error('Nenhuma citação de artigo identificada na imagem');
      } else {
        toast.success(`${citacoes.length} citaç${citacoes.length === 1 ? 'ão identificada' : 'ões identificadas'}`);
      }
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        createdAt: Date.now(),
        thumbnail: thumb,
        citacoes,
      };
      setResult({ citacoes, thumb });
      if (citacoes.length > 0) saveHistory(entry);
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao analisar a imagem');
    } finally {
      setProcessing(false);
    }
  }, [leiNome, history, leiSlug]);

  const handleArtigoClick = (numero: string | null) => {
    if (!numero) return;
    const clean = String(numero).replace(/[^\d]/g, '');
    if (!clean) return;
    onArtigoSelect?.(clean);
    onClose();
  };

  if (!open) return null;

  const description = leiNome
    ? `Envie uma foto ou arquivo de uma página que cite artigos de ${leiNome}. A IA vai fazer OCR e identificar cada artigo mencionado, mesmo sem o número explícito.`
    : 'Envie uma foto ou arquivo de uma página com citações de artigos. A IA vai fazer OCR e identificar cada artigo mencionado.';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] pt-[var(--sai-top,env(safe-area-inset-top,0px))]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border/60 shrink-0">
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-base font-bold truncate">Scanner de artigos</h2>
            {leiNome && <p className="text-[11px] text-muted-foreground truncate">{leiNome}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 px-4 pt-3 shrink-0">
          <button
            onClick={() => setTab('scan')}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
              tab === 'scan' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}
          >
            <ScanLine className="w-4 h-4" /> Escanear
          </button>
          <button
            onClick={() => setTab('history')}
            className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition ${
              tab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}
          >
            <History className="w-4 h-4" /> Recentes
            {history.length > 0 && (
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${tab === 'history' ? 'bg-primary-foreground/20' : 'bg-primary/15 text-primary'}`}>{history.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === 'scan' && (
            <>
              {!result && !processing && (
                <div className="max-w-md mx-auto">
                  <div className="rounded-2xl border-2 border-dashed border-border p-6 flex flex-col items-center text-center bg-secondary/30">
                    <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-3">
                      <ScanLine className="w-7 h-7 text-primary" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-display text-lg font-bold mb-2">Envie uma foto ou arquivo</h3>
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">{description}</p>

                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }}
                    />
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }}
                    />

                    <div className="w-full flex flex-col gap-2.5">
                      <button
                        onClick={() => cameraRef.current?.click()}
                        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
                      >
                        <Camera className="w-5 h-5" /> Tirar foto
                      </button>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="w-full h-12 rounded-xl bg-secondary text-foreground font-semibold flex items-center justify-center gap-2 border border-border active:scale-[0.98] transition"
                      >
                        <ImageIcon className="w-5 h-5" /> Enviar arquivo
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center mt-4">
                    Dica: enquadre bem a página, com boa iluminação, para melhor precisão.
                  </p>
                </div>
              )}

              {processing && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analisando imagem e identificando artigos…</p>
                </div>
              )}

              {result && !processing && (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex gap-3 items-start">
                    <img src={result.thumb} alt="Imagem enviada" className="w-20 h-20 rounded-xl object-cover border border-border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Foram encontradas</p>
                      <p className="font-display text-lg font-bold">
                        {result.citacoes.length} {result.citacoes.length === 1 ? 'citação' : 'citações'}
                      </p>
                      <button
                        onClick={() => setResult(null)}
                        className="text-[12px] text-primary font-semibold mt-1"
                      >
                        Escanear outra imagem
                      </button>
                    </div>
                  </div>

                  <CitacoesList citacoes={result.citacoes} onArtigoClick={handleArtigoClick} />
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <div className="max-w-md mx-auto space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  Nenhum scan recente ainda.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Últimos scans</p>
                    <button onClick={clearHistory} className="text-[11px] text-destructive font-semibold">Limpar</button>
                  </div>
                  {history.map((h) => (
                    <div key={h.id} className="rounded-2xl bg-secondary/50 border border-border overflow-hidden">
                      <div className="flex gap-3 p-3">
                        <img src={h.thumbnail} alt="Scan" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(h.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="font-display text-sm font-bold">
                            {h.citacoes.length} {h.citacoes.length === 1 ? 'citação' : 'citações'}
                          </p>
                        </div>
                      </div>
                      <div className="px-3 pb-3">
                        <CitacoesList citacoes={h.citacoes} onArtigoClick={handleArtigoClick} compact />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

const CitacoesList = ({
  citacoes,
  onArtigoClick,
  compact = false,
}: {
  citacoes: CitacaoIdentificada[];
  onArtigoClick: (numero: string | null) => void;
  compact?: boolean;
}) => {
  if (citacoes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma citação.</p>;
  }
  return (
    <div className={`space-y-2 ${compact ? '' : ''}`}>
      {citacoes.map((c, i) => {
        const hasNumero = !!c.numero_artigo;
        return (
          <button
            key={i}
            onClick={() => hasNumero && onArtigoClick(c.numero_artigo)}
            disabled={!hasNumero}
            className={`w-full text-left rounded-xl p-3 border transition flex gap-3 items-start ${
              hasNumero
                ? 'bg-card border-border hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99]'
                : 'bg-card/50 border-border/50 cursor-default'
            }`}
          >
            <div className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center ${hasNumero ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
              {hasNumero ? (
                <>
                  <span className="text-[9px] font-bold uppercase tracking-wider">Art.</span>
                  <span className="font-display font-bold text-base leading-none">{c.numero_artigo}</span>
                </>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">Sem<br/>número</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-[13px] font-bold text-foreground line-clamp-1">{c.titulo || 'Trecho'}</p>
              <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{c.trecho}</p>
              {c.confianca && c.confianca !== 'alta' && (
                <span className="inline-block mt-1 text-[9px] uppercase tracking-wider text-muted-foreground bg-secondary rounded px-1.5 py-0.5">
                  Confiança {c.confianca}
                </span>
              )}
            </div>
            {hasNumero && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />}
          </button>
        );
      })}
    </div>
  );
};

export default OcrScanner;
