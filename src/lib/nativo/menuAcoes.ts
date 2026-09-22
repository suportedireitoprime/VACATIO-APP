/**
 * Menu de ações nativo (Action Sheet do iOS / bottom sheet do Android).
 * Retorna `true` quando o menu nativo foi exibido e a ação executada.
 * Na web retorna `false` para o chamador manter seu próprio menu/dialog.
 */
import { Capacitor } from '@capacitor/core';

export interface AcaoNativa {
  titulo: string;
  destrutiva?: boolean;
  onSelect: () => void | Promise<void>;
}

export interface MenuAcoesOpts {
  titulo?: string;
  mensagem?: string;
  acoes: AcaoNativa[];
  /** Texto do botão de cancelar (padrão "Cancelar"). */
  cancelar?: string;
}

export async function menuAcoes({ titulo, mensagem, acoes, cancelar = 'Cancelar' }: MenuAcoesOpts): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || acoes.length === 0) return false;
  try {
    const { ActionSheet, ActionSheetButtonStyle } = await import('@capacitor/action-sheet');
    const options = [
      ...acoes.map((a) => ({
        title: a.titulo,
        style: a.destrutiva ? ActionSheetButtonStyle.Destructive : ActionSheetButtonStyle.Default,
      })),
      { title: cancelar, style: ActionSheetButtonStyle.Cancel },
    ];
    const { index } = await ActionSheet.showActions({ title: titulo, message: mensagem, options });
    const escolhida = acoes[index];
    if (escolhida) await escolhida.onSelect();
    return true;
  } catch {
    return false;
  }
}
