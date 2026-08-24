import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Star, Sparkles, Download, MessageCircle, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';

interface Concorrente {
  id: string; nome: string; package_id: string; url: string; total_reviews: number; avg_rating: number | null; ultima_extracao_em: string | null;
}
interface Review {
  id: string; autor: string | null; rating: number | null; data_publicacao: string | null; ano: number | null; texto: string | null; resposta_dev: string | null;
}
interface Analise {
  id: string; created_at: string; total_analisado: number; modelo: string | null; resumo: any;
}

export default function AdminConcorrenteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [tab, setTab] = useState<string>(search.get('tab') || 'reviews');
  const [conc, setConc] = useState<Concorrente | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [loading, setLoading] = useState(true);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroNota, setFiltroNota] = useState<string>('all');
  const [filtroAno, setFiltroAno] = useState<string>('all');

  const [rodando, setRodando] = useState(false);
  const [analisando, setAnalisando] = useState(false);

  async function carregar() {
    if (!id) return;
    setLoading(true);
    const [c, rs, an] = await Promise.all([
      supabase.from('concorrentes').select('*').eq('id', id).single(),
      supabase.from('concorrente_reviews').select('*').eq('concorrente_id', id).order('data_publicacao', { ascending: false, nullsFirst: false }).limit(1000),
      supabase.from('concorrente_analises').select('*').eq('concorrente_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (c.error) toast.error(c.error.message);
    setConc((c.data as any) || null);
    setReviews(((rs.data as any) || []) as Review[]);
    setAnalise(((an.data as any) || null) as Analise | null);
    setLoading(false);
  }
  useEffect(() => { carregar(); }, [id]);

  const anos = useMemo(() => Array.from(new Set(reviews.map(r => r.ano).filter(Boolean))).sort((a, b) => (b as number) - (a as number)) as number[], [reviews]);

  const filtradas = useMemo(() => reviews.filter(r => {
    if (filtroNota !== 'all' && String(r.rating) !== filtroNota) return false;
    if (filtroAno !== 'all' && String(r.ano) !== filtroAno) return false;
    if (filtroTexto.trim() && !((r.texto || '') + ' ' + (r.autor || '')).toLowerCase().includes(filtroTexto.toLowerCase())) return false;
    return true;
  }), [reviews, filtroTexto, filtroNota, filtroAno]);

  const contagemPorNota = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of reviews) if (r.rating) m.set(r.rating, (m.get(r.rating) || 0) + 1);
    return m;
  }, [reviews]);

  async function reextrair() {
    if (!conc) return;
    setRodando(true);
    try {
      const { data, error } = await supabase.functions.invoke('extrair-reviews-concorrente', { body: { mode: 'extrair', concorrente_id: conc.id, max_scrolls: 50 } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Extraídos: ${(data as any).extraidos} · Novos: ${(data as any).novos}`);
      carregar();
    } catch (e: any) { toast.error(e.message || String(e)); } finally { setRodando(false); }
  }
  async function reanalisar() {
    if (!conc) return;
    setAnalisando(true);
    try {
      const { data, error } = await supabase.functions.invoke('extrair-reviews-concorrente', { body: { mode: 'analisar', concorrente_id: conc.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Análise gerada');
      carregar();
      setTab('analise');
    } catch (e: any) { toast.error(e.message || String(e)); } finally { setAnalisando(false); }
  }

  if (loading || !conc) {
    return (
      <div className="min-h-dvh bg-background">
        <PageHeader title="Carregando…" onBack={() => navigate(-1)} />
        <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  const r = analise?.resumo || {};
  const secoes: Array<{ chave: string; label: string; tone?: 'good' | 'bad' | 'neutral' }> = [
    { chave: 'elogios', label: '👏 Mais elogiados', tone: 'good' },
    { chave: 'criticas', label: '⚠️ Mais criticados', tone: 'bad' },
    { chave: 'funcionalidades_pedidas', label: '💡 Funcionalidades pedidas' },
    { chave: 'dores', label: '😣 Dores' },
    { chave: 'bugs_recorrentes', label: '🐞 Bugs recorrentes' },
  ];

  return (
    <div className="min-h-dvh bg-background pb-20">
      <PageHeader
        title={conc.nome}
        subtitle={`${conc.total_reviews} reviews${conc.avg_rating ? ` · ${conc.avg_rating}★` : ''}`}
        onBack={() => navigate('/admin-concorrentes')}
      />

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={reextrair} disabled={rodando}>
            {rodando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Re-extrair reviews
          </Button>
          <Button size="sm" variant="secondary" onClick={reanalisar} disabled={analisando || reviews.length === 0}>
            {analisando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {analise ? 'Re-analisar com IA' : 'Analisar com IA'}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="analise">Análise</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { v: 'all', label: 'Todas', count: reviews.length },
                { v: '5', label: '5★', count: contagemPorNota.get(5) || 0 },
                { v: '4', label: '4★', count: contagemPorNota.get(4) || 0 },
                { v: '3', label: '3★', count: contagemPorNota.get(3) || 0 },
                { v: '2', label: '2★', count: contagemPorNota.get(2) || 0 },
                { v: '1', label: '1★', count: contagemPorNota.get(1) || 0 },
              ].map((s) => (
                <button
                  key={s.v}
                  onClick={() => setFiltroNota(s.v)}
                  className={`shrink-0 px-3 h-9 rounded-full text-xs font-medium border transition-all ${
                    filtroNota === s.v
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {s.label} <span className="opacity-70">({s.count})</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Buscar texto…" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} className="flex-1 min-w-[180px]" />
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{filtradas.length} resultado(s)</p>

            {filtradas.map((r) => (
              <Card key={r.id} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{r.autor || 'anônimo'}</span>
                  {r.rating != null && (
                    <span className="inline-flex items-center gap-0.5 text-yellow-500 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < (r.rating || 0) ? 'fill-yellow-500' : 'stroke-muted-foreground'}`} />
                      ))}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto">{r.data_publicacao || r.ano}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{r.texto}</p>
                {r.resposta_dev && (
                  <div className="mt-2 pl-3 border-l-2 border-primary/30">
                    <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Resposta do desenvolvedor</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{r.resposta_dev}</p>
                  </div>
                )}
              </Card>
            ))}

            {reviews.length === 0 && (
              <Card className="p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground mb-3">Sem reviews extraídas ainda.</p>
                <Button onClick={reextrair} disabled={rodando}>
                  {rodando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Extrair agora
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analise" className="space-y-3">
            {!analise && (
              <Card className="p-8 text-center border-dashed">
                <p className="text-sm text-muted-foreground mb-3">Nenhuma análise ainda.</p>
                <Button onClick={reanalisar} disabled={analisando || reviews.length === 0}>
                  {analisando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Analisar {reviews.length} reviews
                </Button>
              </Card>
            )}
            {analise && (
              <>
                <p className="text-xs text-muted-foreground">
                  Análise de {analise.total_analisado} reviews · {new Date(analise.created_at).toLocaleString('pt-BR')} · {analise.modelo}
                </p>

                {r.resumo_geral && (
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Resumo geral</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.resumo_geral}</p>
                  </Card>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  {Array.isArray(r.vantagens_nossas) && r.vantagens_nossas.length > 0 && (
                    <Card className="p-4 border-green-500/40 bg-green-500/5">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                        <ThumbsUp className="w-4 h-4" /> Vantagens nossas
                      </h4>
                      <ul className="list-disc ml-5 space-y-1">
                        {r.vantagens_nossas.map((o: string, i: number) => (
                          <li key={i} className="text-sm">{o}</li>
                        ))}
                      </ul>
                    </Card>
                  )}
                  {Array.isArray(r.riscos_nossos) && r.riscos_nossos.length > 0 && (
                    <Card className="p-4 border-destructive/40 bg-destructive/5">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
                        <ShieldAlert className="w-4 h-4" /> Riscos / o que devemos observar
                      </h4>
                      <ul className="list-disc ml-5 space-y-1">
                        {r.riscos_nossos.map((o: string, i: number) => (
                          <li key={i} className="text-sm">{o}</li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>

                {Array.isArray(r.oportunidades) && r.oportunidades.length > 0 && (
                  <Card className="p-4 border-primary/40 bg-primary/5">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Oportunidades acionáveis</h4>
                    <ul className="list-disc ml-5 space-y-1">
                      {r.oportunidades.map((o: string, i: number) => (
                        <li key={i} className="text-sm">{o}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {secoes.map(({ chave, label, tone }) => {
                  const arr = Array.isArray(r[chave]) ? r[chave] : [];
                  if (arr.length === 0) return null;
                  const borderColor = tone === 'good' ? 'border-green-500/30' : tone === 'bad' ? 'border-destructive/30' : 'border-border';
                  return (
                    <Card key={chave} className={`p-4 border ${borderColor}`}>
                      <h4 className="font-semibold mb-3">{label}</h4>
                      <div className="space-y-3">
                        {arr.map((it: any, i: number) => (
                          <div key={i} className="border-l-2 border-border pl-3">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <span className="text-sm font-medium">{it.tema}</span>
                              {typeof it.count === 'number' && <Badge variant="secondary">{it.count}</Badge>}
                              {it.temos === true && (
                                <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30 gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Temos
                                </Badge>
                              )}
                              {it.temos === false && (
                                <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
                                  <XCircle className="w-3 h-3" /> Não temos
                                </Badge>
                              )}
                              {it.risco_pra_nos && (
                                <Badge className={`gap-1 ${
                                  it.risco_pra_nos === 'alto' ? 'bg-destructive/15 text-destructive border-destructive/30'
                                  : it.risco_pra_nos === 'medio' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" /> risco {it.risco_pra_nos}
                                </Badge>
                              )}
                            </div>
                            {it.obs && <p className="text-xs text-foreground/80 mb-1">{it.obs}</p>}
                            {Array.isArray(it.citacoes) && (
                              <ul className="space-y-1 mt-1">
                                {it.citacoes.map((c: string, k: number) => (
                                  <li key={k} className="text-xs text-muted-foreground italic">"{c}"</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
