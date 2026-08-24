import { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Mic, BookOpen, Sparkles, Gavel } from 'lucide-react';

type Example = {
  id: string;
  tag: string;
  icon: any;
  quote: string;
  color: string; // accent hex
  glow: string;
};

const EXAMPLES: Example[] = [
  {
    id: 'livro',
    tag: 'Livro',
    icon: BookOpen,
    quote: 'Me resume esse livro em tópicos.',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  {
    id: 'lei',
    tag: 'Lei',
    icon: Gavel,
    quote: 'Horus, explica esse artigo pra mim.',
    color: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.35)',
  },
  {
    id: 'pdf',
    tag: 'PDF',
    icon: FileText,
    quote: 'Me resume esse PDF em pontos-chave.',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.35)',
  },
  {
    id: 'audio',
    tag: 'Áudio',
    icon: Mic,
    quote: 'Escuta esse áudio e me resume a aula.',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'imagem',
    tag: 'Imagem',
    icon: ImageIcon,
    quote: 'O que diz esse print? Me resume.',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.35)',
  },
  {
    id: 'texto',
    tag: 'Texto',
    icon: Sparkles,
    quote: 'Resume isso pra mim de um jeito simples.',
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.35)',
  },
];

export default function HorusExamplesCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % EXAMPLES.length);
    }, 3200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused]);

  const cardW = 260; // px
  const gap = 14;
  const step = cardW + gap;

  return (
    <div className="-mx-5 select-none">
      <div className="px-5 mb-2 flex items-center justify-between">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
          Exemplos do que pedir
        </p>
      </div>

      <div
        className="relative overflow-hidden py-4"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        style={{ height: 190 }}
      >
        {/* fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-background to-transparent" />

        <div className="relative h-full w-full">
          {EXAMPLES.map((ex, i) => {
            const Icon = ex.icon;
            // circular distance
            let d = i - index;
            const half = EXAMPLES.length / 2;
            if (d > half) d -= EXAMPLES.length;
            if (d < -half) d += EXAMPLES.length;

            const isCenter = d === 0;
            const abs = Math.abs(d);
            const translate = d * step;
            const scale = isCenter ? 1 : abs === 1 ? 0.82 : 0.68;
            const opacity = abs === 0 ? 1 : abs === 1 ? 0.55 : 0;
            const z = 10 - abs;

            return (
              <div
                key={ex.id}
                className="absolute top-1/2 left-1/2 transition-all duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  width: cardW,
                  height: 150,
                  marginLeft: -cardW / 2,
                  marginTop: -75,
                  transform: `translate3d(${translate}px, 0, 0) scale(${scale})`,
                  opacity,
                  zIndex: z,
                  pointerEvents: isCenter ? 'auto' : 'none',
                }}
              >
                <div
                  className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10"
                  style={{
                    // gray → accent color gradient
                    background: `linear-gradient(135deg, #2a2a2e 0%, #1a1a1d 45%, ${ex.color} 140%)`,
                    boxShadow: isCenter
                      ? `0 20px 50px -18px ${ex.glow}, 0 0 0 1px rgba(255,255,255,0.06) inset`
                      : `0 8px 24px -14px rgba(0,0,0,0.6)`,
                  }}
                >
                  {/* color wash on the corner */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(120% 90% at 100% 100%, ${ex.color}55, transparent 55%)`,
                    }}
                  />
                  {/* top-left sheen */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                    style={{
                      background:
                        'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.35), transparent 55%)',
                    }}
                  />

                  <div className="relative h-full p-4 flex flex-col justify-between">
                    <span
                      className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-[10.5px] font-bold uppercase tracking-wider"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        border: `1px solid ${ex.color}66`,
                        color: ex.color,
                      }}
                    >
                      <Icon className="w-3 h-3" strokeWidth={2.5} />
                      {ex.tag}
                    </span>
                    <p
                      className="font-display text-[16px] leading-snug font-semibold uppercase"
                      style={{ color: '#fff', textShadow: '0 1px 12px rgba(0,0,0,0.45)' }}
                    >
                      “{ex.quote}”
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* dots */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 z-20">
          {EXAMPLES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === index ? 16 : 6,
                background: i === index ? EXAMPLES[index].color : 'rgba(255,255,255,0.25)',
              }}
              aria-label={`Exemplo ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
