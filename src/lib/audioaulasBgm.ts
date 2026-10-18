export interface BgmTrack {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: string;
  src: string;
  descricaoCurta: string;
}

export const BGM_TRACKS: BgmTrack[] = [
  {
    id: 'noturno-chuva',
    titulo: 'Lo-Fi Noturno com Chuva',
    subtitulo: 'Chuva suave, ambiência calma e foco profundo',
    descricaoCurta: 'Chuva suave e notas relaxantes',
    icone: '🌧️',
    src: '/audio/lofi/lofi-noturno-chuva.mp3',
  },
  {
    id: 'vinil-1',
    titulo: 'Lo-Fi Vinil Intenso 1',
    subtitulo: 'Textura analógica, batida rítmica e concentração',
    descricaoCurta: 'Batida rítmica e ruído de vinil',
    icone: '📻',
    src: '/audio/lofi/lofi-vinil-1.mp3',
  },
  {
    id: 'vinil-2',
    titulo: 'Lo-Fi Vinil Intenso 2',
    subtitulo: 'Graves aveludados e andamento constante de estudo',
    descricaoCurta: 'Graves quentes e andamento leve',
    icone: '🎧',
    src: '/audio/lofi/lofi-vinil-2.mp3',
  },
  {
    id: 'frances',
    titulo: 'Lo-Fi Francês',
    subtitulo: 'Melodia intimista, piano acústico e leveza',
    descricaoCurta: 'Piano acústico e melodia leve',
    icone: '☕',
    src: '/audio/lofi/lofi-frances.mp3',
  },
];

export const BGM_STORAGE_KEYS = {
  ATIVO: 'aa_bgm_ativo_v1',
  TRACK_ID: 'aa_bgm_track_id_v1',
  VOLUME: 'aa_bgm_volume_v1',
};

export const BGM_VOLUME_PADRAO = 0.18; // 18% é o volume ideal de fundo sob a voz do professor

export function lerBgmConfig(): { ativo: boolean; trackId: string; volume: number } {
  try {
    const rawAtivo = localStorage.getItem(BGM_STORAGE_KEYS.ATIVO);
    const rawTrack = localStorage.getItem(BGM_STORAGE_KEYS.TRACK_ID);
    const rawVolume = localStorage.getItem(BGM_STORAGE_KEYS.VOLUME);

    return {
      ativo: rawAtivo !== null ? rawAtivo === 'true' : true,
      trackId: rawTrack && BGM_TRACKS.some((t) => t.id === rawTrack) ? rawTrack : 'noturno-chuva',
      volume: rawVolume !== null ? Math.max(0, Math.min(1, parseFloat(rawVolume))) : BGM_VOLUME_PADRAO,
    };
  } catch {
    return {
      ativo: true,
      trackId: 'noturno-chuva',
      volume: BGM_VOLUME_PADRAO,
    };
  }
}

export function salvarBgmConfig(ativo: boolean, trackId: string, volume: number): void {
  try {
    localStorage.setItem(BGM_STORAGE_KEYS.ATIVO, String(ativo));
    localStorage.setItem(BGM_STORAGE_KEYS.TRACK_ID, trackId);
    localStorage.setItem(BGM_STORAGE_KEYS.VOLUME, String(volume));
  } catch {
    /* ignore */
  }
}
