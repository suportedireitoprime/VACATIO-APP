// Toasts nativos com fallback pro sonner (web).
// Uso: import { toastNative } from '@/lib/nativeToast';  toastNative.success('Salvo');
//
// Regra: Android/iOS → toast do sistema (mais leve, integrado ao SO).
// Web → sonner (já usado em toda a app).

import { Capacitor } from '@capacitor/core';
import { toast as sonner } from 'sonner';

type ToastKind = 'success' | 'error' | 'info';

async function showNative(message: string, duration: 'short' | 'long' = 'short') {
  try {
    const { Toast } = await import('@capacitor/toast');
    await Toast.show({ text: message, duration, position: 'bottom' });
  } catch (e) {
    // Se plugin falhar, cai pro sonner
    sonner(message);
  }
}

function show(message: string, kind: ToastKind = 'info', duration: 'short' | 'long' = 'short') {
  if (Capacitor.isNativePlatform()) {
    showNative(message, duration);
    return;
  }
  if (kind === 'success') sonner.success(message);
  else if (kind === 'error') sonner.error(message);
  else sonner(message);
}

export const toastNative = {
  success: (msg: string) => show(msg, 'success'),
  error: (msg: string) => show(msg, 'error', 'long'),
  info: (msg: string) => show(msg, 'info'),
  show,
};
