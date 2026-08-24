import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Image as ImageIcon, Loader2, Download, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { gerarArtigoPDF, type ArtigoPdfModo } from '@/lib/artigoPdf';
import { gerarArtigoImage } from '@/lib/artigoImage';

interface Props {
  open: boolean;
  onClose: () => void;
  artigo: {
    numero: string;
    caput: string;
    incisos?: any[];
    paragrafos?: any[];
  } | null;
  tabelaNome?: string;
  leiLabel?: string;
}

type Formato = 'pdf' | 'imagem';

function normalizeItems(arr?: any[]): string[] {
  if (!arr?.length) return [];
  return arr.map((x) => (typeof x === 'string' ? x : x?.texto)).filter(Boolean);
}

function extrairHistorico(caput: string): { ano: number; texto: string }[] {
  const modRegex = /\(((?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vetad[oa]|Vigência|Regulamento|Renumerado|Transformado|Suprimido|Restabelecido|Produção de efeito)[^)]*)\)/gi;
  const out: { ano: number; texto: string }[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = modRegex.exec(caput)) !== null) {
    const t = m[1].trim();
    if (seen.has(t)) continue;
    seen.add(t);
    const y = t.match(/\b(1\d{3}|20\d{2})\b/);
    out.push({ texto: t, ano: y ? Number(y[1]) : 0 });
  }
  out.sort((a, b) => b.ano - a.ano);
  return out;
}

const BaixarArtigoSheet = ({ open, onClose, artigo, tabelaNome, leiLabel }: Props) => {
  const [formato, setFormato] = useState<Formato>('pdf');
  const [modo, setModo] = useState<ArtigoPdfModo>('lei-seca');
  const [loading, setLoading] = useState(false);

  const displayLeiLabel = useMemo(() => {
    if (leiLabel) return leiLabel;
    if (!tabelaNome) return 'Legislação';
    return tabelaNome
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }, [leiLabel, tabelaNome]);

  const fetchAI = async (tipo: 'explicacao' | 'exemplo'): Promise<string | undefined> => {
    if (!artigo || !tabelaNome) return undefined;
    try {
      // 1) cache
      const { data: cached } = await supabase
        .from('artigo_ai_cache')
        .select('conteudo')
        .eq('tabela_codigo', tabelaNome)
        .eq('numero_artigo', artigo.numero)
        .eq('tipo', tipo)
        .maybeSingle();
      if (cached?.conteudo) return cached.conteudo as string;

      // 2) gerar
      const { data, error } = await supabase.functions.invoke('assistente-juridica', {
        body: { mode: tipo, artigoTexto: artigo.caput, artigoNumero: artigo.numero, leiNome: tabelaNome },
      });
      if (error || !data?.reply) return undefined;
      // salva cache
      supabase
        .from('artigo_ai_cache')
        .upsert(
          { tabela_codigo: tabelaNome, numero_artigo: artigo.numero, tipo, conteudo: data.reply },
          { onConflict: 'tabela_codigo,numero_artigo,tipo' }
        )
        .then(() => {});
      return data.reply as string;
    } catch {
      return undefined;
    }
  };

  const handleBaixar = async () => {
    if (!artigo) return;
    setLoading(true);
    try {
      let explicacao: string | undefined;
      let exemplo: string | undefined;
      const historico = modo === 'completo' ? extrairHistorico(artigo.caput) : undefined;

      if (modo === 'completo') {
        toast.loading('Preparando conteúdo com IA...', { id: 'baixar-artigo' });
        [explicacao, exemplo] = await Promise.all([fetchAI('explicacao'), fetchAI('exemplo')]);
      }

      const input = {
        leiLabel: displayLeiLabel,
        numero: artigo.numero,
        caput: artigo.caput,
        incisos: normalizeItems(artigo.incisos),
        paragrafos: normalizeItems(artigo.paragrafos),
        modo,
        explicacao,
        exemplo,
        historico,
      };

      toast.loading(formato === 'pdf' ? 'Gerando PDF...' : 'Gerando imagem...', { id: 'baixar-artigo' });
      if (formato === 'pdf') await gerarArtigoPDF(input);
      else await gerarArtigoImage(input);

      toast.success(formato === 'pdf' ? 'PDF baixado' : 'Imagem baixada', { id: 'baixar-artigo' });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível gerar o arquivo.', { id: 'baixar-artigo' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="ov"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={loading ? undefined : onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
      />
      <motion.aside
        key="sh"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed bottom-0 left-0 right-0 z-[81] bg-card border-t border-border rounded-t-3xl shadow-2xl flex flex-col pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] max-h-[92vh] mx-auto max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-xl md:rounded-3xl md:border md:border-border"
      >
        <div className="pt-3 pb-2 flex justify-center">
          <span className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-base font-semibold text-foreground">Baixar artigo</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70 disabled:opacity-40"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Formato */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Formato</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormato('pdf')}
                className={`rounded-2xl border p-4 flex flex-col items-start gap-2 transition ${
                  formato === 'pdf'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/40 hover:bg-secondary/60'
                }`}
              >
                <FileText className={`w-6 h-6 ${formato === 'pdf' ? 'text-primary' : 'text-foreground/70'}`} />
                <div className="text-left">
                  <div className="font-semibold text-sm text-foreground">PDF</div>
                  <div className="text-[11px] text-muted-foreground">Documento com capa e marca d'água</div>
                </div>
              </button>
              <button
                onClick={() => setFormato('imagem')}
                className={`rounded-2xl border p-4 flex flex-col items-start gap-2 transition ${
                  formato === 'imagem'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/40 hover:bg-secondary/60'
                }`}
              >
                <ImageIcon className={`w-6 h-6 ${formato === 'imagem' ? 'text-primary' : 'text-foreground/70'}`} />
                <div className="text-left">
                  <div className="font-semibold text-sm text-foreground">Imagem</div>
                  <div className="text-[11px] text-muted-foreground">PNG pronto para compartilhar</div>
                </div>
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Conteúdo</p>
            <div className="space-y-2">
              <button
                onClick={() => setModo('lei-seca')}
                className={`w-full rounded-2xl border p-4 flex items-start gap-3 text-left transition ${
                  modo === 'lei-seca'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/40 hover:bg-secondary/60'
                }`}
              >
                <BookOpen className={`w-5 h-5 mt-0.5 shrink-0 ${modo === 'lei-seca' ? 'text-primary' : 'text-foreground/70'}`} />
                <div>
                  <div className="font-semibold text-sm text-foreground">Lei seca</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Apenas o texto do artigo, sem comentários.</div>
                </div>
              </button>
              <button
                onClick={() => setModo('completo')}
                className={`w-full rounded-2xl border p-4 flex items-start gap-3 text-left transition ${
                  modo === 'completo'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary/40 hover:bg-secondary/60'
                }`}
              >
                <Sparkles className={`w-5 h-5 mt-0.5 shrink-0 ${modo === 'completo' ? 'text-primary' : 'text-foreground/70'}`} />
                <div>
                  <div className="font-semibold text-sm text-foreground">Com explicação e exemplo</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Inclui explicação, exemplo prático e histórico.</div>
                </div>
              </button>
            </div>
          </div>

          <button
            onClick={handleBaixar}
            disabled={loading}
            className="w-full rounded-2xl bg-primary text-primary-foreground font-bold py-4 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Baixar {formato === 'pdf' ? 'PDF' : 'imagem'}
              </>
            )}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>,
    document.body
  );
};

export default BaixarArtigoSheet;
