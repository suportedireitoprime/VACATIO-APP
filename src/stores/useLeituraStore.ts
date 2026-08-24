import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LeituraStore {
  bionicReading: boolean;
  setBionicReading: (val: boolean) => void;
  focusMode: boolean;
  setFocusMode: (val: boolean) => void;
}

export const useLeituraStore = create<LeituraStore>()(
  persist(
    (set) => ({
      bionicReading: false,
      setBionicReading: (val) => set({ bionicReading: val }),
      focusMode: false,
      setFocusMode: (val) => set({ focusMode: val }),
    }),
    { name: 'leitura-preferences' }
  )
);
