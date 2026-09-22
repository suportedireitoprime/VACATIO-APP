import { Capacitor } from '@capacitor/core';

type ConfirmarArgs = {
  titulo?: string;
  mensagem: string;
  okTexto?: string;
  cancelarTexto?: string;
};

/**
 * Diálogo de confirmação.
 * Nativo: @capacitor/dialog (alerta do sistema). Web: window.confirm.
 */
export async function confirmar({
  titulo = 'Confirmar',
  mensagem,
  okTexto = 'Confirmar',
  cancelarTexto = 'Cancelar',
}: ConfirmarArgs): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Dialog } = await import('@capacitor/dialog');
      const { value } = await Dialog.confirm({
        title: titulo,
        message: mensagem,
        okButtonTitle: okTexto,
        cancelButtonTitle: cancelarTexto,
      });
      return value;
    } catch (e) {
      console.error('Dialog nativo falhou:', e);
    }
  }
  return window.confirm(mensagem);
}

/** Aviso simples (OK). Nativo: @capacitor/dialog. Web: window.alert. */
export async function avisar(mensagem: string, titulo = 'Aviso'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Dialog } = await import('@capacitor/dialog');
      await Dialog.alert({ title: titulo, message: mensagem, buttonTitle: 'OK' });
      return;
    } catch (e) {
      console.error('Dialog nativo falhou:', e);
    }
  }
  window.alert(mensagem);
}
