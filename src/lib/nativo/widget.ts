/**
 * Alimenta o widget de tela inicial ("Lei do dia" / "Flashcard do dia").
 *
 * O app grava o conteúdo em Preferences (SharedPreferences `CapacitorStorage`
 * no Android) e pede a atualização do AppWidget. O provider nativo
 * (`LeiDoDiaWidget`, injetado pelo workflow build-android.yml) lê essa chave
 * e monta o layout; o toque abre `estudosjuridicos://<rota>`.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const CHAVE_WIDGET = 'widget_conteudo';

export interface ConteudoWidget {
  /** Etiqueta superior, ex.: "Lei do dia". */
  etiqueta: string;
  titulo: string;
  texto: string;
  /** Rota interna aberta ao tocar no widget. */
  rota: string;
  atualizadoEm: number;
}

interface WidgetNativoPlugin {
  atualizar(options: { json: string }): Promise<void>;
}

const WidgetNativo = registerPlugin<WidgetNativoPlugin>('WidgetNativo');

export async function atualizarWidget(dados: Omit<ConteudoWidget, 'atualizadoEm'>): Promise<void> {
  const payload: ConteudoWidget = { ...dados, atualizadoEm: Date.now() };
  const json = JSON.stringify(payload);
  try {
    await Preferences.set({ key: CHAVE_WIDGET, value: json });
  } catch {
    /* noop */
  }
  if (!Capacitor.isNativePlatform()) return;
  try {
    await WidgetNativo.atualizar({ json });
  } catch {
    // Plugin ausente (ex.: iOS sem extensão): a chave já ficou salva e o
    // widget lê no próximo ciclo de atualização.
  }
}

export async function lerConteudoWidget(): Promise<ConteudoWidget | null> {
  try {
    const { value } = await Preferences.get({ key: CHAVE_WIDGET });
    return value ? (JSON.parse(value) as ConteudoWidget) : null;
  } catch {
    return null;
  }
}
