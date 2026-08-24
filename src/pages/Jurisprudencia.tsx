import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Search, Shield, Landmark, Scale, ChevronRight, Gavel, FileText, ListChecks } from 'lucide-react';
import JurisBlogCarousel from '@/components/vademecum/JurisBlogCarousel';
import HeroOrnaments from '@/components/vademecum/HeroOrnaments';
import { heroFigures } from '@/assets/hero-figures';
import { assetUrl } from '@/lib/assetUrl';
import { prefetchRoute } from '@/lib/routePrefetch';
import { fetchSumulas } from '@/services/sumulasService';
import { fetchPesquisasProntas } from '@/services/pesquisasProntasService';
import { fetchEdicoes } from '@/services/informativosService';
import { fetchTesesEdicoes } from '@/services/tesesService';
import { track } from '@/lib/analyticsEvents';

function prefetchTarget(id: string) {
  if (id.startsWith('PRONTAS_')) {
    prefetchRoute('pesquisasProntasLista');
    prefetchRoute('pesquisasProntasTema');
    void fetchPesquisasProntas(id === 'PRONTAS_STF' ? 'STF' : 'STJ').catch(() => {});
    return;
  }
  if (id.startsWith('INFORMATIVOS_')) {
    prefetchRoute('informativosTribunal');
    void fetchEdicoes(id === 'INFORMATIVOS_STF' ? 'STF' : 'STJ').catch(() => {});
    return;
  }
  if (id.startsWith('TESES_')) {
    prefetchRoute('tesesTribunal');
    void fetchTesesEdicoes(id === 'TESES_STF' ? 'STF' : 'STJ').catch(() => {});
    return;
  }
  prefetchRoute('sumulasTribunal');
  void fetchSumulas(id).catch(() => {});
}

// Figuras vazadas com temática de tribunal/julgamento — mesmo padrão do painel
// amarelo do início, porém na paleta verde desta seção.
const JURIS_FIGURE_ALTS = [
  'Juiz com martelo',
  'Advogada argumentando',
  'Martelo do juiz',
  'Balança da justiça',
  'Colonata em perspectiva',
  'Fachada de faculdade',
  'Juramento de advogado',
  'Advogado lendo peça',
  'Cícero',
  'Montesquieu',
  'Escadaria da faculdade',
  'Pergaminho lacrado',
];
const JURIS_FIGURES = JURIS_FIGURE_ALTS
  .map((alt) => heroFigures.find((f) => f.alt === alt))
  .filter((f): f is (typeof heroFigures)[number] => Boolean(f));

// Página dedicada de Jurisprudência: substitui o antigo bottom sheet por uma
// tela cheia com painel verde no topo, barra de busca e cartões de coleção.
const CATEGORIAS = [
  {
    id: 'STF_VINCULANTE',
    label: 'Súmulas Vinculantes',
    desc: 'Vinculantes para todo o Judiciário e Administração Pública',
    icon: Shield,
    tag: 'VINCULANTE',
  },
  {
    id: 'STF',
    label: 'Súmulas do STF',
    desc: 'Supremo Tribunal Federal — jurisprudência constitucional',
    icon: Landmark,
    tag: 'STF',
  },
  {
    id: 'STJ',
    label: 'Súmulas do STJ',
    desc: 'Superior Tribunal de Justiça — uniformização infraconstitucional',
    icon: Scale,
    tag: 'STJ',
  },
  {
    id: 'PRONTAS_STF',
    label: 'Jurisprudências prontas — STF',
    desc: 'Coletâneas temáticas do Supremo Tribunal Federal',
    icon: Gavel,
    tag: 'STF · PRONTAS',
  },
  {
    id: 'PRONTAS_STJ',
    label: 'Jurisprudências prontas — STJ',
    desc: 'Coletâneas temáticas do Superior Tribunal de Justiça',
    icon: Gavel,
    tag: 'STJ · PRONTAS',
  },
  {
    id: 'INFORMATIVOS_STJ',
    label: 'Informativos do STJ',
    desc: 'Boletins periódicos com os principais julgados do STJ',
    icon: FileText,
    tag: 'STJ · INFORMATIVOS',
  },
  {
    id: 'INFORMATIVOS_STF',
    label: 'Informativos do STF',
    desc: 'Boletins periódicos com os principais julgados do STF',
    icon: FileText,
    tag: 'STF · INFORMATIVOS',
  },
  {
    id: 'TESES_STJ',
    label: 'Jurisprudência em Teses — STJ',
    desc: 'Teses consolidadas do STJ organizadas por edição e ramo do direito',
    icon: ListChecks,
    tag: 'STJ · TESES',
  },
  {
    id: 'TESES_STF',
    label: 'Jurisprudência em Teses — STF',
    desc: 'Teses consolidadas do STF organizadas por edição e ramo do direito',
    icon: ListChecks,
    tag: 'STF · TESES',
  },
] as const;

const Jurisprudencia = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [coverIndex, setCoverIndex] = useState(() => Math.floor(Math.random() * JURIS_FIGURES.length));

  useEffect(() => {
    if (JURIS_FIGURES.length <= 1) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) return;
      id = setInterval(() => setCoverIndex((i) => (i + 1) % JURIS_FIGURES.length), 9000);
    };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // Aquece o cache de TODAS as figuras (são poucas e leves) em idle, para
  // que os slides seguintes apareçam instantaneamente sem "carregando".
  useEffect(() => {
    const w: any = window;
    const idle = w.requestIdleCallback || ((cb: any) => setTimeout(cb, 400));
    const cancel = w.cancelIdleCallback || clearTimeout;
    const handle = idle(() => {
      JURIS_FIGURES.forEach((f) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = assetUrl(f.url);
      });
    });
    return () => cancel(handle);
  }, []);

  const abrir = (id: string) => {
    track('jurisprudencia_category_opened', { category_id: id });
    if (id === 'PRONTAS_STF') {
      navigate('/jurisprudencia/prontas/stf');
      return;
    }
    if (id === 'PRONTAS_STJ') {
      navigate('/jurisprudencia/prontas/stj');
      return;
    }
    if (id === 'INFORMATIVOS_STJ') {
      navigate('/jurisprudencia/informativos-stj');
      return;
    }
    if (id === 'INFORMATIVOS_STF') {
      navigate('/jurisprudencia/informativos-stf');
      return;
    }
    if (id === 'TESES_STJ') {
      navigate('/jurisprudencia/teses-stj');
      return;
    }
    if (id === 'TESES_STF') {
      navigate('/jurisprudencia/teses-stf');
      return;
    }
    const slug =
      id === 'STF_VINCULANTE' ? 'sumulas-vinculantes'
      : id === 'STF' ? 'sumulas-stf'
      : id === 'STJ' ? 'sumulas-stj'
      : '';
    if (slug) navigate(`/jurisprudencia/${slug}`);
  };

  const submitBusca = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    track('jurisprudencia_search_submitted', { query_length: q.length, query_terms: q.split(/\s+/).length });
    navigate(`/jurisprudencia/sumulas-stf?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-dvh bg-background pb-16">
      {/* Painel verde (mirror do painel amarelo do início) */}
      <div
        className="relative overflow-hidden rounded-b-[36px] border-b border-emerald-500/30 shadow-2xl shadow-black/50"
        style={{
          background:
            'linear-gradient(150deg, hsl(164 45% 16%) 0%, hsl(158 52% 11%) 55%, hsl(150 45% 7%) 100%)',
        }}
      >
        {/* Ornamentos SVG (mesmo do painel amarelo), tingidos de verde */}
        <div className="absolute inset-0 opacity-70 pointer-events-none [filter:hue-rotate(95deg)_saturate(0.85)]">
          <HeroOrnaments />
        </div>

        {/* Figuras vazadas rotativas com crossfade + Ken Burns (mesmo padrão do painel amarelo) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <AnimatePresence initial={false}>
            {(() => {
              const fig = JURIS_FIGURES[coverIndex % JURIS_FIGURES.length];
              if (!fig) return null;
              const posClass =
                fig.side === 'left'
                  ? 'left-[4%] right-auto origin-bottom-left'
                  : fig.side === 'right'
                  ? 'right-[4%] left-auto origin-bottom-right'
                  : 'left-1/2 -translate-x-1/2 origin-bottom';
              const kenBurnsAnim = (coverIndex % 2 === 0)
                ? 'ken-burns-a 12s ease-in-out infinite alternate'
                : 'ken-burns-b 12s ease-in-out infinite alternate';
              return (
                <motion.img
                  key={coverIndex}
                  src={assetUrl(fig.url)}
                  alt=""
                  aria-hidden
                  loading="eager"
                  decoding="async"
                  // @ts-expect-error non-standard yet-widely-supported hint
                  fetchpriority="high"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.92 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ animation: kenBurnsAnim, willChange: 'transform' }}
                  className={`absolute bottom-2 top-2 h-[calc(100%-16px)] w-auto max-w-[62%] sm:max-w-[52%] lg:max-w-[42%] object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.55)] ${posClass}`}
                />
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Escurecedor para legibilidade */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-emerald-950/25 to-emerald-950/70" />

        {/* Glow decorativo */}
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-teal-300/10 blur-3xl pointer-events-none" />

        {/* Header com voltar */}
        <div className="relative flex items-center justify-between px-4 pt-[calc(var(--sai-top,env(safe-area-inset-top,0px))+0.875rem)] pb-2">
          <button
            onClick={() => navigate('/')}
            aria-label="Voltar"
            className="w-11 h-11 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="w-11 h-11" />
        </div>

        {/* Hero */}
        <div className="relative px-6 pb-8 pt-6 flex flex-col items-center text-center">
          <div className="relative w-[76px] h-[76px] rounded-full p-[2px] bg-[conic-gradient(from_140deg,hsl(158_60%_55%),hsl(168_45%_30%),hsl(150_70%_45%),hsl(158_60%_55%))] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)]">
            <div className="w-full h-full rounded-full bg-emerald-950/70 border border-white/15 backdrop-blur-sm flex items-center justify-center">
              <Gavel className="w-8 h-8 text-emerald-200" strokeWidth={2} />
            </div>
          </div>
          <p className="mt-4 font-display uppercase tracking-[0.24em] text-[11px] text-emerald-200/80">
            Coleções
          </p>
          <h1 className="mt-1 font-display uppercase tracking-wider text-white text-[28px] leading-tight font-bold drop-shadow">
            Jurisprudência
          </h1>
          <p className="mt-2 text-white/90 text-[16px] leading-relaxed max-w-md font-body">
            Súmulas vinculantes, do STF, do STJ e coletâneas prontas — em um só lugar.
          </p>

          {/* Busca */}
          <form
            onSubmit={submitBusca}
            data-track="jurisprudencia_search_form"
            className="mt-5 w-full max-w-md flex items-center gap-2 rounded-full bg-white/95 pl-4 pr-1 py-1 shadow-lg shadow-emerald-950/30"
          >
            <Search className="w-5 h-5 text-emerald-800/70 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jurisprudência"
              className="flex-1 bg-transparent outline-none text-[16px] text-emerald-950 placeholder:text-emerald-800/50 py-2.5"
            />
            <button
              type="submit"
              className="rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-[13px] font-display uppercase tracking-wider font-bold px-5 min-h-11 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>

      {/* Categorias divididas em Súmulas e Jurisprudências prontas */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {(() => {
          const sumulas = CATEGORIAS.filter(
            (c) => !c.id.startsWith('PRONTAS_') && !c.id.startsWith('INFORMATIVOS_') && !c.id.startsWith('TESES_'),
          );
          const prontas = CATEGORIAS.filter((c) => c.id.startsWith('PRONTAS_'));
          const informativos = CATEGORIAS.filter((c) => c.id.startsWith('INFORMATIVOS_'));
          const teses = CATEGORIAS.filter((c) => c.id.startsWith('TESES_'));
          const renderCard = (op: typeof CATEGORIAS[number]) => {
            const Icon = op.icon;
            return (
              <button
                key={op.id}
                onClick={() => abrir(op.id)}
                onPointerEnter={() => prefetchTarget(op.id)}
                onTouchStart={() => prefetchTarget(op.id)}
                data-track="jurisprudencia_category_click"
                data-category-id={op.id}
                data-category-label={op.label}
                className="group w-full h-[104px] flex items-stretch gap-3 rounded-2xl bg-secondary/60 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left overflow-hidden shadow-sm shadow-black/5 hover:shadow-md hover:shadow-primary/10"
              >
                <div
                  className="relative w-[92px] h-full shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: '#0f2a20' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-black/25 pointer-events-none" />
                  <Icon className="relative w-10 h-10 text-emerald-300" strokeWidth={2} />
                  <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-sm bg-black/60 text-white text-[10px] font-body font-bold tracking-wider">
                    {op.tag}
                  </span>
                </div>
                <div className="flex-1 min-w-0 py-3 pr-2 flex flex-col justify-center">
                  <p className="font-display text-[16px] font-bold text-foreground leading-snug tracking-wide line-clamp-2">
                    {op.label}
                  </p>
                  <p className="font-body text-[13.5px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                    {op.desc}
                  </p>
                </div>
                <div className="w-11 h-11 mr-3 self-center rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            );
          };
          return (
            <>
              <section className="space-y-3">
                <p className="px-1 text-[13px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
                  Súmulas
                </p>
                {sumulas.map(renderCard)}
              </section>
              <div className="-mx-4"><JurisBlogCarousel /></div>
              <section className="space-y-3">
                <p className="px-1 text-[13px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
                  Jurisprudências prontas
                </p>
                {prontas.map(renderCard)}
              </section>
              <section className="space-y-3">
                <p className="px-1 text-[13px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
                  Informativos
                </p>
                {informativos.map(renderCard)}
              </section>
              <section className="space-y-3">
                <p className="px-1 text-[13px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
                  Jurisprudência em Teses
                </p>
                {teses.map(renderCard)}
              </section>
            </>
          );
        })()}

        <div className="mt-3 rounded-2xl border border-border/60 bg-background/40 p-4">
          <p className="font-display text-[16px] font-bold text-foreground leading-snug">
            O que são súmulas?
          </p>
          <p className="font-body text-[14px] text-muted-foreground leading-relaxed mt-1.5">
            Enunciados que consolidam o entendimento reiterado dos tribunais superiores. As{' '}
            <strong className="text-foreground/90">Vinculantes</strong> obrigam todo o Judiciário
            e a Administração Pública.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Jurisprudencia;