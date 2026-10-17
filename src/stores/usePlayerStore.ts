import { create } from 'zustand';
import { registrarMidia, clearMediaSession } from '@/lib/mediaSession';
import { notifyMediaPlay } from '@/lib/mediaCoordinator';

interface PlayerState {
  currentUrl: string | null;
  isPlaying: boolean;
  progress: number;
  artigoNumero: string | null;
  leiNome: string | null;
  audio: HTMLAudioElement | null;
  play: (url: string, artigoNumero: string, leiNome: string) => void;
  pause: () => void;
  toggle: () => void;
  stop: () => void;
  setProgress: (p: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentUrl: null,
  isPlaying: false,
  progress: 0,
  artigoNumero: null,
  leiNome: null,
  audio: null,

  play: (url, artigoNumero, leiNome) => {
    const prev = get().audio;
    if (prev) {
      prev.pause();
      prev.src = '';
    }

    notifyMediaPlay('artigo');

    const audio = new Audio(url);
    audio.onended = () => {
      clearMediaSession();
      set({ isPlaying: false, progress: 0, audio: null });
    };
    audio.ontimeupdate = () => {
      if (audio.duration > 0) set({ progress: (audio.currentTime / audio.duration) * 100 });
    };

    audio.play().catch(() => {});

    // Controles de tela de bloqueio e central de notificações nativa
    registrarMidia({
      titulo: `Art. ${artigoNumero}`,
      subtitulo: leiNome || 'Vade Mecum',
      album: 'Narração de Artigos',
      audio,
      onPlay: () => {
        audio.play().catch(() => {});
        set({ isPlaying: true });
      },
      onPause: () => {
        audio.pause();
        set({ isPlaying: false });
      },
      onStop: () => {
        get().stop();
      },
      onSeek: (t) => {
        if (audio.duration > 0) {
          set({ progress: (t / audio.duration) * 100 });
        }
      },
    });

    set({ currentUrl: url, isPlaying: true, progress: 0, artigoNumero, leiNome, audio });
  },

  pause: () => {
    get().audio?.pause();
    set({ isPlaying: false });
  },

  toggle: () => {
    const { audio, isPlaying } = get();
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      set({ isPlaying: false });
    } else {
      audio.play().catch(() => {});
      set({ isPlaying: true });
    }
  },

  stop: () => {
    const a = get().audio;
    if (a) {
      a.pause();
      a.src = '';
    }
    clearMediaSession();
    set({ currentUrl: null, isPlaying: false, progress: 0, artigoNumero: null, leiNome: null, audio: null });
  },

  setProgress: (p) => set({ progress: p }),
}));
