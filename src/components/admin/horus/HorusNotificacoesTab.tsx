import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, XCircle, Play, Radio } from 'lucide-react';
import { toast } from 'sonner';

type Automation = {
  id: string; key: string; nome: string; descricao: string | null;
  enabled: boolean; emoji: string | null; last_run_at: string | null;
};

// Config visual + função de teste para cada automação conhecida
const AUTOMATION_META: Record<string, { color: string; testFn?: string; testBody?: any }> = {
  radar_leis_novas:        { color: '#3B82F6' /* função é disparada pelo scraper — sem teste manual seguro */ },
  noticias_juridicas_novas:{ color: '#8B5CF6', testFn: 'sync-noticias-migalhas', testBody: {} },
  blog_edicao_publicado:   { color: '#EC4899' /* dispara junto do runner; teste via aba Blog */ },
  resenha_diaria_manha:    { color: '#F59E0B' },
  videoaula_nova:          { color: '#EF4444' },
  curiosidade_diaria:      { color: '#10B981' },
  biblioteca_novo_livro:   { color: '#0EA5E9' },
  
  aviso_admin:             { color: '#94A3B8' },
};

type Log = {
  id: string; phone_e164: string; kind: string; tipo: string;
  status: string; error: string | null; sent_at: string | null;
  created_at: string; campaign_id: string | null; payload: any;
};

export function HorusNotificacoesTab() {
  // Automações
  const [autos, setAutos] = useState<Automation[]>([]);
  const [autosLoading, setAutosLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  async function loadAutos() {
    const { data } = await supabase
      .from('push_automations')
      .select('id, key, nome, descricao, enabled, emoji, last_run_at')
      .order('created_at');
    setAutos((data as any) || []); setAutosLoading(false);
  }

  async function toggleAuto(a: Automation, v: boolean) {
    setAutos((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: v } : x));
    const { error } = await supabase.from('push_automations').update({ enabled: v }).eq('id', a.id);
    if (error) { toast.error('Falha ao atualizar'); loadAutos(); return; }
    toast.success(v ? `${a.nome} ativada` : `${a.nome} desativada`);
  }

  async function testAuto(a: Automation) {
    const meta = AUTOMATION_META[a.key];
    if (!meta?.testFn) { toast.info('Esta automação dispara automaticamente pela fonte de dados.'); return; }
    setRunning(a.key);
    const { error } = await supabase.functions.invoke(meta.testFn, { body: meta.testBody || {} });
    setRunning(null);
    if (error) { toast.error('Falha: ' + error.message); return; }
    toast.success('Disparo iniciado — veja em "Últimos envios"');
    loadAutos();
  }

  useEffect(() => { loadAutos(); }, []);

  // Log (envios WhatsApp)
  const [items, setItems] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    let q = supabase.from('horus_outbound_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (tipo !== 'all') q = q.eq('tipo', tipo);
    if (status !== 'all') q = q.eq('status', status);
    const { data } = await q;
    setItems((data as any) || []); setLoading(false);
  }
  useEffect(() => { load(); }, [tipo, status]);

  useEffect(() => {
    const ch = supabase.channel('horus_outbound_admin')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'horus_outbound_log' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = items.filter((i) => !query || i.phone_e164.includes(query));
  const hoje = new Date().toDateString();
  const enviadosHoje = items.filter((i) => i.status === 'sent' && new Date(i.created_at).toDateString() === hoje).length;
  const falhasHoje = items.filter((i) => i.status === 'failed' && new Date(i.created_at).toDateString() === hoje).length;
  const total = enviadosHoje + falhasHoje;
  const taxa = total > 0 ? Math.round((enviadosHoje / total) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* ===== Automações configuradas ===== */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm">Automações configuradas</h3>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Push notifications automáticas disparadas pelo sistema.
        </p>
        {autosLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {autos.map((a) => {
              const meta = AUTOMATION_META[a.key] || { color: '#64748B' };
              const last = a.last_run_at ? new Date(a.last_run_at).toLocaleString('pt-BR') : 'nunca';
              return (
                <div key={a.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${meta.color}20` }}
                    >
                      {a.emoji || '🔔'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{a.nome}</p>
                        <Switch checked={a.enabled} onCheckedChange={(v) => toggleAuto(a, v)} />
                      </div>
                      {a.descricao && <p className="text-[11px] text-muted-foreground line-clamp-2">{a.descricao}</p>}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className="text-[10px] text-muted-foreground">Última: {last}</span>
                        {AUTOMATION_META[a.key]?.testFn && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 text-[10px] px-2"
                            disabled={running === a.key || !a.enabled}
                            onClick={() => testAuto(a)}
                          >
                            {running === a.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Play className="w-3 h-3 mr-1" />Testar</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== Últimos envios (WhatsApp) ===== */}
      <section className="space-y-3">
        <h3 className="font-display text-sm">Últimos envios (WhatsApp)</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="font-display text-lg text-green-500">{enviadosHoje}</p>
          <p className="text-[10px] text-muted-foreground">enviados hoje</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="font-display text-lg text-destructive">{falhasHoje}</p>
          <p className="text-[10px] text-muted-foreground">falhas hoje</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 text-center">
          <p className="font-display text-lg">{taxa}%</p>
          <p className="text-[10px] text-muted-foreground">sucesso</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="resposta_ai">Resposta IA</SelectItem>
            <SelectItem value="campanha">Campanha</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="sistema">Sistema</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar telefone..." />

      {loading ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div> :
        filtered.length === 0 ? <p className="text-center text-sm text-muted-foreground py-8">Nenhum envio.</p> :
        filtered.map((i) => (
          <div key={i.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                {i.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">+{i.phone_e164}</p>
                  <p className="text-[10px] text-muted-foreground">{i.tipo} · {i.kind}</p>
                  {i.error && <p className="text-[10px] text-destructive line-clamp-2 mt-1">{i.error}</p>}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground shrink-0">{new Date(i.created_at).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        ))
      }
      </section>
    </div>
  );
}