export type MediaType = 'audioaula' | 'leiscantadas' | 'pilulas' | 'videoaula' | 'resumolivro' | 'narracao';

type Listener = (activeType: MediaType) => void;
const listeners = new Set<Listener>();

let currentActiveMedia: MediaType | null = null;

export function notifyMediaPlay(type: MediaType): void {
  currentActiveMedia = type;
  listeners.forEach((fn) => {
    try {
      fn(type);
    } catch (e) {
      console.error('[mediaCoordinator] Erro ao notificar player:', e);
    }
  });
}

export function subscribeMediaPlay(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveMedia(): MediaType | null {
  return currentActiveMedia;
}
