import { useState } from 'react';
import { ArrowDownUp, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SortOption = 'proximo' | 'melhor' | 'aberto' | 'mais_visitado';

export const SORT_LABELS: Record<SortOption, string> = {
  proximo: 'Mais próximos',
  melhor: 'Melhor avaliados',
  aberto: 'Aberto agora',
  mais_visitado: 'Mais visitados',
};

interface Props {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  onBuscaEndereco: (coords: { lat: number; lng: number; endereco: string }) => void;
  onLimparBusca: () => void;
  buscaAtiva?: string | null;
}

export function LocaisFiltroBar({ sort, onSortChange, onBuscaEndereco, onLimparBusca, buscaAtiva }: Props) {
  const [buscar, setBuscar] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const executarBusca = async () => {
    if (query.trim().length < 3) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('local-geocode', { body: { query } });
      if (error || !(data as any)?.lat) { toast.error('Não encontrei esse endereço'); return; }
      onBuscaEndereco({ lat: (data as any).lat, lng: (data as any).lng, endereco: (data as any).endereco_formatado });
      setBuscar(false);
      setQuery('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pb-2 space-y-2">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs gap-1.5">
              <ArrowDownUp className="w-3.5 h-3.5" />
              {SORT_LABELS[sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(SORT_LABELS) as SortOption[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onSortChange(s)}>
                {SORT_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={buscaAtiva ? 'default' : 'outline'}
          size="sm"
          className="rounded-full h-8 text-xs gap-1.5"
          onClick={() => setBuscar((v) => !v)}
        >
          <Search className="w-3.5 h-3.5" />
          {buscaAtiva ? 'Alterar local' : 'Cidade/CEP'}
        </Button>

        {buscaAtiva && (
          <button
            onClick={onLimparBusca}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {buscaAtiva && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {buscaAtiva}
        </div>
      )}

      {buscar && (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Ex.: São Paulo, SP ou 01310-100"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') executarBusca(); }}
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={executarBusca} disabled={loading || query.length < 3} className="h-9">
            Buscar
          </Button>
        </div>
      )}
    </div>
  );
}
