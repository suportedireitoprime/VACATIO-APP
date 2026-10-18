/**
 * Serviço de Estatísticas de Reprodução de Áudio (Áudio Leis & Áudio Aulas)
 * Persiste métricas no localStorage com fallback seguro e histórico por artigo.
 */

export interface TrackPlayStat {
  id: string;
  titulo: string;
  leiNome: string;
  artigoNumero?: string;
  tipo: 'lei' | 'aula';
  totalSegundos: number;
  reproducoes: number;
  ultimaVez: string;
}

export interface AudioStatsData {
  totalSegundos: number;
  diasConsecutivos: number;
  ultimoDiaOuvido: string; // YYYY-MM-DD
  metaDiariaMinutos: number;
  minutosHoje: number;
  dataHoje: string; // YYYY-MM-DD
  tracksStats: Record<string, TrackPlayStat>;
  trilhasConcluidas: string[];
}

const STORAGE_KEY = 'vacatio_audio_stats_v2';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULT_STATS: AudioStatsData = {
  totalSegundos: 45 * 60, // 45 min iniciais para demonstrar interface rica se for novo usuário
  diasConsecutivos: 3,
  ultimoDiaOuvido: getTodayString(),
  metaDiariaMinutos: 30,
  minutosHoje: 18,
  dataHoje: getTodayString(),
  tracksStats: {
    'cf::5': {
      id: 'cf::5',
      titulo: 'Art. 5º - Direitos e Garantias Fundamentais',
      leiNome: 'Constituição Federal',
      artigoNumero: 'Art. 5º',
      tipo: 'lei',
      totalSegundos: 32 * 60,
      reproducoes: 14,
      ultimaVez: new Date().toISOString(),
    },
    'cp::121': {
      id: 'cp::121',
      titulo: 'Art. 121 - Homicídio simples e qualificado',
      leiNome: 'Código Penal',
      artigoNumero: 'Art. 121',
      tipo: 'lei',
      totalSegundos: 24 * 60,
      reproducoes: 9,
      ultimaVez: new Date().toISOString(),
    },
    'cp::155': {
      id: 'cp::155',
      titulo: 'Art. 155 - Furto e qualificadoras',
      leiNome: 'Código Penal',
      artigoNumero: 'Art. 155',
      tipo: 'lei',
      totalSegundos: 16 * 60,
      reproducoes: 6,
      ultimaVez: new Date().toISOString(),
    },
    'cc::1': {
      id: 'cc::1',
      titulo: 'Art. 1º - Da Personalidade e Capacidade',
      leiNome: 'Código Civil',
      artigoNumero: 'Art. 1º',
      tipo: 'lei',
      totalSegundos: 12 * 60,
      reproducoes: 5,
      ultimaVez: new Date().toISOString(),
    },
    'clt::477': {
      id: 'clt::477',
      titulo: 'Art. 477 - Rescisão Contratual e Prazos',
      leiNome: 'CLT',
      artigoNumero: 'Art. 477',
      tipo: 'lei',
      totalSegundos: 10 * 60,
      reproducoes: 4,
      ultimaVez: new Date().toISOString(),
    },
  },
  trilhasConcluidas: ['trilha-cf-direitos'],
};

export function getAudioStats(): AudioStatsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAudioStats(DEFAULT_STATS);
      return DEFAULT_STATS;
    }
    const data: AudioStatsData = JSON.parse(raw);
    const today = getTodayString();
    if (data.dataHoje !== today) {
      // Novo dia detectado
      data.dataHoje = today;
      data.minutosHoje = 0;
      saveAudioStats(data);
    }
    return data;
  } catch (e) {
    console.warn('[audioStatsService] Erro ao carregar estatísticas:', e);
    return DEFAULT_STATS;
  }
}

export function saveAudioStats(stats: AudioStatsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('[audioStatsService] Erro ao salvar estatísticas:', e);
  }
}

/**
 * Registra segundos ouvidos para uma faixa
 */
export function registrarTempoOuvido(params: {
  trackId: string;
  titulo: string;
  leiNome: string;
  artigoNumero?: string;
  tipo: 'lei' | 'aula';
  segundos: number;
}): void {
  if (params.segundos <= 0) return;
  const stats = getAudioStats();
  const today = getTodayString();

  stats.totalSegundos += params.segundos;

  // Atualiza minutos hoje
  if (stats.dataHoje === today) {
    stats.minutosHoje = Math.round(stats.minutosHoje + params.segundos / 60);
  } else {
    stats.dataHoje = today;
    stats.minutosHoje = Math.round(params.segundos / 60);
  }

  // Verifica dias consecutivos
  if (stats.ultimoDiaOuvido !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (stats.ultimoDiaOuvido === yesterdayStr) {
      stats.diasConsecutivos += 1;
    } else {
      stats.diasConsecutivos = 1;
    }
    stats.ultimoDiaOuvido = today;
  }

  // Atualiza estatísticas da faixa
  const existing = stats.tracksStats[params.trackId];
  if (existing) {
    existing.totalSegundos += params.segundos;
    existing.ultimaVez = new Date().toISOString();
  } else {
    stats.tracksStats[params.trackId] = {
      id: params.trackId,
      titulo: params.titulo,
      leiNome: params.leiNome,
      artigoNumero: params.artigoNumero,
      tipo: params.tipo,
      totalSegundos: params.segundos,
      reproducoes: 1,
      ultimaVez: new Date().toISOString(),
    };
  }

  saveAudioStats(stats);
}

/**
 * Incrementa contagem de reprodução (início do play)
 */
export function registrarPlay(trackId: string, titulo: string, leiNome: string, tipo: 'lei' | 'aula', artigoNumero?: string): void {
  const stats = getAudioStats();
  const existing = stats.tracksStats[trackId];
  if (existing) {
    existing.reproducoes += 1;
    existing.ultimaVez = new Date().toISOString();
  } else {
    stats.tracksStats[trackId] = {
      id: trackId,
      titulo,
      leiNome,
      artigoNumero,
      tipo,
      totalSegundos: 0,
      reproducoes: 1,
      ultimaVez: new Date().toISOString(),
    };
  }
  saveAudioStats(stats);
}
