import { create } from 'zustand';
import type { ArtigoLei } from '@/data/mockData';

interface AdoptPayload {
  audio: HTMLAudioElement;
  artigo: ArtigoLei;
  tabelaNome?: string;
  leiNome?: string;
  returnPath: string;
}

interface State {
  audio: HTMLAudioElement | null;
  artigo: ArtigoLei | null;
  tabelaNome?: string;
  leiNome?: string;
  returnPath: string | null;
  isPlaying: boolean;
  progress: number; // 0..1
  adopt: (p: AdoptPayload) => void;
  toggle: () => void;
  close: () => void;
  seek: (fraction: number) => void;
  /** Called when user clicks the reopen arrow. Consumer navigates + reopens. */
  requestReopen: () => { returnPath: string; artigo: ArtigoLei } | null;
  /** Called by the article sheet when it opens the same artigo again. */
  reclaim: (artigoId: string) => HTMLAudioElement | null;
}

const detach = (audio: HTMLAudioElement | null) => {
  if (!audio) return;
  audio.onplay = null;
  audio.onpause = null;
  audio.onended = null;
  audio.ontimeupdate = null;
};

export const useNarracaoFlutuante = create<State>((set, get) => ({
  audio: null,
  artigo: null,
  tabelaNome: undefined,
  leiNome: undefined,
  returnPath: null,
  isPlaying: false,
  progress: 0,

  adopt: ({ audio, artigo, tabelaNome, leiNome, returnPath }) => {
    // Detach any previous audio
    const prev = get().audio;
    if (prev && prev !== audio) {
      try { prev.pause(); } catch {}
      detach(prev);
    }

    audio.onplay = () => set({ isPlaying: true });
    audio.onpause = () => set({ isPlaying: !audio.ended && !audio.paused });
    audio.onended = () => {
      detach(audio);
      set({
        audio: null,
        artigo: null,
        tabelaNome: undefined,
        leiNome: undefined,
        returnPath: null,
        isPlaying: false,
        progress: 0,
      });
    };
    audio.ontimeupdate = () => {
      const d = audio.duration || 0;
      set({ progress: d > 0 ? audio.currentTime / d : 0 });
    };

    set({
      audio,
      artigo,
      tabelaNome,
      leiNome,
      returnPath,
      isPlaying: !audio.paused,
      progress: audio.duration ? audio.currentTime / audio.duration : 0,
    });
  },

  toggle: () => {
    const a = get().audio;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  },

  seek: (fraction) => {
    const a = get().audio;
    if (!a || !a.duration) return;
    a.currentTime = Math.max(0, Math.min(1, fraction)) * a.duration;
  },

  close: () => {
    const a = get().audio;
    if (a) {
      try { a.pause(); } catch {}
      detach(a);
    }
    set({
      audio: null,
      artigo: null,
      tabelaNome: undefined,
      leiNome: undefined,
      returnPath: null,
      isPlaying: false,
      progress: 0,
    });
  },

  requestReopen: () => {
    const { returnPath, artigo } = get();
    if (!returnPath || !artigo) return null;
    return { returnPath, artigo };
  },

  reclaim: (artigoId) => {
    const { audio, artigo } = get();
    if (!audio || !artigo || artigo.id !== artigoId) return null;
    detach(audio);
    set({
      audio: null,
      artigo: null,
      tabelaNome: undefined,
      leiNome: undefined,
      returnPath: null,
      isPlaying: false,
      progress: 0,
    });
    return audio;
  },
}));
