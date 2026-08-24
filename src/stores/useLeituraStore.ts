import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LeituraStore {
  bionicReading: boolean;
  setBionicReading: (val: boolean) => void;
  focusMode: boolean;
  setFocusMode: (val: boolean) => void;
  isPaintMode: boolean;
  paintColor: string;
  togglePaintMode: () => void;
  setPaintColor: (color: string) => void;
}

export const useLeituraStore = create<LeituraStore>()(
  persist(
    (set) => ({
      bionicReading: false,
      setBionicReading: (val) => set({ bionicReading: val }),
      focusMode: false,
      setFocusMode: (val) => set({ focusMode: val }),
      isPaintMode: false,
      paintColor: 'rgba(250, 204, 21, 0.42)',
      togglePaintMode: () => set((state) => ({ isPaintMode: !state.isPaintMode })),
      setPaintColor: (color) => set({ paintColor: color }),
    }),
    { name: 'leitura-preferences' }
  )
);
