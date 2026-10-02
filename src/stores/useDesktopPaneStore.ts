import { create } from 'zustand';
import React from 'react';

interface DesktopPaneState {
  isOpen: boolean;
  content: React.ReactNode | null;
  title: string;
  openPane: (title: string, content: React.ReactNode) => void;
  closePane: () => void;
}

export const useDesktopPaneStore = create<DesktopPaneState>((set) => ({
  isOpen: false,
  content: null,
  title: '',
  openPane: (title, content) => set({ isOpen: true, title, content }),
  closePane: () => set({ isOpen: false, content: null, title: '' }),
}));
