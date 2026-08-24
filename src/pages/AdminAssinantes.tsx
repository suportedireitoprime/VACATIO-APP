import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Crown, AlertTriangle, Copy, ExternalLink, Search, Users, TrendingUp, XCircle, FlaskConical, DollarSign, CircleDollarSign, Wallet, PieChart as PieIcon } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

type LocalRow = {
  user_id: string;
  product_id: string | null;
  base_plan_id: string | null;
  purchase_token: string | null;
  order_id: string | null;
  status: string;
  auto_renewing: boolean | null;
  start_time: string | null;
  expires_at: string | null;
  cancel_reason: string | null;
  updated_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_test: boolean;
};

type Metrics = {
  ativosHoje: number;
  novos7: number;
  cancelados7: number;
  renovacoes30: number;
  timeline: { date: string; label: string; ativos: number; novos: number; cancelados: number; renovacoes: number }[];
};

type SyncInfo = {
  checked?: number;
  updated?: number;
  errors?: { status: number; message: string }[];
  lastSyncAt?: string;
  error?: string;
};

type Payload = {
  sync: SyncInfo | null;
  local: {
    rows: LocalRow[];
    stats: { total: number; active: number; test: number; byPlan: Record<string, number> };
    metrics: Metrics;
  };
  packageName: string;
  serviceAccountEmail: string | null;
};


// Preços vigentes (BRL) — usados para estimar MRR/ARR/receita acumulada
// Ajuste aqui se mudar o preço no Play Console.
const PRICE_TABLE: Record<string, { monthly: number; sticker: number; period: 'mensal' | 'anual' | 'semestral' }> = {
  vade_mecum_mensal: { monthly: 21.9, sticker: 21.9, period: 'mensal' },
  vade_mecum_anual: { monthly: 119.9 / 12, sticker: 119.9, period: 'anual' },
  vade_mecum_semestral: { monthly: 59.9 / 6, sticker: 59.9, period: 'semestral' },
};

const priceFor = (productId: string | null) => {
  if (!productId) return null;
  return PRICE_TABLE[productId] ?? null;
};

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SUBSCRIPTION_STATE_ACTIVE: { label: 'Ativa', cls: 'bg-emerald-500/15 text-emerald-500' },
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: { label: 'Em graça', cls: 'bg-amber-500/15 text-amber-500' },
  SUBSCRIPTION_STATE_ON_HOLD: { label: 'Em espera', cls: 'bg-orange-500/15 text-orange-500' },
  SUBSCRIPTION_STATE_PAUSED: { label: 'Pausada', cls: 'bg-slate-500/15 text-slate-400' },
  SUBSCRIPTION_STATE_CANCELED: { label: 'Cancelada', cls: 'bg-rose-500/15 text-rose-500' },
  SUBSCRIPTION_STATE_EXPIRED: { label: 'Expirada', cls: 'bg-muted text-muted-foreground' },
  SUBSCRIPTION_STATE_PENDING: { label: 'Pendente', cls: 'bg-blue-500/15 text-blue-500' },
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const EMPTY_METRICS: Metrics = { ativosHoje: 0, novos7: 0, cancelados7: 0, renovacoes30: 0, timeline: [] };


const AdminAssinantes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true); setError(null);
    const { data: res, error: err } = await supabase.functions.invoke('play-reporting', { body: {} });
    if (err) {
      setError(err.message ?? 'Erro ao carregar');
      setLoading(false);
      return;
    }
    setData(res as Payload);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.local.rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!term) return true;
      return [r.email, r.display_name, r.product_id, r.order_id].some((v) =>
        (v ?? '').toLowerCase().includes(term),
      );
    });
  }, [data, q, statusFilter]);

  const sync = data?.sync ?? null;
  const syncErrors = sync?.errors ?? [];
  const syncFatal = sync?.error ?? null;
  const sync403 = syncErrors.some((e) => e.status === 401 || e.status === 403);

  const metrics = data?.local.metrics ?? EMPTY_METRICS;
  const activeToday = metrics.ativosHoje;
  const newLast7 = metrics.novos7;
  const canceledLast7 = metrics.cancelados7;
  const renewals30 = metrics.renovacoes30;
  const timeline = metrics.timeline;


  // Receita estimada com base nos assinantes ativos NÃO-teste e preços vigentes
  const revenue = useMemo(() => {
    if (!data) return { mrr: 0, arr: 0, paying: 0, avgTicket: 0, lifetimeGross: 0, byPlan: [] as any[] };
    const active = data.local.rows.filter(
      (r) => !r.is_test && (r.status === 'SUBSCRIPTION_STATE_ACTIVE' || r.status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'),
    );
    let mrr = 0;
    let lifetimeGross = 0;
    const planAgg: Record<string, { plan: string; count: number; mrr: number }> = {};
    active.forEach((r) => {
      const p = priceFor(r.product_id);
      if (!p) return;
      mrr += p.monthly;
      lifetimeGross += p.sticker; // 1 ciclo cobrado
      const key = r.product_id ?? 'desconhecido';
      const cur = planAgg[key] ?? { plan: key, count: 0, mrr: 0 };
      cur.count += 1;
      cur.mrr += p.monthly;
      planAgg[key] = cur;
    });
    // soma cobrança única de todas as linhas (aprox. GMV bruto acumulado no banco)
    data.local.rows.filter((r) => !r.is_test).forEach((r) => {
      const p = priceFor(r.product_id);
      if (p) lifetimeGross += 0; // já contamos acima; mantém explícito
    });
    return {
      mrr,
      arr: mrr * 12,
      paying: active.length,
      avgTicket: active.length ? mrr / active.length : 0,
      lifetimeGross,
      byPlan: Object.values(planAgg).sort((a, b) => b.mrr - a.mrr),
    };
  }, [data]);

  // Receita bruta acumulada (todas as assinaturas já registradas, exceto testes)
  const grossAccumulated = useMemo(() => {
    if (!data) return 0;
    return data.local.rows
      .filter((r) => !r.is_test)
      .reduce((sum, r) => sum + (priceFor(r.product_id)?.sticker ?? 0), 0);
  }, [data]);

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-muted-foreground">
        Acesso restrito.
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20">
      <PageHeader
        title="Assinantes Play"
        subtitle="Métricas + lista individual"
        onBack={() => navigate('/admin-funcoes')}
        rightAction={
          <button onClick={load} disabled={loading} aria-label="Recarregar" className="w-11 h-11 rounded-full bg-muted flex items-center justify-center disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {(syncFatal || syncErrors.length > 0) && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              {sync403 ? 'Falta permissão no Play Console' : 'Erro ao consultar o Google Play'}
            </div>
            {syncFatal && <p className="text-xs font-mono break-all text-muted-foreground">{syncFatal}</p>}
            {syncErrors.map((e, i) => (
              <p key={i} className="text-xs font-mono break-all text-muted-foreground">
                HTTP {e.status} — {e.message}
              </p>
            ))}
            {sync403 && (
              <p className="text-muted-foreground">
                A service account existe, mas não tem acesso. Vá em <strong>Play Console → Usuários e permissões</strong>,
                localize a conta abaixo e habilite <em>"Ver informações financeiras, pedidos e cancelamentos"</em> e o acesso ao app <code>{data?.packageName}</code>.
              </p>
            )}
            {data?.serviceAccountEmail && (
              <div className="flex items-center gap-2 rounded-md bg-background/70 px-2 py-1.5 text-xs font-mono break-all">
                <span className="flex-1">{data.serviceAccountEmail}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(data.serviceAccountEmail!); toast.success('Copiado'); }}
                  className="p-1 hover:bg-muted rounded"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <a
              href="https://play.google.com/console/u/0/developers/-/users-and-permissions"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Abrir Play Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {sync && !syncFatal && (
          <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
            Sincronizado com o Google Play: <strong className="text-foreground">{sync.checked ?? 0}</strong> compra(s) verificada(s),{' '}
            <strong className="text-foreground">{sync.updated ?? 0}</strong> atualizada(s)
            {sync.lastSyncAt && <> · {new Date(sync.lastSyncAt).toLocaleString('pt-BR')}</>}
          </div>
        )}


        {/* HERO — Receita estimada */}
        <section className="rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CircleDollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Receita recorrente estimada</div>
                <div className="text-xs text-muted-foreground">com base em {revenue.paying} assinante(s) pagante(s)</div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-background/60 text-muted-foreground">BRL</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RevenueCard label="MRR" value={fmtBRL(revenue.mrr)} hint="mensal" accent="from-amber-500 to-orange-500" />
            <RevenueCard label="ARR" value={fmtBRL(revenue.arr)} hint="anualizado" accent="from-emerald-500 to-teal-500" />
            <RevenueCard label="Ticket médio" value={fmtBRL(revenue.avgTicket)} hint="por assinante/mês" accent="from-blue-500 to-cyan-500" />
            <RevenueCard label="Bruto acumulado" value={fmtBRL(grossAccumulated)} hint="ciclos vendidos" accent="from-purple-500 to-fuchsia-500" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            * Estimativa a partir dos preços de tabela (R$ 21,90 mensal · R$ 119,90 anual). Não inclui impostos nem taxa do Google (15/30%).
          </p>
        </section>

        {/* Gráfico timeline */}
        {timeline.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold">Evolução (últimos 30 dias)</h2>
            </div>
            <div className="h-56 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="gNovos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCanc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(346 87% 60%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(346 87% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gAtivos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160 84% 45%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(160 84% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={28} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="ativos" name="Ativos" stroke="hsl(160 84% 45%)" fill="url(#gAtivos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="novos" name="Novos" stroke="hsl(217 91% 60%)" fill="url(#gNovos)" strokeWidth={2} />
                  <Area type="monotone" dataKey="cancelados" name="Cancelados" stroke="hsl(346 87% 60%)" fill="url(#gCanc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Métricas agregadas */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
            Últimos 30 dias (sincronizado com o Google Play)
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard icon={Users} label="Ativos hoje" value={loading ? '…' : activeToday} tint="text-emerald-500" />
            <StatCard icon={TrendingUp} label="Novos 7d" value={loading ? '…' : newLast7} tint="text-blue-500" />
            <StatCard icon={XCircle} label="Cancelados 7d" value={loading ? '…' : canceledLast7} tint="text-rose-500" />
            <StatCard icon={RefreshCw} label="Renovações 30d" value={loading ? '…' : renewals30} tint="text-amber-500" />
          </div>
        </section>

        {/* Métricas locais */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
            Do nosso banco
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard icon={Users} label="Total registradas" value={loading ? '…' : data?.local.stats.total ?? 0} tint="text-primary" />
            <StatCard icon={Crown} label="Premium agora" value={loading ? '…' : data?.local.stats.active ?? 0} tint="text-amber-500" />
            <StatCard icon={FlaskConical} label="Testes" value={loading ? '…' : data?.local.stats.test ?? 0} tint="text-purple-500" />
            <StatCard icon={TrendingUp} label="SKUs ativos" value={loading ? '…' : Object.keys(data?.local.stats.byPlan ?? {}).length} tint="text-cyan-500" />
          </div>
          {revenue.byPlan.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <PieIcon className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Receita por plano (MRR)</h3>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue.byPlan} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v.toFixed(0)}`} />
                    <YAxis type="category" dataKey="plan" fontSize={10} width={110} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any, k) => (k === 'mrr' ? fmtBRL(Number(v)) : v)}
                    />
                    <Bar dataKey="mrr" name="MRR" radius={[0, 6, 6, 0]}>
                      {revenue.byPlan.map((_, i) => (
                        <Cell key={i} fill={['hsl(43 96% 56%)', 'hsl(160 84% 45%)', 'hsl(217 91% 60%)', 'hsl(280 65% 60%)'][i % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {revenue.byPlan.map((p) => (
                  <div key={p.plan} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.plan}</span>
                    <span className="font-medium">{p.count} · {fmtBRL(p.mrr)}/mês</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Aviso testadores */}
        <section className="rounded-lg border border-border bg-card p-3 text-sm space-y-1.5">
          <div className="font-medium">Testadores de licença</div>
          <p className="text-xs text-muted-foreground">
            O Google não expõe por API a lista de testadores licenciados. Gerencie-os em{' '}
            <a
              href="https://play.google.com/console/u/0/developers/-/settings/license-testing"
              target="_blank" rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Play Console → Testes de licença <ExternalLink className="w-3 h-3" />
            </a>.
            Identificamos como <strong>teste</strong> as assinaturas com duração menor que 1h (padrão do Play para contas de licença).
          </p>
        </section>

        {/* Lista */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por e-mail, nome, SKU, order id…"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="all">Todos</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {loading && <div className="p-6 text-center text-sm text-muted-foreground">Carregando…</div>}
            {!loading && filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma assinatura encontrada.</div>
            )}
            {!loading && filtered.map((r) => {
              const status = STATUS_LABEL[r.status] ?? { label: r.status, cls: 'bg-muted text-muted-foreground' };
              return (
                <div key={`${r.user_id}-${r.purchase_token}`} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover bg-muted" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(r.display_name ?? r.email ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{r.display_name ?? r.email ?? 'Usuário'}</span>
                      {r.is_test && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                          <FlaskConical className="w-2.5 h-2.5" /> teste
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{r.email ?? '—'}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {r.product_id ?? '—'} · início {fmtDate(r.start_time)} · expira {fmtDate(r.expires_at)}
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};




function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: number | string; tint: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`w-3.5 h-3.5 ${tint}`} /> {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function RevenueCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className="relative rounded-xl border border-border bg-background/60 backdrop-blur p-3 overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent}`} />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg md:text-xl font-bold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

export default AdminAssinantes;