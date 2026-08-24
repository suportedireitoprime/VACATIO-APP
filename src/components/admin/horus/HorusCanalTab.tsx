import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, RefreshCw, Send, Radio, Link2 } from 'lucide-react';
import { toast } from 'sonner';

type CanalSalvo = {
  id: string;
  jid: string;
  nome: string;
  descricao: string | null;
  invite_link: string | null;
  ativo: boolean;
  post_noticias: boolean;
  post_blog: boolean;
  post_leis: boolean;
  last_post_at: string | null;
};

type CanalWa = {
  jid: string;
  name: string;
  description: string | null;
  subscribers: number | null;
  role: string | null;
};

export function HorusCanalTab() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [canaisWa, setCanaisWa] = useState<CanalWa[]>([]);
  const [salvos, setSalvos] = useState<CanalSalvo[]>([]);
  const [erroWa, setErroWa] = useState<string | null>(null);
  const [nomeBusca, setNomeBusca] = useState('Vacatio vade mecum');
  const [texto, setTexto] = useState('');

  async function call(body: any) {
    const { data, error } = await supabase.functions.invoke('horus-admin', { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(String(data.error));
    return data;
  }

  async function load() {
    setLoading(true);
    try {
      const data = await call({ action: 'canal_list' });
      setCanaisWa(data.canais_whatsapp || []);
      setSalvos(data.salvos || []);
      setErroWa(data.erro_whatsapp || null);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar canais');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function sincronizar(opts: { jid?: string; nome?: string }) {
    setBusy('sync');
    try {
      const data = await call({ action: 'canal_sync', ...opts });
      toast.success(`Canal "${data.canal.nome}" conectado ao Horus`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Canal não encontrado');
    }
    setBusy(null);
  }

  async function togglePref(c: CanalSalvo, key: keyof CanalSalvo, value: boolean) {
    setSalvos((prev) => prev.map((x) => (x.id === c.id ? { ...x, [key]: value } : x)));
    try {
      await call({ action: 'canal_update', id: c.id, [key]: value });
    } catch (e: any) {
      toast.error(e.message || 'Falha ao salvar');
      load();
    }
  }

  async function publicar(jid: string) {
    if (!texto.trim()) return;
    setBusy('post');
    try {
      const data = await call({ action: 'canal_post', jid, text: texto });
      const ok = (data.results || []).every((r: any) => r.ok);
      ok ? toast.success('Publicado no canal') : toast.error(data.results?.[0]?.error || 'Falha ao publicar');
      setTexto('');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao publicar');
    }
    setBusy(null);
  }

  async function testarAuto(jid: string, tipo: string) {
    setBusy(tipo);
    try {
      const data = await call({ action: 'canal_auto_post', jid, tipos: [tipo], force: true });
      const r = data.results?.[0];
      if (r?.ok) toast.success(`Publicado: ${tipo}`);
      else toast.info(r?.skipped ? `Sem publicação (${r.skipped})` : r?.error || 'Nada publicado');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Falha');
    }
    setBusy(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-[12px] text-muted-foreground">
          Canais do WhatsApp em que o Horus é administrador. Ao conectar, ele publica o conteúdo do dia automaticamente.
        </p>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {erroWa && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 font-body text-xs text-destructive">
          Não foi possível listar os canais na Evolution: {erroWa}
        </div>
      )}

      {/* Buscar por nome */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h3 className="font-display text-sm flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-500" /> Conectar canal por nome
        </h3>
        <div className="flex gap-2">
          <Input value={nomeBusca} onChange={(e) => setNomeBusca(e.target.value)} placeholder="Nome do canal" />
          <Button onClick={() => sincronizar({ nome: nomeBusca })} disabled={busy === 'sync' || !nomeBusca.trim()}>
            {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar'}
          </Button>
        </div>
      </div>

      {/* Canais vistos no WhatsApp */}
      {canaisWa.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-display text-sm">Canais visíveis na instância</h3>
          {canaisWa.map((c) => (
            <div key={c.jid} className="flex items-center gap-3 border-t border-border/60 pt-3 first:border-0 first:pt-0">
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm truncate">{c.name}</p>
                <p className="font-body text-[11px] text-muted-foreground truncate">
                  {c.role || 'membro'}{c.subscribers ? ` • ${c.subscribers} inscritos` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => sincronizar({ jid: c.jid })}>
                Conectar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Canais conectados */}
      {salvos.map((c) => (
        <div key={c.id} className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm truncate">{c.nome}</p>
              <p className="font-body text-[11px] text-muted-foreground truncate">{c.jid}</p>
              {c.last_post_at && (
                <p className="font-body text-[11px] text-muted-foreground">
                  Última publicação: {new Date(c.last_post_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            <Switch checked={c.ativo} onCheckedChange={(v) => togglePref(c, 'ativo', v)} />
          </div>

          {c.invite_link && (
            <a
              href={c.invite_link}
              target="_blank"
              rel="noreferrer"
              className="font-body text-[12px] text-primary inline-flex items-center gap-1"
            >
              <Link2 className="w-3.5 h-3.5" /> Abrir canal
            </a>
          )}

          <div className="space-y-3">
            {([
              ['post_noticias', 'Notícias do dia', 'noticias'],
              ['post_blog', 'Posts do blog', 'blog'],
              ['post_leis', 'Leis novas (Radar 360)', 'leis'],
            ] as const).map(([key, label, tipo]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm">{label}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => testarAuto(c.jid, tipo)}
                  disabled={busy === tipo}
                >
                  {busy === tipo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Testar'}
                </Button>
                <Switch checked={c[key]} onCheckedChange={(v) => togglePref(c, key, v)} />
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border/60 pt-3">
            <p className="font-body text-xs text-muted-foreground">Publicação manual</p>
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escreva o que o Horus deve publicar no canal…"
              rows={4}
            />
            <Button className="w-full" onClick={() => publicar(c.jid)} disabled={busy === 'post' || !texto.trim()}>
              {busy === 'post' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Publicar no canal
            </Button>
          </div>
        </div>
      ))}

      {salvos.length === 0 && (
        <p className="font-body text-[12px] text-muted-foreground text-center py-4">
          Nenhum canal conectado ainda.
        </p>
      )}
    </div>
  );
}
