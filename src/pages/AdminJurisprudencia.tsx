import { useEffect, useMemo, useState } from 'react';
import { LEIS_SUPABASE_URL } from "@/lib/legislacaoBackend";
import { useNavigate } from 'react-router-dom';
import { Scale, ShieldAlert, Plus, ExternalLink, Trash2, Check, X, Pencil, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import { fetchAllRows } from '@/lib/fetchAllRows';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import GeracaoAnimacaoOverlay from '@/components/vademecum/GeracaoAnimacaoOverlay';
import { toast } from 'sonner';

type Lei = { id: string; slug: string | null; nome: string | null; nome_curto: string | null; numero_lei: string | null; ano_lei: number | null };
type MapRow = {
  id: string;
  slug_local: string;
  corpus_lei_id: number;
  corpus_lei_slug: string | null;
  nome_exibicao: string;
  ativo: boolean;
};
type CacheAgg = { corpus_lei_id: number; count: number };

export default function AdminJurisprudencia() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  const [leis, setLeis] = useState<Lei[]>([]);
  const [mapa, setMapa] = useState<MapRow[]>([]);
  const [cache, setCache] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ corpus_lei_id: string; nome_exibicao: string; ativo: boolean }>({
    corpus_lei_id: '', nome_exibicao: '', ativo: true,
  });

  const load = async () => {
    setLoading(true);
    const [ls, ms, cs] = await Promise.all([
      fetchAllRows<Lei>(() => supabase.from('vade_mecum_leis').select('id, slug, nome, nome_curto, numero_lei, ano_lei') as any),
      fetchAllRows<MapRow>(() => supabase.from('jurisprudencia_leis_map').select('*') as any),
      fetchAllRows<CacheAgg>(() => supabase.from('jurisprudencia_cache').select('corpus_lei_id') as any),
    ]);
    const cm = new Map<number, number>();
    (cs ?? []).forEach((r: any) => cm.set(r.corpus_lei_id, (cm.get(r.corpus_lei_id) ?? 0) + 1));
    setLeis((ls ?? []).filter((l) => !!l.slug).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')));
    setMapa(ms ?? []);
    setCache(cm);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const mapBySlug = useMemo(() => {
    const m = new Map<string, MapRow>();
    mapa.forEach((r) => m.set(r.slug_local, r));
    return m;
  }, [mapa]);

  const filtered = useMemo(() => {
    if (!q.trim()) return leis;
    const s = q.toLowerCase();
    return leis.filter(
      (l) =>
        l.slug?.toLowerCase().includes(s) ||
        l.nome?.toLowerCase().includes(s) ||
        l.nome_curto?.toLowerCase().includes(s),
    );
  }, [leis, q]);

  const totalMapeadas = mapa.filter((m) => m.ativo).length;
  const totalCache = Array.from(cache.values()).reduce((a, b) => a + b, 0);

  const startEdit = (lei: Lei) => {
    const cur = mapBySlug.get(lei.slug!);
    setEditing(lei.slug!);
    setDraft({
      corpus_lei_id: cur ? String(cur.corpus_lei_id) : '',
      nome_exibicao: cur?.nome_exibicao || lei.nome_curto || lei.nome || '',
      ativo: cur?.ativo ?? true,
    });
  };

  const save = async (lei: Lei) => {
    const id = Number(draft.corpus_lei_id);
    if (!id || Number.isNaN(id)) {
      toast.error('Informe um ID numérico do Corpus927.');
      return;
    }
    const cur = mapBySlug.get(lei.slug!);
    const payload = {
      slug_local: lei.slug!,
      corpus_lei_id: id,
      nome_exibicao: draft.nome_exibicao || lei.nome || lei.slug!,
      ativo: draft.ativo,
    };
    const q = cur
      ? supabase.from('jurisprudencia_leis_map').update(payload).eq('id', cur.id)
      : supabase.from('jurisprudencia_leis_map').insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success('Mapeamento salvo.');
    setEditing(null);
    load();
  };

  const remove = async (row: MapRow) => {
    if (!confirm(`Remover mapeamento de "${row.nome_exibicao}"? O cache permanece.`)) return;
    const { error } = await supabase.from('jurisprudencia_leis_map').delete().eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Removido.');
    load();
  };

  const [descobrindo, setDescobrindo] = useState(false);
  const [importandoProntas, setImportandoProntas] = useState<null | 'STF' | 'STJ'>(null);
  const [descStep, setDescStep] = useState(0);
  const [descTitulo, setDescTitulo] = useState('Descobrindo lei no Corpus927');
  const [descProgresso, setDescProgresso] = useState<{ ok: number; skip: number; total: number } | null>(null);

  const SB_URL = LEIS_SUPABASE_URL;

  const importarProntas = async (tribunal: 'STF' | 'STJ') => {
    if (!confirm(`Importar catálogo de Pesquisas Prontas do ${tribunal}? Isso substitui os registros existentes.`)) return;
    setImportandoProntas(tribunal);
    try {
      const fn = tribunal === 'STF' ? 'import-prontas-stf' : 'import-prontas-stj';
      const { data, error } = await supabase.functions.invoke(fn, { body: { wipe: true } });
      if (error) throw error;
      const total = (data as any)?.total ?? (data as any)?.inserted ?? 0;
      toast.success(`${tribunal}: ${total} temas importados.`);
    } catch (e: any) {
      toast.error(`Falha na importação ${tribunal}: ${e?.message || e}`);
    } finally {
      setImportandoProntas(null);
    }
  };

  const DESC_STEPS = [
    'Consultando catálogo Corpus927',
    'Analisando correspondências',
    'Salvando mapeamento',
    'Pronto',
  ];

  const BULK_STEPS = [
    'Consultando catálogo Corpus927',
    'Analisando correspondências',
    'Salvando mapeamentos',
    'Pronto',
  ];

  const descobrirUma = async (lei: Lei): Promise<boolean> => {
    const resp = await fetch(`${SB_URL}/functions/v1/corpus927-descobrir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug_local: lei.slug,
        nome: lei.nome || lei.nome_curto || lei.slug,
        numero_lei: lei.numero_lei,
        ano_lei: lei.ano_lei,
        apply: true,
      }),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || 'Falha');
    return !!json.confident;
  };

  const descobrirLei = async (lei: Lei) => {
    setDescTitulo(`Descobrindo ${lei.nome_curto || lei.nome}`);
    setDescStep(0);
    setDescProgresso(null);
    setDescobrindo(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setDescStep(1);
      const ok = await descobrirUma(lei);
      setDescStep(2);
      await new Promise((r) => setTimeout(r, 350));
      if (ok) {
        toast.success('Lei mapeada automaticamente.');
        setDescStep(3);
        await new Promise((r) => setTimeout(r, 400));
        setDescobrindo(false);
        load();
      } else {
        setDescobrindo(false);
        toast.error('Nenhuma correspondência confiável. Mapeie manualmente.');
      }
    } catch (e: any) {
      setDescobrindo(false);
      toast.error(e?.message || 'Falha na descoberta.');
    }
  };

  const descobrirTodas = async () => {
    const naoMapeadas = leis.filter((l) => l.slug && !mapBySlug.get(l.slug));
    if (naoMapeadas.length === 0) { toast.info('Todas as leis já estão mapeadas.'); return; }
    if (!confirm(`Tentar descoberta automática para ${naoMapeadas.length} leis não mapeadas?`)) return;
    setDescTitulo(`Descobrindo ${naoMapeadas.length} leis`);
    setDescStep(0);
    setDescProgresso({ ok: 0, skip: 0, total: naoMapeadas.length });
    setDescobrindo(true);
    let ok = 0, skip = 0;
    setDescStep(1);
    for (let i = 0; i < naoMapeadas.length; i++) {
      const lei = naoMapeadas[i];
      try {
        const success = await descobrirUma(lei);
        if (success) ok++; else skip++;
      } catch { skip++; }
      setDescProgresso({ ok, skip, total: naoMapeadas.length });
    }
    setDescStep(2);
    await new Promise((r) => setTimeout(r, 300));
    setDescStep(3);
    await new Promise((r) => setTimeout(r, 400));
    setDescobrindo(false);
    toast.success(`Descoberta concluída: ${ok} mapeadas, ${skip} sem correspondência.`);
    load();
  };


  const mobileHeader = <PageHeader title="Admin — Jurisprudência" onBack={() => navigate('/admin-funcoes')} />;

  if (!isAdmin) {
    return (
      <DesktopPageLayout activeId="admin" title="Admin — Jurisprudência" mobileHeader={mobileHeader}>
        <div className="p-8 text-center text-muted-foreground">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10" />
          Apenas administradores.
        </div>
      </DesktopPageLayout>
    );
  }

  return (
    <DesktopPageLayout
      activeId="admin"
      title="Admin — Jurisprudência"
      subtitle="Mapeie os IDs do Corpus927 para cada lei"
      mobileHeader={mobileHeader}
    >
      <GeracaoAnimacaoOverlay
        open={descobrindo}
        titulo={descProgresso ? `${descTitulo} · ${descProgresso.ok}/${descProgresso.total}` : descTitulo}
        steps={descProgresso ? BULK_STEPS : DESC_STEPS}
        stepIdx={descStep}
        estTotalSec={descProgresso ? Math.max(10, descProgresso.total * 2) : 8}
      />
      <div className="px-4 sm:px-6 py-6 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Scale className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1 flex-1">
            <p className="font-semibold text-foreground">
              {totalMapeadas} leis mapeadas · {totalCache} artigos em cache
            </p>
            <p className="text-muted-foreground text-xs">
              Use <b>Descobrir todas</b> para mapear automaticamente via nome + número da lei. Ou consulte manualmente em{' '}
              <a
                className="underline inline-flex items-center gap-1"
                href="https://corpus927.enfam.jus.br/legislacao"
                target="_blank"
                rel="noreferrer"
              >
                corpus927.enfam.jus.br <ExternalLink className="h-3 w-3" />
              </a>.
            </p>
          </div>
          <button
            onClick={descobrirTodas}
            disabled={descobrindo}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {descobrindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Descobrir todas
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 font-semibold text-foreground text-sm">Pesquisas Prontas (catálogo)</p>
          <p className="text-xs text-muted-foreground mb-3">
            Importa os temas oficiais de <b>Pesquisas Prontas</b> do STF e do STJ. Substitui o catálogo atual.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => importarProntas('STF')}
              disabled={!!importandoProntas}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {importandoProntas === 'STF' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Importar Prontas STF
            </button>
            <button
              onClick={() => importarProntas('STJ')}
              disabled={!!importandoProntas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              {importandoProntas === 'STJ' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Importar Prontas STJ (Fase 3)
            </button>
          </div>
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar lei…"
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />



        {loading ? (
          <div className="grid gap-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((lei) => {
              const cur = mapBySlug.get(lei.slug!);
              const isEd = editing === lei.slug;
              const nCache = cur ? cache.get(cur.corpus_lei_id) ?? 0 : 0;
              return (
                <div
                  key={lei.id}
                  className={`rounded-xl border p-3 ${
                    cur?.ativo ? 'border-primary/40 bg-card' : 'border-border bg-card/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: '#EFE039' }}
                    >
                      <Scale className="h-5 w-5 text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold text-foreground truncate">
                        {lei.nome_curto || lei.nome}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        <code>{lei.slug}</code>
                        {cur && (
                          <>
                            {' · '}Corpus ID <b className="text-foreground">{cur.corpus_lei_id}</b>
                            {' · '}
                            {nCache} artigos em cache
                            {!cur.ativo && ' · inativo'}
                          </>
                        )}
                      </p>
                    </div>
                    {!isEd && (
                      <div className="flex gap-1">
                        {!cur && (
                          <button
                            onClick={() => descobrirLei(lei)}
                            disabled={descobrindo}
                            className="rounded-lg border border-primary/40 bg-primary/10 p-2 text-primary hover:bg-primary/20 disabled:opacity-50"
                            title="Descobrir automaticamente"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(lei)}
                          className="rounded-lg border border-border p-2 hover:bg-muted"
                          title={cur ? 'Editar' : 'Mapear manualmente'}
                        >
                          {cur ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                        {cur && (
                          <button
                            onClick={() => remove(cur)}
                            className="rounded-lg border border-border p-2 hover:bg-destructive/10 hover:text-destructive"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEd && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-[110px_1fr_auto] sm:items-end">
                      <label className="text-xs">
                        <span className="mb-1 block text-muted-foreground">Corpus ID</span>
                        <input
                          type="number"
                          value={draft.corpus_lei_id}
                          onChange={(e) => setDraft((d) => ({ ...d, corpus_lei_id: e.target.value }))}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                          placeholder="88"
                          autoFocus
                        />
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block text-muted-foreground">Nome de exibição</span>
                        <input
                          value={draft.nome_exibicao}
                          onChange={(e) => setDraft((d) => ({ ...d, nome_exibicao: e.target.value }))}
                          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                        />
                      </label>
                      <div className="flex items-center gap-1">
                        <label className="mr-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={draft.ativo}
                            onChange={(e) => setDraft((d) => ({ ...d, ativo: e.target.checked }))}
                          />
                          ativo
                        </label>
                        <button
                          onClick={() => save(lei)}
                          className="rounded-lg bg-primary p-2 text-primary-foreground hover:opacity-90"
                          title="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded-lg border border-border p-2 hover:bg-muted"
                          title="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DesktopPageLayout>
  );
}
