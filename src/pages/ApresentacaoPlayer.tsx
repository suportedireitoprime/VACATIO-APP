import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, ChevronLeft, ChevronRight, Heart, Star, Share2, MessageCircle, RotateCw, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import flipSoundAsset from '@/assets/flipcard.mp3.asset.json';

type Slide = { slide_index: number; imagem_url: string | null; audio_url: string | null; roteiro: string | null };
type Apres = { id: string; titulo: string; descricao: string | null; total_slides: number; livro_tabela: string; livro_id: string };

const formatarTempo = (seg: number): string => {
  if (!Number.isFinite(seg) || seg < 0) return '--:--';
  const m = Math.floor(seg / 60);
  const s = Math.round(seg % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const ApresentacaoPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const [usaA, setUsaA] = useState(true);
  const usaARef = useRef(true);
  usaARef.current = usaA;
  const flipAudioRef = useRef<HTMLAudioElement | null>(null);
  const [apres, setApres] = useState<Apres | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [idx, setIdx] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [preparando, setPreparando] = useState(false);
  const [duracoes, setDuracoes] = useState<number[]>([]);
  const [tempoAtual, setTempoAtual] = useState(0);
  const [deitado, setDeitado] = useState(false);
  const [midiaPronta, setMidiaPronta] = useState(false);
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const [curtido, setCurtido] = useState(false);
  const [favorito, setFavorito] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comentarios, setComentarios] = useState<{ id: string; texto: string; created_at: string }[]>([]);
  const [abrirComentarios, setAbrirComentarios] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const [{ data: a }, { data: s }, { count }, { data: cs }] = await Promise.all([
        supabase.from('apresentacoes_narradas').select('id, titulo, descricao, total_slides, livro_tabela, livro_id').eq('id', id).maybeSingle(),
        supabase.from('apresentacao_slides').select('slide_index, imagem_url, audio_url, roteiro').eq('apresentacao_id', id).order('slide_index'),
        supabase.from('apresentacao_likes').select('id', { count: 'exact', head: true }).eq('apresentacao_id', id),
        supabase.from('apresentacao_comentarios').select('id, texto, created_at').eq('apresentacao_id', id).order('created_at', { ascending: false }),
      ]);
      setApres(a as Apres | null);
      setSlides((s ?? []) as Slide[]);
      setLikes(count ?? 0);
      setComentarios((cs ?? []) as any[]);
      if (user) {
        const [{ data: l }, { data: f }] = await Promise.all([
          supabase.from('apresentacao_likes').select('id').eq('apresentacao_id', id).eq('user_id', user.id).maybeSingle(),
          supabase.from('apresentacao_favoritos').select('id').eq('apresentacao_id', id).eq('user_id', user.id).maybeSingle(),
        ]);
        setCurtido(!!l); setFavorito(!!f);
      }
      setCarregando(false);
    })();
  }, [id]);

  const slide = slides[idx];

  const elAtivo = useCallback(() => (usaARef.current ? audioARef.current : audioBRef.current), []);
  const elReserva = useCallback(() => (usaARef.current ? audioBRef.current : audioARef.current), []);

  /** Pré-carrega todas as imagens dos slides de uma vez (nada "surge" depois). */
  useEffect(() => {
    if (!slides.length) return;
    let vivo = true;
    const urls = slides.map((s) => s.imagem_url).filter(Boolean) as string[];
    if (!urls.length) { setMidiaPronta(true); return; }
    Promise.all(
      urls.map((u) => new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = u;
      })),
    ).then(() => { if (vivo) setMidiaPronta(true); });
    return () => { vivo = false; };
  }, [slides]);

  /** Deixa o áudio do próximo slide já bufferizado para a troca não ter pausa. */
  const precarregarProximo = useCallback((i: number) => {
    const prox = slides[i + 1]?.audio_url;
    const res = elReserva();
    if (!res || !prox) return;
    if (res.src !== prox) { res.src = prox; res.load(); }
  }, [slides, elReserva]);

  // Som de virada de slide — o mesmo usado nos flashcards.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    flipAudioRef.current = new Audio(flipSoundAsset.url);
    flipAudioRef.current.volume = 0.5;
  }, []);

  const tocarFlip = useCallback(() => {
    const a = flipAudioRef.current;
    if (!a) return;
    try { a.currentTime = 0; void a.play(); } catch { /* ignora */ }
  }, []);

  // Mede a duração de cada slide para mostrar o tempo total da apresentação.
  useEffect(() => {
    if (!slides.length) return;
    let vivo = true;
    const medir = (url: string | null) => new Promise<number>((resolve) => {
      if (!url) return resolve(0);
      const a = new Audio();
      a.preload = 'metadata';
      const fim = (v: number) => { a.src = ''; resolve(v); };
      a.addEventListener('loadedmetadata', () => fim(Number.isFinite(a.duration) ? a.duration : 0), { once: true });
      a.addEventListener('error', () => fim(0), { once: true });
      a.src = url;
    });
    (async () => {
      const ds: number[] = [];
      for (const s of slides) {
        const d = await medir(s.audio_url);
        if (!vivo) return;
        ds.push(d);
        setDuracoes([...ds]);
      }
    })();
    return () => { vivo = false; };
  }, [slides]);

  // Carrega o áudio do slide atual e toca quando estiver em reprodução.
  const tocarSlide = useCallback(async (i: number, autoplay: boolean) => {
    const el = elAtivo();
    const url = slides[i]?.audio_url;
    if (!el) return;
    if (!url) {
      el.removeAttribute('src');
      el.load();
      if (autoplay) toast.info('Este slide ainda não tem narração');
      return;
    }
    if (el.src !== url) { el.src = url; el.load(); }
    precarregarProximo(i);
    if (!autoplay) return;
    try {
      setPreparando(true);
      await el.play();
      setTocando(true);
    } catch (e) {
      setTocando(false);
      toast.error('Não foi possível reproduzir o áudio deste slide');
    } finally {
      setPreparando(false);
    }
  }, [slides, elAtivo, precarregarProximo]);

  const irPara = useCallback((novo: number) => {
    if (novo < 0 || novo >= slides.length) { setTocando(false); return; }
    const anterior = elAtivo();
    if (anterior) { anterior.pause(); }
    setDirecao(novo > idx ? 1 : -1);
    tocarFlip();
    setIdx(novo);
    setTempoAtual(0);
    void tocarSlide(novo, tocando);
  }, [slides.length, tocando, tocarSlide, idx, tocarFlip, elAtivo]);

  /**
   * Fim da narração de um slide: troca para o elemento de áudio já
   * pré-carregado do próximo slide e toca na hora, sem silêncio no meio.
   */
  const continuarProximo = useCallback(() => {
    const proximo = idx + 1;
    if (proximo >= slides.length) { setTocando(false); return; }
    const url = slides[proximo]?.audio_url;
    const res = elReserva();
    setDirecao(1);
    tocarFlip();
    setIdx(proximo);
    setTempoAtual(0);
    if (!url || !res) return;
    if (res.src !== url) { res.src = url; res.load(); }
    usaARef.current = !usaARef.current;
    setUsaA(usaARef.current);
    void res.play().catch(() => setTocando(false));
    // já deixa o seguinte bufferizado no elemento que acabou de liberar
    const seguinte = slides[proximo + 1]?.audio_url;
    const livre = usaARef.current ? audioBRef.current : audioARef.current;
    if (seguinte && livre && livre.src !== seguinte) { livre.src = seguinte; livre.load(); }
  }, [idx, slides, elReserva, tocarFlip]);

  // Prepara o áudio do primeiro slide assim que os dados chegam.
  useEffect(() => {
    if (slides.length) void tocarSlide(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  const alternarPlay = useCallback(async () => {
    const el = elAtivo();
    if (!el) return;
    if (tocando) { el.pause(); setTocando(false); return; }
    await tocarSlide(idx, true);
  }, [tocando, idx, tocarSlide, elAtivo]);

  const curtir = async () => {
    if (!userId || !id) { toast.info('Entre para curtir'); return; }
    if (curtido) {
      await supabase.from('apresentacao_likes').delete().eq('apresentacao_id', id).eq('user_id', userId);
      setCurtido(false); setLikes((n) => Math.max(0, n - 1));
    } else {
      await supabase.from('apresentacao_likes').insert({ apresentacao_id: id, user_id: userId });
      setCurtido(true); setLikes((n) => n + 1);
    }
  };

  const favoritar = async () => {
    if (!userId || !id) { toast.info('Entre para favoritar'); return; }
    if (favorito) {
      await supabase.from('apresentacao_favoritos').delete().eq('apresentacao_id', id).eq('user_id', userId);
      setFavorito(false);
    } else {
      await supabase.from('apresentacao_favoritos').insert({ apresentacao_id: id, user_id: userId });
      setFavorito(true);
      toast.success('Adicionada aos favoritos');
    }
  };

  const compartilhar = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: apres?.titulo ?? 'Apresentação narrada', url });
      else { await navigator.clipboard.writeText(url); toast.success('Link copiado'); }
    } catch { /* cancelado */ }
  };

  const enviarComentario = async () => {
    const texto = novoComentario.trim();
    if (!texto || !userId || !id) { if (!userId) toast.info('Entre para comentar'); return; }
    const { data, error } = await supabase.from('apresentacao_comentarios')
      .insert({ apresentacao_id: id, user_id: userId, texto }).select('id, texto, created_at').single();
    if (error) { toast.error('Não foi possível comentar'); return; }
    setComentarios((prev) => [data as any, ...prev]);
    setNovoComentario('');
  };

  if (carregando || (slides.length > 0 && !midiaPronta)) {
    return (
      <div className="min-h-dvh bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-white/70" />
        <p className="text-xs text-white/50 font-body">Carregando slides…</p>
      </div>
    );
  }
  if (!apres || !slides.length) {
    return (
      <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-body text-white/80">Apresentação indisponível.</p>
        <button onClick={() => navigate(-1)} className="rounded-xl bg-white/10 px-4 py-2 text-sm">Voltar</button>
      </div>
    );
  }

  const duracaoSlide = duracoes[idx] ?? 0;
  const totalMedido = duracoes.reduce((a, b) => a + b, 0);
  const tudoMedido = duracoes.length === slides.length;
  const decorridoAnterior = duracoes.slice(0, idx).reduce((a, b) => a + b, 0);
  const pctSlide = duracaoSlide > 0 ? Math.min(100, (tempoAtual / duracaoSlide) * 100) : 0;
  const restanteSlide = duracaoSlide > 0 ? Math.max(0, duracaoSlide - tempoAtual) : 0;
  const pct = totalMedido > 0
    ? Math.min(100, ((decorridoAnterior + tempoAtual) / totalMedido) * 100)
    : ((idx + 1) / slides.length) * 100;

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      <audio
        ref={audioARef}
        onEnded={() => { if (usaA) continuarProximo(); }}
        onTimeUpdate={(e) => { if (usaA) setTempoAtual(e.currentTarget.currentTime); }}
        onPlay={() => { if (usaA) setTocando(true); }}
        preload="auto"
        className="hidden"
      />
      <audio
        ref={audioBRef}
        onEnded={() => { if (!usaA) continuarProximo(); }}
        onTimeUpdate={(e) => { if (!usaA) setTempoAtual(e.currentTarget.currentTime); }}
        onPlay={() => { if (!usaA) setTocando(true); }}
        preload="auto"
        className="hidden"
      />

      <header className="flex items-center gap-3 p-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-sm truncate">{apres.titulo}</p>
          <p className="text-[11px] text-white/60 font-body">
            Slide {idx + 1} de {slides.length}
            {totalMedido > 0 && ` · ${tudoMedido ? '' : '~'}${formatarTempo(totalMedido)} no total`}
          </p>
        </div>
        <button onClick={() => setDeitado((v) => !v)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" aria-label="Girar tela">
          <RotateCw className="w-5 h-5" />
        </button>
      </header>

      {/* Progresso do slide atual — mostra quanto falta para acabar. */}
      <div className="px-3 pb-2">
        <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
          <div
            className={`h-full rounded-full bg-primary ${pctSlide > 85 ? 'animate-pulse' : ''}`}
            style={{ width: `${pctSlide}%`, transition: 'width 200ms linear' }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/50 font-body tabular-nums pt-1">
          <span>Slide {idx + 1}</span>
          <span>{duracaoSlide > 0 ? `-${formatarTempo(restanteSlide)}` : 'sem narração'}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden px-3">
        <div className={`w-full transition-transform duration-500 ${deitado ? 'rotate-90 scale-[0.72]' : ''}`}>
          <div
            key={idx}
            className="animate-fade-in"
            style={{ animation: `slide-swap-${direcao === 1 ? 'next' : 'prev'} 420ms cubic-bezier(0.22,1,0.36,1)` }}
          >
            {slide?.imagem_url ? (
              <img
                src={slide.imagem_url}
                alt={`Slide ${idx + 1} de ${apres.titulo}`}
                decoding="sync"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="aspect-video rounded-2xl bg-white/10" />
            )}
          </div>
        </div>
        {/* Mantém todas as imagens em cache do navegador para trocas instantâneas. */}
        <div className="hidden" aria-hidden>
          {slides.map((s) => (s.imagem_url ? <img key={s.slide_index} src={s.imagem_url} alt="" /> : null))}
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/60 font-body tabular-nums">
          <span>{formatarTempo(decorridoAnterior + tempoAtual)}</span>
          <span>{duracaoSlide > 0 ? `slide ${formatarTempo(tempoAtual)} / ${formatarTempo(duracaoSlide)}` : 'sem narração'}</span>
          <span>{totalMedido > 0 ? formatarTempo(totalMedido) : '--:--'}</span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button onClick={() => irPara(idx - 1)} disabled={idx === 0} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={alternarPlay} aria-label={tocando ? 'Pausar' : 'Reproduzir'} className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition">
            {preparando ? <Loader2 className="w-7 h-7 animate-spin" /> : tocando ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
          <button onClick={() => irPara(idx + 1)} disabled={idx === slides.length - 1} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center justify-around pt-1">
          <button onClick={curtir} className="flex flex-col items-center gap-1 text-[11px] font-body">
            <Heart className={`w-6 h-6 ${curtido ? 'fill-primary text-primary' : ''}`} /> {likes}
          </button>
          <button onClick={() => setAbrirComentarios(true)} className="flex flex-col items-center gap-1 text-[11px] font-body">
            <MessageCircle className="w-6 h-6" /> {comentarios.length}
          </button>
          <button onClick={compartilhar} className="flex flex-col items-center gap-1 text-[11px] font-body">
            <Share2 className="w-6 h-6" /> Enviar
          </button>
          <button onClick={favoritar} className="flex flex-col items-center gap-1 text-[11px] font-body">
            <Star className={`w-6 h-6 ${favorito ? 'fill-primary text-primary' : ''}`} /> Salvar
          </button>
        </div>
      </div>

      <Sheet open={abrirComentarios} onOpenChange={setAbrirComentarios}>
        <SheetContent side="bottom" className="h-[70vh] flex flex-col">
          <SheetHeader><SheetTitle>Comentários</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-3">
            {comentarios.length === 0 && <p className="text-sm text-muted-foreground font-body">Seja o primeiro a comentar.</p>}
            {comentarios.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-body">{c.texto}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pb-2">
            <input
              value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)}
              placeholder="Escreva um comentário…"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-body"
            />
            <button onClick={enviarComentario} className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"><Send className="w-5 h-5" /></button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ApresentacaoPlayer;
