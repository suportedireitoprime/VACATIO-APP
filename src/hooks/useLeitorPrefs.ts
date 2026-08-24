import { useCallback, useEffect, useState } from 'react';

/**
 * Preferências do Leitor Nativo estilo iPad Books.
 * Persistidas em localStorage sob o prefixo `leitura-nativa:*`.
 */

export type TemaId = 'original' | 'papel' | 'silencioso' | 'noturno' | 'relaxante';

export interface Tema {
  id: TemaId;
  nome: string;
  bg: string;
  text: string;
  muted: string;
  border: string;
  isDark: boolean;
}

export const TEMAS: Record<TemaId, Tema> = {
  original: {
    id: 'original',
    nome: 'Original',
    bg: '#f6f1e6',
    text: '#2a2418',
    muted: 'rgba(42,36,24,0.65)',
    border: 'rgba(42,36,24,0.12)',
    isDark: false,
  },
  papel: {
    id: 'papel',
    nome: 'Papel',
    bg: '#ffffff',
    text: '#111111',
    muted: 'rgba(17,17,17,0.6)',
    border: 'rgba(0,0,0,0.1)',
    isDark: false,
  },
  silencioso: {
    id: 'silencioso',
    nome: 'Silencioso',
    bg: '#d9d5cd',
    text: '#1c1a15',
    muted: 'rgba(28,26,21,0.65)',
    border: 'rgba(28,26,21,0.14)',
    isDark: false,
  },
  noturno: {
    id: 'noturno',
    nome: 'Noturno',
    bg: '#0f0f0f',
    text: '#d8d3c4',
    muted: 'rgba(216,211,196,0.6)',
    border: 'rgba(255,255,255,0.1)',
    isDark: true,
  },
  relaxante: {
    id: 'relaxante',
    nome: 'Relaxante',
    bg: '#e9dcc1',
    text: '#3a2f1e',
    muted: 'rgba(58,47,30,0.7)',
    border: 'rgba(58,47,30,0.15)',
    isDark: false,
  },
};

export type FonteId = 'georgia' | 'iowan' | 'inter' | 'dyslexic';
export const FONTES: Record<FonteId, { nome: string; family: string }> = {
  georgia: { nome: 'Serifada', family: 'Georgia, "Iowan Old Style", serif' },
  iowan: { nome: 'Serifada Moderna', family: '"Iowan Old Style", "Palatino", Georgia, serif' },
  inter: { nome: 'Sem Serifa', family: 'Inter, system-ui, -apple-system, sans-serif' },
  dyslexic: { nome: 'Dislexia', family: '"OpenDyslexic", "Lexend", system-ui, sans-serif' },
};

export type PageMode = 'slide' | 'curl' | 'fade' | 'scroll';
export const PAGE_MODES: Record<PageMode, string> = {
  slide: 'Deslizar',
  curl: 'Folhear',
  fade: 'Esmaecimento',
  scroll: 'Rolar',
};

export type AlinhamentoId = 'justify' | 'left';
export type EspacamentoId = 'compacto' | 'normal' | 'amplo';
export const ESPACAMENTOS: Record<EspacamentoId, number> = {
  compacto: 1.45,
  normal: 1.7,
  amplo: 1.95,
};

export interface LeitorPrefs {
  temaId: TemaId;
  fontSize: number;
  fonteId: FonteId;
  alinhamento: AlinhamentoId;
  espacamento: EspacamentoId;
  brilho: number; // 0.6 – 1.15
  tonalidade: number; // 0 – 1 (âmbar)
  pageMode: PageMode;
}

const KEY = 'leitura-nativa:prefs:v1';

const DEFAULTS: LeitorPrefs = {
  temaId: 'noturno',
  fontSize: 17,
  fonteId: 'georgia',
  alinhamento: 'justify',
  espacamento: 'normal',
  brilho: 1,
  tonalidade: 0,
  pageMode: 'slide',
};

function load(): LeitorPrefs {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    // Migração do formato antigo
    const oldFs = Number(localStorage.getItem('leitura-nativa:fs'));
    const oldDark = localStorage.getItem('leitura-nativa:dark');
    return {
      ...DEFAULTS,
      fontSize: Number.isFinite(oldFs) && oldFs > 0 ? oldFs : DEFAULTS.fontSize,
      temaId: oldDark === '1' ? 'noturno' : DEFAULTS.temaId,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useLeitorPrefs() {
  const [prefs, setPrefs] = useState<LeitorPrefs>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  const update = useCallback(<K extends keyof LeitorPrefs>(key: K, value: LeitorPrefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const tema = TEMAS[prefs.temaId] || TEMAS.original;
  const fonte = FONTES[prefs.fonteId] || FONTES.georgia;
  const lineHeight = ESPACAMENTOS[prefs.espacamento] || ESPACAMENTOS.normal;

  return { prefs, update, tema, fonte, lineHeight };
}
