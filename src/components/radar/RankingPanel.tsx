import { useEffect, useState } from 'react';
import { RefreshCw, Trophy, FileText, Wallet, CalendarCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

type Criterio = 'total_proposicoes' | 'presenca_percentual' | 'total_despesas';

const CRITERIOS: { id: Criterio; label: string; icon: typeof FileText; asc: boolean; format: (v: number) => string }[] = [
  { id: 'total_proposicoes', label: 'Proposições', icon: FileText, asc: false, format: (v) => `${v ?? 0}` },
  { id: 'presenca_percentual', label: 'Presença', icon: CalendarCheck, asc: false, format: (v) => `${Number(v ?? 0).toFixed(0)}%` },
  {
    id: 'total_despesas',
    label: 'Despesas',
    icon: Wallet,
    asc: true,
    format: (v) => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
  },
];

const RankingPanel = () => {
  const navigate = useNavigate();
  const [criterio, setCriterio] = useState<Criterio>('total_proposicoes');
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      const cfg = CRITERIOS.find((c) => c.id === criterio)!;
      const { data } = await (supabase as any)
        .from('radar_ranking')
        .select('deputado_id,nome,sigla_partido,sigla_uf,foto_url,total_despesas,total_proposicoes,presenca_percentual')
        .order(criterio, { ascending: cfg.asc, nullsFirst: false })
        .limit(50);
      if (!ativo) return;
      setItens(data ?? []);
      setLoading(false);
    })();
    return () => { ativo = false; };
  }, [criterio]);

  const cfg = CRITERIOS.find((c) => c.id === criterio)!;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {CRITERIOS.map((c) => {
          const Icon = c.icon;
          const active = c.id === criterio;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCriterio(c.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-[12.5px] font-semibold transition-colors ${
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {c.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : itens.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          O ranking ainda não foi processado. Volte mais tarde.
        </p>
      ) : (
        <div className="space-y-2">
          {itens.map((d, i) => (
            <Card
              key={d.deputado_id ?? i}
              className="bg-card/50 border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => d.deputado_id && navigate(`/radar/deputado/${d.deputado_id}`)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <span className={`w-6 text-center text-[13px] font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {i < 3 ? <Trophy className="w-4 h-4 mx-auto" /> : i + 1}
                </span>
                <Avatar className="w-9 h-9">
                  <AvatarImage src={d.foto_url} />
                  <AvatarFallback className="text-[10px]">{d.nome?.slice(0, 2) ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-foreground truncate">{d.nome}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {d.sigla_partido} · {d.sigla_uf}
                  </p>
                </div>
                <span className="text-[13px] font-bold text-primary shrink-0">{cfg.format(d[criterio])}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingPanel;
