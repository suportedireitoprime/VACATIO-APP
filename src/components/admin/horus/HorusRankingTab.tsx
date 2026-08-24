import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Loader2 } from 'lucide-react';

type Row = {
  phone_e164: string;
  nome: string | null;
  msgs: number;
  tokens: number;
  cost: number;
};

const PERIODS = [
  { id: 7, label: '7 dias' },
  { id: 30, label: '30 dias' },
] as const;

export function HorusRankingTab() {
  const [days, setDays] = useState<7 | 30>(7);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from('horus_conversations')
        .select('phone_e164, cost_usd, tokens_total, tokens_in, tokens_out')
        .eq('role', 'assistant')
        .gte('created_at', since)
        .limit(10000);

      if (error || !data) {
        setRows([]);
        setLoading(false);
        return;
      }

      const map = new Map<string, Row>();
      for (const r of data as any[]) {
        const key = r.phone_e164 || 'desconhecido';
        const prev = map.get(key) || { phone_e164: key, nome: null, msgs: 0, tokens: 0, cost: 0 };
        prev.msgs += 1;
        prev.tokens += Number(r.tokens_total || (r.tokens_in || 0) + (r.tokens_out || 0)) || 0;
        prev.cost += Number(r.cost_usd || 0);
        map.set(key, prev);
      }

      const phones = Array.from(map.keys()).filter((p) => p !== 'desconhecido');
      if (phones.length) {
        const { data: users } = await supabase
          .from('horus_whatsapp_users')
          .select('phone_e164, nome_preferido, display_name')
          .in('phone_e164', phones);
        for (const u of (users || []) as any[]) {
          const row = map.get(u.phone_e164);
          if (row) row.nome = u.nome_preferido || u.display_name || null;
        }
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.cost - a.cost).slice(0, 50);
      setRows(sorted);
      setLoading(false);
    })();
  }, [days]);

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalTokens = rows.reduce((s, r) => s + r.tokens, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setDays(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              days === p.id ? 'bg-amber-500 text-white' : 'bg-card border border-border hover:bg-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-foreground">Usuários</div>
          <div className="text-lg font-bold">{rows.length}</div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-foreground">Total USD</div>
          <div className="text-lg font-bold">${totalCost.toFixed(4)}</div>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-foreground">Total tokens</div>
          <div className="text-lg font-bold">{totalTokens.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma conversa nos últimos {days} dias.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.phone_e164}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  i === 0
                    ? 'bg-yellow-400 text-black'
                    : i === 1
                    ? 'bg-gray-300 text-black'
                    : i === 2
                    ? 'bg-amber-700 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < 3 ? <Trophy className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {r.nome || r.phone_e164}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.nome ? r.phone_e164 : ''} · {r.msgs} msgs · {r.tokens.toLocaleString('pt-BR')} tokens
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-sm">${r.cost.toFixed(4)}</div>
                <div className="text-[10px] text-muted-foreground">USD</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
