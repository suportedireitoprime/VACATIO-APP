import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldAlert, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import { fetchAllRows } from '@/lib/fetchAllRows';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';

type AreaStat = {
  area: string;
  livros: number;
  ocrProntos: number;
  sugestoes: number;
  geradas: number;
  publicadas: number;
};

const AdminAprender = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [stats, setStats] = useState<AreaStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      // Base agora é LIVROS (biblioteca_estudos) → OCR (biblioteca_leitura_nativa)
      // → sumário sugerido (aprender_sumario_sugerido) → aulas geradas.
      const [livros, ocrRows, sugestoes, aulas] = await Promise.all([
        fetchAllRows<{ id: string; area: string }>(() =>
          supabase.from('biblioteca_estudos').select('id, area') as any,
        ),
        fetchAllRows<{ id: string; livro_id: string; livro_tabela: string; status: string; refino_status: string }>(() =>
          supabase.from('biblioteca_leitura_nativa')
            .select('id, livro_id, livro_tabela, status, refino_status')
            .in('livro_tabela', ['biblioteca_estudos', 'areas']) as any,
        ),
        fetchAllRows<{ livro_id: string; aula_id: string | null }>(() =>
          supabase.from('aprender_sumario_sugerido').select('livro_id, aula_id') as any,
        ),
        fetchAllRows<{ id: string; status: string; livro_origem_id: string | null }>(() =>
          supabase.from('aprender_aulas').select('id, status, livro_origem_id') as any,
        ),
      ]);

      // OCR por livro base id, mapeando pra área via biblioteca_estudos
      const livroToArea = new Map<string, string>();
      (livros ?? []).forEach((l: any) => livroToArea.set(l.id, l.area));

      const ocrByLivro = new Map<string, { nativa_id: string; pronto: boolean }>();
      (ocrRows ?? []).forEach((o: any) => {
        ocrByLivro.set(o.livro_id, {
          nativa_id: o.id,
          pronto: o.status === 'pronto' || o.refino_status === 'pronto',
        });
      });

      // Sugestões e aulas indexadas pela nativa_id do livro
      const nativaToArea = new Map<string, string>();
      ocrByLivro.forEach((v, livroId) => {
        const area = livroToArea.get(livroId);
        if (area) nativaToArea.set(v.nativa_id, area);
      });

      const aulaStatusById = new Map<string, string>();
      (aulas ?? []).forEach((a: any) => aulaStatusById.set(a.id, a.status));

      const byArea = new Map<string, AreaStat>();
      const ensure = (area: string) => {
        let cur = byArea.get(area);
        if (!cur) {
          cur = { area, livros: 0, ocrProntos: 0, sugestoes: 0, geradas: 0, publicadas: 0 };
          byArea.set(area, cur);
        }
        return cur;
      };

      (livros ?? []).forEach((l: any) => {
        const cur = ensure(l.area);
        cur.livros += 1;
        const ocr = ocrByLivro.get(l.id);
        if (ocr?.pronto) cur.ocrProntos += 1;
      });

      (sugestoes ?? []).forEach((s: any) => {
        const area = nativaToArea.get(s.livro_id);
        if (!area) return;
        const cur = ensure(area);
        cur.sugestoes += 1;
        if (s.aula_id) {
          cur.geradas += 1;
          if (aulaStatusById.get(s.aula_id) === 'published') cur.publicadas += 1;
        }
      });

      setStats(Array.from(byArea.values()).sort((a, b) => a.area.localeCompare(b.area)));
      setLoading(false);
    })();
  }, [isAdmin]);

  const filtered = useMemo(
    () => (query ? stats.filter((s) => s.area.toLowerCase().includes(query.toLowerCase())) : stats),
    [stats, query],
  );

  const totais = useMemo(
    () => stats.reduce(
      (acc, s) => {
        acc.livros += s.livros;
        acc.ocrProntos += s.ocrProntos;
        acc.sugestoes += s.sugestoes;
        acc.geradas += s.geradas;
        acc.publicadas += s.publicadas;
        return acc;
      },
      { livros: 0, ocrProntos: 0, sugestoes: 0, geradas: 0, publicadas: 0 },
    ),
    [stats],
  );

  const mobileHeader = <PageHeader title="Admin — Aprender" onBack={() => navigate('/admin-funcoes')} />;

  if (!isAdmin) {
    return (
      <DesktopPageLayout activeId="admin" title="Admin — Aprender" mobileHeader={mobileHeader}>
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
      title="Admin — Aprender"
      subtitle="Escolha uma categoria para gerar as aulas"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-6 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <GraduationCap className="h-5 w-5 text-primary" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Fase 2 — geração via livros (Mistral)</p>
            <p className="text-muted-foreground">
              {totais.ocrProntos}/{totais.livros} livros OCR pronto · {totais.geradas}/{totais.sugestoes} aulas geradas · {totais.publicadas} publicadas.
            </p>
          </div>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar categoria…"
          className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />

        {(() => {
          const denom = totais.sugestoes || totais.ocrProntos;
          const pct = denom > 0 ? Math.round((totais.geradas / denom) * 100) : 0;
          const faltam = Math.max(0, denom - totais.geradas);
          return (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Progresso geral</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>Livros: <b className="text-foreground">{totais.livros}</b></span>
                <span>OCR pronto: <b className="text-foreground">{totais.ocrProntos}</b></span>
                <span>Sugeridas: <b className="text-foreground">{totais.sugestoes}</b></span>
                <span>Geradas: <b className="text-foreground">{totais.geradas}</b></span>
                <span>Faltam: <b className="text-foreground">{faltam}</b></span>
                <span>Publicadas: <b className="text-foreground">{totais.publicadas}</b></span>
              </div>
            </div>
          );
        })()}

        {loading ? (
          <div className="grid gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria encontrada.</p>
        ) : (
          <div className="grid gap-2">
            {filtered.map((s) => {
              const denom = s.sugestoes || s.ocrProntos;
              const pct = denom > 0 ? Math.round((s.geradas / denom) * 100) : 0;
              return (
                <button
                  key={s.area}
                  onClick={() => navigate(`/admin-aprender/${encodeURIComponent(s.area)}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: '#EFE039' }}
                  >
                    <GraduationCap className="h-5 w-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-bold text-foreground truncate">{s.area}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.livros} livros · {s.ocrProntos} OCR · {s.sugestoes} sugeridas · {s.geradas} geradas ({pct}%) · {s.publicadas} pub.
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprender;
