import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  downloadedLeis: Set<string>;
  downloading: string | null;
  setOnline: (v: boolean) => void;
  markDownloaded: (tabelaNome: string) => void;
  setDownloading: (tabelaNome: string | null) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: navigator.onLine,
  downloadedLeis: new Set(),
  downloading: null,
  setOnline: (v) => set({ isOnline: v }),
  markDownloaded: (tabelaNome) => set((s) => {
    const next = new Set(s.downloadedLeis);
    next.add(tabelaNome);
    return { downloadedLeis: next };
  }),
  setDownloading: (tabelaNome) => set({ downloading: tabelaNome }),
}));

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useOfflineStore.getState().setOnline(true));
  window.addEventListener('offline', () => useOfflineStore.getState().setOnline(false));
}
