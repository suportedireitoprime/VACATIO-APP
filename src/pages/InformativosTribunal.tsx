import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FileText, Search, Loader2, Scale, Landmark, X } from 'lucide-react';
import { supabaseCloud } from '@/integrations/supabase/cloudClient';
import {
  fetchEdicoes, getEdicoesCached, subscribeEdicoes,
  fetchVerbetes, getVerbetesCached, subscribeVerbetes,
} from '@/services/informativosService';

type Verbete = {
  id: string;
  edicao: number;
  edicao_titulo: string | null;
  data_publicacao: string | null;
  ordem: number;
  secao: string | null;
  processo: string | null;
  ramo_direito: string | null;
  tema: string | null;
  destaque: string | null;
  inteiro_teor: string | null;
  informacoes_adicionais: string | null;
};

type Edicao = {
  edicao: number;
  titulo: string;
  data_publicacao: string | null;
  total: number;
};

const TRIBUNAL_UI = {
  STJ: {
    label: 'Informativos do STJ',
    subtitle: 'Superior Tribunal de Justiça — teses jurisprudenciais',
    table: 'informativos_stj',
    Icon: Scale,
    gradient: 'linear-gradient(160deg, hsl(220 72% 42%) 0%, hsl(220 65% 28%) 55%, hsl(220 55% 16%) 100%)',
    accentText: 'text-blue-200',
    tagBg: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
  },
  STF: {
    label: 'Informativos do STF',
    subtitle: 'Supremo Tribunal Federal — teses jurisprudenciais',
    table: 'informativos_stf',
    Icon: Landmark,
    gradient: 'linear-gradient(160deg, hsl(0 72% 42%) 0%, hsl(0 65% 28%) 55%, hsl(0 55% 16%) 100%)',
    accentText: 'text-red-200',
    tagBg: 'bg-red-500/15 text-red-200 border-red-400/30',
  },
} as const;

function formatDataPT(iso: string | null) {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${String(d).padStart(2,'0')} ${meses[(m||1)-1]}. ${y}`;
  } catch { return iso; }
}

function reduceEdicoes(rows: { edicao: number; edicao_titulo: string | null; data_publicacao: string | null }[]): Edicao[] {
  const map = new Map<number, Edicao>();
  rows.forEach((row) => {
    const cur = map.get(row.edicao);
    if (cur) cur.total += 1;
    else map.set(row.edicao, {
      edicao: row.edicao,
      titulo: (row.edicao_titulo || `Informativo n. ${row.edicao}`).trim(),
      data_publicacao: row.data_publicacao,
      total: 1,
    });
  });
  return Array.from(map.values()).sort((a, b) => b.edicao - a.edicao);
}

function useInformativos(tribunal: 'STJ' | 'STF') {
  const cfg = TRIBUNAL_UI[tribunal];
  const cached = getEdicoesCached(tribunal);
  const [edicoes, setEdicoes] = useState<Edicao[]>(cached ? reduceEdicoes(cached as any) : []);
  const [loading, setLoading] = useState(!(cached && cached.length > 0));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEdicoes(tribunal)
      .then((rows) => {
        if (cancelled) return;
        setEdicoes(reduceEdicoes(rows as any));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || 'erro');
        setLoading(false);
      });
    const unsub = subscribeEdicoes(tribunal, (rows) => {
      if (cancelled) return;
      setEdicoes(reduceEdicoes(rows as any));
      setLoading(false);
    });
    return () => { cancelled = true; unsub(); };
  }, [tribunal]);

  return { edicoes, loading, error, table: cfg.table };
}

function VerbeteDetalhe({ verbete, onClose }: { verbete: Verbete; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl h-[92vh] sm:h-[85vh] bg-background rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/60 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
              {verbete.secao || 'Verbete'} · #{verbete.ordem}
            </p>
            <p className="text-[13px] font-display font-bold text-foreground truncate">
              {verbete.processo}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 shrink-0" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-[14px] leading-relaxed">
          {verbete.ramo_direito && (
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              {verbete.ramo_direito}
            </div>
          )}
          {verbete.tema && (
            <section>
              <h3 className="font-display font-bold text-primary uppercase tracking-wider text-[11px] mb-1.5">Tema</h3>
              <p className="text-foreground/90 whitespace-pre-wrap">{verbete.tema}</p>
            </section>
          )}
          {verbete.destaque && (
            <section>
              <h3 className="font-display font-bold text-amber-500 uppercase tracking-wider text-[11px] mb-1.5">Destaque</h3>
              <p className="text-foreground whitespace-pre-wrap">{verbete.destaque}</p>
            </section>
          )}
          {verbete.inteiro_teor && (
            <section>
              <h3 className="font-display font-bold text-emerald-500 uppercase tracking-wider text-[11px] mb-1.5">Informações do inteiro teor</h3>
              <p className="text-foreground/90 whitespace-pre-wrap">{verbete.inteiro_teor}</p>
            </section>
          )}
          {verbete.informacoes_adicionais && (
            <section>
              <h3 className="font-display font-bold text-sky-500 uppercase tracking-wider text-[11px] mb-1.5">Informações adicionais</h3>
              <p className="text-foreground/80 whitespace-pre-wrap">{verbete.informacoes_adicionais}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function EdicaoSheet({ tribunal, edicao, onClose }: { tribunal: 'STJ' | 'STF'; edicao: Edicao; onClose: () => void }) {
  const cfg = TRIBUNAL_UI[tribunal];
  const [verbetes, setVerbetes] = useState<Verbete[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [ativo, setAtivo] = useState<Verbete | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = getVerbetesCached(tribunal, edicao.edicao);
    if (cached && cached.length > 0) {
      setVerbetes(cached as any);
      setLoading(false);
    }
    fetchVerbetes(tribunal, edicao.edicao).then((rows) => {
      if (cancelled) return;
      setVerbetes(rows as any);
      setLoading(false);
    });
    const unsub = subscribeVerbetes(tribunal, edicao.edicao, (rows) => {
      if (cancelled) return;
      setVerbetes(rows as any);
      setLoading(false);
    });
    return () => { cancelled = true; unsub(); };
  }, [tribunal, edicao.edicao]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return verbetes;
    return verbetes.filter((v) =>
      [v.processo, v.tema, v.ramo_direito, v.secao, v.destaque].some((s) => (s || '').toLowerCase().includes(q))
    );
  }, [verbetes, query]);

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
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body font-semibold">
                {cfg.label} · {formatDataPT(edicao.data_publicacao)}
              </p>
              <h2 className="font-display text-[15px] font-bold text-foreground truncate">
                {edicao.titulo}
              </h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full border text-[11px] font-body font-bold ${cfg.tagBg}`}>
              {edicao.total} verbetes
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted/60 border border-border pl-3 pr-1 py-1">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por tema, processo, ramo…"
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
            <p className="text-center text-muted-foreground py-10 text-sm">Nenhum verbete encontrado.</p>
          )}
          {!loading && filtrados.map((v) => (
            <button
              key={v.id}
              onClick={() => setAtivo(v)}
              className="w-full text-left rounded-xl border border-border bg-secondary/40 hover:bg-secondary hover:border-primary/40 transition-all p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold truncate">
                  {v.secao || '—'} · #{v.ordem}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <p className="font-display text-[13px] font-bold text-foreground leading-tight line-clamp-2">
                {v.processo}
              </p>
              {v.ramo_direito && (
                <p className={`text-[10.5px] uppercase tracking-wider font-semibold ${cfg.accentText} truncate`}>
                  {v.ramo_direito}
                </p>
              )}
              {v.tema && (
                <p className="text-[12.5px] text-muted-foreground line-clamp-3 leading-snug">{v.tema}</p>
              )}
            </button>
          ))}
        </div>
      </div>
      {ativo && <VerbeteDetalhe verbete={ativo} onClose={() => setAtivo(null)} />}
    </div>
  );
}

function InformativosTribunalInner({ tribunal }: { tribunal: 'STJ' | 'STF' }) {
  const navigate = useNavigate();
  const cfg = TRIBUNAL_UI[tribunal];
  const { edicoes, loading, error } = useInformativos(tribunal);
  const [aberta, setAberta] = useState<Edicao | null>(null);
  const [query, setQuery] = useState('');

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return edicoes;
    return edicoes.filter((e) => e.titulo.toLowerCase().includes(q) || String(e.edicao).includes(q));
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
            <p className="font-display uppercase tracking-[0.22em] text-[10px] text-white/70">
              Jurisprudência
            </p>
            <h1 className="font-display uppercase tracking-wider text-white text-lg font-bold leading-tight">
              {cfg.label}
            </h1>
          </div>
          <div className="w-11 h-11" />
        </div>
        <div className="relative px-6 pb-8 pt-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-black/40">
            <Icon className="w-8 h-8 text-white" strokeWidth={2.2} />
          </div>
          <h2 className="mt-4 font-display uppercase tracking-wider text-white text-2xl font-bold drop-shadow">
            {cfg.label}
          </h2>
          <p className="mt-1 text-white/85 text-sm max-w-md font-body">{cfg.subtitle}</p>
          <div className="mt-5 w-full max-w-md flex items-center gap-2 rounded-full bg-white/95 pl-4 pr-4 py-1 shadow-lg shadow-black/30">
            <Search className="w-4 h-4 text-black/60 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar edição"
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
        {error && <p className="text-center text-destructive text-sm py-6">{error}</p>}
        {!loading && !error && filtradas.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">
            Nenhuma edição publicada ainda.
          </p>
        )}
        {!loading && filtradas.map((ed) => (
          <button
            key={ed.edicao}
            onClick={() => setAberta(ed)}
            className="w-full flex items-center gap-3 rounded-2xl bg-secondary/60 border border-border hover:border-primary/50 hover:bg-secondary transition-all text-left overflow-hidden shadow-sm shadow-black/5"
          >
            <div className="relative w-[82px] h-[86px] shrink-0 flex items-center justify-center" style={{ background: cfg.gradient }}>
              <FileText className="relative w-8 h-8 text-white/95" strokeWidth={2} />
              <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded-sm bg-black/60 text-white text-[9px] font-body font-bold tracking-wider">
                n. {ed.edicao}
              </span>
            </div>
            <div className="flex-1 min-w-0 py-3 pr-2">
              <p className="font-display text-[14px] font-bold text-foreground leading-tight tracking-wide line-clamp-2">
                {ed.titulo}
              </p>
              <p className="font-body text-[12px] text-muted-foreground mt-1">
                {formatDataPT(ed.data_publicacao)} · {ed.total} verbete{ed.total !== 1 ? 's' : ''}
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

export default function InformativosTribunal() {
  const { tribunal } = useParams<{ tribunal: string }>();
  const t = (tribunal || '').toUpperCase() as 'STJ' | 'STF';
  if (t !== 'STJ' && t !== 'STF') {
    return <div className="p-6 text-center text-muted-foreground">Tribunal desconhecido.</div>;
  }
  return <InformativosTribunalInner tribunal={t} />;
}

export const InformativosSTJ = () => <InformativosTribunalInner tribunal="STJ" />;
export const InformativosSTF = () => <InformativosTribunalInner tribunal="STF" />;