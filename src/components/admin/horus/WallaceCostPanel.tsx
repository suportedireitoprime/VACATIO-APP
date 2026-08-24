import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Loader2 } from 'lucide-react';

type Stats = {
  phone: string | null;
  nome: string | null;
  sessoes: number;
  totalDia: number;
  totalMes: number;
  custoPorSessao: number;
  msgsDia: number;
  msgsMes: number;
  tokensMes: number;
};

// Considera "sessão" um bloco de mensagens do assistente com gap < 30 min
const SESSION_GAP_MS = 30 * 60 * 1000;

export function WallaceCostPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1. Localiza Wallace pelo nome (nome_preferido ou display_name)
      const { data: users } = await supabase
        .from('horus_whatsapp_users')
        .select('phone_e164, nome_preferido, display_name')
        .or('nome_preferido.ilike.%wallace%,display_name.ilike.%wallace%')
        .limit(1);

      const wallace = users?.[0];
      if (!wallace) {
        setStats({ phone: null, nome: null, sessoes: 0, totalDia: 0, totalMes: 0, custoPorSessao: 0, msgsDia: 0, msgsMes: 0, tokensMes: 0 });
        setLoading(false);
        return;
      }

      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);

      const { data: msgs } = await supabase
        .from('horus_conversations')
        .select('created_at, cost_usd, tokens_total, tokens_in, tokens_out')
        .eq('phone_e164', wallace.phone_e164)
        .eq('role', 'assistant')
        .gte('created_at', inicioMes.toISOString())
        .order('created_at', { ascending: true })
        .limit(5000);

      const rows = (msgs || []) as any[];
      let totalMes = 0, totalDia = 0, msgsMes = 0, msgsDia = 0, tokensMes = 0;
      let sessoes = 0, ultimoTs = 0;

      for (const r of rows) {
        const ts = new Date(r.created_at).getTime();
        const cost = Number(r.cost_usd || 0);
        const toks = Number(r.tokens_total || (r.tokens_in || 0) + (r.tokens_out || 0)) || 0;
        totalMes += cost;
        msgsMes += 1;
        tokensMes += toks;
        if (ts >= inicioDia.getTime()) {
          totalDia += cost;
          msgsDia += 1;
        }
        if (ts - ultimoTs > SESSION_GAP_MS) sessoes += 1;
        ultimoTs = ts;
      }

      setStats({
        phone: wallace.phone_e164,
        nome: wallace.nome_preferido || wallace.display_name || 'Wallace',
        sessoes,
        totalDia,
        totalMes,
        custoPorSessao: sessoes > 0 ? totalMes / sessoes : 0,
        msgsDia,
        msgsMes,
        tokensMes,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-5 h-5 text-amber-500" />
        <div>
          <div className="font-semibold text-sm">Custo do Wallace</div>
          <div className="text-xs text-muted-foreground">
            {stats?.nome ? `${stats.nome} · ${stats.phone}` : 'Rastreamento exclusivo'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Calculando…
        </div>
      ) : !stats?.phone ? (
        <div className="text-sm text-muted-foreground py-4">
          Usuário "Wallace" ainda não verificou o WhatsApp.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Card label="Hoje" value={`$${stats.totalDia.toFixed(4)}`} sub={`${stats.msgsDia} msgs`} />
            <Card label="Este mês" value={`$${stats.totalMes.toFixed(4)}`} sub={`${stats.msgsMes} msgs`} />
            <Card label="Sessões (mês)" value={String(stats.sessoes)} sub="gap > 30 min" />
            <Card label="Custo/sessão" value={`$${stats.custoPorSessao.toFixed(4)}`} sub={`${stats.tokensMes.toLocaleString('pt-BR')} tokens`} />
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-bold leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
