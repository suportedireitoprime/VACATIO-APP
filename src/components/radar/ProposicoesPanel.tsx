import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchProposicoes } from '@/services/radarService';

interface Props {
  searchQuery?: string;
  dataInicial?: string;
}

function plId(p: any): string | null {
  const id = p.id_externo ?? p.dados_json?.id ?? p.id;
  return id ? String(id) : null;
}

function plLabel(p: any): string {
  const sigla = p.sigla_tipo ?? p.dados_json?.siglaTipo ?? 'PL';
  const numero = p.numero ?? p.dados_json?.numero ?? '';
  const ano = p.ano ?? p.dados_json?.ano ?? '';
  return `${sigla} ${numero}/${ano}`.trim();
}

const ProposicoesPanel = ({ searchQuery = '', dataInicial }: Props) => {
  const navigate = useNavigate();
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [busca, setBusca] = useState(searchQuery);

  const load = useCallback(async (p: number, append: boolean) => {
    setLoading(true);
    const data = await fetchProposicoes(undefined, undefined, p);
    setItens((prev) => (append ? [...prev, ...data] : data));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(1, false);
    setPagina(1);
  }, [load, dataInicial]);

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? itens.filter(
        (p) =>
          String(p.ementa ?? p.dados_json?.ementa ?? '').toLowerCase().includes(termo) ||
          plLabel(p).toLowerCase().includes(termo),
      )
    : itens;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número ou ementa"
          className="pl-9 h-11 text-[15px]"
        />
      </div>

      {loading && itens.length === 0 ? (
        <div className="flex justify-center py-10">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((p, i) => {
            const id = plId(p);
            return (
              <Card
                key={`${id ?? 'x'}-${i}`}
                className="bg-card/50 border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => id && navigate(`/radar/pl/${id}`)}
              >
                <CardContent className="p-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-primary mb-1">{plLabel(p)}</p>
                    <p className="text-[13px] text-muted-foreground line-clamp-3 leading-snug">
                      {p.ementa ?? p.dados_json?.ementa ?? 'Sem ementa disponível.'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                </CardContent>
              </Card>
            );
          })}

          {filtrados.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma proposição encontrada.</p>
          )}

          {!termo && itens.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              disabled={loading}
              onClick={() => {
                const next = pagina + 1;
                setPagina(next);
                void load(next, true);
              }}
            >
              {loading ? 'Carregando…' : 'Carregar mais'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProposicoesPanel;
