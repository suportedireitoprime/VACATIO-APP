// MediaSession helper — enables lockscreen / notification controls
// for narration playback (background audio) on Android/iOS and on browsers
// that support the Media Session API.
//
// Safe to call on any platform; unsupported browsers just skip it.

type SetupArgs = {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  audio: HTMLAudioElement;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeek?: (timeSec: number) => void;
};

const DEFAULT_ARTIST = 'Vacatio · Vade Mecum';

function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (typeof window !== 'undefined' && window.location) {
    try {
      return new URL(url, window.location.origin).href;
    } catch {
      return url;
    }
  }
  return url;
}

// Guarda a referência do cleanup anterior para evitar vazamento de listeners
let activeCleanup: (() => void) | null = null;

export function setupMediaSession({
  title,
  artist = DEFAULT_ARTIST,
  album,
  artworkUrl,
  audio,
  onPlay,
  onPause,
  onStop,
  onSeek,
}: SetupArgs): () => void {
  // Limpa sessão anterior se houver
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return () => {};
  }
  const ms = navigator.mediaSession;

  const absArtwork = toAbsoluteUrl(artworkUrl) || (typeof window !== 'undefined' ? toAbsoluteUrl('/favicon.ico') : undefined);

  try {
    const artworkList = absArtwork
      ? [
          { src: absArtwork, sizes: '96x96', type: 'image/webp' },
          { src: absArtwork, sizes: '128x128', type: 'image/webp' },
          { src: absArtwork, sizes: '192x192', type: 'image/webp' },
          { src: absArtwork, sizes: '256x256', type: 'image/webp' },
          { src: absArtwork, sizes: '384x384', type: 'image/webp' },
          { src: absArtwork, sizes: '512x512', type: 'image/webp' },
        ]
      : [];

    ms.metadata = new window.MediaMetadata({
      title,
      artist,
      album: album ?? 'Vacatio Áudio',
      artwork: artworkList,
    });

    const safeSetAction = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* Ação não suportada pelo navegador/dispositivo específico */
      }
    };

    const updatePositionState = () => {
      if (!('setPositionState' in ms)) return;
      if (!isFinite(audio.duration) || audio.duration <= 0) return;
      const duration = audio.duration;
      const position = Math.min(Math.max(audio.currentTime || 0, 0), duration);
      const playbackRate = audio.playbackRate > 0 ? audio.playbackRate : 1;
      try {
        ms.setPositionState({
          duration,
          playbackRate,
          position,
        });
      } catch {
        /* ignore constraints during rapid seek */
      }
    };

    safeSetAction('play', () => {
      if (onPlay) {
        onPlay();
      } else {
        audio.play().catch(() => {});
      }
      ms.playbackState = 'playing';
      updatePositionState();
    });

    safeSetAction('pause', () => {
      if (onPause) {
        onPause();
      } else {
        audio.pause();
      }
      ms.playbackState = 'paused';
      updatePositionState();
    });

    safeSetAction('stop', () => {
      if (onStop) {
        onStop();
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
      ms.playbackState = 'none';
    });

    // Pular para trás (15 segundos padrão de podcast / audioaula)
    safeSetAction('seekbackward', (details) => {
      const skip = details.seekOffset || 15;
      const newTime = Math.max(0, audio.currentTime - skip);
      audio.currentTime = newTime;
      onSeek?.(newTime);
      updatePositionState();
    });

    // Pular para frente (15 segundos padrão)
    safeSetAction('seekforward', (details) => {
      const skip = details.seekOffset || 15;
      const maxDur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : audio.currentTime + skip;
      const newTime = Math.min(maxDur, audio.currentTime + skip);
      audio.currentTime = newTime;
      onSeek?.(newTime);
      updatePositionState();
    });

    // Barra de progresso / scrubbing na tela de bloqueio
    safeSetAction('seekto', (details) => {
      if (details.seekTime != null) {
        const maxDur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : details.seekTime;
        const newTime = Math.min(Math.max(details.seekTime, 0), maxDur);
        audio.currentTime = newTime;
        onSeek?.(newTime);
        updatePositionState();
      }
    });

    const updateState = () => {
      ms.playbackState = audio.paused ? 'paused' : 'playing';
      updatePositionState();
    };

    audio.addEventListener('play', updateState);
    audio.addEventListener('playing', updateState);
    audio.addEventListener('pause', updateState);
    audio.addEventListener('timeupdate', updatePositionState);
    audio.addEventListener('ratechange', updatePositionState);
    audio.addEventListener('durationchange', updatePositionState);
    
    const onEnded = () => {
      ms.playbackState = 'none';
    };
    audio.addEventListener('ended', onEnded);

    const cleanup = () => {
      audio.removeEventListener('play', updateState);
      audio.removeEventListener('playing', updateState);
      audio.removeEventListener('pause', updateState);
      audio.removeEventListener('timeupdate', updatePositionState);
      audio.removeEventListener('ratechange', updatePositionState);
      audio.removeEventListener('durationchange', updatePositionState);
      audio.removeEventListener('ended', onEnded);
    };

    activeCleanup = cleanup;
    return cleanup;
  } catch {
    /* MediaSession não suportada plenamente */
    return () => {};
  }
}

export function clearMediaSession() {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    const ms = navigator.mediaSession;
    const actions: MediaSessionAction[] = [
      'play',
      'pause',
      'stop',
      'seekbackward',
      'seekforward',
      'seekto',
      'previoustrack',
      'nexttrack',
    ];
    actions.forEach((act) => {
      try {
        ms.setActionHandler(act, null);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

export type RegistrarMidiaArgs = {
  titulo: string;
  subtitulo?: string;
  album?: string;
  capaUrl?: string;
  audio: HTMLAudioElement;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onStop?: () => void;
  onSeek?: (timeSec: number) => void;
};

export function registrarMidia(args: RegistrarMidiaArgs): () => void {
  const cleanup = setupMediaSession({
    title: args.titulo,
    artist: args.subtitulo || DEFAULT_ARTIST,
    album: args.album,
    artworkUrl: args.capaUrl,
    audio: args.audio,
    onPlay: args.onPlay,
    onPause: args.onPause,
    onStop: args.onStop,
    onSeek: args.onSeek,
  });

  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler('nexttrack', args.onNext ? () => args.onNext?.() : null);
    } catch {
      /* ignore */
    }
    try {
      ms.setActionHandler('previoustrack', args.onPrev ? () => args.onPrev?.() : null);
    } catch {
      /* ignore */
    }
  }

  return cleanup;
}
