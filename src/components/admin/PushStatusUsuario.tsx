import { useEffect, useState } from 'react';
import { BellRing, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface TokenInfo {
  platform: string;
  created_at: string;
  updated_at: string;
  last_success_at: string | null;
  invalidated_at: string | null;
  invalid_reason: string | null;
}

interface EventoInfo {
  event_type: string;
  platform: string | null;
  created_at: string;
  campaign_id: string | null;
  titulo: string | null;
}

interface Status {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  tokens: TokenInfo[];
  eventos: EventoInfo[];
  resumo: { sent: number; delivered: number; opened: number; failed: number } | null;
}

const dia = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const diaHora = (v?: string | null) =>
  v ? `${dia(v)} ${new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—';

const ROTULO_EVENTO: Record<string, string> = {
  sent: 'Enviada',
  delivered: 'Entregue',
  opened: 'Aberta',
  converted: 'Clicou',
  failed: 'Falhou',
};

/**
 * Situação das notificações de um usuário: se tem app instalado, se desinstalou,
 * e o histórico recente de envio/entrega/abertura. Base para reengajamento.
 */
export function PushStatusUsuario({ userId }: { userId: string }) {
  const [s, setS] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('admin_push_status_usuario' as any, { _user_id: userId });
      if (cancel) return;
      if (error) console.warn('push status', error);
      setS((data as unknown as Status) ?? null);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [userId]);

  const enviarTeste = async () => {
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: 'Teste do painel',
          body: 'Se você recebeu isso, as notificações estão funcionando 👌',
          url: '/',
          audience: { user_ids: [userId] },
          mirror_canal: false,
        },
      });
      if (error) throw error;
      const enviados = (data as any)?.sent ?? 0;
      toast[enviados > 0 ? 'success' : 'error'](
        enviados > 0 ? `Push enviado (${enviados} dispositivo)` : 'Nenhum dispositivo válido para este usuário',
      );
    } catch (e: any) {
      toast.error('Falha ao enviar', { description: e?.message });
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!s) return null;

  const ativos = s.tokens.filter((t) => !t.invalidated_at);
  const desinstalado = !ativos.length && s.tokens.some((t) => t.invalid_reason === 'unregistered');
  const ultimoInvalidado = s.tokens
    .filter((t) => t.invalidated_at)
    .sort((a, b) => (b.invalidated_at! > a.invalidated_at! ? 1 : -1))[0];

  const statusLabel = ativos.length
    ? 'Recebe notificações'
    : desinstalado
      ? `Desinstalou o app · ${dia(ultimoInvalidado?.invalidated_at)}`
      : 'Sem token — nunca permitiu notificações';
  const statusCor = ativos.length
    ? 'bg-primary/15 text-primary'
    : desinstalado
      ? 'bg-destructive/15 text-destructive'
      : 'bg-muted text-muted-foreground';

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 space-y-3">
      <div className="flex items-center gap-2 font-body text-[14px] font-medium text-muted-foreground">
        <BellRing className="w-[18px] h-[18px] text-primary" /> Notificações
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 font-body text-[13px] font-medium ${statusCor}`}>
          {statusLabel}
        </span>
        {ativos.map((t, i) => (
          <span key={i} className="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-body text-[13px] text-foreground">
            {t.platform}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 font-body text-[13px]">
        <Item label="Nome" value={s.nome || '—'} />
        <Item label="Telefone" value={s.telefone || '—'} />
        <Item label="E-mail" value={s.email || '—'} />
        <Item label="Último envio OK" value={diaHora(ativos[0]?.last_success_at ?? null)} />
      </div>

      {s.resumo && (
        <div className="flex flex-wrap gap-2 font-body text-[13px] text-muted-foreground">
          <span>{s.resumo.sent} enviadas</span>
          <span>· {s.resumo.delivered} entregues</span>
          <span>· {s.resumo.opened} abertas</span>
          {s.resumo.failed > 0 && <span className="text-destructive">· {s.resumo.failed} falhas</span>}
        </div>
      )}

      {s.eventos.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {s.eventos.slice(0, 6).map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-2 font-body text-[13px]">
              <span className="truncate text-foreground">{e.titulo || 'Notificação'}</span>
              <span className="shrink-0 text-muted-foreground">
                {ROTULO_EVENTO[e.event_type] || e.event_type} · {diaHora(e.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" variant="outline" className="w-full" onClick={enviarTeste} disabled={enviando || !ativos.length}>
        {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Enviar push de teste
      </Button>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="truncate text-foreground">{value}</div>
    </div>
  );
}
