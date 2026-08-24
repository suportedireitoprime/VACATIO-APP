import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/vademecum/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, Image as ImageIcon, Mic, Type, ChevronRight, RefreshCw, User as UserIcon, Bot, Mail, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAppOrigin } from "@/lib/aiFunctionOrigins";

type LogRow = {
  id: string;
  created_at: string;
  function_name: string;
  kind: "text" | "image" | "tts" | "stt" | "embedding" | "ocr" | "vision";
  model: string;
  trigger_type: "manual" | "auto";
  input_units: number;
  output_units: number;
  cost_usd: number;
  duration_ms: number | null;
  success: boolean;
  error: string | null;
  ref_id: string | null;
  user_id: string | null;
};

type Periodo = 7 | 30;
type AtorFilter = "all" | "user" | "app";

type Actor =
  | { tipo: "user"; key: string; label: string; sublabel?: string }
  | { tipo: "app";  key: string; label: string; sublabel?: string };

type FuncStats = {
  function_name: string;
  kind: LogRow["kind"];
  models: string[];
  execs: number;
  manual: number;
  auto: number;
  cost: number;
  errors: number;
  lastAt: string | null;
  topActors: { actor: Actor; execs: number; cost: number }[];
};

const KIND_META: Record<LogRow["kind"], { label: string; icon: any; color: string }> = {
  text:      { label: "Texto",       icon: Type,      color: "text-sky-500" },
  image:     { label: "Imagem",      icon: ImageIcon, color: "text-fuchsia-500" },
  tts:       { label: "Voz",         icon: Mic,       color: "text-amber-500" },
  stt:       { label: "Transcrição", icon: Mic,       color: "text-emerald-500" },
  embedding: { label: "Embedding",   icon: Activity,  color: "text-violet-500" },
  ocr:       { label: "OCR",         icon: Type,      color: "text-orange-500" },
  vision:    { label: "Visão",       icon: ImageIcon, color: "text-cyan-500" },
};

const fmtUsd = (v: number) => `US$ ${v.toFixed(4)}`;
const fmtBrl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4, maximumFractionDigits: 4 });

function useUsdBrl() {
  const [rate, setRate] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cached = sessionStorage.getItem("usd_brl_rate");
        if (cached) {
          const p = JSON.parse(cached);
          if (Date.now() - p.ts < 10 * 60_000) {
            setRate(p.rate); setUpdatedAt(p.updatedAt); return;
          }
        }
        const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL");
        const j = await r.json();
        const bid = Number(j?.USDBRL?.bid);
        const ts = j?.USDBRL?.create_date ?? new Date().toISOString();
        if (!cancelled && Number.isFinite(bid) && bid > 0) {
          setRate(bid); setUpdatedAt(ts);
          sessionStorage.setItem("usd_brl_rate", JSON.stringify({ rate: bid, updatedAt: ts, ts: Date.now() }));
        }
      } catch (e) { console.warn("USD→BRL falhou", e); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);
  return { rate, updatedAt };
}
const fmtRel = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h atrás`;
  return `${Math.round(h / 24)} d atrás`;
};

function getActor(row: LogRow, users: Map<string, { name: string; email: string | null }>): Actor {
  if (row.user_id) {
    const u = users.get(row.user_id);
    return {
      tipo: "user",
      key: `user:${row.user_id}`,
      label: u?.name ?? "Usuário",
      sublabel: u?.email ?? row.user_id.slice(0, 8),
    };
  }
  if (row.trigger_type === "manual") {
    return { tipo: "user", key: "user:anon", label: "Admin", sublabel: "sessão sem ID" };
  }
  const origin = getAppOrigin(row.function_name);
  return { tipo: "app", key: `app:${origin}`, label: "Aplicativo", sublabel: origin };
}

export default function AdminMonitorApis() {
  const navigate = useNavigate();
  const [periodo, setPeriodo] = useState<Periodo>(7);
  const [kindFilter, setKindFilter] = useState<LogRow["kind"] | "all">("all");
  const [atorFilter, setAtorFilter] = useState<AtorFilter>("all");
  const [rows, setRows] = useState<LogRow[]>([]);
  const [users, setUsers] = useState<Map<string, { name: string; email: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<LogRow[]>([]);
  const [view, setView] = useState<"detail" | "users">("detail");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { rate: usdBrl, updatedAt: rateAt } = useUsdBrl();
  const toBrl = (v: number) => (usdBrl ? fmtBrl(v * usdBrl) : "R$ —");

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - periodo * 86400_000).toISOString();
    const { data, error } = await supabase
      .from("ai_usage_log")
      .select("id,created_at,function_name,kind,model,trigger_type,input_units,output_units,cost_usd,duration_ms,success,error,ref_id,user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) console.error(error);
    const list = (data ?? []) as unknown as LogRow[];
    setRows(list);

    // Busca nome/email para user_ids únicos
    const uids = Array.from(new Set(list.map(r => r.user_id).filter(Boolean))) as string[];
    if (uids.length) {
      const { data: actors, error: e2 } = await supabase.rpc("admin_ai_usage_actors", { _user_ids: uids });
      if (e2) console.warn("admin_ai_usage_actors", e2);
      const map = new Map<string, { name: string; email: string | null }>();
      (actors ?? []).forEach((a: any) => map.set(a.user_id, { name: a.display_name ?? "Usuário", email: a.email ?? null }));
      setUsers(map);
    } else {
      setUsers(new Map());
    }
    setLoading(false);
  };

  useEffect(() => { void load();   }, [periodo]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (atorFilter !== "all") {
        const ator = getActor(r, users);
        if (atorFilter !== ator.tipo) return false;
      }
      return true;
    });
  }, [rows, kindFilter, atorFilter, users]);

  const totals = useMemo(() => {
    const cost = filtered.reduce((s, r) => s + Number(r.cost_usd || 0), 0);
    const execs = filtered.length;
    const manual = filtered.filter(r => r.trigger_type === "manual").length;
    const errors = filtered.filter(r => !r.success).length;
    return { cost, execs, manual, errors };
  }, [filtered]);

  const origemBreakdown = useMemo(() => {
    let userCost = 0, appCost = 0, userExecs = 0, appExecs = 0;
    for (const r of filtered) {
      const ator = getActor(r, users);
      const c = Number(r.cost_usd || 0);
      if (ator.tipo === "user") { userCost += c; userExecs++; }
      else { appCost += c; appExecs++; }
    }
    return { userCost, appCost, userExecs, appExecs };
  }, [filtered, users]);

  const perFn: FuncStats[] = useMemo(() => {
    const map = new Map<string, FuncStats>();
    for (const r of filtered) {
      const key = r.function_name;
      let s = map.get(key);
      if (!s) {
        s = { function_name: key, kind: r.kind, models: [], execs: 0, manual: 0, auto: 0, cost: 0, errors: 0, lastAt: null, topActors: [] };
        map.set(key, s);
      }
      s.execs++;
      s.cost += Number(r.cost_usd || 0);
      if (r.trigger_type === "manual") s.manual++; else s.auto++;
      if (!r.success) s.errors++;
      if (!s.models.includes(r.model)) s.models.push(r.model);
      if (!s.lastAt || r.created_at > s.lastAt) s.lastAt = r.created_at;
    }
    // topActors por função
    for (const s of map.values()) {
      const acc = new Map<string, { actor: Actor; execs: number; cost: number }>();
      for (const r of filtered) {
        if (r.function_name !== s.function_name) continue;
        const actor = getActor(r, users);
        const prev = acc.get(actor.key);
        if (prev) { prev.execs++; prev.cost += Number(r.cost_usd || 0); }
        else acc.set(actor.key, { actor, execs: 1, cost: Number(r.cost_usd || 0) });
      }
      s.topActors = Array.from(acc.values()).sort((a, b) => b.cost - a.cost || b.execs - a.execs).slice(0, 3);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost || b.execs - a.execs);
  }, [filtered, users]);

  type UserAgg = {
    actor: Actor;
    user_id: string | null;
    execs: number;
    cost: number;
    errors: number;
    lastAt: string;
    functions: Map<string, number>;
    kinds: Set<LogRow["kind"]>;
  };

  const perUser: UserAgg[] = useMemo(() => {
    const map = new Map<string, UserAgg>();
    for (const r of filtered) {
      const actor = getActor(r, users);
      if (actor.tipo !== "user") continue;
      let u = map.get(actor.key);
      if (!u) {
        u = { actor, user_id: r.user_id, execs: 0, cost: 0, errors: 0, lastAt: r.created_at, functions: new Map(), kinds: new Set() };
        map.set(actor.key, u);
      }
      u.execs++;
      u.cost += Number(r.cost_usd || 0);
      if (!r.success) u.errors++;
      if (r.created_at > u.lastAt) u.lastAt = r.created_at;
      u.functions.set(r.function_name, (u.functions.get(r.function_name) ?? 0) + 1);
      u.kinds.add(r.kind);
    }
    return Array.from(map.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }, [filtered, users]);

  const selectedUserAgg = useMemo(
    () => perUser.find(u => u.actor.key === selectedUser) ?? null,
    [perUser, selectedUser],
  );
  const selectedUserRows = useMemo(
    () => selectedUser ? rows.filter(r => getActor(r, users).key === selectedUser).slice(0, 50) : [],
    [rows, users, selectedUser],
  );

  useEffect(() => {
    if (!selected) { setHistory([]); return; }
    const items = rows.filter(r => r.function_name === selected).slice(0, 50);
    setHistory(items);
  }, [selected, rows]);

  const userPct = origemBreakdown.userCost + origemBreakdown.appCost > 0
    ? (origemBreakdown.userCost / (origemBreakdown.userCost + origemBreakdown.appCost)) * 100
    : 0;

  return (
    <div className="min-h-dvh bg-background pb-8">
      <PageHeader title="APIs de IA" onBack={() => navigate("/admin-monitoramento")} />

      <div className="p-4 space-y-4">
        {/* Toggle Detalhe / Usuários */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-secondary/40 border border-border/60">
          <button
            onClick={() => setView("detail")}
            className={cn(
              "py-2 rounded-xl text-[12px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5",
              view === "detail" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Activity className="w-3.5 h-3.5" /> Detalhe
          </button>
          <button
            onClick={() => setView("users")}
            className={cn(
              "py-2 rounded-xl text-[12px] font-semibold transition-colors inline-flex items-center justify-center gap-1.5",
              view === "users" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <UserIcon className="w-3.5 h-3.5" /> Usuários
            {perUser.length > 0 && (
              <span className="ml-1 text-[10px] font-mono opacity-80">{perUser.length}</span>
            )}
          </button>
        </div>

        {view === "detail" ? (
        <>
        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-2">

          <SummaryCard
            label={`Custo (${periodo}d)`}
            value={usdBrl ? toBrl(totals.cost) : fmtUsd(totals.cost)}
            hint={usdBrl ? fmtUsd(totals.cost) : undefined}
          />
          <SummaryCard label={`Execuções (${periodo}d)`} value={String(totals.execs)} />
          <SummaryCard label="Manuais" value={String(totals.manual)} />
          <SummaryCard label="Erros" value={String(totals.errors)} tone={totals.errors > 0 ? "danger" : "muted"} />
        </div>

        {/* Gasto por origem */}
        <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-2">Gasto por origem</div>
          <div className="h-2 rounded-full bg-background overflow-hidden flex">
            <div className="bg-primary" style={{ width: `${userPct}%` }} />
            <div className="bg-fuchsia-500 flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 text-primary" />
              <div>
                <div className="font-mono font-semibold text-foreground">
                  {usdBrl ? toBrl(origemBreakdown.userCost) : fmtUsd(origemBreakdown.userCost)}
                </div>
                <div className="text-[10px] text-muted-foreground">Usuários · {origemBreakdown.userExecs}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Bot className="w-3 h-3 text-fuchsia-500" />
              <div className="text-right">
                <div className="font-mono font-semibold text-foreground">
                  {usdBrl ? toBrl(origemBreakdown.appCost) : fmtUsd(origemBreakdown.appCost)}
                </div>
                <div className="text-[10px] text-muted-foreground">Aplicativo · {origemBreakdown.appExecs}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cotação */}
        <div className="text-[10.5px] text-muted-foreground font-mono">
          {usdBrl
            ? `USD → BRL: R$ ${usdBrl.toFixed(4)}${rateAt ? ` · ${rateAt}` : ""}`
            : "Buscando cotação USD → BRL…"}
        </div>

        {/* Filtros de ator */}
        <div className="flex flex-wrap items-center gap-2">
          <SegBtn active={atorFilter === "all"}  onClick={() => setAtorFilter("all")}>Todos os atores</SegBtn>
          <SegBtn active={atorFilter === "user"} onClick={() => setAtorFilter("user")}>
            <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />Usuários</span>
          </SegBtn>
          <SegBtn active={atorFilter === "app"}  onClick={() => setAtorFilter("app")}>
            <span className="inline-flex items-center gap-1"><Bot className="w-3 h-3" />Aplicativo</span>
          </SegBtn>
        </div>

        {/* Filtros de período/tipo */}
        <div className="flex flex-wrap items-center gap-2">
          <SegBtn active={periodo === 7} onClick={() => setPeriodo(7)}>7 dias</SegBtn>
          <SegBtn active={periodo === 30} onClick={() => setPeriodo(30)}>30 dias</SegBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <SegBtn active={kindFilter === "all"}   onClick={() => setKindFilter("all")}>Todos</SegBtn>
          <SegBtn active={kindFilter === "text"}  onClick={() => setKindFilter("text")}>Texto</SegBtn>
          <SegBtn active={kindFilter === "image"} onClick={() => setKindFilter("image")}>Imagem</SegBtn>
          <SegBtn active={kindFilter === "tts"}   onClick={() => setKindFilter("tts")}>Voz</SegBtn>
          <SegBtn active={kindFilter === "stt"}   onClick={() => setKindFilter("stt")}>STT</SegBtn>
          <SegBtn active={kindFilter === "ocr"}   onClick={() => setKindFilter("ocr")}>OCR</SegBtn>
          <SegBtn active={kindFilter === "vision"} onClick={() => setKindFilter("vision")}>Visão</SegBtn>
          <button
            onClick={() => void load()}
            className="ml-auto p-2 rounded-lg bg-secondary/60 hover:bg-secondary text-muted-foreground"
            aria-label="Atualizar"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {/* Lista por função */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : perFn.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Nenhuma chamada registrada nesse período.
          </div>
        ) : (
          <div className="space-y-2">
            {perFn.map((s) => {
              const meta = KIND_META[s.kind];
              const Icon = meta.icon;
              const manualPct = s.execs > 0 ? Math.round((s.manual / s.execs) * 100) : 0;
              return (
                <button
                  key={s.function_name}
                  onClick={() => setSelected(s.function_name)}
                  className="w-full text-left rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 transition-colors p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0", meta.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-body text-sm font-semibold text-foreground truncate">
                          {s.function_name}
                        </div>
                        <span className="text-[10px] uppercase font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded">
                          {meta.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {s.models.join(" · ")}
                      </div>

                      {/* Barra manual vs auto */}
                      <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden flex">
                        <div className="bg-primary" style={{ width: `${manualPct}%` }} />
                        <div className="bg-muted-foreground/40 flex-1" />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10.5px] text-muted-foreground">
                        <span>{s.manual} manual · {s.auto} auto</span>
                        {s.lastAt && <span>{fmtRel(s.lastAt)}</span>}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                        <Stat label="Execs" value={String(s.execs)} />
                        <Stat label="Custo" value={usdBrl ? toBrl(s.cost) : fmtUsd(s.cost)} />
                        <Stat label="Erros" value={String(s.errors)} tone={s.errors > 0 ? "danger" : "muted"} />
                      </div>

                      {/* Top atores */}
                      {s.topActors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {s.topActors.map((a) => (
                            <div key={a.actor.key} className="flex items-center gap-1.5 text-[10.5px]">
                              <ActorBadge actor={a.actor} />
                              <span className="text-muted-foreground truncate flex-1 min-w-0">
                                {a.actor.label}
                                {a.actor.sublabel && <span className="opacity-70"> · {a.actor.sublabel}</span>}
                              </span>
                              <span className="font-mono text-muted-foreground shrink-0">
                                {a.execs} · {usdBrl ? toBrl(a.cost) : fmtUsd(a.cost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        </>
        ) : (
          /* Aba Usuários */
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : perUser.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
                Nenhum usuário fez chamadas nesse período.
              </div>
            ) : perUser.map((u) => (
              <button
                key={u.actor.key}
                onClick={() => setSelectedUser(u.actor.key)}
                className="w-full text-left rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 transition-colors p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                    {(u.actor.label || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body text-sm font-semibold text-foreground truncate">{u.actor.label}</div>
                    {u.actor.sublabel && (
                      <div className="text-[11px] text-muted-foreground truncate">{u.actor.sublabel}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtRel(u.lastAt)}</span>
                      <span>·</span>
                      <span>{u.execs} chamadas</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                      <Stat label="Custo" value={usdBrl ? toBrl(u.cost) : fmtUsd(u.cost)} />
                      <Stat label="Funções" value={String(u.functions.size)} />
                      <Stat label="Erros" value={String(u.errors)} tone={u.errors > 0 ? "danger" : "muted"} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-3" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de detalhes do usuário */}
      <Dialog open={!!selectedUser} onOpenChange={(v) => !v && setSelectedUser(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-left font-display text-base font-bold">
              {selectedUserAgg?.actor.label ?? "Usuário"}
            </DialogTitle>
            {selectedUserAgg?.actor.sublabel && (
              <p className="text-[11px] text-muted-foreground text-left inline-flex items-center gap-1">
                <Mail className="w-3 h-3" /> {selectedUserAgg.actor.sublabel}
              </p>
            )}
          </DialogHeader>
          {selectedUserAgg && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Chamadas" value={String(selectedUserAgg.execs)} />
                <Stat label="Custo" value={usdBrl ? toBrl(selectedUserAgg.cost) : fmtUsd(selectedUserAgg.cost)} />
                <Stat label="Erros" value={String(selectedUserAgg.errors)} tone={selectedUserAgg.errors > 0 ? "danger" : "muted"} />
              </div>

              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1.5">Funções usadas</div>
                <div className="space-y-1">
                  {Array.from(selectedUserAgg.functions.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([fn, n]) => (
                      <div key={fn} className="flex items-center justify-between text-[11.5px] bg-secondary/30 rounded-lg px-2 py-1.5">
                        <span className="truncate">{fn}</span>
                        <span className="font-mono text-muted-foreground shrink-0 ml-2">{n}×</span>
                      </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground mb-1.5">Últimas chamadas</div>
                <div className="space-y-1.5">
                  {selectedUserRows.map((h) => (
                    <div key={h.id} className="rounded-lg border border-border/60 bg-secondary/20 p-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground truncate">{h.function_name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">
                          {new Date(h.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10.5px] text-muted-foreground font-mono">
                        <span>{h.model} · {KIND_META[h.kind].label}</span>
                        <span>{usdBrl ? toBrl(Number(h.cost_usd)) : fmtUsd(Number(h.cost_usd))}</span>
                      </div>
                      {!h.success && h.error && (
                        <div className="mt-1 text-[10px] text-destructive line-clamp-2">{h.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Drawer de histórico */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0 bg-background border-border">
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/50">
            <SheetTitle className="font-display text-base font-bold text-foreground text-left">
              {selected}
            </SheetTitle>
            <p className="text-[11px] text-muted-foreground text-left">Últimas {history.length} chamadas</p>
          </SheetHeader>
          <div className="p-3 space-y-2">
            {history.map((h) => {
              const actor = getActor(h, users);
              return (
                <div key={h.id} className="rounded-xl border border-border/60 bg-secondary/20 p-2.5 text-[11.5px]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ActorBadge actor={actor} />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{actor.label}</div>
                        {actor.sublabel && <div className="text-[10px] text-muted-foreground truncate">{actor.sublabel}</div>}
                      </div>
                    </div>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0",
                      h.trigger_type === "manual" ? "bg-primary/20 text-primary" : "bg-muted-foreground/10 text-muted-foreground",
                    )}>{h.trigger_type}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10.5px] text-muted-foreground font-mono">
                    <span>{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-1 text-[10.5px] text-muted-foreground">
                    <span>in: {h.input_units}</span>
                    <span>out: {h.output_units}</span>
                    <span>{usdBrl ? toBrl(Number(h.cost_usd)) : fmtUsd(Number(h.cost_usd))}</span>
                    <span>{h.duration_ms ? `${h.duration_ms}ms` : "—"}</span>
                  </div>
                  {!h.success && h.error && (
                    <div className="mt-1 text-[10.5px] text-destructive line-clamp-2">{h.error}</div>
                  )}
                  {h.ref_id && (
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono truncate">ref: {h.ref_id}</div>
                  )}
                </div>
              );
            })}
            {history.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">Sem histórico.</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ActorBadge({ actor }: { actor: Actor }) {
  if (actor.tipo === "user") {
    const initial = (actor.label || "?").trim().charAt(0).toUpperCase();
    return (
      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
        {initial}
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-500 flex items-center justify-center shrink-0">
      <Bot className="w-3.5 h-3.5" />
    </div>
  );
}

function SummaryCard({ label, value, tone = "default", hint }: { label: string; value: string; tone?: "default" | "danger" | "muted"; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/30 p-3">
      <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn(
        "text-lg font-semibold mt-0.5",
        tone === "danger" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground",
      )}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{hint}</div>}
    </div>
  );
}

function Stat({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "danger" }) {
  return (
    <div className="rounded-lg bg-background px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={cn("font-mono font-semibold", tone === "danger" ? "text-destructive" : "text-foreground")}>{value}</div>
    </div>
  );
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
