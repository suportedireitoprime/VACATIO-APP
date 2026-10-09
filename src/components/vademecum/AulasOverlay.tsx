import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, ChevronRight, GraduationCap, ArrowLeft, PlayCircle } from 'lucide-react';

// Fallbacks caso não exista o diretório em vacatio app
import hero1 from '@/assets/aprender-hero/hero-1.png';
import hero2 from '@/assets/aprender-hero/hero-2.png';
import hero3 from '@/assets/aprender-hero/hero-3.png';
import hero4 from '@/assets/aprender-hero/hero-4.png';
import hero5 from '@/assets/aprender-hero/hero-5.png';
import hero6 from '@/assets/aprender-hero/hero-6.png';

const HERO_ILLUSTRATIONS = [hero1, hero2, hero3, hero4, hero5, hero6];

type ArtigoType = any; // Substitua por import real depois
type CapGroup = { capitulo: string; artigos: ArtigoType[] };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

interface AulasOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  onClose: () => void;
  onArtigoSelect: (artigo: ArtigoType) => void;
}

export function AulasOverlay({ capituloGroups, leiNome, onClose, onArtigoSelect }: AulasOverlayProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedCapitulo, setSelectedCapitulo] = useState<CapGroup | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_ILLUSTRATIONS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const allCapitulos = useMemo(() => {
    return capituloGroups.flatMap(t => t.capitulos).filter(c => c.artigos.length > 0);
  }, [capituloGroups]);

  const totalAulas = allCapitulos.reduce((acc, curr) => acc + curr.artigos.length, 0);

  if (selectedCapitulo) {
    return (
      <div className="flex flex-col h-full bg-background relative z-10 w-full rounded-[30px] overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-white/10 sticky top-0 bg-background/80 backdrop-blur-md z-20">
          <button 
            onClick={() => setSelectedCapitulo(null)}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white truncate">
              {selectedCapitulo.capitulo}
            </h2>
            <p className="text-sm text-muted-foreground truncate font-body">
              {selectedCapitulo.artigos.length} aulas
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-3">
          {selectedCapitulo.artigos.map((artigo, idx) => (
            <button
              key={artigo.id || idx}
              onClick={() => onArtigoSelect(artigo)}
              className="w-full text-left bg-card border border-border p-3.5 rounded-2xl flex items-center gap-4 hover:border-primary/40 active:scale-[0.99] transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PlayCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-white text-[15px]">Aula {idx + 1}</h3>
                <p className="text-muted-foreground text-[13px] truncate font-body mt-0.5" style={{ letterSpacing: '-0.005em' }}>
                  {artigo.numero}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = 0; // Por enquanto mockado em 0%
  const dash = c - (pct / 100) * c;

  return (
    <div className="flex flex-col h-full relative w-full overflow-hidden">
      <section className="bg-amber-500 relative isolate shrink-0 border-b border-black/20 pb-4 overflow-hidden -mx-px rounded-t-[30px]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.18),transparent_65%)]" />

        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] sm:w-[34%] overflow-hidden">
          {HERO_ILLUSTRATIONS.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="absolute inset-y-0 right-0 h-full w-auto object-contain object-right transition-opacity duration-[1400ms] ease-in-out"
              style={{ opacity: i === heroIdx ? 1 : 0 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ))}
          <div className="absolute inset-0 opacity-25" style={{ background: 'linear-gradient(135deg, hsl(348 78% 38%) 0%, #F87171 100%)', mixBlendMode: 'multiply' }} />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-amber-500 via-amber-500/60 to-transparent" />
        </div>

        <div className="relative p-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 mt-1" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,0.15)" strokeWidth={stroke} fill="none" />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="#111"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={c}
                  strokeDashoffset={dash}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[14px] font-black leading-none text-black">{pct}%</span>
              </div>
            </div>

            <div className="min-w-0 max-w-[65%]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-black/70">Sua trilha</p>
              <h1 className="mt-0.5 font-display text-[22px] font-black leading-tight text-black sm:text-[26px]">
                Aulas
                <span className="ml-2 font-display text-[15px] font-semibold italic text-black/70">
                  em trilhas
                </span>
              </h1>
              <p className="mt-0.5 text-[12px] leading-snug text-black/70 font-body">
                Aulas organizadas por capítulos de {leiNome}
              </p>
            </div>
          </div>

          <div className="relative mt-4 rounded-xl bg-black/85 text-white ring-1 ring-black/20 shadow-lg">
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Trilhas</span>
                <span className="mt-0.5 font-display text-lg font-black leading-none">{allCapitulos.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Aulas Totais</span>
                <span className="mt-0.5 font-display text-lg font-black leading-none">{totalAulas}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32 space-y-3">
        {allCapitulos.map((cap, i) => {
          const capPct = 0; // Placeholder
          return (
            <button
              key={i}
              onClick={() => setSelectedCapitulo(cap)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 active:scale-[0.99] sm:p-3.5 shadow-sm"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-16 bg-gradient-to-br from-[#c2274a] to-red-600 flex items-center justify-center border border-black/10">
                <GraduationCap className="h-7 w-7 text-white drop-shadow-sm" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground sm:text-[16px]" style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
                    {cap.capitulo}
                  </p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold bg-muted text-muted-foreground tabular-nums">
                    {capPct}%
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-[13px]">
                  {cap.artigos.length} {cap.artigos.length === 1 ? 'aula' : 'aulas'}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--aprender-accent))] transition-all"
                    style={{ width: `${capPct}%` }}
                  />
                </div>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
        {allCapitulos.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm font-body">
            Nenhuma trilha encontrada para esta legislação.
          </div>
        )}
      </div>
    </div>
  );
}

export default AulasOverlay;
