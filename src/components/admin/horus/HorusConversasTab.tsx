import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Search, Send, Ban, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type User = { id: string; phone_e164: string; blocked: boolean; last_seen_at: string | null };
type Msg = { id: string; role: string; content: string; created_at: string; duration_ms?: number | null; tokens_in?: number | null; tokens_out?: number | null; tokens_total?: number | null; cost_usd?: number | null; tools_used?: string[] | null; model?: string | null };

export function HorusConversasTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<User | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const { data: usersData } = await supabase
      .from('horus_whatsapp_users')
      .select('id, phone_e164, blocked, last_seen_at, msg_count, linked_user_id, display_name, onboarding_state')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(200);
    const list = usersData || [];
    if (list.length) {
      const phones = list.map((u: any) => u.phone_e164);
      const { data: counts } = await supabase.from('horus_conversations').select('phone_e164, created_at, content').in('phone_e164', phones).order('created_at', { ascending: false }).limit(1000);
      const byPhone: Record<string, { count: number; last?: any }> = {};
      (counts || []).forEach((c: any) => {
        if (!byPhone[c.phone_e164]) byPhone[c.phone_e164] = { count: 0, last: c };
        byPhone[c.phone_e164].count++;
      });
      setUsers(list.map((u: any) => ({ ...u, ...(byPhone[u.phone_e164] || { count: 0 }) })));
    } else setUsers([]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openConversation(u: User) {
    setOpen(u); setMsgsLoading(true); setMsgs([]);
    const { data } = await supabase.from('horus_conversations').select('id, role, content, created_at, duration_ms, tokens_in, tokens_out, tokens_total, cost_usd, tools_used, model').eq('phone_e164', u.phone_e164).order('created_at', { ascending: true }).limit(200);
    setMsgs((data as any) || []);
    setMsgsLoading(false);
  }

  async function sendManual() {
    if (!open || !replyText.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke('horus-send-manual', { body: { phone: open.phone_e164, text: replyText.trim() } });
    setSending(false);
    if (error) { toast.error(error.message || 'Falhou'); return; }
    toast.success('Enviada');
    setReplyText('');
    openConversation(open);
  }

  async function toggleBlock(u: User) {
    await supabase.from('horus_whatsapp_users').update({ blocked: !u.blocked }).eq('id', u.id);
    toast.success(u.blocked ? 'Desbloqueado' : 'Bloqueado');
    load();
    if (open?.id === u.id) setOpen({ ...u, blocked: !u.blocked });
  }

  const filtered = users.filter((u) => !query || u.phone_e164.includes(query));

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por telefone..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conversa ainda.</p>
      ) : filtered.map((u) => (
        <button key={u.id} onClick={() => openConversation(u)} className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm flex items-center gap-2">
                  <span>{u.display_name ? u.display_name : `+${u.phone_e164}`}</span>
                  {u.linked_user_id ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">Cadastrado</span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">Sem cadastro</span>
                  )}
                </p>
                {u.display_name && <p className="font-body text-[10px] text-muted-foreground">+{u.phone_e164}</p>}
                <p className="font-body text-xs text-muted-foreground line-clamp-1">{u.last?.content || 'Sem mensagens'}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">{u.msg_count ?? u.count ?? 0} msgs</p>
              {u.last_seen_at && <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(u.last_seen_at), { locale: ptBR, addSuffix: true })}</p>}
              {u.blocked && <p className="text-[10px] text-destructive">bloqueado</p>}
            </div>
          </div>
        </button>
      ))}

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className="max-h-[95vh] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>+{open?.phone_e164}</span>
              {open && <Button variant="ghost" size="sm" onClick={() => toggleBlock(open)}><Ban className="w-4 h-4 mr-1" />{open.blocked ? 'Desbloquear' : 'Bloquear'}</Button>}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-2">
            {msgsLoading ? <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div> : msgs.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'assistant' ? 'ml-auto bg-primary/10' : 'bg-muted'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString('pt-BR')}</p>
                {m.role === 'assistant' && (m.duration_ms || m.tokens_total || m.cost_usd || (m.tools_used && m.tools_used.length)) ? (
                  <div className="mt-2 pt-2 border-t border-primary/20 flex flex-wrap gap-1.5 text-[9px]">
                    {m.duration_ms != null && (
                      <span className="px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">⏱ {(m.duration_ms / 1000).toFixed(2)}s</span>
                    )}
                    {m.cost_usd != null && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">💰 US$ {Number(m.cost_usd).toFixed(6)}</span>
                    )}
                    {m.tokens_total != null && (
                      <span className="px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">🔤 {m.tokens_in ?? 0}→{m.tokens_out ?? 0} ({m.tokens_total})</span>
                    )}
                    {m.model && (
                      <span className="px-1.5 py-0.5 rounded bg-background/60 text-muted-foreground">🧠 {m.model}</span>
                    )}
                    {(m.tools_used || []).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">🔧 {t}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Enviar mensagem manual..." rows={2} className="flex-1" />
            <Button onClick={sendManual} disabled={sending || !replyText.trim()}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}