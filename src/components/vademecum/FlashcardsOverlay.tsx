import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, ChevronRight, GraduationCap, ArrowLeft, PlayCircle } from 'lucide-react';

// Fallbacks caso não exista o diretório em vacatio app
import hero1 from '@/assets/aprender-hero/hero-1.webp';
import hero2 from '@/assets/aprender-hero/hero-2.webp';
import hero3 from '@/assets/aprender-hero/hero-3.webp';
import hero4 from '@/assets/aprender-hero/hero-4.webp';
import hero5 from '@/assets/aprender-hero/hero-5.webp';
import hero6 from '@/assets/aprender-hero/hero-6.webp';

const HERO_ILLUSTRATIONS = [hero1, hero2, hero3, hero4, hero5, hero6];
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

type ArtigoType = any; // Substitua por import real depois
type CapGroup = { capitulo: string; artigos: ArtigoType[] };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

interface AulasOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  onClose: () => void;
  onArtigoSelect: (artigo: ArtigoType) => void;
}

export function FlashcardsOverlay({ capituloGroups, leiNome, onClose, onArtigoSelect }: AulasOverlayProps) {
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
      <div className="flex flex-col h-full bg-background relative w-full rounded-t-[30px] overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(0 70% 38%) 0%, hsl(0 75% 42%) 40%, hsl(0 72% 36%) 100%)' }}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="flex items-center gap-3 p-4 border-b border-white/10 relative z-20">
          <button 
            onClick={() => setSelectedCapitulo(null)}
            className="w-10 h-10 rounded-full bg-black/20 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white drop-shadow-md" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white truncate drop-shadow-md">
              {selectedCapitulo.capitulo.split(' - ').slice(1).join(' - ') || selectedCapitulo.capitulo}
            </h2>
            <p className="text-sm text-white/80 truncate font-body drop-shadow-sm">
              {selectedCapitulo.artigos.length} aulas
            </p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pb-32 relative z-10">
          <ul className="flex flex-col items-center gap-4 py-8">
            {selectedCapitulo.artigos.map((artigo, idx) => {
              const offset = OFFSETS[idx % OFFSETS.length];
              const numText = artigo.numero.toLowerCase().includes('art') ? artigo.numero : `Art. ${artigo.numero}`;
              
              return (
                <li
                  key={artigo.id || idx}
                  className="w-full flex justify-center relative"
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                    <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white/90 border border-white/20 whitespace-nowrap shadow-sm">
                      {numText}
                    </div>
                  </div>

                  <button
                    onClick={() => onArtigoSelect(artigo)}
                    className="relative w-16 h-16 z-10 rounded-full flex items-center justify-center font-black text-white text-lg bg-red-500 ring-red-200 ring-4 ring-offset-2 ring-offset-transparent active:scale-95 transition-transform"
                    style={{
                      boxShadow: '0 10px 22px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    <span className="tabular-nums drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">
                      {idx + 1}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  const pct = 0; // Por enquanto mockado em 0%

  return (
    <div className="flex flex-col h-full relative w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(150 75% 35%) 0%, hsl(150 80% 40%) 40%, hsl(150 70% 30%) 100%)' }}>
      <section className="relative isolate shrink-0 pb-4 overflow-hidden -mx-px rounded-t-[30px] z-10">
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
          <div className="absolute inset-0 opacity-25" style={{ background: 'linear-gradient(135deg, hsl(150 75% 30%) 0%, #34D399 100%)', mixBlendMode: 'multiply' }} />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#10b981] via-[#10b981]/60 to-transparent" />
        </div>

        <div className="relative p-5 pt-[calc(var(--sai-top)+16px)]">
          {/* Botão de Voltar */}
          <button 
            onClick={onClose}
            className="absolute left-4 top-[calc(var(--sai-top)+12px)] z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 drop-shadow-md" />
          </button>

          <div className="flex items-start gap-4 mt-8 relative z-10">
            <div className="min-w-0 max-w-[80%] text-white drop-shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Sua trilha</p>
              <h1 className="mt-0.5 font-display text-[22px] font-black leading-tight sm:text-[26px]">
                Flashcards
              </h1>
              <p className="mt-0.5 text-[12px] leading-snug text-white/80 font-body">
                Flashcards organizados por capítulos de {leiNome}
              </p>
            </div>
          </div>

          <div className="relative mt-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-lg z-10">
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Temas</span>
                <span className="mt-0.5 font-display text-lg font-black leading-none">{allCapitulos.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Cards Totais</span>
                <span className="mt-0.5 font-display text-lg font-black leading-none">{totalAulas * 5}</span>
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
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {cap.capitulo.split(' - ')[0]}
                  </p>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted text-muted-foreground tabular-nums ml-auto">
                    {capPct}%
                  </span>
                </div>
                <p className="min-w-0 text-[14px] font-bold text-foreground sm:text-[15px] leading-snug" style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
                  {cap.capitulo.split(' - ').slice(1).join(' - ') || cap.capitulo}
                </p>
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
