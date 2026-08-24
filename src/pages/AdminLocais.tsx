import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CATEGORIAS_LOCAIS } from '@/lib/locaisCategorias';

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

interface ContagemRow {
  categoria: string;
  uf: string;
  total: number;
}

export default function AdminLocais() {
  const navigate = useNavigate();
  const [contagens, setContagens] = useState<ContagemRow[]>([]);
  const [sincronizando, setSincronizando] = useState<string | null>(null);
  const [ufSelecionada, setUfSelecionada] = useState('SP');
  const [totalGeral, setTotalGeral] = useState(0);

  const carregar = async () => {
    const { data, error } = await supabase
      .from('locais_juridicos')
      .select('categoria, uf');
    if (error) {
      toast.error('Falha ao carregar contagens.');
      return;
    }
    const agrupado: Record<string, ContagemRow> = {};
    for (const row of data ?? []) {
      const key = `${row.categoria}__${row.uf ?? ''}`;
      agrupado[key] ??= { categoria: row.categoria, uf: row.uf ?? '', total: 0 };
      agrupado[key].total += 1;
    }
    setContagens(Object.values(agrupado));
    setTotalGeral(data?.length ?? 0);
  };

  useEffect(() => { carregar(); }, []);

  const sync = async (categoria: string) => {
    const key = `${categoria}__${ufSelecionada}`;
    setSincronizando(key);
    try {
      const { data, error } = await supabase.functions.invoke('locais-overpass-sync', {
        body: { uf: ufSelecionada, categoria },
      });
      if (error) throw error;
      toast.success(`${categoria} / ${ufSelecionada}: ${(data as any)?.salvos ?? 0} salvos`);
      await carregar();
    } catch (err) {
      toast.error(`Falha: ${(err as Error).message}`);
    } finally {
      setSincronizando(null);
    }
  };

  const totalUf = (categoria: string) =>
    contagens.find((c) => c.categoria === categoria && c.uf === ufSelecionada)?.total ?? 0;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 bg-black text-white px-4 py-4 flex items-center gap-3 border-b border-black/20">
        <button onClick={() => navigate('/admin-funcoes')} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-display font-bold">Locais Jurídicos</h1>
          <p className="text-xs text-white/70">{totalGeral} registros no banco</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-yellow-400 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-black" />
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-3xl mx-auto">
        <div>
          <label className="text-sm font-semibold block mb-2">UF alvo</label>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS.map((uf) => (
              <button
                key={uf}
                onClick={() => setUfSelecionada(uf)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold border transition-colors ${
                  ufSelecionada === uf
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border'
                }`}
              >
                {uf}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {CATEGORIAS_LOCAIS.filter((c) => c.fonteOsm).map((c) => {
            const key = `${c.id}__${ufSelecionada}`;
            const total = totalUf(c.id);
            const busy = sincronizando === key;
            const Icon = c.icon;
            return (
              <div key={c.id} className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white ${c.cor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {total} salvos em {ufSelecionada}
                  </p>
                </div>
                <Button size="sm" onClick={() => sync(c.id)} disabled={busy}>
                  {busy ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sincronizando</>
                  ) : total > 0 ? (
                    <><RefreshCw className="w-4 h-4 mr-1" /> Atualizar</>
                  ) : (
                    <><Download className="w-4 h-4 mr-1" /> Baixar</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Fonte: OpenStreetMap (Overpass API). Uso e distribuição sob licença ODbL.
        </p>
      </div>
    </div>
  );
}
