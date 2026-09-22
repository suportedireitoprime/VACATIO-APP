import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Copia texto para a área de transferência.
 * Nativo: @capacitor/clipboard. Web: navigator.clipboard com fallback legado.
 */
export async function copiar(texto: string, mensagem = 'Copiado'): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: texto });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
    } else {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    if (mensagem) toast.success(mensagem);
    return true;
  } catch (e) {
    console.error('Falha ao copiar:', e);
    toast.error('Não foi possível copiar');
    return false;
  }
}

/** Copia sem mostrar toast de sucesso (para quem já mostra o próprio feedback). */
export const copiarTexto = (texto: string) => copiar(texto, '');
