import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  Loader2, Plus, Download, Sparkles, ChevronRight, Star, Trash2, ExternalLink, Users, ImageIcon, Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface Concorrente {
  id: string;
  nome: string;
  package_id: string;
  url: string;
  hl: string;
  total_reviews: number;
  avg_rating: number | null;
  ultima_extracao_em: string | null;
  created_at: string;
  icon_url: string | null;
  nome_app: string | null;
  desenvolvedor: string | null;
  descricao: string | null;
  total_avaliacoes_play: number | null;
  downloads_texto: string | null;
  categoria_play: string | null;
  job_status: string | null;
  job_progresso: { pct?: number; etapa?: string; extraidos?: number; novos?: number; atualizados?: number } | null;
  job_atualizado_em: string | null;
  job_logs?: Array<{ t: string; msg: string; level?: string }> | null;
}

function extractPackageId(url: string): string | null {
  const m = url.match(/[?&]id=([^&]+)/);
  return m ? m[1] : null;
}

function formatNumber(n: number | null | undefined) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')} mil`;
  return String(n);
}

export default function AdminConcorrentes() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Concorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [novoUrl, setNovoUrl] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [extraindo, setExtraindo] = useState<Record<string, boolean>>({});
  const [analisando, setAnalisando] = useState<Record<string, boolean>>({});
  const [logsOpen, setLogsOpen] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    const { data, error } = await supabase
      .from('concorrentes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setItems((data || []) as unknown as Concorrente[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // Realtime — atualiza a linha em tempo real conforme o edge function escreve progresso
  useEffect(() => {
    const channel = supabase
      .channel('concorrentes-progress')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'concorrentes' },
        (payload) => {
          const row = payload.new as unknown as Concorrente;
          setItems((prev) => prev.map((c) => (c.id === row.id ? { ...c, ...row } : c)));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function salvarNovo() {
    if (!novoUrl.trim() || !novoNome.trim()) { toast.error('Preencha nome e URL'); return; }
    const pkg = extractPackageId(novoUrl.trim());
    if (!pkg) { toast.error('URL inválida — precisa conter ?id=<package>'); return; }
    setSalvando(true);
    const hlMatch = novoUrl.match(/[?&]hl=([^&]+)/);
    const { error } = await supabase.from('concorrentes').insert({
      nome: novoNome.trim(),
      package_id: pkg,
      url: novoUrl.trim(),
      hl: hlMatch?.[1] || 'pt_BR',
    });
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Concorrente adicionado');
    setOpenNew(false); setNovoUrl(''); setNovoNome('');
    carregar();
  }

  async function extrair(c: Concorrente) {
    setExtraindo((p) => ({ ...p, [c.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('extrair-reviews-concorrente', {
        body: { mode: 'extrair', concorrente_id: c.id, max_scrolls: 40 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Extraídos: ${(data as any).extraidos} · Novos: ${(data as any).novos}`);
      carregar();
    } catch (e: any) {
      toast.error(`Falha: ${e.message || e}`);
    } finally {
      setExtraindo((p) => ({ ...p, [c.id]: false }));
    }
  }

  async function analisar(c: Concorrente) {
    setAnalisando((p) => ({ ...p, [c.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('extrair-reviews-concorrente', {
        body: { mode: 'analisar', concorrente_id: c.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Análise gerada');
      navigate(`/admin-concorrentes/${c.id}?tab=analise`);
    } catch (e: any) {
      toast.error(`Falha: ${e.message || e}`);
    } finally {
      setAnalisando((p) => ({ ...p, [c.id]: false }));
    }
  }

  async function remover(c: Concorrente) {
    if (!confirm(`Remover "${c.nome}" e todas as suas reviews?`)) return;
    const { error } = await supabase.from('concorrentes').delete().eq('id', c.id);
    if (error) toast.error(error.message);
    else { toast.success('Removido'); carregar(); }
  }

  return (
    <div className="min-h-dvh bg-background pb-20">
      <PageHeader
        title="Concorrentes"
        subtitle="Reviews do Google Play + análise IA"
        onBack={() => navigate('/admin-funcoes')}
        rightAction={
          <button onClick={() => setOpenNew(true)} className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-3 max-w-3xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        )}

        {!loading && items.length === 0 && (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm text-muted-foreground mb-3">Nenhum concorrente cadastrado ainda.</p>
            <Button onClick={() => setOpenNew(true)}><Plus className="w-4 h-4 mr-2" /> Adicionar primeiro</Button>
          </Card>
        )}

        {items.map((c) => {
          const running = c.job_status === 'running';
          const pct = c.job_progresso?.pct ?? 0;
          const etapa = c.job_progresso?.etapa || 'Processando…';
          const busy = extraindo[c.id] || running;
          return (
            <Card key={c.id} className="p-4 overflow-hidden">
              <div className="flex items-start gap-3">
                {c.icon_url ? (
                  <img
                    src={c.icon_url}
                    alt={c.nome_app || c.nome}
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm shrink-0 bg-muted"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{c.nome_app || c.nome}</h3>
                    {c.avg_rating != null && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> {c.avg_rating}
                      </Badge>
                    )}
                  </div>
                  {c.desenvolvedor && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.desenvolvedor}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                    {c.downloads_texto && (
                      <span className="inline-flex items-center gap-1"><Download className="w-3 h-3" />{c.downloads_texto}</span>
                    )}
                    {c.total_avaliacoes_play != null && (
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{formatNumber(c.total_avaliacoes_play)} avaliações</span>
                    )}
                    <Badge variant="outline" className="text-[10px] py-0 h-4">{c.total_reviews} coletadas</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 font-mono truncate mt-1">{c.package_id}</p>
                </div>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {running && (
                <div className="mt-3 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-medium inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> {etapa}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  {c.job_progresso?.extraidos != null && (
                    <p className="text-[11px] text-muted-foreground">
                      {c.job_progresso.extraidos} avaliações coletadas
                      {c.job_progresso.novos != null && ` · ${c.job_progresso.novos} novas`}
                    </p>
                  )}
                </div>
              )}

              {!running && c.ultima_extracao_em && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Última extração: {new Date(c.ultima_extracao_em).toLocaleString('pt-BR')}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" variant="secondary" onClick={() => extrair(c)} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {c.total_reviews > 0 ? 'Re-extrair' : 'Extrair'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => analisar(c)} disabled={analisando[c.id] || c.total_reviews === 0 || running}>
                  {analisando[c.id] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Analisar com IA
                </Button>
                <Button size="sm" onClick={() => navigate(`/admin-concorrentes/${c.id}`)}>
                  Abrir <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setLogsOpen(c.id)} title="Ver logs em tempo real" className="ml-auto">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remover(c)} className="text-destructive hover:text-destructive" disabled={running}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar concorrente</DialogTitle>
            <DialogDescription>Cole o link do app na Google Play Store.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: JurisHand" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">URL do Google Play</label>
              <Input value={novoUrl} onChange={(e) => setNovoUrl(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={salvarNovo} disabled={salvando}>
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!logsOpen} onOpenChange={(o) => !o && setLogsOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle>Logs em tempo real</SheetTitle>
            <SheetDescription>
              {(() => {
                const c = items.find((x) => x.id === logsOpen);
                return c ? `${c.nome_app || c.nome} · ${c.job_status || 'idle'}` : '';
              })()}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4 rounded-lg bg-black/90 text-green-300 font-mono text-[11px] p-3 space-y-1">
            {(() => {
              const c = items.find((x) => x.id === logsOpen);
              const logs = c?.job_logs || [];
              if (!logs.length) return <p className="text-muted-foreground">Sem logs ainda. Clique em Extrair pra iniciar.</p>;
              return logs.map((l, i) => (
                <div key={i} className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-300' : ''}>
                  <span className="text-muted-foreground/70 mr-2">{new Date(l.t).toLocaleTimeString('pt-BR')}</span>
                  {l.msg}
                </div>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
