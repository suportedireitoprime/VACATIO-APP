import { useState, useEffect } from 'react';
import { Search, RefreshCw, ArrowLeft, Banknote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { fetchDeputados, fetchDeputadoDetalhe, fetchDeputadoDespesas, UFS } from '@/services/radarService';

interface DeputadosPanelProps {
  searchQuery: string;
}

const DeputadosPanel = ({ searchQuery }: DeputadosPanelProps) => {
  const [deputados, setDeputados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [filtroUf, setFiltroUf] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [detalhe, setDetalhe] = useState<any>(null);
  const [despesas, setDespesas] = useState<any[]>([]);

  const query = searchQuery || localSearch;

  useEffect(() => {
    loadDeputados();
  }, [query, filtroUf]);

  async function loadDeputados() {
    setLoading(true);
    const data = await fetchDeputados(query || undefined, undefined, filtroUf || undefined);
    setDeputados(data);
    setLoading(false);
  }

  async function selectDeputado(dep: any) {
    setSelected(dep);
    const [det, desp] = await Promise.all([
      fetchDeputadoDetalhe(dep.id),
      fetchDeputadoDespesas(dep.id),
    ]);
    setDetalhe(det);
    setDespesas(desp);
  }

  if (selected) {
    const totalDespesas = despesas.reduce((sum: number, d: any) => sum + (d.valorDocumento || 0), 0);
    return (
      <div>
        <button onClick={() => { setSelected(null); setDetalhe(null); }} className="flex items-center gap-1 text-sm text-primary mb-4">
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
            {selected.email && <p className="text-xs text-muted-foreground">{selected.email}</p>}
          </div>
        </div>

        {detalhe && (
          <Card className="mb-4 bg-card/50 border-border/50">
            <CardContent className="p-4 text-sm space-y-1">
              {detalhe.nomeCivil && <p><span className="text-muted-foreground">Nome civil:</span> {detalhe.nomeCivil}</p>}
              {detalhe.dataNascimento && <p><span className="text-muted-foreground">Nascimento:</span> {detalhe.dataNascimento}</p>}
              {detalhe.escolaridade && <p><span className="text-muted-foreground">Escolaridade:</span> {detalhe.escolaridade}</p>}
              {detalhe.municipioNascimento && <p><span className="text-muted-foreground">Naturalidade:</span> {detalhe.municipioNascimento}/{detalhe.ufNascimento}</p>}
            </CardContent>
          </Card>
        )}

        <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary" />
          Despesas Recentes
          <span className="text-xs text-muted-foreground ml-auto">
            Total: R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </h3>
        <div className="space-y-2">
          {despesas.slice(0, 10).map((d: any, i: number) => (
            <Card key={i} className="bg-card/50 border-border/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium">{d.tipoDespesa}</p>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{d.dataDocumento}</span>
                  <span className="text-xs font-bold text-primary">
                    R$ {(d.valorDocumento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar deputado..."
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
          {deputados.map((dep: any) => (
            <Card
              key={dep.id}
              className="bg-card/50 border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => selectDeputado(dep)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={dep.foto_url} alt={dep.nome} />
                  <AvatarFallback className="text-xs">{dep.nome?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{dep.nome}</p>
                  <p className="text-xs text-muted-foreground">{dep.sigla_partido} - {dep.sigla_uf}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {deputados.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum deputado encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default DeputadosPanel;
