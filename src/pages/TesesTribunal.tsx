import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ListChecks, Search, Loader2, Scale, Landmark, X, Copy, Check } from 'lucide-react';
import {
  fetchTesesEdicoes, getTesesEdicoesCached, subscribeTesesEdicoes,
  fetchTesesItens, getTesesItensCached, subscribeTesesItens,
  type TeseEdicaoRow, type TeseItemRow,
} from '@/services/tesesService';

const TRIBUNAL_UI = {
  STJ: {
    label: 'Jurisprudência em Teses — STJ',
    short: 'Teses do STJ',
    subtitle: 'Superior Tribunal de Justiça — teses consolidadas por edição',
    Icon: Scale,
    gradient: 'linear-gradient(160deg, hsl(268 62% 45%) 0%, hsl(268 58% 30%) 55%, hsl(268 50% 18%) 100%)',
    accentText: 'text-violet-200',
    tagBg: 'bg-violet-500/15 text-violet-200 border-violet-400/30',
  },
  STF: {
    label: 'Jurisprudência em Teses — STF',
    short: 'Teses do STF',
    subtitle: 'Supremo Tribunal Federal — teses consolidadas por edição',
    Icon: Landmark,
    gradient: 'linear-gradient(160deg, hsl(200 68% 42%) 0%, hsl(200 62% 27%) 55%, hsl(200 52% 16%) 100%)',
    accentText: 'text-sky-200',
    tagBg: 'bg-sky-500/15 text-sky-200 border-sky-400/30',
  },
} as const;

function TeseCard({ item, accent }: { item: TeseItemRow; accent: string }) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`${item.numero}. ${item.tese}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {}
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-start gap-2">
        <span className={`shrink-0 mt-0.5 text-[11px] font-display font-bold ${accent}`}>
          {String(item.numero).padStart(2, '0')}
        </span>
        <p className="flex-1 text-[13.5px] leading-snug text-foreground">{item.tese}</p>
        <button onClick={copiar} aria-label="Copiar tese" className="shrink-0 w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted">
          {copiado ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {item.julgados && (
        <>
          <button
            onClick={() => setAberto((v) => !v)}
            className="mt-2 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground hover:text-foreground"
          >
            {aberto ? 'Ocultar julgados' : 'Ver julgados'}
          </button>
          {aberto && (
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground whitespace-pre-wrap border-t border-border/60 pt-2">
              {item.julgados}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function EdicaoSheet({ tribunal, edicao, onClose }: { tribunal: 'STJ' | 'STF'; edicao: TeseEdicaoRow; onClose: () => void }) {
  const cfg = TRIBUNAL_UI[tribunal];
  const cached = getTesesItensCached(tribunal, edicao.edicao);
  const [itens, setItens] = useState<TeseItemRow[]>(cached ?? []);
  const [loading, setLoading] = useState(!(cached && cached.length > 0));
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTesesItens(tribunal, edicao.edicao).then((rows) => {
      if (cancelled) return;
      setItens(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
    const unsub = subscribeTesesItens(tribunal, edicao.edicao, (rows) => {
      if (cancelled) return;
      setItens(rows);
      setLoading(false);
    });
    return () => { cancelled = true; unsub(); };
  }, [tribunal, edicao.edicao]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter((i) => i.tese.toLowerCase().includes(q) || (i.julgados || '').toLowerCase().includes(q));
  }, [itens, query]);

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-3xl h-[92vh] bg-background rounded-t-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-4 border-b border-border/60 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body font-semibold truncate">
                Edição n. {edicao.edicao}{edicao.ramo ? ` · ${edicao.ramo}` : ''}
              </p>
              <h2 className="font-display text-[15px] font-bold text-foreground truncate">{edicao.titulo}</h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-body font-bold ${cfg.tagBg}`}>
              {edicao.total_teses} teses
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted/60 border border-border pl-3 pr-1 py-1">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nesta edição…"
              className="flex-1 bg-transparent outline-none text-sm py-1.5"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
          {!loading && filtrados.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma tese encontrada.</p>
          )}
          {!loading && filtrados.map((i) => <TeseCard key={i.id} item={i} accent={cfg.accentText} />)}
        </div>
      </div>
    </div>
  );
}

function TesesTribunalInner({ tribunal }: { tribunal: 'STJ' | 'STF' }) {
  const navigate = useNavigate();
  const cfg = TRIBUNAL_UI[tribunal];
  const cached = getTesesEdicoesCached(tribunal);
  const [edicoes, setEdicoes] = useState<TeseEdicaoRow[]>(cached ?? []);
  const [loading, setLoading] = useState(!(cached && cached.length > 0));
  const [aberta, setAberta] = useState<TeseEdicaoRow | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchTesesEdicoes(tribunal).then((rows) => {
      if (cancelled) return;
      setEdicoes(rows);
      setLoading(false);
    }).catch(() => setLoading(false));
    const unsub = subscribeTesesEdicoes(tribunal, (rows) => {
      if (cancelled) return;
      setEdicoes(rows);
      setLoading(false);
    });
    return () => { cancelled = true; unsub(); };
  }, [tribunal]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return edicoes;
    return edicoes.filter((e) =>
      e.titulo.toLowerCase().includes(q) ||
      (e.ramo || '').toLowerCase().includes(q) ||
      String(e.edicao).includes(q)
    );
  }, [edicoes, query]);

  const Icon = cfg.Icon;

  return (
    <div className="min-h-dvh bg-background pb-16">
      <div
        className="relative overflow-hidden rounded-b-[36px] border-b border-white/10 shadow-2xl shadow-black/50"
        style={{ background: cfg.gradient }}
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="w-11 h-11 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="font-display uppercase tracking-[0.22em] text-[10px] text-white/70">Jurisprudência</p>
            <h1 className="font-display uppercase tracking-wider text-white text-lg font-bold leading-tight">
              {cfg.short}
            </h1>
          </div>
          <div className="w-11 h-11" />
        </div>
        <div className="relative px-6 pb-8 pt-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-black/40">
            <Icon className="w-8 h-8 text-white" strokeWidth={2.2} />
          </div>
          <h2 className="mt-4 font-display uppercase tracking-wider text-white text-2xl font-bold drop-shadow">
            Jurisprudência em Teses
          </h2>
          <p className="mt-1 text-white/85 text-sm max-w-md font-body">{cfg.subtitle}</p>
          <div className="mt-5 w-full max-w-md flex items-center gap-2 rounded-full bg-white/95 pl-4 pr-4 py-1 shadow-lg shadow-black/30">
            <Search className="w-4 h-4 text-black/60 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar edição ou ramo do direito"
              className="flex-1 bg-transparent outline-none text-sm text-black py-2 placeholder:text-black/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && filtradas.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma edição publicada ainda.</p>
        )}
        {!loading && filtradas.map((ed) => (
          <button
            key={ed.id}
            onClick={() => setAberta(ed)}
            className="w-full flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left overflow-hidden shadow-sm shadow-black/5"
          >
            <div className="relative w-[82px] h-[86px] shrink-0 flex items-center justify-center" style={{ background: cfg.gradient }}>
              <ListChecks className="relative w-8 h-8 text-white/95" strokeWidth={2} />
              <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-sm bg-black/60 text-white text-[9px] font-body font-bold tracking-wider">
                n. {ed.edicao}
              </span>
            </div>
            <div className="flex-1 min-w-0 py-3 pr-2">
              <p className="font-display text-[14px] font-bold text-foreground leading-tight tracking-wide line-clamp-2">
                {ed.titulo}
              </p>
              <p className="font-body text-[12px] text-muted-foreground mt-1 truncate">
                {ed.ramo ? `${ed.ramo} · ` : ''}{ed.total_teses} tese{ed.total_teses !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-9 h-9 mr-3 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {aberta && <EdicaoSheet tribunal={tribunal} edicao={aberta} onClose={() => setAberta(null)} />}
    </div>
  );
}

export default function TesesTribunal() {
  const { tribunal } = useParams<{ tribunal: string }>();
  const t = (tribunal || '').toUpperCase() as 'STJ' | 'STF';
  if (t !== 'STJ' && t !== 'STF') {
    return <div className="p-6 text-center text-muted-foreground">Tribunal desconhecido.</div>;
  }
  return <TesesTribunalInner tribunal={t} />;
}

export const TesesSTJ = () => <TesesTribunalInner tribunal="STJ" />;
export const TesesSTF = () => <TesesTribunalInner tribunal="STF" />;
