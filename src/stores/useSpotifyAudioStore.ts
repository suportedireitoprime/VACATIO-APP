import { create } from 'zustand';
import { db } from '@/services/offlineDb';

export interface SpotifyTrack {
  id: string; // Ex: 'cp::1' ou 'aula::cp::1'
  tipo: 'lei' | 'aula';
  leiId: string;
  leiSlug: string;
  leiNome: string;
  artigoNumero: string; // Ex: 'Art. 1º'
  numeroFormatado: string;
  titulo: string; // Ex: 'Art. 1º - Anterioridade da Lei'
  subtitulo: string; // Ex: 'Código Penal • Narração Oficial'
  texto: string; // Caput do artigo ou resumo da aula
  audioUrl: string;
  coverUrl: string;
  ordem: number;
  duracao?: number; // em segundos
}

export interface SpotifyPlaylist {
  id: string;
  nome: string;
  descricao?: string;
  capa?: string;
  criadaEm: string;
  tracks: SpotifyTrack[];
}

export type SpotifyTabType = 'explorar' | 'pesquisar' | 'playlists' | 'favoritos' | 'downloads';
export type RepeatMode = 'off' | 'all' | 'one';

interface SpotifyAudioStoreState {
  // Estado do Player
  currentTrack: SpotifyTrack | null;
  queue: SpotifyTrack[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isExpanded: boolean;
  audioObjectUrl: string | null; // URL temporária gerada de Blob offline

  // Navegação e Modos
  activeTab: SpotifyTabType;
  audioMode: 'leis' | 'aulas';
  selectedLeiId: string | null; // Quando uma lei específica está aberta no estilo álbum

  // Coleções do Usuário
  playlists: SpotifyPlaylist[];
  favoritos: SpotifyTrack[];
  historicoRecentes: SpotifyTrack[];
  downloadedTrackIds: string[]; // IDs de tracks baixadas em offlineDb

  // Ações do Player
  playTrack: (track: SpotifyTrack, newQueue?: SpotifyTrack[]) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  setPlaybackRate: (rate: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (expanded: boolean) => void;
  setActiveTab: (tab: SpotifyTabType) => void;
  setAudioMode: (mode: 'leis' | 'aulas') => void;
  setSelectedLeiId: (leiId: string | null) => void;

  // Gerenciamento de Playlists
  createPlaylist: (nome: string, descricao?: string) => SpotifyPlaylist;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: SpotifyTrack) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  playPlaylist: (playlistId: string, startTrackId?: string) => Promise<void>;

  // Favoritos & Histórico
  toggleFavorito: (track: SpotifyTrack) => void;
  isFavorito: (trackId: string) => boolean;
  limparRecentes: () => void;

  // Downloads / Offline
  downloadTrack: (track: SpotifyTrack) => Promise<boolean>;
  removeDownload: (trackId: string) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  refreshDownloadedList: () => Promise<void>;

  // Sincronização interna do áudio element
  _audioElement: HTMLAudioElement | null;
  _setAudioElement: (el: HTMLAudioElement | null) => void;
  _setCurrentTime: (time: number) => void;
  _setDuration: (dur: number) => void;
  _setIsPlaying: (playing: boolean) => void;
  _handleTrackEnded: () => void;
}

const STORAGE_KEY_PLAYLISTS = 'vacatio_spotify_playlists_v1';
const STORAGE_KEY_FAVORITOS = 'vacatio_spotify_favoritos_v1';
const STORAGE_KEY_RECENTES = 'vacatio_spotify_recentes_v1';

// Playlists padrão pré-criadas para inspiração
const DEFAULT_PLAYLISTS: SpotifyPlaylist[] = [
  {
    id: 'playlist-oab-top',
    nome: 'Top Artigos OAB 1ª Fase',
    descricao: 'Artigos essenciais de Direito Penal, Processo Penal e Ética mais cobrados pela FGV.',
    criadaEm: new Date().toISOString(),
    tracks: [],
  },
  {
    id: 'playlist-penal-crimes',
    nome: 'Crimes Contra a Vida & Patrimônio',
    descricao: 'Homicídio, lesão corporal, furto, roubo e estelionato para fixação rápida.',
    criadaEm: new Date().toISOString(),
    tracks: [],
  },
];

function loadSavedPlaylists(): SpotifyPlaylist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLAYLISTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[SpotifyStore] Erro ao carregar playlists:', e);
  }
  return DEFAULT_PLAYLISTS;
}

function savePlaylists(playlists: SpotifyPlaylist[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PLAYLISTS, JSON.stringify(playlists));
  } catch (e) {
    console.warn('[SpotifyStore] Erro ao salvar playlists:', e);
  }
}

function loadSavedFavoritos(): SpotifyTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITOS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[SpotifyStore] Erro ao carregar favoritos:', e);
  }
  return [];
}

function saveFavoritos(favoritos: SpotifyTrack[]) {
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITOS, JSON.stringify(favoritos));
  } catch (e) {
    console.warn('[SpotifyStore] Erro ao salvar favoritos:', e);
  }
}

function loadSavedRecentes(): SpotifyTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENTES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[SpotifyStore] Erro ao carregar recentes:', e);
  }
  return [];
}

function saveRecentes(recentes: SpotifyTrack[]) {
  try {
    localStorage.setItem(STORAGE_KEY_RECENTES, JSON.stringify(recentes.slice(0, 20)));
  } catch (e) {
    console.warn('[SpotifyStore] Erro ao salvar recentes:', e);
  }
}

export const useSpotifyAudioStore = create<SpotifyAudioStoreState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
  isShuffle: false,
  repeatMode: 'off',
  isExpanded: false,
  audioObjectUrl: null,

  activeTab: 'explorar',
  audioMode: 'leis',
  selectedLeiId: null,

  playlists: loadSavedPlaylists(),
  favoritos: loadSavedFavoritos(),
  historicoRecentes: loadSavedRecentes(),
  downloadedTrackIds: [],

  _audioElement: null,

  _setAudioElement: (el) => {
    set({ _audioElement: el });
  },

  _setCurrentTime: (time) => set({ currentTime: time }),
  _setDuration: (dur) => set({ duration: dur }),
  _setIsPlaying: (playing) => set({ isPlaying: playing }),

  _handleTrackEnded: () => {
    const { repeatMode, currentTrack, _audioElement, nextTrack } = get();
    if (repeatMode === 'one' && _audioElement) {
      _audioElement.currentTime = 0;
      _audioElement.play().catch(console.warn);
      set({ isPlaying: true });
    } else {
      nextTrack();
    }
  },

  playTrack: async (track, newQueue) => {
    const { _audioElement, playbackRate, audioObjectUrl } = get();

    // Revoga URL temporária anterior se existir
    if (audioObjectUrl) {
      try {
        URL.revokeObjectURL(audioObjectUrl);
      } catch {}
    }

    let urlToPlay = track.audioUrl;
    let newObjectUrl: string | null = null;

    // 1. Verifica se temos este áudio gravado no Dexie (IndexedDB) para tocar offline com máxima velocidade
    try {
      const offlineItem = await db.narracoes
        .where('id')
        .equals(`${track.leiSlug}::${track.artigoNumero}`)
        .first();

      if (offlineItem && offlineItem.audioBlob) {
        newObjectUrl = URL.createObjectURL(offlineItem.audioBlob);
        urlToPlay = newObjectUrl;
      }
    } catch (e) {
      console.warn('[SpotifyStore] Falha ao checar áudio offline:', e);
    }

    // Atualiza fila de reprodução
    let queue = newQueue || get().queue;
    let queueIndex = queue.findIndex((t) => t.id === track.id);

    if (queueIndex === -1) {
      // Se a faixa não está na fila, coloca ela como inicial
      queue = [track, ...queue];
      queueIndex = 0;
    }

    // Atualiza histórico de reproduzidos recentemente
    const prevRecentes = get().historicoRecentes || [];
    const novosRecentes = [track, ...prevRecentes.filter((t) => t.id !== track.id)].slice(0, 20);
    saveRecentes(novosRecentes);

    set({
      currentTrack: track,
      queue,
      queueIndex,
      currentTime: 0,
      duration: 0,
      audioObjectUrl: newObjectUrl,
      isPlaying: true,
      historicoRecentes: novosRecentes,
    });

    if (_audioElement) {
      _audioElement.src = urlToPlay;
      _audioElement.playbackRate = playbackRate;
      try {
        await _audioElement.play();
        set({ isPlaying: true });
      } catch (err) {
        console.warn('[SpotifyStore] Play impedido pelo browser:', err);
        set({ isPlaying: false });
      }
    }

    // Configura MediaSession API nativa (Notificações, Lockscreen, Fone Bluetooth)
    if ('mediaSession' in navigator && navigator.mediaSession) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.titulo,
          artist: track.leiNome,
          album: 'VACATIO Vade Mecum Áudio',
          artwork: [
            { src: track.coverUrl, sizes: '512x512', type: 'image/webp' },
          ],
        });

        navigator.mediaSession.setActionHandler('play', () => get().togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => get().togglePlay());
        navigator.mediaSession.setActionHandler('previoustrack', () => get().prevTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => get().nextTrack());
        navigator.mediaSession.setActionHandler('seekbackward', () => get().seekRelative(-15));
        navigator.mediaSession.setActionHandler('seekforward', () => get().seekRelative(15));
      } catch (e) {
        console.warn('[SpotifyStore] MediaSession warning:', e);
      }
    }
  },

  togglePlay: () => {
    const { _audioElement, isPlaying, currentTrack, queue } = get();
    if (!_audioElement) return;

    if (!currentTrack && queue.length > 0) {
      get().playTrack(queue[0]);
      return;
    }

    if (isPlaying) {
      _audioElement.pause();
      set({ isPlaying: false });
    } else {
      _audioElement.play().catch(console.warn);
      set({ isPlaying: true });
    }
  },

  pause: () => {
    const { _audioElement } = get();
    if (_audioElement) {
      _audioElement.pause();
      set({ isPlaying: false });
    }
  },

  resume: () => {
    const { _audioElement } = get();
    if (_audioElement) {
      _audioElement.play().catch(console.warn);
      set({ isPlaying: true });
    }
  },

  seekTo: (seconds) => {
    const { _audioElement } = get();
    if (_audioElement) {
      _audioElement.currentTime = seconds;
      set({ currentTime: seconds });
    }
  },

  seekRelative: (deltaSeconds) => {
    const { _audioElement, currentTime, duration } = get();
    if (_audioElement) {
      const target = Math.max(0, Math.min(currentTime + deltaSeconds, duration || 999999));
      _audioElement.currentTime = target;
      set({ currentTime: target });
    }
  },

  nextTrack: async () => {
    const { queue, queueIndex, isShuffle, repeatMode, playTrack } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;

    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        // Chegou ao fim da fila
        set({ isPlaying: false, currentTime: 0 });
        return;
      }
    }

    const nextTrackItem = queue[nextIndex];
    if (nextTrackItem) {
      await playTrack(nextTrackItem, queue);
    }
  },

  prevTrack: async () => {
    const { queue, queueIndex, currentTime, playTrack, seekTo } = get();
    if (queue.length === 0) return;

    // Se já tocou mais de 3 segundos, apenas reinicia a faixa atual
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    const prevIndex = queueIndex > 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrackItem = queue[prevIndex];
    if (prevTrackItem) {
      await playTrack(prevTrackItem, queue);
    }
  },

  setPlaybackRate: (rate) => {
    const { _audioElement } = get();
    if (_audioElement) {
      _audioElement.playbackRate = rate;
    }
    set({ playbackRate: rate });
  },

  toggleShuffle: () => {
    set((state) => ({ isShuffle: !state.isShuffle }));
  },

  toggleRepeat: () => {
    set((state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      return { repeatMode: modes[nextIdx] };
    });
  },

  setExpanded: (expanded) => set({ isExpanded: expanded }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setAudioMode: (mode) => set({ audioMode: mode }),
  setSelectedLeiId: (leiId) => set({ selectedLeiId: leiId }),

  // PLAYLISTS
  createPlaylist: (nome, descricao) => {
    const nova: SpotifyPlaylist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: nome.trim(),
      descricao: descricao?.trim(),
      criadaEm: new Date().toISOString(),
      tracks: [],
    };
    const updated = [nova, ...get().playlists];
    set({ playlists: updated });
    savePlaylists(updated);
    return nova;
  },

  deletePlaylist: (playlistId) => {
    const updated = get().playlists.filter((p) => p.id !== playlistId);
    set({ playlists: updated });
    savePlaylists(updated);
  },

  addTrackToPlaylist: (playlistId, track) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      const alreadyHas = pl.tracks.some((t) => t.id === track.id);
      if (alreadyHas) return pl;
      return {
        ...pl,
        tracks: [...pl.tracks, track],
      };
    });
    set({ playlists: updated });
    savePlaylists(updated);
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id !== playlistId) return pl;
      return {
        ...pl,
        tracks: pl.tracks.filter((t) => t.id !== trackId),
      };
    });
    set({ playlists: updated });
    savePlaylists(updated);
  },

  playPlaylist: async (playlistId, startTrackId) => {
    const pl = get().playlists.find((p) => p.id === playlistId);
    if (!pl || pl.tracks.length === 0) return;

    let trackToStart = pl.tracks[0];
    if (startTrackId) {
      const found = pl.tracks.find((t) => t.id === startTrackId);
      if (found) trackToStart = found;
    }

    await get().playTrack(trackToStart, pl.tracks);
  },

  // FAVORITOS
  toggleFavorito: (track) => {
    const { favoritos } = get();
    const isFav = favoritos.some((t) => t.id === track.id);
    let updated: SpotifyTrack[];
    if (isFav) {
      updated = favoritos.filter((t) => t.id !== track.id);
    } else {
      updated = [track, ...favoritos];
    }
    set({ favoritos: updated });
    saveFavoritos(updated);
  },

  isFavorito: (trackId) => {
    return get().favoritos.some((t) => t.id === trackId);
  },

  limparRecentes: () => {
    set({ historicoRecentes: [] });
    saveRecentes([]);
  },

  // DOWNLOADS / OFFLINE
  downloadTrack: async (track) => {
    try {
      if (!track.audioUrl) return false;
      const res = await fetch(track.audioUrl);
      if (!res.ok) return false;
      const blob = await res.blob();

      await db.narracoes.put({
        id: `${track.leiSlug}::${track.artigoNumero}`,
        tabelaNome: track.leiSlug,
        artigoNumero: track.artigoNumero,
        audioBlob: blob,
      });

      await get().refreshDownloadedList();
      return true;
    } catch (err) {
      console.warn('[SpotifyStore] Erro ao baixar faixa offline:', err);
      return false;
    }
  },

  removeDownload: async (trackId) => {
    try {
      const track = get().queue.find((t) => t.id === trackId) ||
        get().favoritos.find((t) => t.id === trackId);
      if (track) {
        await db.narracoes.delete(`${track.leiSlug}::${track.artigoNumero}`).catch(() => {});
      } else {
        await db.narracoes.delete(trackId).catch(() => {});
      }
      await get().refreshDownloadedList();
    } catch (e) {
      console.warn('[SpotifyStore] Erro ao remover download:', e);
    }
  },

  isDownloaded: (trackId) => {
    const { downloadedTrackIds } = get();
    return downloadedTrackIds.includes(trackId);
  },

  refreshDownloadedList: async () => {
    try {
      const allRows = await db.narracoes.toArray().catch(() => []);
      const ids = allRows.map((r) => `${r.tabelaNome}::${r.artigoNumero}`);
      set({ downloadedTrackIds: ids });
    } catch (e) {
      console.warn('[SpotifyStore] Falha ao listar downloads:', e);
    }
  },
}));
