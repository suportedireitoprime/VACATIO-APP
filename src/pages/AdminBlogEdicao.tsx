import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2, Sparkles, CheckCircle2, AlertCircle, Settings, Image as ImageIcon, Headphones, Loader2, Pause, Volume2, Wand2, CalendarClock, PenLine, ImagePlus, Bell, ChevronRight, Zap } from 'lucide-react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import GcpMonitorWidget from '@/components/admin/GcpMonitorWidget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TEMA_COLORS } from '@/data/blogPosts';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Tema = {
  id: string;
  ordem: number;
  titulo_sugerido: string;
  categoria: string;
  resumo_briefing?: string | null;
  status: 'pendente' | 'agendado' | 'gerando' | 'concluido' | 'falhou' | 'cancelado';
  agendado_para?: string | null;
  post_id?: string | null;
  erro?: string | null;
  concluido_em?: string | null;
  audio_url?: string | null;
  audio_voice?: string | null;
  audio_duration_seconds?: number | null;
  audio_cost_credits?: number | null;
  imagem_url?: string | null;
};

type Config = {
  id: string;
  posts_por_dia: number;
  horarios: string[];
  intervalo_minutos: number | null;
  modo_publicacao: 'auto' | 'rascunho';
  tom: string;
  tamanho_alvo: number;
  estilo_capa_prompt: string;
  push_ativo: boolean;
  push_titulo_template: string;
  push_corpo_template: string;
  push_audiencia: Record<string, unknown>;
  push_quiet_start: string | null;
  push_quiet_end: string | null;
  narracao_voz: string;
  narracao_modelo: string;
  narracao_estilo: string;
};

type Voz = { id: string; genero: 'F' | 'M'; descricao: string };

const PREVIEW_TEXTO_PADRAO =
  'Você sabia que o STF já reconheceu, em decisão inédita, que até um simples emoji pode ter valor jurídico em processos digitais? A cada nova tecnologia, o direito precisa se reinventar — e é justamente aí que mora a curiosidade.';

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-secondary text-muted-foreground',
  agendado: 'bg-blue-500/20 text-blue-300',
  gerando: 'bg-amber-500/20 text-amber-300 animate-pulse',
  concluido: 'bg-emerald-500/20 text-emerald-300',
  falhou: 'bg-red-500/20 text-red-300',
  cancelado: 'bg-muted text-muted-foreground',
};

// Utilitário: “hoje” no fuso local (YYYY-MM-DD)
const hojeStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const mesmoDia = (isoOrDate: string | Date | null | undefined) => {
  if (!isoOrDate) return false;
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === hojeStr();
};

export default function AdminBlogEdicao() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'biblioteca' | 'em_fila' | 'concluidos'>('em_fila');
  const [temas, setTemas] = useState<Tema[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [configSection, setConfigSection] = useState<null | 'acoes' | 'agenda' | 'conteudo' | 'capa' | 'narracao' | 'push'>(null);
  const [running, setRunning] = useState(false);
  const [vozes, setVozes] = useState<Voz[]>([]);
  const [previewTexto, setPreviewTexto] = useState<string>(PREVIEW_TEXTO_PADRAO);
  const [previewVoz, setPreviewVoz] = useState<string>('Puck');
  const [previewGerando, setPreviewGerando] = useState<string | null>(null);
  const PREVIEW_CACHE_KEY = 'blog_edicao_preview_cache_v1';
  const [previewAudio, setPreviewAudio] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_CACHE_KEY);
      return raw ? JSON.parse(raw) as Record<string, string> : {};
    } catch { return {}; }
  });
  const cacheKey = (voz: string) =>
    `${voz}::${(config?.narracao_estilo || '').slice(0, 40)}::${previewTexto.slice(0, 80)}`;
  const [narrandoPostId, setNarrandoPostId] = useState<string | null>(null);
  const [narracaoProgresso, setNarracaoProgresso] = useState<Record<string, { done: number; total: number }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('blog_edicao_temas').select('*').order('ordem', { ascending: true }),
      supabase.from('blog_edicao_config').select('*').limit(1).single(),
    ]);
    const temasRaw = (t as Tema[]) || [];
    const postIds = temasRaw.map(x => x.post_id).filter(Boolean) as string[];
    let audiosByPost: Record<string, Partial<Tema>> = {};
    if (postIds.length) {
      const { data: posts } = await supabase
        .from('blog_edicao_posts')
        .select('id, audio_url, audio_voice, audio_duration_seconds, audio_cost_credits, imagem_url')
        .in('id', postIds);
      audiosByPost = Object.fromEntries((posts || []).map((p: any) => [p.id, p]));
    }
    setTemas(temasRaw.map(x => (x.post_id && audiosByPost[x.post_id]) ? { ...x, ...audiosByPost[x.post_id] } : x));
    setConfig((c as unknown as Config) || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const base = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
        if (!base) throw new Error('VITE_SUPABASE_URL ausente');
        const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
        const r = await fetch(`${base}/functions/v1/blog-narrar-preview?acao=vozes`, {
          headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : undefined,
        });
        const j = await r.json();
        if (Array.isArray(j?.vozes)) setVozes(j.vozes as Voz[]);
      } catch (e) {
        console.warn('falha ao carregar vozes', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (config?.narracao_voz) setPreviewVoz(config.narracao_voz);
  }, [config?.narracao_voz]);

  const pendentes = useMemo(
    () => temas.filter(t => ['pendente', 'agendado', 'gerando'].includes(t.status)),
    [temas],
  );

  // Concluídos ordenados por data de conclusão desc (fix: antes vinham por ordem asc)
  const concluidos = useMemo(
    () => temas
      .filter(t => t.status === 'concluido')
      .sort((a, b) => (new Date(b.concluido_em || 0).getTime() - new Date(a.concluido_em || 0).getTime())),
    [temas],
  );

  // Fila de hoje: rotação por categoria (round-robin). Um item por categoria por rodada,
  // embaralhando categorias com base na data para variar dia a dia.
  const filaHoje = useMemo(() => {
    if (!config) return [] as Array<Tema & { horario?: string }>;
    const n = config.posts_por_dia || 3;

    // buckets por categoria (preserva ordem original dentro de cada bucket)
    const buckets = new Map<string, Tema[]>();
    for (const p of pendentes) {
      if (!buckets.has(p.categoria)) buckets.set(p.categoria, []);
      buckets.get(p.categoria)!.push(p);
    }
    // embaralha a ordem das categorias por dia (seed = dia do ano)
    const cats = Array.from(buckets.keys());
    const seed = Number(hojeStr().replace(/-/g, ''));
    cats.sort((a, b) => {
      const ha = ((seed * 9301 + a.charCodeAt(0) * 49297) % 233280);
      const hb = ((seed * 9301 + b.charCodeAt(0) * 49297) % 233280);
      return ha - hb;
    });

    // round-robin até completar n
    const escolhidos: Tema[] = [];
    let vazios = 0;
    while (escolhidos.length < n && vazios < cats.length) {
      vazios = 0;
      for (const c of cats) {
        const b = buckets.get(c)!;
        if (b.length === 0) { vazios++; continue; }
        escolhidos.push(b.shift()!);
        if (escolhidos.length >= n) break;
      }
    }

    // associa horários (do config) — 1º item = 1º horário, etc.
    const horarios = (config.horarios || []).slice(0, n);
    return escolhidos.map((t, i) => ({ ...t, horario: horarios[i] }));
  }, [config, pendentes]);

  // Biblioteca = tudo que ainda está pendente (não incluído na fila de hoje)
  const bibliotecaIds = useMemo(() => new Set(filaHoje.map(x => x.id)), [filaHoje]);
  const biblioteca = useMemo(
    () => pendentes.filter(t => !bibliotecaIds.has(t.id)),
    [pendentes, bibliotecaIds],
  );

  const filtered = useMemo(() => {
    if (tab === 'biblioteca') return biblioteca;
    if (tab === 'em_fila') return filaHoje;
    return concluidos;
  }, [tab, biblioteca, filaHoje, concluidos]);

  // Próxima geração: primeiro horário >= agora, dentre os horários do dia
  const proximaGeracao = useMemo(() => {
    if (!config) return { horario: null as string | null, item: null as Tema | null };
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const alvos = (config.horarios || []).map((h, idx) => {
      const [hh, mm] = h.split(':').map(Number);
      return { h, mins: hh * 60 + (mm || 0), idx };
    }).sort((a, b) => a.mins - b.mins);
    const nxt = alvos.find(a => a.mins > mins) || alvos[0] || null;
    const item = nxt ? filaHoje[nxt.idx] || filaHoje[0] : null;
    return { horario: nxt?.h || null, item };
  }, [config, filaHoje]);

  const gerarTemas = async () => {
    setRunning(true);
    toast.loading('Gerando 30 temas com IA...', { id: 'gerar-temas' });
    const { error } = await supabase.functions.invoke('blog-edicao-gerar-temas', {
      body: { quantidade: 30 },
    });
    if (error) toast.error('Falha: ' + error.message, { id: 'gerar-temas' });
    else { toast.success('Temas gerados!', { id: 'gerar-temas' }); await load(); }
    setRunning(false);
  };

  const rodarAgora = async (tema_id?: string) => {
    setRunning(true);
    toast.loading(tema_id ? 'Gerando artigo...' : 'Gerando próximo artigo...', { id: 'runner' });
    const { data, error } = await supabase.functions.invoke('blog-edicao-runner', {
      body: tema_id ? { tema_id } : {},
    });
    if (error) toast.error('Falha: ' + error.message, { id: 'runner' });
    else {
      const msg = data?.post_id ? 'Artigo publicado!' : (data?.message || 'Nada a fazer');
      toast.success(msg, { id: 'runner' });
      await load();
    }
    setRunning(false);
  };

  const regerarCapa = async (post_id: string) => {
    setRunning(true);
    toast.loading('Regerando capa...', { id: 'cover' });
    const { error } = await supabase.functions.invoke('blog-edicao-runner', {
      body: { regenerate_cover_post_id: post_id },
    });
    if (error) toast.error('Falha: ' + error.message, { id: 'cover' });
    else { toast.success('Capa regerada!', { id: 'cover' }); await load(); }
    setRunning(false);
  };

  const removerTema = async (id: string) => {
    if (!confirm('Remover este tema?')) return;
    await supabase.from('blog_edicao_temas').delete().eq('id', id);
    await load();
  };

  const salvarConfig = async () => {
    if (!config) return;
    const { error } = await supabase.from('blog_edicao_config').update({
      posts_por_dia: config.posts_por_dia,
      horarios: config.horarios,
      intervalo_minutos: config.intervalo_minutos,
      modo_publicacao: config.modo_publicacao,
      tom: config.tom,
      tamanho_alvo: config.tamanho_alvo,
      estilo_capa_prompt: config.estilo_capa_prompt,
      push_ativo: config.push_ativo,
      push_titulo_template: config.push_titulo_template,
      push_corpo_template: config.push_corpo_template,
      push_audiencia: config.push_audiencia as any,
      push_quiet_start: config.push_quiet_start,
      push_quiet_end: config.push_quiet_end,
      narracao_voz: config.narracao_voz,
      narracao_modelo: config.narracao_modelo,
      narracao_estilo: config.narracao_estilo,
    }).eq('id', config.id);
    if (error) toast.error(error.message);
    else { toast.success('Config salva'); setConfigOpen(false); }
  };

  const gerarPreview = async (voz: string) => {
    if (!previewTexto.trim()) { toast.error('Escreva um trecho de exemplo'); return; }
    const key = cacheKey(voz);
    if (previewAudio[key]) {
      togglePlay(previewAudio[key]);
      return;
    }
    setPreviewGerando(voz);
    try {
      const { data, error } = await supabase.functions.invoke('blog-narrar-preview', {
        body: { texto: previewTexto, voz, estilo: config?.narracao_estilo },
      });
      if (error || !(data as any)?.audio_data_url) throw new Error(error?.message || 'sem áudio');
      const url = (data as any).audio_data_url as string;
      setPreviewAudio(prev => {
        const next = { ...prev, [key]: url };
        try { localStorage.setItem(PREVIEW_CACHE_KEY, JSON.stringify(next)); } catch { /* quota */ }
        return next;
      });
      const a = new Audio(url);
      a.play().catch(() => {});
    } catch (e: any) {
      toast.error('Falha preview: ' + (e?.message || 'erro'));
    } finally {
      setPreviewGerando(null);
    }
  };

  const narrarArtigo = async (post_id: string) => {
    setNarrandoPostId(post_id);
    setNarracaoProgresso(p => ({ ...p, [post_id]: { done: 0, total: 0 } }));
    toast.loading('Iniciando narração...', { id: 'narr-' + post_id });
    try {
      const base = (import.meta as any).env?.VITE_SUPABASE_URL as string;
      const anon = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || anon;
      const resp = await fetch(`${base}/functions/v1/blog-narrar-artigo?stream=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'apikey': anon,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id }),
      });
      if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${txt.slice(0, 200)}`);
      }
      const reader = resp.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = '';
      let finalResult: any = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const events = buf.split('\n\n');
        buf = events.pop() || '';
        for (const evt of events) {
          const line = evt.split('\n').find(l => l.startsWith('data:'));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.type === 'progress') {
              setNarracaoProgresso(p => ({
                ...p,
                [post_id]: { done: payload.done, total: payload.total },
              }));
              const pct = payload.total ? Math.round((payload.done / payload.total) * 100) : 0;
              toast.loading(`Narrando... ${pct}% (${payload.done}/${payload.total})`, { id: 'narr-' + post_id });
            } else if (payload.type === 'done') {
              finalResult = payload.result;
            } else if (payload.type === 'error') {
              throw new Error(payload.error || 'erro no stream');
            }
          } catch (err) {
            if (err instanceof Error && err.message?.startsWith('erro')) throw err;
          }
        }
      }
      if (!finalResult) throw new Error('stream encerrou sem resultado');
      toast.success(
        `Narração pronta · ${Math.round((finalResult.duration_seconds || 0) / 60)}min · ${finalResult.cost_credits} cr.`,
        { id: 'narr-' + post_id },
      );
      await load();
    } catch (e: any) {
      toast.error('Falha: ' + (e?.message || 'erro'), { id: 'narr-' + post_id });
    } finally {
      setNarrandoPostId(null);
      setNarracaoProgresso(p => {
        const next = { ...p };
        delete next[post_id];
        return next;
      });
    }
  };

  const togglePlay = (url: string) => {
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
    audioRef.current.onended = () => setPlayingUrl(null);
    setPlayingUrl(url);
  };

  const USD_BRL = 5.50;
  const estimativa = useMemo(() => {
    const words = config?.tamanho_alvo || 1200;
    const chars = words * 5.5;
    const durationMin = Math.max(1, Math.round(chars / 900));
    const durationSec = durationMin * 60;
    const audioTokens = durationSec * 32;
    const custoUSD = (audioTokens / 1_000_000) * 10;
    const custoBRL = Number((custoUSD * USD_BRL).toFixed(2));
    return { chars: Math.round(chars), durationMin, custoBRL, custoUSD: Number(custoUSD.toFixed(3)) };
  }, [config?.tamanho_alvo]);

  const hojeFormatado = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }, []);

  // Timeline dos horários: marca enviado se já existe concluído de hoje para aquele slot
  const timelineSlots = useMemo(() => {
    const hs = (config?.horarios || []).slice(0, config?.posts_por_dia || 3);
    const hojeYMD = hojeStr();
    const concluidosHoje = concluidos.filter(c => (c.concluido_em || '').startsWith(hojeYMD));
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return hs.map((h, i) => {
      const [hh, mm] = h.split(':').map(Number);
      const slotMin = hh * 60 + (mm || 0);
      const enviado = concluidosHoje.length > i;
      const atrasado = !enviado && nowMin > slotMin + 30;
      return { horario: h, label: `${String(hh).padStart(2, '0')}h`, enviado, atrasado, isNext: proximaGeracao.horario === h };
    });
  }, [config, concluidos, proximaGeracao.horario]);

  return (
    <div className="min-h-dvh bg-background pb-8">
      <PageHeader
        title="Blog Edição"
        onBack={() => navigate(-1)}
        rightAction={
          <button onClick={() => setConfigOpen(true)} aria-label="Configurações" className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Hero: data grande + timeline */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent border border-primary/30 p-5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-primary/80 font-bold mb-2">
            Hoje
          </div>
          <div className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground leading-tight capitalize">
            {hojeFormatado}
          </div>

          {/* Timeline horizontal dos horários */}
          {timelineSlots.length > 0 && (
            <div className="mt-5 relative">
              {/* linha de fundo */}
              <div className="absolute left-4 right-4 top-4 h-0.5 bg-primary/20" />
              {/* linha preenchida (até último enviado) */}
              {(() => {
                const lastDoneIdx = timelineSlots.map(s => s.enviado).lastIndexOf(true);
                if (lastDoneIdx < 0) return null;
                const pct = timelineSlots.length > 1 ? (lastDoneIdx / (timelineSlots.length - 1)) * 100 : 0;
                return (
                  <div
                    className="absolute left-4 top-4 h-0.5 bg-primary transition-all"
                    style={{ width: `calc((100% - 2rem) * ${pct / 100})` }}
                  />
                );
              })()}
              <div className="relative flex items-start justify-between">
                {timelineSlots.map((s) => (
                  <div key={s.horario} className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className={
                        'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ' +
                        (s.enviado
                          ? 'bg-primary border-primary text-primary-foreground'
                          : s.atrasado
                          ? 'bg-destructive/20 border-destructive text-destructive'
                          : s.isNext
                          ? 'bg-primary/20 border-primary text-primary animate-pulse'
                          : 'bg-background border-primary/30 text-muted-foreground')
                      }
                    >
                      {s.enviado ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : s.atrasado ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Loader2 className={'w-4 h-4 ' + (s.isNext ? 'animate-spin' : '')} />
                      )}
                    </div>
                    <div className={'text-sm font-bold ' + (s.enviado ? 'text-primary' : s.isNext ? 'text-foreground' : 'text-muted-foreground')}>
                      {s.label}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {s.enviado ? 'Enviado' : s.atrasado ? 'Atrasado' : s.isNext ? 'Próximo' : 'Pendente'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proximaGeracao.item && (
            <div className="mt-5 pt-4 border-t border-primary/20">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Próximo artigo · {proximaGeracao.horario}</div>
              <div className="text-sm font-semibold line-clamp-2">{proximaGeracao.item.titulo_sugerido}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{proximaGeracao.item.categoria}</div>
            </div>
          )}
        </div>

        {/* Custos GCP (Gemini, TTS, etc.) */}
        <GcpMonitorWidget />

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl">
          {([
            { id: 'em_fila', label: 'Em fila', count: filaHoje.length },
            { id: 'biblioteca', label: 'Biblioteca', count: biblioteca.length },
            { id: 'concluidos', label: 'Concluídos', count: concluidos.length },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${tab === t.id ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
            >
              {t.label}
              <span className="ml-1 opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {loading && <div className="text-center text-muted-foreground py-8">Carregando…</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {tab === 'em_fila'
                ? 'Nenhum artigo agendado para hoje.'
                : tab === 'biblioteca'
                ? 'Biblioteca vazia. Gere temas em Configurações.'
                : 'Ainda nada publicado.'}
            </div>
          )}
          {filtered.map(t => {
            const horario = (t as any).horario as string | undefined;
            const isConcluido = t.status === 'concluido';
            return (
              <div key={t.id} className="rounded-xl bg-secondary/40 border border-border/50 p-3">
                <div className="flex items-start gap-2">
                  {isConcluido && t.imagem_url && (
                    <img
                      src={t.imagem_url}
                      alt={t.titulo_sugerido}
                      loading="lazy"
                      className="w-16 h-16 rounded-lg object-cover border border-border/50 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {tab === 'em_fila' && horario && (
                        <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                          {horario}
                        </span>
                      )}
                      {isConcluido && t.concluido_em && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                          {new Date(t.concluido_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status]}`}>
                        {t.status}
                      </span>
                      {(() => {
                        const c = (TEMA_COLORS as any)[t.categoria];
                        return (
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full tracking-wider"
                            style={c ? { background: c.chip, color: c.chipText } : undefined}
                          >
                            {t.categoria}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-sm font-semibold text-foreground line-clamp-2">
                      {t.titulo_sugerido}
                    </div>
                    {t.resumo_briefing && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {t.resumo_briefing}
                      </div>
                    )}
                    {t.erro && (
                      <div className="flex items-center gap-1 text-[11px] text-red-400 mt-1">
                        <AlertCircle className="w-3 h-3" /> {t.erro}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!isConcluido && (
                      <button
                        onClick={() => rodarAgora(t.id)}
                        disabled={running}
                        className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-50"
                        title="Gerar agora"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isConcluido && t.post_id && (
                      <button
                        onClick={() => regerarCapa(t.post_id!)}
                        disabled={running}
                        className="p-2 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                        title="Regerar capa"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isConcluido && t.post_id && (
                      <button
                        onClick={() => narrarArtigo(t.post_id!)}
                        disabled={narrandoPostId === t.post_id}
                        className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 disabled:opacity-50"
                        title={t.audio_url ? 'Regerar narração' : 'Gerar narração'}
                      >
                        {narrandoPostId === t.post_id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Headphones className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={() => removerTema(t.id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {t.post_id && narracaoProgresso[t.post_id] && (() => {
                  const { done, total } = narracaoProgresso[t.post_id];
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="mt-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/30 px-2.5 py-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-fuchsia-200 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Gerando narração
                          {total > 0 && <span className="text-fuchsia-300/70 font-mono">· {done}/{total} trechos</span>}
                        </span>
                        <span className="font-mono tabular-nums text-fuchsia-100">{pct}%</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-fuchsia-950/60 overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-fuchsia-400 to-pink-400 transition-all duration-500 ease-out"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                        {/* Shimmer animado indicando atividade entre chunks */}
                        <div
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                          style={{ animation: 'shimmerBar 1.4s linear infinite' }}
                        />
                      </div>
                    </div>
                  );
                })()}
                {t.audio_url && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20 px-2 py-1.5">
                    <button
                      onClick={() => togglePlay(t.audio_url!)}
                      className="p-1.5 rounded-md bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30"
                    >
                      {playingUrl === t.audio_url ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <div className="text-[11px] text-fuchsia-200/80 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> {t.audio_voice || '—'}</span>
                      {t.audio_duration_seconds != null && (
                        <span>· {Math.floor((t.audio_duration_seconds || 0) / 60)}m{String((t.audio_duration_seconds || 0) % 60).padStart(2, '0')}s</span>
                      )}
                      {t.audio_cost_credits != null && <span>· {t.audio_cost_credits} cr.</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Config Sheet */}
      <Sheet open={configOpen} onOpenChange={setConfigOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurações</SheetTitle>
            <p className="text-xs text-muted-foreground text-left">Ações e ajustes de publicação.</p>
          </SheetHeader>
          {config && (
            <div className="pt-4 pb-8 space-y-2">
              <button
                onClick={() => setConfigSection('acoes')}
                className="w-full flex items-center gap-3 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/40 p-3 hover:from-primary/30 transition text-left"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20 text-primary">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">Ações rápidas</div>
                  <div className="text-[11px] text-muted-foreground truncate">Gerar temas · Gerar próximo artigo</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>

              {([
                { id: 'agenda', icon: CalendarClock, tint: 'text-blue-300 bg-blue-500/10', title: 'Agenda e publicação', desc: `${config.posts_por_dia} posts/dia · ${(config.horarios||[]).join(', ')}` },
                { id: 'conteudo', icon: PenLine, tint: 'text-emerald-300 bg-emerald-500/10', title: 'Conteúdo', desc: `${config.tamanho_alvo} palavras · tom personalizado` },
                { id: 'capa', icon: ImagePlus, tint: 'text-amber-300 bg-amber-500/10', title: 'Capa dos artigos', desc: 'Prompt padrão para geração de imagem' },
                { id: 'narracao', icon: Headphones, tint: 'text-fuchsia-300 bg-fuchsia-500/10', title: 'Narração', desc: `Voz padrão: ${config.narracao_voz || '—'}` },
                { id: 'push', icon: Bell, tint: 'text-rose-300 bg-rose-500/10', title: 'Notificação push', desc: config.push_ativo ? 'Ativa' : 'Desativada' },
              ] as const).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setConfigSection(item.id as any)}
                    className="w-full flex items-center gap-3 rounded-xl bg-secondary/40 border border-border/50 p-3 hover:bg-secondary/60 transition text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.tint}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialogs por seção */}
      <Dialog open={!!configSection} onOpenChange={(o) => !o && setConfigSection(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          {config && configSection === 'acoes' && (
            <>
              <DialogHeader><DialogTitle>Ações rápidas</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Use estas ações para popular a biblioteca de temas ou disparar imediatamente o próximo artigo agendado.
                </p>
                <button
                  onClick={async () => { await gerarTemas(); }}
                  disabled={running}
                  className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> Gerar 30 temas com IA
                </button>
                <button
                  onClick={async () => { await rodarAgora(); }}
                  disabled={running}
                  className="w-full rounded-xl bg-secondary font-semibold py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" /> Gerar próximo artigo agora
                </button>
                <div className="text-[11px] text-muted-foreground rounded-lg bg-secondary/40 p-2">
                  <strong className="text-foreground">Biblioteca:</strong> {biblioteca.length} temas · <strong className="text-foreground">Fila de hoje:</strong> {filaHoje.length} · <strong className="text-foreground">Publicados:</strong> {concluidos.length}
                </div>
              </div>
            </>
          )}

          {config && configSection === 'agenda' && (
            <>
              <DialogHeader><DialogTitle>Agenda e publicação</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Posts por dia</span>
                  <input type="number" min={1} max={20} value={config.posts_por_dia}
                    onChange={e => setConfig({ ...config, posts_por_dia: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Horários (HH:MM separados por vírgula)</span>
                  <input type="text" value={(config.horarios || []).join(', ')}
                    onChange={e => setConfig({ ...config, horarios: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm font-mono" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Intervalo (min, opcional — sobrescreve horários)</span>
                  <input type="number" min={0} value={config.intervalo_minutos ?? ''}
                    onChange={e => setConfig({ ...config, intervalo_minutos: e.target.value ? Number(e.target.value) : null })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Modo</span>
                  <select value={config.modo_publicacao}
                    onChange={e => setConfig({ ...config, modo_publicacao: e.target.value as 'auto' | 'rascunho' })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm">
                    <option value="auto">Publicar automaticamente</option>
                    <option value="rascunho">Salvar como rascunho</option>
                  </select>
                </label>
              </div>
            </>
          )}

          {config && configSection === 'conteudo' && (
            <>
              <DialogHeader><DialogTitle>Conteúdo</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Tom da escrita</span>
                  <textarea value={config.tom} rows={3}
                    onChange={e => setConfig({ ...config, tom: e.target.value })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Tamanho-alvo (palavras)</span>
                  <input type="number" min={500} max={4000} value={config.tamanho_alvo}
                    onChange={e => setConfig({ ...config, tamanho_alvo: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                </label>
              </div>
            </>
          )}

          {config && configSection === 'capa' && (
            <>
              <DialogHeader><DialogTitle>Capa dos artigos</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Prompt padrão da capa</span>
                  <textarea value={config.estilo_capa_prompt} rows={10}
                    onChange={e => setConfig({ ...config, estilo_capa_prompt: e.target.value })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono" />
                </label>
              </div>
            </>
          )}

          {config && configSection === 'narracao' && (
            <>
              <DialogHeader><DialogTitle>Narração dos artigos</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ouça uma prévia de cada voz e escolha a padrão. O trecho abaixo é usado como amostra.
                </p>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Estilo (prompt de narração)</span>
                  <textarea value={config.narracao_estilo || ''} rows={3}
                    onChange={e => setConfig({ ...config, narracao_estilo: e.target.value })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-xs" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Trecho de amostra</span>
                  <textarea value={previewTexto} rows={3} maxLength={1500}
                    onChange={e => setPreviewTexto(e.target.value)}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-xs" />
                  <span className="text-[10px] text-muted-foreground">{previewTexto.length}/1500</span>
                </label>
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/40 p-2">
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Duração</div>
                    <div className="text-sm font-bold text-fuchsia-200">~{estimativa.durationMin} min</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Caracteres</div>
                    <div className="text-sm font-bold text-fuchsia-200">~{estimativa.chars.toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Custo</div>
                    <div className="text-sm font-bold text-fuchsia-200">
                      ~R$ {estimativa.custoBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-muted-foreground/70">Gemini 2.5 Flash TTS</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Voz padrão: <strong className="text-fuchsia-200">{config.narracao_voz || '—'}</strong>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                  {vozes.map(v => {
                    const selecionada = config.narracao_voz === v.id;
                    const gerando = previewGerando === v.id;
                    const audioUrl = previewAudio[cacheKey(v.id)];
                    return (
                      <div key={v.id} className={`rounded-lg border p-2 flex items-center gap-2 ${selecionada ? 'bg-fuchsia-500/15 border-fuchsia-400/60' : 'bg-secondary/40 border-border/50'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${v.genero === 'F' ? 'bg-pink-500/20 text-pink-200' : 'bg-blue-500/20 text-blue-200'}`}>{v.genero}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{v.id}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{v.descricao}</div>
                        </div>
                        <button onClick={() => gerarPreview(v.id)} disabled={gerando}
                          className="p-2 rounded-lg bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30 disabled:opacity-50" title="Gerar preview">
                          {gerando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                        </button>
                        {audioUrl && (
                          <button onClick={() => togglePlay(audioUrl)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80" title="Reproduzir">
                            {playingUrl === audioUrl ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button onClick={() => setConfig({ ...config, narracao_voz: v.id })}
                          className={`text-[10px] font-bold px-2 py-1.5 rounded-lg ${selecionada ? 'bg-fuchsia-400 text-fuchsia-950' : 'bg-secondary text-muted-foreground'}`}>
                          {selecionada ? 'PADRÃO' : 'ESCOLHER'}
                        </button>
                      </div>
                    );
                  })}
                  {vozes.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Carregando vozes…</div>}
                </div>
              </div>
            </>
          )}

          {config && configSection === 'push' && (
            <>
              <DialogHeader><DialogTitle>Notificação push</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                  <span className="text-sm font-semibold">Ativar notificações</span>
                  <input type="checkbox" checked={config.push_ativo}
                    onChange={e => setConfig({ ...config, push_ativo: e.target.checked })} />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Título (use {'{titulo}'} e {'{headline}'})</span>
                  <input type="text" value={config.push_titulo_template}
                    onChange={e => setConfig({ ...config, push_titulo_template: e.target.value })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Corpo</span>
                  <input type="text" value={config.push_corpo_template}
                    onChange={e => setConfig({ ...config, push_corpo_template: e.target.value })}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Silêncio início</span>
                    <input type="time" value={config.push_quiet_start || ''}
                      onChange={e => setConfig({ ...config, push_quiet_start: e.target.value || null })}
                      className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Silêncio fim</span>
                    <input type="time" value={config.push_quiet_end || ''}
                      onChange={e => setConfig({ ...config, push_quiet_end: e.target.value || null })}
                      className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-sm" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Audiência (JSON)</span>
                  <textarea rows={3} value={JSON.stringify(config.push_audiencia, null, 2)}
                    onChange={e => { try { setConfig({ ...config, push_audiencia: JSON.parse(e.target.value) }); } catch { /* ignora */ } }}
                    className="w-full mt-1 rounded-lg bg-secondary px-3 py-2 text-xs font-mono" />
                </label>
              </div>
            </>
          )}

          {config && configSection && configSection !== 'acoes' && (
            <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
              <button onClick={() => setConfigSection(null)}
                className="flex-1 rounded-xl bg-secondary font-semibold py-2.5 text-sm">Cancelar</button>
              <button onClick={async () => { await salvarConfig(); setConfigSection(null); setConfigOpen(true); }}
                className="flex-1 rounded-xl bg-primary text-primary-foreground font-semibold py-2.5 text-sm">Salvar</button>
            </div>
          )}
          {config && configSection === 'acoes' && (
            <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
              <button onClick={() => setConfigSection(null)}
                className="flex-1 rounded-xl bg-secondary font-semibold py-2.5 text-sm">Fechar</button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
