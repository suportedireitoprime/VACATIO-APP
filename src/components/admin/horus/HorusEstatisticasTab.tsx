import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, User, MessageSquare, Send, Search, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';

type Stats = {
  user_id: string; telefone: string; nome_preferido: string | null;
  plano_atual: string | null; dias_streak_estudo: number;
  materia_mais_estudada_7d: string | null; ultimo_artigo_lido: string | null;
  total_questoes_respondidas: number; pct_acerto_geral: number;
  contexto_formatado: string | null; updated_at: string;
};
type IntentLog = { id: string; telefone: string; mensagem: string; intent: string; confidence: number | null; created_at: string };
type Proactive = { id: string; telefone: string; motivo: string; mensagem_enviada: string; enviada_em: string; respondida: boolean };

const INTENT_COLORS: Record<string, string> = {
  duvida_juridica: 'bg-emerald-500/15 text-emerald-500',
  duvida_app: 'bg-blue-500/15 text-blue-500',
  bate_papo: 'bg-purple-500/15 text-purple-500',
  fora_escopo: 'bg-amber-500/15 text-amber-500',
  ininteligivel: 'bg-slate-500/15 text-slate-400',
  suporte: 'bg-red-500/15 text-red-500',
};

export function HorusEstatisticasTab() {
  const [tab, setTab] = useState<'users' | 'intents' | 'proactive' | 'config'>('users');
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: 'users', label: 'Usuários', icon: User },
          { id: 'intents', label: 'Intenções', icon: MessageSquare },
          { id: 'proactive', label: 'Proativos', icon: Send },
          { id: 'config', label: 'Config', icon: Pause },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-b-2 -mb-px transition ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersPanel />}
      {tab === 'intents' && <IntentsPanel />}
      {tab === 'proactive' && <ProactivePanel />}
      {tab === 'config' && <ConfigPanel />}
    </div>
  );
}

function UsersPanel() {
  const [items, setItems] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Stats | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    let query = supabase.from('horus_user_stats').select('*').order('updated_at', { ascending: false }).limit(50);
    if (q) query = query.or(`telefone.ilike.%${q}%,nome_preferido.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) toast.error('Falha ao carregar');
    setItems((data as any) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [q]);

  async function forceSync(userId: string) {
    setSyncing(true);
    const { error } = await supabase.functions.invoke('horus-stats-sync', { body: { user_id: userId, force: true } });
    setSyncing(false);
    if (error) return toast.error('Falha ao sincronizar');
    toast.success('Sincronizado');
    load();
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por telefone ou nome" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Nenhum usuário com estatísticas ainda. Elas são geradas quando alguém usa o app.</div>
      ) : (
        items.map((s) => (
          <button
            key={s.user_id}
            onClick={() => setSelected(s)}
            className="w-full text-left rounded-xl border border-border bg-card p-3 hover:bg-accent/50"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{s.nome_preferido || s.telefone || 'Sem nome'}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.plano_atual === 'pro' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                {s.plano_atual}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {s.dias_streak_estudo > 0 && <span>🔥 {s.dias_streak_estudo}d</span>}
              {s.materia_mais_estudada_7d && <span>📚 {s.materia_mais_estudada_7d}</span>}
              {s.total_questoes_respondidas > 0 && <span>✓ {s.pct_acerto_geral}%</span>}
            </div>
          </button>
        ))
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">{selected.nome_preferido || selected.telefone}</h3>
            <div className="text-xs text-muted-foreground mb-3">Atualizado {new Date(selected.updated_at).toLocaleString('pt-BR')}</div>
            <pre className="text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap font-mono">{selected.contexto_formatado || '(sem contexto formatado)'}</pre>
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={() => forceSync(selected.user_id)} disabled={syncing}>
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Forçar recálculo'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IntentsPanel() {
  const [items, setItems] = useState<IntentLog[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('horus_intent_logs').select('*').order('created_at', { ascending: false }).limit(100);
      setItems((data as any) || []);
      setLoading(false);
    })();
  }, []);
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  if (!items.length) return <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma intenção classificada ainda.</div>;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${INTENT_COLORS[it.intent] || 'bg-muted text-muted-foreground'}`}>
              {it.intent} {it.confidence ? `(${Math.round(it.confidence * 100)}%)` : ''}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleTimeString('pt-BR')}</span>
          </div>
          <p className="text-xs">{it.mensagem}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{it.telefone}</p>
        </div>
      ))}
    </div>
  );
}

function ProactivePanel() {
  const [items, setItems] = useState<Proactive[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('horus_proactive_log').select('*').order('enviada_em', { ascending: false }).limit(50);
    setItems((data as any) || []);
    setLoading(false);
  }
  async function runNow() {
    setTriggering(true);
    const { data, error } = await supabase.functions.invoke('horus-proactive-scheduler', { body: { manual: true } });
    setTriggering(false);
    if (error) return toast.error('Falha: ' + error.message);
    toast.success(`Enviados: ${(data as any)?.enviados ?? 0}`);
    load();
  }
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={runNow} disabled={triggering} className="w-full">
        {triggering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
        Executar agora
      </Button>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : !items.length ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Nenhuma mensagem proativa enviada ainda.</div>
      ) : (
        items.map((p) => (
          <div key={p.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">{p.motivo}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(p.enviada_em).toLocaleString('pt-BR')}</span>
            </div>
            <p className="text-xs">{p.mensagem_enviada}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{p.telefone} {p.respondida && '· respondida ✓'}</p>
          </div>
        ))
      )}
    </div>
  );
}

function ConfigPanel() {
  const [paused, setPaused] = useState(false);
  const [freq, setFreq] = useState(48);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('horus_config').select('chave, valor');
      const p = (data || []).find((r: any) => r.chave === 'proativos_pausados');
      const f = (data || []).find((r: any) => r.chave === 'proativos_frequencia_horas');
      setPaused(p?.valor === true);
      setFreq(Number(f?.valor ?? 48));
      setLoading(false);
    })();
  }, []);
  async function togglePause(v: boolean) {
    setPaused(v);
    await supabase.from('horus_config').upsert({ chave: 'proativos_pausados', valor: v as any });
    toast.success(v ? 'Proativos pausados' : 'Proativos ativos');
  }
  async function saveFreq() {
    await supabase.from('horus_config').upsert({ chave: 'proativos_frequencia_horas', valor: freq as any });
    toast.success('Frequência salva');
  }
  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <Label>Pausar mensagens proativas (kill switch)</Label>
          <p className="text-[10px] text-muted-foreground">Quando ativo, o cron não envia nenhuma mensagem automática.</p>
        </div>
        <Switch checked={paused} onCheckedChange={togglePause} />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <Label>Frequência mínima entre proativos (horas por usuário)</Label>
        <div className="flex gap-2">
          <Input type="number" min={12} max={720} value={freq} onChange={(e) => setFreq(Number(e.target.value))} />
          <Button size="sm" onClick={saveFreq}>Salvar</Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Padrão: 48h. Nenhum usuário recebe mais de 1 msg proativa nesse intervalo.</p>
      </div>
    </div>
  );
}
