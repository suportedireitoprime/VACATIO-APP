import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Bell, Users, BookOpen, Send, CheckCircle2, XCircle, Clock, Calendar, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const AdminLembretesBiblioteca = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [topLivros, setTopLivros] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [dias, setDias] = useState(7);

  const load = async () => {
    setLoading(true);
    const [s, l, u, r] = await Promise.all([
      supabase.rpc('admin_lembretes_biblioteca_stats', { _dias: dias }),
      supabase.rpc('admin_lembretes_biblioteca_top_livros', { _limit: 10 }),
      supabase.rpc('admin_lembretes_biblioteca_top_users', { _limit: 10 }),
      supabase.rpc('admin_lembretes_biblioteca_recent', { _limit: 50 }),
    ]);
    setStats(s.data || null);
    setTopLivros((l.data as any[]) || []);
    setTopUsers((u.data as any[]) || []);
    setRecent((r.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dias]);

  const kpis = [
    { label: 'Ativos', value: stats?.total_ativos ?? 0, icon: Bell, cor: 'text-primary' },
    { label: 'Usuários', value: stats?.usuarios_unicos ?? 0, icon: Users, cor: 'text-blue-500' },
    { label: 'Com livro', value: stats?.com_livro ?? 0, icon: BookOpen, cor: 'text-purple-500' },
    { label: `Disparos ${dias}d`, value: stats?.disparos_periodo ?? 0, icon: Send, cor: 'text-emerald-500' },
  ];

  const maxHora = Math.max(1, ...((stats?.por_hora || []).map((h: any) => h.total)));
  const maxDia = Math.max(1, ...((stats?.por_dia_semana || []).map((d: any) => d.total)));

  return (
    <div className="min-h-dvh bg-background pb-24">
      <PageHeader title="Lembretes · Biblioteca" subtitle="Métricas e disparos" onBack={() => navigate('/admin-lembretes')} />
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={`text-xs px-3 py-1.5 rounded-md font-body ${dias === d ? 'bg-background text-foreground font-bold' : 'text-muted-foreground'}`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-2xl border border-border bg-card p-4">
                <Icon className={`w-5 h-5 ${k.cor} mb-2`} />
                <p className="text-2xl font-bold font-heading">{loading ? <Skeleton className="h-7 w-12" /> : k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-heading font-bold flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-primary" /> Horários preferidos</h3>
            {loading ? <Skeleton className="h-32" /> : (
              <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 24 }).map((_, h) => {
                  const row = (stats?.por_hora || []).find((x: any) => x.hora === h);
                  const total = row?.total || 0;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/70 rounded-t transition-all"
                        style={{ height: `${(total / maxHora) * 100}%`, minHeight: total ? 2 : 0 }}
                        title={`${h}h: ${total}`}
                      />
                      {h % 3 === 0 && <span className="text-[9px] text-muted-foreground">{h}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-heading font-bold flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-primary" /> Dias da semana</h3>
            {loading ? <Skeleton className="h-32" /> : (
              <div className="flex items-end gap-2 h-32">
                {DIAS.map((label, i) => {
                  const row = (stats?.por_dia_semana || []).find((x: any) => x.dia === i);
                  const total = row?.total || 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{total}</span>
                      <div className="w-full bg-primary rounded-t" style={{ height: `${(total / maxDia) * 100}%`, minHeight: total ? 2 : 0 }} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-heading font-bold mb-3">Por canal ({dias}d)</h3>
            {loading ? <Skeleton className="h-16" /> : (
              <div className="space-y-2">
                {Object.entries(stats?.por_canal || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{k.replace('_', ' ')}</span>
                    <span className="font-bold">{v as number}</span>
                  </div>
                ))}
                {!Object.keys(stats?.por_canal || {}).length && <p className="text-xs text-muted-foreground">Sem dados</p>}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-heading font-bold mb-3">Estilos de mensagem</h3>
            {loading ? <Skeleton className="h-16" /> : (
              <div className="space-y-2">
                {Object.entries(stats?.por_estilo || {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{k}</span>
                    <span className="font-bold">{v as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-heading font-bold mb-3">Livros mais lembrados</h3>
          {loading ? <Skeleton className="h-32" /> : topLivros.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum livro com lembrete ainda</p>
          ) : (
            <ul className="divide-y divide-border">
              {topLivros.map((l, i) => (
                <li key={l.livro_id} className="flex items-center gap-3 py-2">
                  <span className="text-xs w-5 text-muted-foreground">{i + 1}</span>
                  {l.livro_capa ? (
                    <img src={l.livro_capa} alt="" className="w-9 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-9 h-12 rounded bg-muted flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body truncate">{l.livro_titulo || l.livro_id}</p>
                    <p className="text-xs text-muted-foreground">{l.usuarios} usuário(s)</p>
                  </div>
                  <span className="text-sm font-bold">{l.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-heading font-bold mb-3">Usuários mais engajados</h3>
          {loading ? <Skeleton className="h-32" /> : topUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados</p>
          ) : (
            <ul className="divide-y divide-border">
              {topUsers.map((u, i) => (
                <li key={u.user_id} className="flex items-center gap-3 py-2">
                  <span className="text-xs w-5 text-muted-foreground">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body truncate">{u.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{u.total}</p>
                    <p className="text-[10px] text-muted-foreground">{u.ativos} ativos</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-heading font-bold mb-3">Últimos disparos</h3>
          {loading ? <Skeleton className="h-40" /> : recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum disparo registrado ainda. Rode a função <code>reminders-tick</code> para começar a acumular histórico.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((d) => (
                <li key={d.id} className="py-2 flex items-center gap-3">
                  {d.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : d.status === 'error' ? <XCircle className="w-4 h-4 text-destructive shrink-0" /> : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body truncate">
                      <span className="font-bold">{d.display_name || '—'}</span>
                      <span className="text-muted-foreground"> · {d.livro_titulo || 'sem livro'}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {d.canal} · {format(new Date(d.created_at), "d MMM HH:mm", { locale: ptBR })}
                      {d.error ? ` · ${d.error}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLembretesBiblioteca;
