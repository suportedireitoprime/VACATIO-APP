import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Play, Pause, Loader2, Mic, RefreshCw, ListMusic, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

type Voz = { id: string; genero: string; descricao: string };
type Post = {
  id: string; titulo: string; categoria: string | null; publicado: boolean | null;
  data_publicacao: string | null; audio_url: string | null; audio_voice: string | null;
  audio_duration_seconds: number | null;
};

const ESTILO_PADRAO =
  'Você é um locutor profissional narrando um artigo jurídico em português brasileiro. Fale com entusiasmo curioso e informativo, respeite as pausas da pontuação, dê ênfase aos termos-chave e não leia marcações de markdown.';

const TEXTO_PREVIA_PADRAO =
  'A legalidade é o coração do Estado de Direito: ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei.';

const fmtDur = (s?: number | null) => {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const AdminNarracaoBlog = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filaAbortRef = useRef(false);

  const [vozes, setVozes] = useState<Voz[]>([]);
  const [voz, setVoz] = useState('Puck');
  const [estilo, setEstilo] = useState(ESTILO_PADRAO);
  const [textoPrevia, setTextoPrevia] = useState(TEXTO_PREVIA_PADRAO);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [narrando, setNarrando] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ done: number; total: number } | null>(null);
  const [fila, setFila] = useState<{ ativo: boolean; feitas: number; total: number }>({ ativo: false, feitas: 0, total: 0 });
  const [tocando, setTocando] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const base = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
        const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
        if (!base) return;
        const r = await fetch(`${base}/functions/v1/blog-narrar-preview?acao=vozes`, {
          headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : undefined,
        });
        const j = await r.json();
        if (Array.isArray(j?.vozes)) setVozes(j.vozes as Voz[]);
      } catch {
        /* silencioso */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_edicao_posts')
      .select('id, titulo, categoria, publicado, data_publicacao, audio_url, audio_voice, audio_duration_seconds')
      .order('data_publicacao', { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) toast.error(`Erro ao carregar artigos: ${error.message}`);
    setPosts((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tocar = (url: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (tocando === url) { a.pause(); setTocando(null); return; }
    a.src = url;
    a.play().catch(() => toast.error('Não foi possível reproduzir o áudio'));
    setTocando(url);
    a.onended = () => setTocando(null);
  };

  const gerarPrevia = async () => {
    if (textoPrevia.trim().length < 3) { toast.error('Escreva um parágrafo para a prévia'); return; }
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-narrar-preview', {
        body: { texto: textoPrevia.trim().slice(0, 1500), voz, estilo },
      });
      if (error) throw new Error(error.message);
      const url = (data as any)?.audio_data_url;
      if (!url) throw new Error((data as any)?.error || 'sem áudio');
      tocar(url);
    } catch (e) {
      toast.error(`Erro na prévia: ${(e as Error).message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const narrarPost = useCallback(async (post: Post) => {
    setNarrando(post.id);
    setProgresso(null);
    try {
      const base = (import.meta as any).env?.VITE_SUPABASE_URL as string;
      const { data: sess } = await supabase.auth.getSession();
      const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const resp = await fetch(`${base}/functions/v1/blog-narrar-artigo?stream=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anon,
          Authorization: `Bearer ${sess?.session?.access_token || anon}`,
        },
        body: JSON.stringify({ post_id: post.id, voz, estilo, manual: true }),
      });
      if (!resp.ok || !resp.body) throw new Error(`falha ${resp.status}`);

      const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let resultado: any = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const linhas = buffer.split('\n\n');
        buffer = linhas.pop() ?? '';
        for (const linha of linhas) {
          const raw = linha.split('\n').find((l) => l.startsWith('data: '));
          if (!raw) continue;
          const evt = JSON.parse(raw.slice(6));
          if (evt.type === 'progress') setProgresso({ done: evt.done, total: evt.total });
          if (evt.type === 'error') throw new Error(evt.error);
          if (evt.type === 'done') resultado = evt.result;
        }
      }
      if (!resultado?.audio_url) throw new Error('narração não retornou áudio');
      setPosts((prev) => prev.map((p) => p.id === post.id
        ? { ...p, audio_url: resultado.audio_url, audio_voice: voz, audio_duration_seconds: resultado.duration_seconds }
        : p));
      return true;
    } catch (e) {
      toast.error(`${post.titulo}: ${(e as Error).message}`);
      return false;
    } finally {
      setNarrando(null);
      setProgresso(null);
    }
  }, [voz, estilo]);

  const pendentes = useMemo(() => posts.filter((p) => !p.audio_url), [posts]);

  const narrarFila = async () => {
    if (!pendentes.length) return;
    filaAbortRef.current = false;
    setFila({ ativo: true, feitas: 0, total: pendentes.length });
    let feitas = 0;
    for (const p of pendentes) {
      if (filaAbortRef.current) break;
      const ok = await narrarPost(p);
      feitas += 1;
      setFila({ ativo: true, feitas, total: pendentes.length });
      if (!ok) break;
    }
    setFila({ ativo: false, feitas: 0, total: 0 });
    toast.success(filaAbortRef.current ? 'Fila interrompida' : 'Fila concluída');
  };

  return (
    <div className="min-h-dvh bg-background pb-28">
      <PageHeader
        title="Narração · Blog e Artigos"
        subtitle="Prévia de voz e narração dos artigos"
        onBack={() => navigate('/admin-narracao')}
      />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-sm uppercase tracking-wide">Voz do narrador</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {vozes.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoz(v.id)}
                className={`text-left rounded-xl border p-2.5 transition-colors ${
                  voz === v.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                <span className="block text-sm font-semibold font-body">{v.id}</span>
                <span className="block text-[11px] text-muted-foreground leading-tight">{v.descricao}</span>
              </button>
            ))}
            {!vozes.length && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-heading font-bold text-sm uppercase tracking-wide">Prévia da voz</h2>
          <Textarea value={textoPrevia} onChange={(e) => setTextoPrevia(e.target.value.slice(0, 1500))} rows={3} className="text-sm" />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-body">Direção de narração (prompt)</summary>
            <Textarea value={estilo} onChange={(e) => setEstilo(e.target.value)} rows={4} className="mt-2 text-xs" />
            <button className="mt-2 underline" onClick={() => setEstilo(ESTILO_PADRAO)}>Restaurar padrão</button>
          </details>
          <Button size="sm" onClick={gerarPrevia} disabled={previewLoading}>
            {previewLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
            Ouvir prévia
          </Button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading font-bold text-sm uppercase tracking-wide">Artigos</h2>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
              {fila.ativo ? (
                <Button size="sm" variant="destructive" onClick={() => { filaAbortRef.current = true; }}>
                  <Square className="w-4 h-4 mr-1" /> Parar ({fila.feitas}/{fila.total})
                </Button>
              ) : (
                <Button size="sm" onClick={narrarFila} disabled={!pendentes.length || loading}>
                  <ListMusic className="w-4 h-4 mr-1" /> Narrar tudo ({pendentes.length})
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {posts.map((p) => {
                const busy = narrando === p.id;
                return (
                  <div key={p.id} className="rounded-xl border border-border bg-background p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold font-body line-clamp-1">{p.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.categoria || 'sem categoria'}
                        {p.audio_url ? ` · ${p.audio_voice} · ${fmtDur(p.audio_duration_seconds)}` : ' · sem narração'}
                        {busy && progresso ? ` · ${progresso.done}/${progresso.total}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {p.audio_url && (
                        <Button size="sm" variant="ghost" onClick={() => tocar(p.audio_url!)}>
                          {tocando === p.audio_url ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      )}
                      <Button size="sm" variant={p.audio_url ? 'ghost' : 'default'} onClick={() => narrarPost(p)} disabled={busy || fila.ativo}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                        <span className="ml-1 text-xs">{p.audio_url ? 'Refazer' : 'Narrar'}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!posts.length && <p className="text-sm text-muted-foreground font-body">Nenhum artigo encontrado.</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminNarracaoBlog;
