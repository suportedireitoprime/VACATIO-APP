import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, X, Clock, Heart, MessageCircle, ExternalLink, Send, Loader2 } from 'lucide-react';
import brasaoImg from '@/assets/brasao-republica.webp';
import swooshAsset from '@/assets/swoosh.mp3.asset.json';
import swooshBundled from '@/assets/swoosh.mp3';
import { pickAsset } from '@/lib/assetUrl';

const swooshSrc = pickAsset(swooshBundled, swooshAsset.url);

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BoletimScene = {
  kind: 'intro' | 'norma' | 'outro';
  tipo: string;
  tipo_label?: string;
  titulo: string;
  texto: string;
  audio_url: string;
  imagem_url: string;
  cor_hex?: string;
  duracao_s?: number;
  url_fonte?: string;
  imagem_fonte?: 'openverse' | 'tipo_padrao';
  imagem_credito?: {
    autor?: string;
    autor_url?: string;
    licenca?: string;
    licenca_url?: string;
    fonte_url?: string;
    titulo?: string;
  } | null;
};

interface Props {
  boletimId?: string;
  scenes: BoletimScene[];
  youtubeUrl?: string;
  onClose?: () => void;
}

type Comentario = {
  id: string;
  autor_nome: string | null;
  texto: string;
  created_at: string;
  user_id: string;
};

/**
 * Player nativo: reproduz o áudio TTS de cada cena com Ken Burns + texto animado.
 * Sincronia por evento `ended` do <audio>; próximo áudio pré-carregado.
 */
export default function BoletimPlayer({ boletimId, scenes, youtubeUrl, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<number, { count: number; mine: boolean }>>({});
  const [comentariosOpen, setComentariosOpen] = useState(false);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [countComentarios, setCountComentarios] = useState<Record<number, number>>({});
  const [transitionKey, setTransitionKey] = useState(0);
  const [showTransition, setShowTransition] = useState(false);


  // GA4: abrir_boletim + play_narracao (uma vez por mount)
  useEffect(() => {
    import('@/lib/appEvents').then(({ appEvents }) => {
      appEvents.abrirBoletim({ boletim_id: boletimId });
      appEvents.playNarracao({ kind: 'boletim', id: boletimId });
    }).catch(() => {});
     
  }, [boletimId]);

  const scene = scenes[idx];
  const next = scenes[idx + 1];

  useEffect(() => {
    if (!audioRef.current || !scene) return;
    let cleanup: (() => void) | undefined;
    // Overlay + swoosh em toda transição (exceto a primeira cena/intro)
    if (idx > 0 && scene.kind !== 'intro') {
      try {
        const s = new Audio(swooshSrc);
        s.volume = 0.6;
        s.play().catch(() => {});
      } catch {}
      setTransitionKey((k) => k + 1);
      setShowTransition(true);
      const t = setTimeout(() => setShowTransition(false), 900);
      cleanup = () => clearTimeout(t);
    }
    audioRef.current.src = scene.audio_url;
    audioRef.current.load();
    if (playing) {
      audioRef.current.play().catch(() => setPlaying(false));
    }
    return cleanup;
  }, [idx]);




  useEffect(() => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [playing]);

  // Trilha de fundo
  useEffect(() => {
    const bg = bgAudioRef.current;
    if (!bg) return;
    bg.volume = 0.18;
    bg.loop = true;
    if (playing) bg.play().catch(() => {});
    else bg.pause();
  }, [playing]);


  // Sessão do usuário
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Carrega contadores de likes/comentários por cena
  useEffect(() => {
    if (!boletimId) return;
    (async () => {
      const [{ data: ls }, { data: cs }] = await Promise.all([
        supabase.from('boletim_likes').select('scene_index,user_id').eq('boletim_id', boletimId),
        supabase.from('boletim_comentarios').select('scene_index').eq('boletim_id', boletimId),
      ]);
      const l: Record<number, { count: number; mine: boolean }> = {};
      (ls || []).forEach((r: any) => {
        const cur = l[r.scene_index] || { count: 0, mine: false };
        cur.count += 1;
        if (userId && r.user_id === userId) cur.mine = true;
        l[r.scene_index] = cur;
      });
      setLikes(l);
      const c: Record<number, number> = {};
      (cs || []).forEach((r: any) => {
        c[r.scene_index] = (c[r.scene_index] || 0) + 1;
      });
      setCountComentarios(c);
    })();
  }, [boletimId, userId]);

  // Carrega comentários da cena atual quando abre a sheet
  useEffect(() => {
    if (!boletimId || !comentariosOpen) return;
    (async () => {
      const { data } = await supabase
        .from('boletim_comentarios')
        .select('id,autor_nome,texto,created_at,user_id')
        .eq('boletim_id', boletimId)
        .eq('scene_index', idx)
        .order('created_at', { ascending: false });
      setComentarios((data as any) || []);
    })();
  }, [boletimId, comentariosOpen, idx]);

  if (!scene && !youtubeUrl) return null;

  // Player do YouTube (prioridade quando houver link)
  if (youtubeUrl) {
    const videoId = youtubeUrl.replace(/.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/, '$1');
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="relative z-10 flex items-center justify-end p-4 pt-6">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 pb-12">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Boletim Jurídico"
            className="w-full max-w-5xl aspect-video rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  const goTo = (n: number) => {
    const clamped = Math.max(0, Math.min(scenes.length - 1, n));
    setIdx(clamped);
  };
  const onEnded = () => {
    if (idx + 1 < scenes.length) setIdx(idx + 1);
    else {
      setPlaying(false);
      import('@/lib/appEvents').then(({ appEvents }) =>
        appEvents.completeNarracao({ kind: 'boletim', id: boletimId })
      ).catch(() => {});
    }
  };

  const cor = scene.cor_hex || '#3B82F6';
  const progresso = ((idx + 1) / scenes.length) * 100;
  const duracaoTotalS = scenes.reduce((acc, s) => acc + (s.duracao_s || 8), 0);
  const totalMin = Math.floor(duracaoTotalS / 60);
  const totalSec = Math.round(duracaoTotalS % 60);
  const hoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const likeAtual = likes[idx] || { count: 0, mine: false };
  const commentsCount = countComentarios[idx] || 0;

  const toggleLike = async () => {
    if (!boletimId) return;
    if (!userId) {
      toast.error('Entre para curtir');
      return;
    }
    // otimista
    setLikes((prev) => {
      const cur = prev[idx] || { count: 0, mine: false };
      return {
        ...prev,
        [idx]: { count: cur.mine ? cur.count - 1 : cur.count + 1, mine: !cur.mine },
      };
    });
    if (likeAtual.mine) {
      await supabase
        .from('boletim_likes')
        .delete()
        .eq('boletim_id', boletimId)
        .eq('scene_index', idx)
        .eq('user_id', userId);
    } else {
      const { error } = await supabase
        .from('boletim_likes')
        .insert({ boletim_id: boletimId, scene_index: idx, user_id: userId });
      if (error && !error.message.includes('duplicate')) toast.error('Erro ao curtir');
    }
  };

  const enviarComentario = async () => {
    if (!boletimId || !userId) {
      toast.error('Entre para comentar');
      return;
    }
    const texto = novoComentario.trim();
    if (!texto) return;
    setEnviandoComentario(true);
    const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
    const { data, error } = await supabase
      .from('boletim_comentarios')
      .insert({
        boletim_id: boletimId,
        scene_index: idx,
        user_id: userId,
        autor_nome: prof?.display_name || 'Usuário',
        texto,
      })
      .select('id,autor_nome,texto,created_at,user_id')
      .single();
    setEnviandoComentario(false);
    if (error) {
      toast.error('Erro ao comentar');
      return;
    }
    setComentarios((prev) => [data as any, ...prev]);
    setCountComentarios((prev) => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
    setNovoComentario('');
  };

  const abrirFonte = () => {
    if (scene.url_fonte) window.open(scene.url_fonte, '_blank', 'noopener,noreferrer');
    else toast.info('Fonte não disponível para esta cena');
  };


  const isNorma = scene.kind === 'norma';
  const fonteLabel = (() => {
    if (!scene.url_fonte) return null;
    try {
      const host = new URL(scene.url_fonte).hostname.replace(/^www\./, '');
      const base = host.split('.')[0];
      if (!base) return null;
      return base.charAt(0).toUpperCase() + base.slice(1);
    } catch {
      return null;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Fundo: para intro mantém imagem em tela cheia; para norma usa gradiente sutil */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${idx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.6, ease: 'easeOut' } }}
          className="absolute inset-0 overflow-hidden"
        >
          {isNorma ? (
            <>
              {/* Fundo desfocado da mesma imagem só para ambientação */}
              <img
                src={scene.imagem_url}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${cor}33 0%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.98) 100%)`,
                }}
              />
            </>
          ) : (
            <>
              <motion.img
                key={`img-${idx}`}
                src={scene.imagem_url}
                alt=""
                initial={{ scale: 1 }}
                animate={{ scale: 1.15 }}
                transition={{ duration: scene.duracao_s || 8, ease: 'linear' }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${cor}22 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.92) 100%)`,
                }}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>


      {/* Overlay de transição entre notícias */}
      <AnimatePresence>
        {showTransition && (
          <motion.div
            key={`trans-${transitionKey}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {/* Cortina de cor deslizando */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 0.85, ease: [0.7, 0, 0.3, 1] }}
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${cor} 40%, ${cor} 60%, transparent 100%)`,
              }}
            />
            {/* Flash central */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, times: [0, 0.3, 0.7, 1] }}
              className="relative flex flex-col items-center gap-3"
            >
              <img
                src={brasaoImg}
                alt=""
                className="w-16 h-16 object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              />
              <span className="text-white text-xs uppercase tracking-[0.4em] font-bold">
                Próxima norma
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pré-carrega próximo */}
      {next?.audio_url && <link rel="preload" as="audio" href={next.audio_url} />}


      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 p-4 pt-6">
        <div className="flex-1 flex gap-1">
          {scenes.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < idx ? '100%' : i === idx ? '50%' : '0%' }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Cena */}
      <div
        className={`relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col p-6 pb-40 ${
          scene.kind === 'intro' ? 'items-center justify-center text-center' : 'justify-end'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={scene.kind === 'intro' ? 'flex flex-col items-center' : ''}
          >
            {scene.kind === 'intro' ? (
              <>
                <img
                  src={brasaoImg}
                  alt="Brasão da República"
                  className="w-28 h-28 md:w-36 md:h-36 object-contain mb-6 drop-shadow-[0_6px_20px_rgba(0,0,0,0.6)]"
                />
                <span
                  className="inline-block text-xs uppercase tracking-[0.3em] font-bold px-4 py-1.5 rounded-full mb-4 bg-white/10 backdrop-blur text-white"
                >
                  Boletim Jurídico
                </span>
                <h1 className="font-display text-4xl md:text-6xl font-black text-white leading-none mb-3">
                  {hoje}
                </h1>
                <p className="text-base md:text-lg text-white/85 max-w-md mb-6">
                  {scene.texto}
                </p>
                <div className="flex items-center gap-2 text-white/80 text-sm bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">
                    {totalMin > 0 ? `${totalMin}m ${totalSec.toString().padStart(2, '0')}s` : `${totalSec}s`}
                  </span>
                  <span className="text-white/50">·</span>
                  <span>{scenes.filter((s) => s.kind === 'norma').length} normas</span>
                </div>
              </>
            ) : (
              <>
                {scene.kind === 'norma' && (
                  <motion.div
                    key={`brasao-${idx}`}
                    initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 14, stiffness: 220, delay: 0.05 }}
                    className="flex items-center gap-3 mb-4"
                  >
                    <img
                      src={brasaoImg}
                      alt="Brasão da República"
                      className="w-12 h-12 md:w-14 md:h-14 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
                    />
                    {scene.tipo_label && (
                      <span
                        className="inline-block text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full"
                        style={{ backgroundColor: cor, color: '#fff' }}
                      >
                        {scene.tipo_label}
                      </span>
                    )}
                    {fonteLabel && (
                      <button
                        type="button"
                        onClick={abrirFonte}
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-white/15 backdrop-blur text-white/90 hover:bg-white/25 transition"
                      >
                        via {fonteLabel}
                      </button>
                    )}
                  </motion.div>
                )}
                {scene.kind === 'norma' && (
                  <motion.div
                    key={`hero-img-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="relative mb-5 w-full max-w-md mx-auto aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40"
                  >
                    <motion.img
                      key={`hero-img-inner-${idx}`}
                      src={scene.imagem_url}
                      alt=""
                      initial={{ scale: 1 }}
                      animate={{ scale: 1.18 }}
                      transition={{ duration: scene.duracao_s || 8, ease: 'linear' }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </motion.div>
                )}
                <h1 className="font-display text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                  {scene.titulo}
                </h1>
                <p className="text-base md:text-lg text-white/85 leading-relaxed line-clamp-6">
                  {scene.texto}
                </p>
              </>

            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right rail: like / comentário / ir para norma */}
      {scene.kind !== 'intro' && (
        <div className="absolute right-3 bottom-40 z-20 flex flex-col items-center gap-4">
          <button
            onClick={toggleLike}
            className="flex flex-col items-center gap-1 text-white"
            aria-label="Curtir"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <Heart
                className={`w-5 h-5 ${likeAtual.mine ? 'text-red-500' : 'text-white'}`}
                fill={likeAtual.mine ? 'currentColor' : 'none'}
              />
            </div>
            <span className="text-[11px] font-semibold">{likeAtual.count}</span>
          </button>
          <button
            onClick={() => setComentariosOpen(true)}
            className="flex flex-col items-center gap-1 text-white"
            aria-label="Comentários"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-semibold">{commentsCount}</span>
          </button>
          {scene.kind === 'norma' && (
            <button
              onClick={abrirFonte}
              className="flex flex-col items-center gap-1 text-white"
              aria-label="Ver norma"
            >
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-black" />
              </div>
              <span className="text-[11px] font-semibold">Ver</span>
            </button>
          )}
        </div>
      )}

      {/* Bottom sheet de comentários */}
      <AnimatePresence>
        {comentariosOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setComentariosOpen(false)}
              className="absolute inset-0 z-30 bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute left-0 right-0 bottom-0 z-40 max-h-[75%] bg-neutral-900 rounded-t-3xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-semibold text-white">Comentários</h3>
                <button
                  onClick={() => setComentariosOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {comentarios.length === 0 && (
                  <p className="text-center text-white/50 text-sm py-8">Seja o primeiro a comentar.</p>
                )}
                {comentarios.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(c.autor_nome || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-semibold mr-2">{c.autor_nome || 'Usuário'}</span>
                        {c.texto}
                      </p>
                      <p className="text-white/70 text-[11px] mt-0.5">
                        {new Date(c.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-white/10 flex gap-2 items-center">
                <input
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarComentario()}
                  placeholder={userId ? 'Escreva um comentário…' : 'Entre para comentar'}
                  disabled={!userId || enviandoComentario}
                  className="flex-1 bg-white/10 text-white placeholder:text-white/70 rounded-full px-4 py-2 text-sm outline-none disabled:opacity-50"
                />
                <button
                  onClick={enviarComentario}
                  disabled={!userId || enviandoComentario || !novoComentario.trim()}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
                >
                  {enviandoComentario ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-10 pb-6 pt-4 px-6 bg-gradient-to-t from-black via-black/85 to-transparent">
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => goTo(idx - 1)}
            disabled={idx === 0}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center disabled:opacity-30"
          >
            <SkipBack className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
          >
            {playing ? (
              <Pause className="w-7 h-7 text-black" fill="black" />
            ) : (
              <Play className="w-7 h-7 text-black ml-1" fill="black" />
            )}
          </button>
          <button
            onClick={() => goTo(idx + 1)}
            disabled={idx === scenes.length - 1}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center disabled:opacity-30"
          >
            <SkipForward className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-center text-white/60 text-xs mt-4">
          {idx + 1} de {scenes.length} · {Math.round(progresso)}%
        </p>
        {scene.imagem_credito?.autor && (
          <p className="text-center text-white/70 text-[10px] mt-1">
            📷 {scene.imagem_credito.autor}
            {scene.imagem_credito.licenca && ` · ${scene.imagem_credito.licenca}`}
            {' · Openverse'}
          </p>
        )}
      </div>

      <audio ref={audioRef} onEnded={onEnded} preload="auto" />
      <audio ref={bgAudioRef} src="/news-bg.mp3" preload="auto" loop />

    </div>
  );
}