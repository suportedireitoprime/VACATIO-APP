import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Download, Trash2, CheckCircle2, Play, Volume2, Sparkles } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  fetchNarracoesDisponiveis,
  getDownloadedAudioIds,
  downloadAudio,
  removeAudio,
  type NarracaoRow,
} from '@/services/audioDownloadService';

interface Props {
  open: boolean;
  onClose: () => void;
  tabelaNome: string;
  leiNome: string;
}

export default function GerenciarAudiosLeiSheet({ open, onClose, tabelaNome, leiNome }: Props) {
  const [rows, setRows] = useState<NarracaoRow[]>([]);
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, number>>({}); // artigoNumero → progress 0..100
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [server, downloadedSet] = await Promise.all([
        fetchNarracoesDisponiveis(tabelaNome),
        getDownloadedAudioIds(tabelaNome),
      ]);
      setRows(server);
      setDownloaded(downloadedSet);
      setLoading(false);
    })();
  }, [open, tabelaNome]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.artigo_numero.toLowerCase().includes(q) ||
      (r.titulo_artigo || '').toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const handleDownload = async (row: NarracaoRow) => {
    setBusy(b => ({ ...b, [row.artigo_numero]: 5 }));
    const ok = await downloadAudio(row, pct =>
      setBusy(b => ({ ...b, [row.artigo_numero]: pct }))
    );
    setBusy(b => {
      const n = { ...b };
      delete n[row.artigo_numero];
      return n;
    });
    if (ok) {
      setDownloaded(s => new Set(s).add(row.artigo_numero));
      toast.success(`Art. ${row.artigo_numero} disponível offline`);
    } else {
      toast.error('Falha ao baixar áudio');
    }
  };

  const handleRemove = async (row: NarracaoRow) => {
    await removeAudio(tabelaNome, row.artigo_numero);
    setDownloaded(s => {
      const n = new Set(s);
      n.delete(row.artigo_numero);
      return n;
    });
  };

  const handleDownloadAll = async () => {
    const missing = filtered.filter(r => !downloaded.has(r.artigo_numero));
    if (!missing.length) return toast.info('Todos já estão baixados');
    toast.info(`Baixando ${missing.length} áudios em segundo plano…`);
    for (const r of missing) {
       
      await handleDownload(r);
    }
    toast.success('Downloads concluídos');
  };

  return (
    <Sheet open={open} onOpenChange={o => !o && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 max-w-lg mx-auto flex flex-col">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Áudios · offline</p>
              <h2 className="font-display text-lg font-bold text-foreground truncate">{leiNome}</h2>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar artigo…"
            className="w-full h-9 px-3 rounded-lg bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 px-6">
              <Volume2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum áudio disponível ainda.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Gere narrações abrindo um artigo e tocando em "Narrar".
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map(r => {
                const isDown = downloaded.has(r.artigo_numero);
                const pct = busy[r.artigo_numero];
                const active = pct !== undefined;
                return (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 text-primary" fill="currentColor" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">Art. {r.artigo_numero}</p>
                      {r.titulo_artigo && (
                        <p className="text-[11px] text-muted-foreground truncate">{r.titulo_artigo}</p>
                      )}
                      {active && <Progress value={pct} className="h-1 mt-1" />}
                    </div>
                    {active ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : isDown ? (
                      <button
                        onClick={() => handleRemove(r)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-emerald-500 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Remover"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownload(r)}
                        className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary"
                        aria-label="Baixar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border/60 bg-background/95 backdrop-blur">
            <button
              onClick={handleDownloadAll}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Sparkles className="w-4 h-4" />
              Baixar todos ({filtered.filter(r => !downloaded.has(r.artigo_numero)).length})
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
