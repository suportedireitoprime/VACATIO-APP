import { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { fetchVotacoes, fetchVotacaoVotos } from '@/services/radarService';

const VotacoesPanel = () => {
  const [votacoes, setVotacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [votos, setVotos] = useState<any[]>([]);
  const [loadingVotos, setLoadingVotos] = useState(false);

  useEffect(() => {
    loadVotacoes();
  }, []);

  async function loadVotacoes() {
    setLoading(true);
    const data = await fetchVotacoes();
    setVotacoes(data);
    setLoading(false);
  }

  async function selectVotacao(v: any) {
    setSelected(v);
    setLoadingVotos(true);
    const id = v.id_externo || v.dados_json?.id;
    if (id) {
      const data = await fetchVotacaoVotos(String(id));
      setVotos(data);
    }
    setLoadingVotos(false);
  }

  if (selected) {
    const sim = votos.filter((v: any) => v.tipoVoto === 'Sim').length;
    const nao = votos.filter((v: any) => v.tipoVoto === 'Não').length;

    return (
      <div>
        <button onClick={() => { setSelected(null); setVotos([]); }} className="flex items-center gap-1 text-sm text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <p className="text-sm text-muted-foreground mb-4">{selected.descricao || 'Votação'}</p>

        {votos.length > 0 && (
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <ThumbsUp className="w-4 h-4" />
              <span className="font-bold">{sim} Sim</span>
            </div>
            <div className="flex items-center gap-2 text-destructive">
              <ThumbsDown className="w-4 h-4" />
              <span className="font-bold">{nao} Não</span>
            </div>
          </div>
        )}

        {loadingVotos ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {votos.slice(0, 50).map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={v.urlFoto} />
                  <AvatarFallback className="text-[10px]">{v.deputado_?.nome?.slice(0, 2) || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-xs flex-1 truncate">{v.deputado_?.nome || 'Parlamentar'}</span>
                <span className={`text-xs font-bold ${
                  v.tipoVoto === 'Sim' ? 'text-emerald-400' : v.tipoVoto === 'Não' ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {v.tipoVoto}
                </span>
              </div>
            ))}
            {votos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Votos não disponíveis para esta votação.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {votacoes.map((v: any, i: number) => (
        <Card
          key={i}
          className="bg-card/50 border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => selectVotacao(v)}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{v.descricao || 'Votação'}</p>
              <div className="flex flex-col items-end shrink-0">
                {v.resultado && (
                  <span className={`text-xs font-bold ${
                    v.resultado === 'Aprovado' ? 'text-emerald-400' : 'text-destructive'
                  }`}>
                    {v.resultado}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{v.data?.slice(0, 10)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {votacoes.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma votação encontrada.</p>
      )}
    </div>
  );
};

export default VotacoesPanel;
