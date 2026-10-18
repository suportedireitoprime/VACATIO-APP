import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { registrarMidia, clearMediaSession } from '@/lib/mediaSession';
import { telaAcesa } from '@/lib/nativo/telaAcordada';
import { fonteDeAudio } from '@/lib/nativo/audioOffline';
import { notifyMediaPlay, subscribeMediaPlay } from '@/lib/mediaCoordinator';
import { toast } from 'sonner';
import { AUDIOAULAS_ACERVO_INICIAL } from '@/data/audioaulasAcervo';
import { capaDaArea } from '@/lib/audioaulasHelper';

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
  historicoRecentes: AulaAudio[];
  alternarFavorito: (a: AulaAudio) => void;
  limparRecentes: () => void;
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

const RECENTES_KEY = 'aa_recentes_v1';
const lerRecentes = (): AulaAudio[] => {
  try {
    const raw = localStorage.getItem(RECENTES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
};

const salvarRecentes = (lista: AulaAudio[]) => {
  try {
    localStorage.setItem(RECENTES_KEY, JSON.stringify(lista.slice(0, 20)));
  } catch {
    /* ignore */
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
  historicoRecentes: [],
  alternarFavorito: () => {},
  limparRecentes: () => {},
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
  const [historicoRecentes, setHistoricoRecentes] = useState<AulaAudio[]>(() => lerRecentes());
  const [filaCustom, setFilaCustom] = useState<AulaAudio[] | null>(null);

  const limparRecentes = useCallback(() => {
    setHistoricoRecentes([]);
    try {
      localStorage.removeItem(RECENTES_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const audioRef = useRef<HTMLAudioElement>(null);
  const introAudioRef = useRef<HTMLAudioElement>(null);
  const introTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isIntroPlayingRef = useRef<boolean>(false);
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

  // Registro na MediaSession nativa (Lock screen / Notificação / Smartwatch / Carro)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !atual) return;

    const capa =
      (atual as any).capa_url ||
      (atual as any).url_capa ||
      (atual as any).imagem_url ||
      capaDaArea(atual.area);

    const cleanup = registrarMidia({
      titulo: atual.titulo,
      subtitulo: atual.tema ? `${atual.area} · ${atual.tema}` : atual.area,
      album: 'Audioaulas · Vacatio',
      capaUrl: capa,
      audio: el,
      onPlay: () => {
        notifyMediaPlay('audioaula');
        el.play().catch(() => {});
        setTocando(true);
      },
      onPause: () => {
        el.pause();
        setTocando(false);
      },
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

    return () => {
      cleanup();
    };
  }, [atual, atualIdx, fila]);

  // Coordenador Universal: pausa se outro player de mídia iniciar
  useEffect(() => {
    return subscribeMediaPlay((active) => {
      if (active !== 'audioaula') {
        if (introTimerRef.current) {
          clearTimeout(introTimerRef.current);
          introTimerRef.current = null;
        }
        if (introAudioRef.current) {
          introAudioRef.current.pause();
        }
        isIntroPlayingRef.current = false;

        const el = audioRef.current;
        if (el && !el.paused) el.pause();
        setTocando(false);
      }
    });
  }, []);

  const tocar = useCallback(
    async (a: AulaAudio, customFila?: AulaAudio[]) => {
      const el = audioRef.current;
      const intro = introAudioRef.current;
      if (!a.url_audio) return;

      if (customFila) {
        setFilaCustom(customFila);
      }

      // Se clicou na mesma aula já em reprodução:
      if (atualId === a.id) {
        // Se a vinheta ainda estiver tocando nos primeiros segundos:
        if (isIntroPlayingRef.current && intro && !intro.ended) {
          if (intro.paused) {
            notifyMediaPlay('audioaula');
            await intro.play().catch(() => {});
            setTocando(true);
          } else {
            intro.pause();
            setTocando(false);
          }
          return;
        }

        // Caso normal da aula já em andamento:
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

      // Início de uma nova aula:
      // Cancela qualquer vinheta ou timer anterior
      if (introTimerRef.current) {
        clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }
      if (intro) {
        intro.pause();
        intro.currentTime = 0;
        intro.volume = 1;
      }
      isIntroPlayingRef.current = false;

      setAtualId(a.id);
      setTempo(0);
      setDur(0);

      // Atualiza histórico de aulas tocadas recentemente
      setHistoricoRecentes((prev) => {
        const novos = [a, ...prev.filter((item) => item.id !== a.id)].slice(0, 20);
        salvarRecentes(novos);
        return novos;
      });

      try {
        const src = await fonteDeAudio(audioIdOf(a), a.url_audio);
        if (el) {
          el.src = src;
          el.playbackRate = velocidade;
          el.currentTime = 0;
          el.load();
        }

        // Toca a vinheta de introdução exclusiva para Audioaulas
        if (intro) {
          isIntroPlayingRef.current = true;
          intro.currentTime = 0;
          intro.volume = 1;
          notifyMediaPlay('audioaula');
          setTocando(true);

          try {
            await intro.play();
          } catch (err) {
            console.warn('[AudioaulasPlayer] Autoplay bloqueado na vinheta, iniciando aula diretamente:', err);
            isIntroPlayingRef.current = false;
            if (el) {
              await el.play();
            }
            return;
          }

          // A áudio aula vai disparar exatamente 1 segundo antes de terminar a vinheta
          const introDur =
            intro.duration && !isNaN(intro.duration) && intro.duration > 1 ? intro.duration : 9.35;
          const delayMs = Math.max(0, (introDur - 1.0) * 1000);

          introTimerRef.current = setTimeout(async () => {
            try {
              if (el && isIntroPlayingRef.current) {
                notifyMediaPlay('audioaula');
                await el.play();
                // A vinheta termina seu último segundo por cima, dando a introdução perfeita
                isIntroPlayingRef.current = false;
              }
            } catch (e) {
              console.warn('[AudioaulasPlayer] Erro ao iniciar aula pós-vinheta:', e);
            }
          }, delayMs);
        } else if (el) {
          notifyMediaPlay('audioaula');
          await el.play();
          setTocando(true);
        }
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
    const intro = introAudioRef.current;
    if (!atual) return;

    if (isIntroPlayingRef.current && intro && !intro.ended) {
      if (tocando) {
        intro.pause();
        setTocando(false);
      } else {
        notifyMediaPlay('audioaula');
        intro.play().catch(() => {});
        setTocando(true);
      }
      return;
    }

    if (!el) return;
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
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    if (introAudioRef.current && isIntroPlayingRef.current) {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
      isIntroPlayingRef.current = false;
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }
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
    if (introTimerRef.current) {
      clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    if (introAudioRef.current) {
      introAudioRef.current.pause();
      introAudioRef.current.currentTime = 0;
    }
    isIntroPlayingRef.current = false;

    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
      clearMediaSession();
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
    historicoRecentes,
    alternarFavorito,
    limparRecentes,
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
      {/* Elemento de áudio da Vinheta de Introdução (Exclusivo Áudio Aulas) */}
      <audio
        ref={introAudioRef}
        src="/audio/intro-audioaulas.mp3"
        preload="auto"
        playsInline
        onError={(e) => {
          const target = e.currentTarget;
          if (!target.src.includes('pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev')) {
            target.src = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/narracoes/intros/intro-audioaulas.mp3';
            target.load();
          }
        }}
        onEnded={() => {
          isIntroPlayingRef.current = false;
        }}
      />
      {/* Elemento de áudio Principal da Aula */}
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
