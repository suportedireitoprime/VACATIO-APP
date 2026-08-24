import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RotateCw, ChevronLeft, ChevronRight, Download, ImageDown, FileDown,
  Check, Share2, MessageCircle, Send as SendIcon, Copy, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { pdf, Document, Page, Text as PdfText, Image as PdfImage, View, StyleSheet } from '@react-pdf/renderer';

/* ────────────────────────────────────────────────────────── */
/*  FLIP FLASHCARDS                                           */
/* ────────────────────────────────────────────────────────── */
export interface Flashcard { frente: string; verso: string }

export const FlipFlashcards = ({ cards, onClose }: { cards: Flashcard[]; onClose: () => void }) => {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const total = cards.length;
  const card = cards[i];

  const go = (delta: number) => {
    setFlipped(false);
    setTimeout(() => setI(v => Math.min(Math.max(0, v + delta), total - 1)), 120);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center px-5"
      onClick={onClose}
    >
      <div className="w-full max-w-md flex items-center justify-between mb-4" onClick={e => e.stopPropagation()}>
        <p className="text-white/80 text-sm font-body">
          <span className="font-bold text-accent">{i + 1}</span> / {total}
        </p>
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-md" style={{ perspective: '1200px' }} onClick={e => e.stopPropagation()}>
        <motion.div
          className="relative w-full aspect-[3/4] cursor-pointer"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
          onClick={() => setFlipped(f => !f)}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-card via-card to-secondary border-2 border-accent/40 p-6 flex flex-col shadow-2xl"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-accent">Frente</span>
              <Sparkles className="w-4 h-4 text-accent/60" />
            </div>
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="font-display text-xl leading-snug text-foreground">{card.frente}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
              <RotateCw className="w-3.5 h-3.5" /> Toque para virar
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/95 to-primary/90 p-6 flex flex-col shadow-2xl"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-accent-foreground/80">Verso</span>
              <Check className="w-4 h-4 text-accent-foreground/80" />
            </div>
            <div className="flex-1 overflow-y-auto text-left">
              <p className="font-body text-[15px] leading-relaxed text-accent-foreground">{card.verso}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-accent-foreground/70 pt-3 border-t border-accent-foreground/20">
              <RotateCw className="w-3.5 h-3.5" /> Toque para voltar
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => go(-1)}
            disabled={i === 0}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center disabled:opacity-30 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex gap-1.5">
            {cards.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-accent' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>
          <button
            onClick={() => go(1)}
            disabled={i === total - 1}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center disabled:opacity-30 active:scale-95"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  QUESTÕES (bottom sheet 80vh)                              */
/* ────────────────────────────────────────────────────────── */
export interface Questao { enunciado: string; alternativas: string[]; correta: number; comentario?: string }

export const QuestoesRunner = ({ questoes, onClose }: { questoes: Questao[]; onClose: () => void }) => {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [reveal, setReveal] = useState<Record<number, boolean>>({});
  const q = questoes[i];
  const answered = picked[i] != null;
  const shown = reveal[i];

  const score = useMemo(
    () => Object.entries(picked).filter(([k, v]) => Number(v) === questoes[Number(k)]?.correta).length,
    [picked, questoes]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full h-[80vh] bg-card rounded-t-3xl flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Questões</h3>
            <p className="text-xs text-muted-foreground">
              {i + 1} de {questoes.length} · Acertos: <span className="text-accent font-bold">{score}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-5 pb-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent"
              animate={{ width: `${((i + 1) / questoes.length) * 100}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <p className="font-body text-[15px] leading-relaxed text-foreground mb-4 font-semibold">
                {i + 1}. {q.enunciado}
              </p>
              <div className="space-y-2">
                {q.alternativas.map((alt, idx) => {
                  const isPicked = picked[i] === idx;
                  const isCorrect = idx === q.correta;
                  const showResult = shown && (isPicked || isCorrect);
                  return (
                    <button
                      key={idx}
                      disabled={answered}
                      onClick={() => { setPicked(p => ({ ...p, [i]: idx })); setTimeout(() => setReveal(r => ({ ...r, [i]: true })), 250); }}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 font-body text-[14px] transition-all ${
                        showResult && isCorrect
                          ? 'bg-emerald-500/15 border-emerald-500 text-foreground'
                          : showResult && isPicked && !isCorrect
                          ? 'bg-red-500/15 border-red-500 text-foreground'
                          : isPicked
                          ? 'bg-accent/15 border-accent text-foreground'
                          : 'bg-secondary border-border text-foreground active:scale-[0.99]'
                      }`}
                    >
                      <span className="font-bold mr-2">{String.fromCharCode(65 + idx)})</span>
                      {alt.replace(/^[A-D]\)\s*/, '')}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {shown && q.comentario && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-2xl bg-accent/10 border border-accent/30"
                  >
                    <p className="text-xs uppercase font-bold text-accent mb-1.5">Comentário</p>
                    <p className="font-body text-sm text-foreground leading-relaxed">{q.comentario}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="px-5 pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] pt-3 border-t border-border flex items-center gap-3">
          <button
            onClick={() => setI(v => Math.max(0, v - 1))}
            disabled={i === 0}
            className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-body text-sm font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setI(v => Math.min(questoes.length - 1, v + 1))}
            disabled={i === questoes.length - 1}
            className="flex-1 py-3 rounded-2xl bg-accent text-accent-foreground font-body text-sm font-bold disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  MAPA MENTAL — radial SVG                                  */
/* ────────────────────────────────────────────────────────── */
export interface MapaNode { titulo: string; filhos?: MapaNode[] }

interface Positioned {
  id: string; label: string; x: number; y: number; depth: number; parentId?: string;
}

function layoutMap(root: MapaNode) {
  const W = 900, H = 640, cx = W / 2, cy = H / 2;
  const nodes: Positioned[] = [{ id: 'r', label: root.titulo, x: cx, y: cy, depth: 0 }];
  const level1 = root.filhos || [];
  const r1 = 200;
  level1.forEach((c, i) => {
    const angle = (i / Math.max(1, level1.length)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r1;
    const y = cy + Math.sin(angle) * r1;
    const id1 = `1-${i}`;
    nodes.push({ id: id1, label: c.titulo, x, y, depth: 1, parentId: 'r' });
    const subs = c.filhos || [];
    const r2 = 110;
    subs.forEach((s, j) => {
      const spread = Math.PI / 3;
      const base = angle;
      const sa = base + (j - (subs.length - 1) / 2) * (spread / Math.max(1, subs.length));
      nodes.push({
        id: `2-${i}-${j}`,
        label: s.titulo,
        x: x + Math.cos(sa) * r2,
        y: y + Math.sin(sa) * r2,
        depth: 2,
        parentId: id1,
      });
    });
  });
  return { W, H, nodes };
}

export const MapaMentalCanvas = ({ data, onClose }: { data: MapaNode; onClose: () => void }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { W, H, nodes } = useMemo(() => layoutMap(data), [data]);
  const byId = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const nodeColor = (d: number) =>
    d === 0 ? { bg: 'hsl(var(--accent))', fg: 'hsl(var(--accent-foreground))', stroke: 'hsl(var(--accent))' }
      : d === 1 ? { bg: 'hsl(var(--primary) / 0.9)', fg: 'hsl(var(--primary-foreground))', stroke: 'hsl(var(--primary))' }
      : { bg: 'hsl(var(--card))', fg: 'hsl(var(--foreground))', stroke: 'hsl(var(--border))' };

  const svgToPng = async (): Promise<Blob> => {
    const svg = svgRef.current!;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // Resolve CSS vars by computing colors
    const serial = new XMLSerializer().serializeToString(clone);
    const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(serial)));
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = W * scale; canvas.height = H * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background') || '#111';
        ctx.fillStyle = `hsl(${ctx.fillStyle})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('blob null')), 'image/png');
      };
      img.onerror = reject;
      img.src = svg64;
    });
  };

  const exportPng = async () => {
    try {
      const blob = await svgToPng();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'mapa-mental.png'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Imagem exportada');
    } catch (e) { toast.error('Erro ao exportar'); }
  };

  const exportPdf = async () => {
    try {
      const blob = await svgToPng();
      const dataUrl: string = await new Promise((r) => {
        const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob);
      });
      const styles = StyleSheet.create({
        page: { padding: 24, backgroundColor: '#111' },
        title: { fontSize: 14, marginBottom: 12, color: '#fff', fontFamily: 'Helvetica-Bold' },
        img: { width: '100%', objectFit: 'contain' as any },
      });
      const doc = (
        <Document>
          <Page size="A4" orientation="landscape" style={styles.page}>
            <PdfText style={styles.title}>Mapa Mental — {data.titulo}</PdfText>
            <PdfImage src={dataUrl} style={styles.img} />
          </Page>
        </Document>
      );
      const pdfBlob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a'); a.href = url; a.download = 'mapa-mental.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exportado');
    } catch (e) { toast.error('Erro ao exportar'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex flex-col"
    >
      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+var(--sai-top,env(safe-area-inset-top,0px)))] pb-3">
        <div>
          <h3 className="font-display text-base font-bold text-white">Mapa mental</h3>
          <p className="text-[11px] text-white/60 truncate max-w-[60vw]">{data.titulo}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPng} className="h-9 px-3 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-95">
            <ImageDown className="w-4 h-4" /> PNG
          </button>
          <button onClick={exportPdf} className="h-9 px-3 rounded-full bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5 active:scale-95">
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="min-w-full min-h-full flex items-center justify-center">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 1100 }} className="drop-shadow-2xl">
            <defs>
              <radialGradient id="rootGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
              </radialGradient>
            </defs>
            {/* Edges */}
            {nodes.filter(n => n.parentId).map((n) => {
              const p = byId[n.parentId!];
              const midX = (p.x + n.x) / 2;
              const midY = (p.y + n.y) / 2;
              const path = `M ${p.x} ${p.y} Q ${midX} ${p.y} ${midX} ${midY} T ${n.x} ${n.y}`;
              return (
                <path key={`e-${n.id}`} d={path} fill="none"
                  stroke="hsl(var(--accent))" strokeOpacity={n.depth === 1 ? 0.55 : 0.3}
                  strokeWidth={n.depth === 1 ? 2 : 1.4} strokeLinecap="round" />
              );
            })}
            {/* Nodes */}
            {nodes.map((n) => {
              const c = nodeColor(n.depth);
              const w = n.depth === 0 ? 210 : n.depth === 1 ? 170 : 140;
              const h = n.depth === 0 ? 70 : n.depth === 1 ? 54 : 42;
              const fontSize = n.depth === 0 ? 16 : n.depth === 1 ? 13 : 11;
              return (
                <g key={n.id} transform={`translate(${n.x - w / 2}, ${n.y - h / 2})`}>
                  <rect width={w} height={h} rx={h / 2}
                    fill={n.depth === 0 ? 'url(#rootGrad)' : c.bg}
                    stroke={c.stroke} strokeWidth={n.depth === 0 ? 0 : 1.5} />
                  <foreignObject x={8} y={4} width={w - 16} height={h - 8}>
                    <div
                      style={{
                        color: c.fg, fontSize, lineHeight: 1.15, fontWeight: n.depth === 0 ? 700 : n.depth === 1 ? 600 : 500,
                        fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', height: '100%', overflow: 'hidden',
                      } as any}
                    >
                      {n.label}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  TERMOS — animação de cards em cascata                     */
/* ────────────────────────────────────────────────────────── */
export interface Termo { termo: string; explicacao: string }

export const TermosViewer = ({ termos, onClose }: { termos: Termo[]; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        className="w-full h-[85vh] bg-card rounded-t-3xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Termos jurídicos</h3>
            <p className="text-xs text-muted-foreground">{termos.length} termos identificados</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(1.5rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] space-y-3">
          {termos.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className="rounded-2xl p-4 bg-gradient-to-br from-secondary to-card border border-accent/30 shadow-sm"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-accent-foreground">{i + 1}</span>
                </div>
                <p className="font-display font-bold text-foreground text-[15px] leading-tight">{t.termo}</p>
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed pl-8">{t.explicacao}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ────────────────────────────────────────────────────────── */
/*  SHARE SHEET                                               */
/* ────────────────────────────────────────────────────────── */
export const ShareSheet = ({ text, onClose }: { text: string; onClose: () => void }) => {
  const enc = encodeURIComponent(text.slice(0, 3800));
  const waUrl = `https://wa.me/?text=${enc}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${enc}`;

  const nativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        onClose();
      } else {
        window.open(waUrl, '_blank');
      }
    } catch { /* cancel */ }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success('Copiado'); onClose(); }
    catch { toast.error('Erro ao copiar'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] bg-black/60 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="w-full bg-card rounded-t-3xl p-5 pb-[calc(2rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
        <h3 className="font-display text-lg font-bold text-foreground mb-4">Compartilhar</h3>
        <div className="grid grid-cols-4 gap-3">
          <ShareBtn onClick={() => window.open(waUrl, '_blank')} label="WhatsApp"
            className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
            <MessageCircle className="w-6 h-6" />
          </ShareBtn>
          <ShareBtn onClick={() => window.open(tgUrl, '_blank')} label="Telegram"
            className="bg-sky-500/15 text-sky-400 border-sky-500/30">
            <SendIcon className="w-6 h-6" />
          </ShareBtn>
          <ShareBtn onClick={copy} label="Copiar"
            className="bg-secondary text-foreground border-border">
            <Copy className="w-6 h-6" />
          </ShareBtn>
          <ShareBtn onClick={nativeShare} label="Mais"
            className="bg-accent/15 text-accent border-accent/30">
            <Share2 className="w-6 h-6" />
          </ShareBtn>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ShareBtn = ({ onClick, label, className, children }: { onClick: () => void; label: string; className: string; children: React.ReactNode }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${className} active:scale-95 transition-transform`}>
    {children}
    <span className="text-xs font-body font-semibold">{label}</span>
  </button>
);
