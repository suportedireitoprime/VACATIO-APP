import { useState, useEffect, useCallback } from 'react';
import { type AulaAudio, audioIdOf } from '@/contexts/AudioaulasPlayerContext';

export interface AulaProgressoInfo {
  tempo: number;
  dur: number;
  percent: number; // 0 a 100
  concluida: boolean;
  updatedAt: number;
}

const STORAGE_KEY = 'aa_progresso_v1';
const EVENT_NAME = 'aa_progress_changed';

/**
 * Lê todo o mapa de progresso armazenado no localStorage.
 */
export const obterTodosProgressos = (): Record<string, AulaProgressoInfo> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Normaliza a chave de identificação de uma aula.
 */
export const chaveDeAula = (id: string | number): string => {
  if (typeof id === 'string' && id.startsWith('audioaula-')) return id;
  return `audioaula-${id}`;
};

/**
 * Salva o progresso de uma aula de forma resiliente e emite evento para re-renderização.
 */
export const salvarProgressoAula = (
  aulaId: string | number,
  tempo: number,
  dur: number,
  concluidaForcada?: boolean
): AulaProgressoInfo => {
  const chave = chaveDeAula(aulaId);
  const mapa = obterTodosProgressos();
  const durValida = Math.max(0, isFinite(dur) ? dur : 0);
  const tempoValido = Math.max(0, isFinite(tempo) ? tempo : 0);

  let percent = 0;
  if (durValida > 0) {
    percent = Math.min(100, Math.round((tempoValido / durValida) * 100));
  }

  // Considera concluída se ouviu >= 90% ou se foi forçada pelo evento de término do áudio
  const concluida = concluidaForcada || percent >= 90 || Boolean(mapa[chave]?.concluida);
  if (concluida) {
    percent = 100;
  }

  const info: AulaProgressoInfo = {
    tempo: Math.round(tempoValido),
    dur: Math.round(durValida),
    percent,
    concluida,
    updatedAt: Date.now(),
  };

  mapa[chave] = info;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { chave, info } }));
    }
  } catch (e) {
    console.warn('[AudioaulasProgresso] Falha ao gravar progresso no localStorage:', e);
  }

  return info;
};

/**
 * Marca uma aula como 100% concluída.
 */
export const marcarAulaConcluida = (aulaId: string | number): void => {
  const chave = chaveDeAula(aulaId);
  const mapa = obterTodosProgressos();
  const existente = mapa[chave];
  const dur = existente?.dur || 100;
  salvarProgressoAula(aulaId, dur, dur, true);
};

/**
 * Calcula o progresso consolidado de um grupo de aulas (ex: uma matéria específica).
 */
export const calcularProgressoMateria = (
  aulas: AulaAudio[],
  mapa: Record<string, AulaProgressoInfo>
): { percent: number; concluidas: number; total: number } => {
  if (!aulas || aulas.length === 0) {
    return { percent: 0, concluidas: 0, total: 0 };
  }

  let somaPercent = 0;
  let concluidas = 0;

  for (const aula of aulas) {
    const k = audioIdOf(aula);
    const info = mapa[k];
    if (info) {
      somaPercent += info.percent;
      if (info.concluida || info.percent >= 90) {
        concluidas++;
      }
    }
  }

  const percent = Math.round(somaPercent / aulas.length);
  return {
    percent: Math.min(100, Math.max(0, percent)),
    concluidas,
    total: aulas.length,
  };
};

/**
 * Hook React que assina e reflete em tempo real o progresso de todas as aulas.
 */
export function useAudioaulasProgresso() {
  const [progressoMap, setProgressoMap] = useState<Record<string, AulaProgressoInfo>>(() =>
    obterTodosProgressos()
  );

  useEffect(() => {
    const handler = () => {
      setProgressoMap(obterTodosProgressos());
    };

    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const atualizarProgresso = useCallback(
    (aulaId: string | number, tempo: number, dur: number, concluida?: boolean) => {
      salvarProgressoAula(aulaId, tempo, dur, concluida);
    },
    []
  );

  return {
    progressoMap,
    atualizarProgresso,
    marcarConcluida: marcarAulaConcluida,
  };
}
