import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ChevronRight, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import {
  fetchPesquisasProntas,
  getPesquisasProntasCached,
  subscribePesquisasProntas,
  agruparPorRamo,
  type PesquisaPronta,
  type Tribunal,
} from '@/services/pesquisasProntasService';

const TRIBUNAL_META: Record<Tribunal, { label: string; sub: string }> = {
  STF: {
    label: 'Pesquisas Prontas — STF',
    sub: 'Temas organizados pelo Supremo Tribunal Federal',
  },
  STJ: {
    label: 'Pesquisas Prontas — STJ',
    sub: 'Coletâneas temáticas do Superior Tribunal de Justiça',
  },
};

export default function PesquisasProntasLista() {
  const navigate = useNavigate();
  const { tribunal: tribunalParam } = useParams<{ tribunal: string }>();
  const tribunal = (tribunalParam?.toUpperCase() as Tribunal) || 'STF';
  const meta = TRIBUNAL_META[tribunal] ?? TRIBUNAL_META.STF;

  const initialCache = getPesquisasProntasCached(tribunal);
  const [loading, setLoading] = useState(!(initialCache && initialCache.length > 0));
  const [itens, setItens] = useState<PesquisaPronta[]>(initialCache ?? []);
  const [q, setQ] = useState('');
  const [openRamos, setOpenRamos] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    fetchPesquisasProntas(tribunal).then((data) => {
      if (!alive) return;
      setItens(data);
      setLoading(false);
    });
    const unsub = subscribePesquisasProntas(tribunal, (rows) => {
      if (!alive) return;
      setItens(rows);
      setLoading(false);
    });
    return () => { alive = false; unsub(); };
  }, [tribunal]);

  const filtered = useMemo(() => {
    if (!q.trim()) return itens;
    const needle = q.trim().toLowerCase();
    return itens.filter(
      (it) =>
        it.titulo.toLowerCase().includes(needle) ||
        it.ramo.toLowerCase().includes(needle) ||
        (it.assunto || '').toLowerCase().includes(needle),
    );
  }, [itens, q]);

  const grupos = useMemo(() => agruparPorRamo(filtered), [filtered]);

  useEffect(() => {
    if (q.trim()) {
      setOpenRamos(new Set(grupos.map((g) => g.ramo)));
    }
  }, [q, grupos]);

  const toggleRamo = (ramo: string) => {
    setOpenRamos((prev) => {
      const next = new Set(prev);
      if (next.has(ramo)) next.delete(ramo);
      else next.add(ramo);
      return next;
    });
  };

  return (
    <div className="min-h-dvh bg-background pb-16">
      <div
        className="relative overflow-hidden rounded-b-[36px] border-b border-emerald-500/30 shadow-2xl shadow-black/50"
        style={{
          background:
            'linear-gradient(160deg, hsl(158 72% 32%) 0%, hsl(150 65% 22%) 55%, hsl(148 55% 14%) 100%)',
        }}
      >
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />

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
              Coleções
            </p>
            <h1 className="font-display uppercase tracking-wider text-white text-lg font-bold leading-tight">
              {tribunal}
            </h1>
          </div>
          <div className="w-11 h-11" />
        </div>

        <div className="relative px-6 pb-8 pt-4 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-emerald-900/40">
            <Sparkles className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h2 className="mt-3 font-display uppercase tracking-wider text-white text-xl font-bold drop-shadow px-4">
            {meta.label}
          </h2>
          <p className="mt-1 text-white/85 text-sm max-w-md font-body px-4">{meta.sub}</p>

          <div className="mt-5 w-full max-w-md flex items-center gap-2 rounded-full bg-white/95 pl-4 pr-1 py-1 shadow-lg shadow-emerald-950/30">
            <Search className="w-4 h-4 text-emerald-800/70 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar tema ou ramo"
              className="flex-1 bg-transparent outline-none text-sm text-emerald-950 placeholder:text-emerald-800/50 py-2"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando coletâneas…
          </div>
        ) : grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/40 p-6 text-center">
            <p className="font-display text-[14px] font-bold text-foreground">
              Nenhum tema disponível ainda
            </p>
            <p className="mt-1 font-body text-[12.5px] text-muted-foreground">
              A coleção de {tribunal} ainda não foi importada. Peça ao administrador para
              rodar a importação.
            </p>
          </div>
        ) : (
          grupos.map((g) => {
            const open = openRamos.has(g.ramo);
            return (
              <div
                key={g.ramo}
                className="rounded-2xl border border-border bg-secondary/40 overflow-hidden"
              >
                <button
                  onClick={() => toggleRamo(g.ramo)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-display text-[14px] font-bold text-foreground leading-tight tracking-wide">
                      {g.ramo}
                    </p>
                    <p className="font-body text-[11.5px] text-muted-foreground mt-0.5">
                      {g.itens.length} tema{g.itens.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <div className="border-t border-border/60 divide-y divide-border/40">
                    {g.itens.map((it) => (
                      <button
                        key={it.id}
                        onClick={() =>
                          navigate(
                            `/jurisprudencia/prontas/${tribunal.toLowerCase()}/${encodeURIComponent(
                              it.slug,
                            )}`,
                          )
                        }
                        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          {it.assunto && (
                            <p className="font-body text-[10.5px] uppercase tracking-wider text-emerald-500/80 font-semibold">
                              {it.assunto}
                            </p>
                          )}
                          <p className="font-body text-[13px] text-foreground leading-snug">
                            {it.titulo}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}