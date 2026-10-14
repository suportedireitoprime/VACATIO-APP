import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registrarMidia, clearMediaSession } from '@/lib/mediaSession';
import { telaAcesa } from '@/lib/nativo/telaAcordada';
import { fonteDeAudio } from '@/lib/nativo/audioOffline';
import { notifyMediaPlay, subscribeMediaPlay } from '@/lib/mediaCoordinator';
import { toast } from 'sonner';
import { AUDIOAULAS_ACERVO_INICIAL } from '@/data/audioaulasAcervo';

export interface AulaAudio {
  id: number;
  area: string;
  tema: string | null;
  sequencia: number | null;
  titulo: string;
  descricao: string | null;
  url_audio: string | null;
}

interface AudioaulasPlayerContextType {
  aulas: AulaAudio[];
  loading: boolean;
  atualId: number | null;
  atual: AulaAudio | null;
  atualIdx: number;
  tocando: boolean;
  tempo: number;
  dur: number;
  velocidade: number;
  aberto: boolean;
  fila: AulaAudio[];
  favoritos: Set<string>;
  alternarFavorito: (a: AulaAudio) => void;
  setAberto: (v: boolean) => void;
  tocar: (a: AulaAudio, customFila?: AulaAudio[]) => Promise<void>;
  togglePlay: () => void;
  pular: (dir: 1 | -1) => void;
  seek: (v: number) => void;
  setVelocidade: (rate: number) => void;
  fechar: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const FAV_KEY = 'aa_favoritos';
const lerFavoritos = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export const audioIdOf = (a: AulaAudio) => `audioaula-${a.id}`;

const fallbackAudioRef: React.RefObject<HTMLAudioElement> = { current: null };

const fallbackAudioaulasContext: AudioaulasPlayerContextType = {
  aulas: [],
  loading: false,
  atualId: null,
  atual: null,
  atualIdx: -1,
  tocando: false,
  tempo: 0,
  dur: 0,
  velocidade: 1,
  aberto: false,
  fila: [],
  favoritos: new Set(),
  alternarFavorito: () => {},
  setAberto: () => {},
  tocar: async () => {},
  togglePlay: () => {},
  pular: () => {},
  seek: () => {},
  setVelocidade: () => {},
  fechar: () => {},
  audioRef: fallbackAudioRef,
};

const Ctx = createContext<AudioaulasPlayerContextType | undefined>(undefined);

export function useAudioaulasPlayer() {
  const ctx = useContext(Ctx);
  return ctx ?? fallbackAudioaulasContext;
}

export const AudioaulasPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aulas, setAulas] = useState<AulaAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualId, setAtualId] = useState<number | null>(null);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [dur, setDur] = useState(0);
  const [velocidade, setVelocidadeState] = useState(1);
  const [aberto, setAberto] = useState(false);
  const [favoritos, setFavoritos] = useState<Set<string>>(() => lerFavoritos());
  const [filaCustom, setFilaCustom] = useState<AulaAudio[] | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const pularRef = useRef<(dir: 1 | -1) => void>(() => {});


  // Carregamento e cache aquecido das aulas
  useEffect(() => {
    let cancelado = false;
    const carregar = async () => {
      try {
        const { data, error } = await supabase
          .from('audioaulas_acervo')
          .select('id, area, tema, sequencia, titulo, descricao, url_audio')
          .order('area', { ascending: true })
          .order('sequencia', { ascending: true });
        if (cancelado) return;
        if (data && data.length > 0) {
          setAulas(data as AulaAudio[]);
        } else {
          setAulas(AUDIOAULAS_ACERVO_INICIAL as AulaAudio[]);
        }
      } catch (err) {
        console.warn('Usando acervo local de áudio-aulas:', err);
        if (!cancelado) setAulas(AUDIOAULAS_ACERVO_INICIAL as AulaAudio[]);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    const idle = (cb: () => void) => {
      const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: unknown) => void };
      if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout: 1500 });
      else setTimeout(cb, 100);
    };

    idle(() => void carregar());
    return () => {
      cancelado = true;
    };
  }, []);

  const alternarFavorito = useCallback((a: AulaAudio) => {
    setFavoritos((prev) => {
      const next = new Set(prev);
      const k = audioIdOf(a);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const fila = useMemo(() => {
    if (filaCustom && filaCustom.length > 0) return filaCustom.filter((a) => a.url_audio);
    return aulas.filter((a) => a.url_audio);
  }, [aulas, filaCustom]);

  const atualIdx = useMemo(() => fila.findIndex((a) => a.id === atualId), [fila, atualId]);
  const atual = useMemo(() => aulas.find((a) => a.id === atualId) ?? (atualIdx >= 0 ? fila[atualIdx] : null), [aulas, atualId, fila, atualIdx]);

  // Manter tela acesa enquanto o áudio estiver tocando
  useEffect(() => {
    void telaAcesa('audioaulas', tocando);
    return () => {
      void telaAcesa('audioaulas', false);
    };
  }, [tocando]);

  // Registro na MediaSession nativa
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !atual) return;
    registrarMidia({
      titulo: atual.titulo,
      subtitulo: atual.tema || atual.area,
      album: 'Audioaulas',
      capaUrl: (atual as any).capa_url || (atual as any).url_capa || (atual as any).imagem_url,
      audio: el,
      onNext: atualIdx >= 0 && fila[atualIdx + 1] ? () => pularRef.current(1) : undefined,
      onPrev: atualIdx > 0 ? () => pularRef.current(-1) : undefined,
      onStop: () => {
        el.pause();
        setTocando(false);
      },
      onSeek: (t) => {
        if (el) el.currentTime = t;
        setTempo(t);
      },
    });
  }, [atual, atualIdx, fila]);

  // Coordenador Universal: pausa se outro player de mídia iniciar
  useEffect(() => {
    return subscribeMediaPlay((active) => {
      if (active !== 'audioaula') {
        const el = audioRef.current;
        if (el && !el.paused) el.pause();
        setTocando(false);
      }
    });
  }, []);

  const tocar = useCallback(
    async (a: AulaAudio, customFila?: AulaAudio[]) => {
      const el = audioRef.current;
      if (!a.url_audio) return;

      if (customFila) {
        setFilaCustom(customFila);
      }

      if (atualId === a.id) {
        if (el?.paused) {
          notifyMediaPlay('audioaula');
          await el.play().catch(() => {});
          setTocando(true);
        } else {
          el?.pause();
          setTocando(false);
        }
        return;
      }

      setAtualId(a.id);
      setTempo(0);
      setDur(0);

      try {
        const src = await fonteDeAudio(audioIdOf(a), a.url_audio);
        if (el) {
          el.src = src;
          el.playbackRate = velocidade;
          notifyMediaPlay('audioaula');
          await el.play();
        }
        setTocando(true);
      } catch (err) {
        console.error('[AudioaulasPlayer] Erro ao carregar/reproduzir áudio:', err);
        setTocando(false);
        toast.error('Não foi possível reproduzir este áudio. Verifique sua conexão.');
      }
    },
    [atualId, velocidade],
  );

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !atual) return;
    if (tocando) {
      el.pause();
      setTocando(false);
    } else {
      notifyMediaPlay('audioaula');
      el.play().catch((err) => {
        console.error('[AudioaulasPlayer] Erro ao alternar reprodução:', err);
        setTocando(false);
        toast.error('Erro ao reproduzir o áudio.');
      });
      setTocando(true);
    }
  }, [atual, tocando]);

  const pular = useCallback(
    (dir: 1 | -1) => {
      if (atualIdx < 0) return;
      const prox = fila[atualIdx + dir];
      if (prox) void tocar(prox);
    },
    [atualIdx, fila, tocar],
  );

  pularRef.current = pular;

  const seek = useCallback((v: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = v;
    setTempo(v);
  }, []);

  const setVelocidade = useCallback((rate: number) => {
    setVelocidadeState(rate);
    const el = audioRef.current;
    if (el) el.playbackRate = rate;
  }, []);

  const fechar = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
      clearMediaSession(el);
    }
    setTocando(false);
    setAtualId(null);
    setTempo(0);
    setDur(0);
    setAberto(false);
  }, []);

  const value: AudioaulasPlayerContextType = {
    aulas,
    loading,
    atualId,
    atual,
    atualIdx,
    tocando,
    tempo,
    dur,
    velocidade,
    aberto,
    fila,
    favoritos,
    alternarFavorito,
    setAberto,
    tocar,
    togglePlay,
    pular,
    seek,
    setVelocidade,
    fechar,
    audioRef,
  };



  return (
    <Ctx.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onError={(e) => {
          console.error('[AudioaulasPlayer] Erro no elemento de áudio:', e);
          setTocando(false);
          toast.error('Erro de carregamento do áudio.');
        }}
        onEnded={() => {
          setTocando(false);
          if (atualIdx >= 0 && fila[atualIdx + 1]) {
            void tocar(fila[atualIdx + 1]);
          } else {
            clearMediaSession(audioRef.current);
          }
        }}
      />
    </Ctx.Provider>
  );
};

export default AudioaulasPlayerProvider;
