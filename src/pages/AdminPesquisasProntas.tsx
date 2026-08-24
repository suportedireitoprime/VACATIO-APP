import { useEffect, useState } from "react";
import { supabaseCloud } from "@/integrations/supabase/cloudClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Play, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Counts {
  stf: number;
  stj: number;
  results: number;
  byRamoStf: { ramo: string; count: number }[];
  byRamoStj: { ramo: string; count: number }[];
}

async function loadCounts(): Promise<Counts> {
  const [stf, stj, res, allTemas] = await Promise.all([
    supabaseCloud.from("jurisprudencia_prontas").select("id", { count: "exact", head: true }).eq("tribunal", "STF"),
    supabaseCloud.from("jurisprudencia_prontas").select("id", { count: "exact", head: true }).eq("tribunal", "STJ"),
    supabaseCloud.from("jurisprudencia_prontas_resultados").select("pesquisa_id", { count: "exact", head: true }),
    supabaseCloud.from("jurisprudencia_prontas").select("tribunal, ramo"),
  ]);
  const rows = (allTemas.data ?? []) as { tribunal: string; ramo: string }[];
  const grp = (t: string) => {
    const m = new Map<string, number>();
    rows.filter(r => r.tribunal === t).forEach(r => m.set(r.ramo, (m.get(r.ramo) ?? 0) + 1));
    return Array.from(m.entries()).map(([ramo, count]) => ({ ramo, count })).sort((a, b) => a.ramo.localeCompare(b.ramo));
  };
  return {
    stf: stf.count ?? 0,
    stj: stj.count ?? 0,
    results: res.count ?? 0,
    byRamoStf: grp("STF"),
    byRamoStj: grp("STJ"),
  };
}

export default function AdminPesquisasProntas() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<null | "stf" | "stj" | "backfill">(null);
  const [backfillLog, setBackfillLog] = useState<string[]>([]);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState({ done: 0, total: 0 });

  async function refresh() {
    setLoading(true);
    try { setCounts(await loadCounts()); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, []);

  async function runIndex(tribunal: "stf" | "stj") {
    setPhase(tribunal);
    try {
      const fn = tribunal === "stf" ? "pesquisas-prontas-index-stf" : "pesquisas-prontas-index-stj";
      const { error } = await supabaseCloud.functions.invoke(fn, { body: {} });
      if (error) throw error;
      toast.success(`Indexação ${tribunal.toUpperCase()} iniciada`, { description: "Rodando em background (~30-60s). A contagem atualiza sozinha." });
    } catch (e: any) {
      toast.error("Erro", { description: e?.message ?? String(e) });
    } finally {
      setPhase(null);
    }
  }

  async function runBackfill(tribunal?: "STF" | "STJ") {
    setBackfillRunning(true);
    setBackfillLog([`Iniciando backfill${tribunal ? ` ${tribunal}` : ""}...`]);
    try {
      while (true) {
        const { data, error } = await supabaseCloud.functions.invoke("pesquisas-prontas-backfill", {
          body: { batch: 5, tribunal },
        });
        if (error) throw error;
        const r = data as any;
        setBackfillProgress({ done: r.done_now, total: r.total });
        setBackfillLog(prev => [
          ...prev.slice(-40),
          `${r.done_now}/${r.total} — lote: ${r.ok_count} OK, ${r.fail_count} falha, restante ${r.remaining}`,
        ]);
        if (r.processed === 0 || r.remaining === 0) break;
        await new Promise(res => setTimeout(res, 1200));
      }
      setBackfillLog(prev => [...prev, "✔ Backfill concluído"]);
      toast.success("Backfill concluído");
    } catch (e: any) {
      setBackfillLog(prev => [...prev, `✗ Erro: ${e?.message ?? String(e)}`]);
      toast.error("Erro no backfill", { description: e?.message ?? String(e) });
    } finally {
      setBackfillRunning(false);
      refresh();
    }
  }

  const total = (counts?.stf ?? 0) + (counts?.stj ?? 0);
  const pct = total > 0 ? Math.round(((counts?.results ?? 0) / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Admin — Pesquisas Prontas</h1>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Card className="p-4 space-y-1">
          <div className="text-sm text-muted-foreground">Estado atual</div>
          <div className="flex gap-4 text-sm">
            <span><strong>{counts?.stf ?? "—"}</strong> temas STF</span>
            <span><strong>{counts?.stj ?? "—"}</strong> temas STJ</span>
            <span><strong>{counts?.results ?? "—"}</strong> em cache</span>
          </div>
          <Progress value={pct} className="h-2 mt-2" />
          <div className="text-xs text-muted-foreground">{pct}% dos temas já com acórdãos raspados</div>
        </Card>

        {/* Fase 1 */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Fase 1 — Índice STF</div>
              <div className="text-xs text-muted-foreground">Raspa todos os ramos do portal STF (Firecrawl).</div>
            </div>
            <Button onClick={() => runIndex("stf")} disabled={phase === "stf"}>
              {phase === "stf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Rodar
            </Button>
          </div>
          {counts && counts.byRamoStf.length > 0 && (
            <div className="text-xs space-y-0.5 max-h-40 overflow-auto border rounded p-2 bg-muted/20">
              {counts.byRamoStf.map(r => (
                <div key={r.ramo} className="flex justify-between"><span>{r.ramo}</span><span>{r.count}</span></div>
              ))}
            </div>
          )}
        </Card>

        {/* Fase 2 */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Fase 2 — Índice STJ</div>
              <div className="text-xs text-muted-foreground">Raspa todas as matérias/temas do SCON.</div>
            </div>
            <Button onClick={() => runIndex("stj")} disabled={phase === "stj"}>
              {phase === "stj" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Rodar
            </Button>
          </div>
          {counts && counts.byRamoStj.length > 0 && (
            <div className="text-xs space-y-0.5 max-h-40 overflow-auto border rounded p-2 bg-muted/20">
              {counts.byRamoStj.map(r => (
                <div key={r.ramo} className="flex justify-between"><span>{r.ramo}</span><span>{r.count}</span></div>
              ))}
            </div>
          )}
        </Card>

        {/* Fase 3 */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Fase 3 — Backfill de acórdãos</div>
              <div className="text-xs text-muted-foreground">
                Percorre cada tema e cacheia os acórdãos (5 por vez). ~2 min por 100 temas.
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => runBackfill("STF")} disabled={backfillRunning}>STF</Button>
              <Button variant="outline" size="sm" onClick={() => runBackfill("STJ")} disabled={backfillRunning}>STJ</Button>
              <Button size="sm" onClick={() => runBackfill()} disabled={backfillRunning}>
                {backfillRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tudo"}
              </Button>
            </div>
          </div>
          {backfillProgress.total > 0 && (
            <Progress value={(backfillProgress.done / backfillProgress.total) * 100} className="h-2" />
          )}
          {backfillLog.length > 0 && (
            <div className="text-xs font-mono max-h-56 overflow-auto border rounded p-2 bg-muted/20 space-y-0.5">
              {backfillLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
