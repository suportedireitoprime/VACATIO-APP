import { useState, useEffect } from 'react';
import { Search, RefreshCw, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { fetchSenadores, UFS } from '@/services/radarService';

interface SenadoresPanelProps {
  searchQuery: string;
}

const SenadoresPanel = ({ searchQuery }: SenadoresPanelProps) => {
  const [senadores, setSenadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [filtroUf, setFiltroUf] = useState('');
  const [selected, setSelected] = useState<any>(null);

  const query = searchQuery || localSearch;

  useEffect(() => {
    loadSenadores();
  }, [query, filtroUf]);

  async function loadSenadores() {
    setLoading(true);
    const data = await fetchSenadores(query || undefined, undefined, filtroUf || undefined);
    setSenadores(data);
    setLoading(false);
  }

  if (selected) {
    const dados = selected.dados_json;
    const mandato = dados?.Mandatos?.Mandato || dados?.MandatoAtual;
    const id = dados?.IdentificacaoParlamentar || {};

    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={selected.foto_url} alt={selected.nome} />
            <AvatarFallback>{selected.nome?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-display text-lg font-bold">{selected.nome}</h2>
            <p className="text-sm text-muted-foreground">{selected.sigla_partido} - {selected.sigla_uf}</p>
          </div>
        </div>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 text-sm space-y-1">
            {id.NomeCompletoParlamentar && <p><span className="text-muted-foreground">Nome completo:</span> {id.NomeCompletoParlamentar}</p>}
            {id.FormaTratamento && <p><span className="text-muted-foreground">Tratamento:</span> {id.FormaTratamento}</p>}
            {id.EmailParlamentar && <p><span className="text-muted-foreground">Email:</span> {id.EmailParlamentar}</p>}
            {id.UrlPaginaParlamentar && (
              <a href={id.UrlPaginaParlamentar} target="_blank" rel="noopener noreferrer" className="text-primary text-xs underline">
                Página no Senado
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar senador..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card/50 border-border/50"
          />
        </div>
        <select
          value={filtroUf}
          onChange={(e) => setFiltroUf(e.target.value)}
          className="h-9 px-2 rounded-md border border-border bg-card/50 text-sm"
        >
          <option value="">UF</option>
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {senadores.map((sen: any) => (
            <Card
              key={sen.codigo}
              className="bg-card/50 border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelected(sen)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={sen.foto_url} alt={sen.nome} />
                  <AvatarFallback className="text-xs">{sen.nome?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{sen.nome}</p>
                  <p className="text-xs text-muted-foreground">{sen.sigla_partido} - {sen.sigla_uf}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {senadores.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum senador encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SenadoresPanel;
