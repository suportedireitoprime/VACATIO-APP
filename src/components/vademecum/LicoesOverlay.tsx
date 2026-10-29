import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ArrowLeft, ChevronLeft, Pencil } from 'lucide-react';

import hero1 from '@/assets/aprender-hero/hero-1.webp';
import hero2 from '@/assets/aprender-hero/hero-2.webp';
import hero3 from '@/assets/aprender-hero/hero-3.webp';
import hero4 from '@/assets/aprender-hero/hero-4.webp';
import hero5 from '@/assets/aprender-hero/hero-5.webp';
import hero6 from '@/assets/aprender-hero/hero-6.webp';

const HERO_ILLUSTRATIONS = [hero1, hero2, hero3, hero4, hero5, hero6];
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

import { formatCapituloDisplay } from '@/lib/capituloFormat';
import { LicoesArtigoView } from './praticar/LicoesArtigoView';

type ArtigoType = any;
type CapGroup = { capitulo: string; titulo?: string; artigos: ArtigoType[] };
type TituloGroup = { titulo: string; capitulos: CapGroup[] };

interface AulasOverlayProps {
  capituloGroups: TituloGroup[];
  leiNome: string;
  onClose: () => void;
  onArtigoSelect: (artigo: ArtigoType) => void;
}

export function LicoesOverlay({ capituloGroups, leiNome, onClose, onArtigoSelect }: AulasOverlayProps) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [selectedCapitulo, setSelectedCapitulo] = useState<CapGroup | null>(null);
  const [selectedArtigoLicao, setSelectedArtigoLicao] = useState<ArtigoType | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_ILLUSTRATIONS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const allCapitulos = useMemo(() => {
    return capituloGroups.flatMap(t => t.capitulos.map(c => ({ ...c, titulo: t.titulo }))).filter(c => c.artigos.length > 0);
  }, [capituloGroups]);

  const totalAulas = allCapitulos.reduce((acc, curr) => acc + curr.artigos.length, 0);

  // ─── TELA CHEIA: LIÇÃO DO ARTIGO SELECIONADO NA TRILHA ───
  if (selectedArtigoLicao) {
    const numText = selectedArtigoLicao.numero?.toLowerCase().includes('art')
      ? selectedArtigoLicao.numero
      : `Art. ${selectedArtigoLicao.numero}`;

    return (
      <div className="fixed inset-0 z-[120] bg-card flex flex-col w-full h-full max-h-screen overflow-hidden pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))]">
        {/* Cabeçalho expandido encostando no topo com botão voltar circular padrão e sem botão fechar X */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border/80 bg-background/50 backdrop-blur-md shrink-0 pt-[max(0.875rem,env(safe-area-inset-top))]">
          <button
            onClick={() => setSelectedArtigoLicao(null)}
            className="w-10 h-10 rounded-full bg-secondary/80 hover:bg-secondary border border-border/60 flex items-center justify-center text-foreground transition-all active:scale-95 shrink-0 shadow-sm"
            aria-label="Voltar para a Trilha de Lições"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Pencil className="w-5 h-5 text-[#38BDF8] shrink-0" strokeWidth={2.2} />
            <h3 className="font-heading text-base sm:text-lg font-bold text-foreground truncate uppercase tracking-wider">
              Lições • {numText}
            </h3>
          </div>
        </div>

        {/* Conteúdo Interativo das Lições */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <LicoesArtigoView
            artigoNumero={String(selectedArtigoLicao.numero || '')}
            artigoTexto={String(selectedArtigoLicao.texto || selectedArtigoLicao.caput || '')}
            leiNome={leiNome}
            onVoltar={() => setSelectedArtigoLicao(null)}
          />
        </div>
      </div>
    );
  }

  // ─── TELA DA TRILHA DE NÓS DO CAPÍTULO ───
  if (selectedCapitulo) {
    const selectedFormatted = formatCapituloDisplay(selectedCapitulo.capitulo, selectedCapitulo.titulo);
    return (
      <div 
        className="flex flex-col h-full bg-background relative w-full rounded-t-[30px] overflow-hidden" 
        style={{ background: 'linear-gradient(180deg, hsl(200 85% 35%) 0%, hsl(200 90% 40%) 40%, hsl(200 80% 30%) 100%)' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
        
        {/* Cabeçalho da Trilha do Capítulo */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 relative z-20 pt-[max(1rem,env(safe-area-inset-top))]">
          <button 
            onClick={() => setSelectedCapitulo(null)}
            className="w-10 h-10 rounded-full bg-black/20 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all shadow-sm"
            aria-label="Voltar para capítulos"
          >
            <ChevronLeft className="w-5 h-5 text-white drop-shadow-md" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-lg text-white truncate drop-shadow-md">
              {selectedFormatted.tag ? `${selectedFormatted.tag} - ${selectedFormatted.title}` : selectedFormatted.title}
            </h2>
            <p className="text-sm text-white/80 truncate font-body drop-shadow-sm">
              {selectedCapitulo.artigos.length} {selectedCapitulo.artigos.length === 1 ? 'artigo para praticar' : 'artigos para praticar'}
            </p>
          </div>
        </div>
        
        {/* Lista Sinuosa (Trilha estilo Duolingo em azul celeste com botões táteis) */}
        <div 
          className="flex-1 overflow-y-auto p-4 relative z-10"
          style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
        >
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
                  {/* Badge com número do Artigo */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                    <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white/95 border border-white/25 whitespace-nowrap shadow-sm">
                      {numText}
                    </div>
                  </div>

                  {/* Botão circular tátil com ícone oficial de Lições (Pencil) */}
                  <button
                    onClick={() => setSelectedArtigoLicao(artigo)}
                    className="relative w-16 h-16 z-10 rounded-full flex items-center justify-center bg-sky-500 hover:bg-sky-400 ring-sky-300 ring-4 ring-offset-2 ring-offset-transparent active:scale-95 transition-transform"
                    style={{
                      boxShadow: '0 10px 22px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.25), inset 0 -4px 0 rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.18)',
                    }}
                    title={`Praticar lições do ${numText}`}
                  >
                    <Pencil className="w-7 h-7 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]" strokeWidth={2.4} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  // ─── TELA GERAL DE CAPÍTULOS DE LIÇÕES ───
  return (
    <div 
      className="flex flex-col h-full relative w-full overflow-hidden" 
      style={{ background: 'linear-gradient(180deg, hsl(200 85% 40%) 0%, hsl(200 90% 45%) 40%, hsl(200 80% 35%) 100%)' }}
    >
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
          <div className="absolute inset-0 opacity-25" style={{ background: 'linear-gradient(135deg, hsl(200 80% 35%) 0%, #38BDF8 100%)', mixBlendMode: 'multiply' }} />
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0284c7] via-[#0284c7]/60 to-transparent" />
        </div>

        <div className="relative p-5 pt-[calc(var(--sai-top)+16px)]">
          {/* Botão de Voltar padrão circular */}
          <button 
            onClick={onClose}
            className="absolute left-4 top-[calc(var(--sai-top)+12px)] z-20 w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-sm active:scale-95 transition-all"
            aria-label="Fechar trilhas"
          >
            <ChevronLeft className="w-5 h-5 drop-shadow-md" />
          </button>

          <div className="flex items-start gap-4 mt-8 relative z-10">
            <div className="min-w-0 max-w-[80%] text-white drop-shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Sua trilha</p>
              <h1 className="mt-0.5 font-display text-[22px] font-black leading-tight sm:text-[26px]">
                Lições
              </h1>
              <p className="mt-0.5 text-[12px] leading-snug text-white/80 font-body">
                Lições de fixação organizadas por capítulos de {leiNome}
              </p>
            </div>
          </div>

          <div className="relative mt-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-lg z-10">
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Capítulos</span>
                <span className="mt-0.5 font-display text-lg font-black leading-none">{allCapitulos.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center px-2 py-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Artigos Totais</span>
                <span className="mt-0.5 font-display text-lg font-black leading-none">{totalAulas}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div 
        className="flex-1 overflow-y-auto px-4 py-5 space-y-3"
        style={{ paddingBottom: 'calc(8rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        {allCapitulos.map((cap, i) => {
          return (
            <button
              key={i}
              onClick={() => setSelectedCapitulo(cap)}
              className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md p-3 text-left transition-all hover:bg-black/30 active:scale-[0.99] sm:p-3.5 shadow-sm"
            >
              <div className="relative h-14 w-14 shrink-0 flex items-center justify-center sm:h-16 sm:w-16">
                <Pencil className="h-9 w-9 text-[#38BDF8] drop-shadow-sm transition-transform group-hover:scale-110" strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                {(() => {
                  const f = formatCapituloDisplay(cap.capitulo, cap.titulo);
                  return (
                    <>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider truncate">
                          {f.tag}
                        </p>
                      </div>
                      <p className="min-w-0 text-[14px] font-bold text-white sm:text-[15px] leading-snug drop-shadow-sm" style={{ fontFamily: "'Barlow', system-ui, sans-serif", letterSpacing: '-0.005em' }}>
                        {f.title}
                      </p>
                    </>
                  );
                })()}
                <p className="mt-0.5 text-[12px] text-white/60 sm:text-[13px]">
                  {cap.artigos.length} {cap.artigos.length === 1 ? 'artigo para praticar' : 'artigos para praticar'}
                </p>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
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

export default LicoesOverlay;
