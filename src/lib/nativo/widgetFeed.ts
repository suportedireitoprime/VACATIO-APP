/**
 * Alimenta o widget de tela inicial ("Curiosidade do dia" / "Lei do dia").
 *
 * Roda no boot, no máximo uma vez por dia: escolhe um item ativo de
 * `home_curiosidades` de forma estável pela data (todo mundo vê o mesmo item
 * no mesmo dia) e grava no cache lido pelo widget nativo.
 */
import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/integrations/supabase/client';
import { atualizarWidget } from './widget';

const CHAVE_DIA = 'widget_ultimo_dia';

const hoje = () => new Date().toISOString().slice(0, 10);

/** Índice estável para o dia — mesmo conteúdo durante todo o dia. */
function indiceDoDia(total: number): number {
  const dia = hoje();
  let hash = 0;
  for (let i = 0; i < dia.length; i++) hash = ((hash << 5) - hash + dia.charCodeAt(i)) | 0;
  return Math.abs(hash) % Math.max(total, 1);
}

export async function atualizarWidgetDoDia(forcar = false): Promise<void> {
  try {
    if (!forcar) {
      const { value } = await Preferences.get({ key: CHAVE_DIA });
      if (value === hoje()) return;
    }

    const { data, error } = await (supabase as any)
      .from('home_curiosidades')
      .select('titulo, texto')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .limit(50);

    if (error || !Array.isArray(data) || data.length === 0) return;

    const item = data[indiceDoDia(data.length)] as { titulo?: string; texto?: string };
    await atualizarWidget({
      etiqueta: 'Curiosidade do dia',
      titulo: item.titulo?.trim() || 'Estudos Jurídicos',
      texto: (item.texto ?? '').trim().slice(0, 160),
      rota: '/inicio',
    });
    await Preferences.set({ key: CHAVE_DIA, value: hoje() });
  } catch (e) {
    console.warn('[widgetFeed] falhou', e);
  }
}
