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
  onSeek?: (timeSec: number) => void;
};

const DEFAULT_ARTIST = 'Vacatio · Vade Mecum';

export function setupMediaSession({
  title,
  artist = DEFAULT_ARTIST,
  album,
  artworkUrl,
  audio,
  onSeek,
}: SetupArgs) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  const ms = navigator.mediaSession;

  try {
    ms.metadata = new window.MediaMetadata({
      title,
      artist,
      album: album ?? 'Narração',
      artwork: artworkUrl
        ? [
            { src: artworkUrl, sizes: '512x512', type: 'image/webp' },
            { src: artworkUrl, sizes: '256x256', type: 'image/webp' },
          ]
        : [],
    });

    ms.setActionHandler('play', () => {
      audio.play().catch(() => {});
    });
    ms.setActionHandler('pause', () => {
      audio.pause();
    });
    ms.setActionHandler('stop', () => {
      audio.pause();
      audio.currentTime = 0;
    });
    ms.setActionHandler('seekbackward', (details) => {
      audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset ?? 10));
    });
    ms.setActionHandler('seekforward', (details) => {
      audio.currentTime = Math.min(
        audio.duration || 0,
        audio.currentTime + (details.seekOffset ?? 10),
      );
    });
    if (onSeek) {
      ms.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) {
          audio.currentTime = details.seekTime;
          onSeek(details.seekTime);
        }
      });
    }

    const updateState = () => {
      ms.playbackState = audio.paused ? 'paused' : 'playing';
      if (isFinite(audio.duration) && audio.duration > 0) {
        try {
          ms.setPositionState?.({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime,
          });
        } catch {
          /* ignore */
        }
      }
    };
    audio.addEventListener('play', updateState);
    audio.addEventListener('pause', updateState);
    audio.addEventListener('timeupdate', updateState);
    audio.addEventListener('ended', () => {
      ms.playbackState = 'none';
    });
  } catch {
    /* MediaSession not fully supported — ignore */
  }
}

export function clearMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  } catch {
    /* ignore */
  }
}
