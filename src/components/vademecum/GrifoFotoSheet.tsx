import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { takePhoto } from '@/lib/nativeCamera';
import { haptic } from '@/lib/nativeHaptics';

interface Highlight { frase: string; categoria: string; }
interface Props { open: boolean; onClose: () => void; }

const CAT_COLORS: Record<string, string> = {
  definicao: 'bg-blue-500/25 text-blue-100 border-blue-400/40',
  prazo:     'bg-amber-500/25 text-amber-100 border-amber-400/40',
  regra:     'bg-emerald-500/25 text-emerald-100 border-emerald-400/40',
  excecao:   'bg-purple-500/25 text-purple-100 border-purple-400/40',
  penalidade:'bg-red-500/25 text-red-100 border-red-400/40',
};
const CAT_LABEL: Record<string, string> = {
  definicao: 'Definição', prazo: 'Prazo', regra: 'Regra',
  excecao: 'Exceção', penalidade: 'Penalidade',
};

function renderHighlighted(texto: string, highlights: Highlight[]) {
  if (!texto) return null;
  // Ordena por comprimento decrescente pra evitar sobreposição
  const sorted = [...highlights].sort((a, b) => (b.frase?.length ?? 0) - (a.frase?.length ?? 0));
  let parts: Array<{ text: string; cat?: string }> = [{ text: texto }];
  for (const h of sorted) {
    if (!h.frase) continue;
    const next: typeof parts = [];
    for (const p of parts) {
      if (p.cat) { next.push(p); continue; }
      const idx = p.text.toLowerCase().indexOf(h.frase.toLowerCase());
      if (idx < 0) { next.push(p); continue; }
      if (idx > 0) next.push({ text: p.text.slice(0, idx) });
      next.push({ text: p.text.slice(idx, idx + h.frase.length), cat: h.categoria });
      if (idx + h.frase.length < p.text.length) next.push({ text: p.text.slice(idx + h.frase.length) });
    }
    parts = next;
  }
  return parts.map((p, i) =>
    p.cat ? (
      <mark key={i} className={`px-1 py-0.5 rounded-md border ${CAT_COLORS[p.cat] ?? 'bg-amber-500/25 text-amber-100 border-amber-400/40'}`}>
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    )
  );
}

export default function GrifoFotoSheet({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [texto, setTexto] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const start = async (source: 'camera' | 'photos') => {
    setError(null);
    const photo = await takePhoto({ source, quality: 70 });
    if (!photo.ok || !photo.base64) {
      if (photo.reason && photo.reason !== 'User cancelled photos app') setError('Não foi possível abrir a câmera.');
      return;
    }
    setPreview(photo.dataUrl ?? null);
    setLoading(true);
    setTexto(''); setHighlights([]);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('grifo-foto', {
        body: { imageBase64: photo.base64, mimeType: `image/${photo.format ?? 'jpeg'}` },
      });
      if (fnErr) throw fnErr;
      setTexto(data?.texto ?? '');
      setHighlights(Array.isArray(data?.highlights) ? data.highlights : []);
      haptic.success();
    } catch (e: any) {
      console.error(e);
      setError('Não consegui ler a imagem. Tente uma foto mais nítida.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setTexto(''); setHighlights([]); setPreview(null); setError(null); };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[62]" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[63] bg-card rounded-t-[2rem] border-t border-border/50 flex flex-col shadow-2xl md:max-w-lg md:mx-auto"
            style={{ maxHeight: '88vh' }}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20 mx-auto mt-3 mb-1" />
            <div className="px-6 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground font-display">Grifar de foto</h3>
                <p className="text-[11px] text-muted-foreground">IA lê o texto e destaca o que importa</p>
              </div>
              <button onClick={() => { reset(); onClose(); }} className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-4">
              {!preview && !loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-amber-400" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Fotografe uma lei impressa, um artigo, uma súmula ou um trecho de livro. A IA vai extrair o texto e destacar as partes-chave.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => start('camera')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 text-amber-950 font-semibold text-sm hover:bg-amber-300 transition-colors">
                      <Camera className="w-4 h-4" /> Tirar foto
                    </button>
                    <button onClick={() => start('photos')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors">
                      Galeria
                    </button>
                  </div>
                </div>
              )}

              {preview && (
                <img src={preview} alt="foto" className="w-full max-h-56 object-contain rounded-xl border border-border" />
              )}

              {loading && (
                <div className="flex items-center gap-2 justify-center py-6 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo e grifando…
                </div>
              )}

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              {texto && !loading && (
                <>
                  <div className="rounded-xl bg-secondary/30 border border-border p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {renderHighlighted(texto, highlights)}
                  </div>
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(highlights.map(h => h.categoria))).map(c => (
                        <span key={c} className={`text-[10px] px-2 py-0.5 rounded-full border ${CAT_COLORS[c] ?? ''}`}>
                          {CAT_LABEL[c] ?? c}
                        </span>
                      ))}
                    </div>
                  )}
                  <button onClick={reset} className="w-full py-2.5 rounded-xl bg-secondary text-sm font-semibold text-foreground">
                    Nova foto
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
