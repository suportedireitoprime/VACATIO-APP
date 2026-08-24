import { supabase } from '@/integrations/supabase/client';

interface PLData {
  id: string | number;
  ementa: string;
  numero?: number;
  ano?: number;
  autorNome?: string;
  urlInteiroTeor?: string;
}

const BAD_ENDINGS = /\b(de|da|do|das|dos|e|em|com|para|por|sem|sob|sobre|contra|entre|até|ou|num|numa|no|na|nos|nas|que|se|ao|à|aos|às|pelo|pela|pelos|pelas|um|uma|uns|umas)\s*$/i;
const TRUNCATED_END = /\b[a-záéíóúâêôãõç]{1,4}$/i;
const INVALID_HEADLINE_PATTERNS = [
  /desculpe/i,
  /não consegui gerar/i,
  /erro interno/i,
  /resposta\.?$/i,
];

function isValidHeadline(value?: string | null): boolean {
  const h = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (h.length < 30 || h.length > 95) return false;
  if (INVALID_HEADLINE_PATTERNS.some((pattern) => pattern.test(h))) return false;

  if (/[,:;\-/]$|\.\.\.$/.test(h)) return false;
  if (BAD_ENDINGS.test(h)) return false;
  const last = h.split(' ').pop() ?? '';
  if (last.length <= 4 && TRUNCATED_END.test(last) && !/[.!?)]$/.test(h)) return false;
  return true;
}

export async function getOrGenerateHeadline(pl: PLData): Promise<string | null> {
  const idExterno = String(pl.id);

  // Check cache first
  const { data: cached } = await (supabase as any)
    .from('radar_pl_headlines')
    .select('headline')
    .eq('id_externo', idExterno)
    .maybeSingle();

  const cachedHeadline = cached?.headline?.trim();
  if (isValidHeadline(cachedHeadline)) return cachedHeadline!;

  // Generate via edge function
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase.functions.invoke('assistente-juridica', {
        body: {
          mode: 'headline',
          ementa: pl.ementa,
          plNumero: pl.numero,
          plAno: pl.ano,
          autorNome: pl.autorNome,
          urlInteiroTeor: pl.urlInteiroTeor,
        },
      });

      if (error || !data?.reply) continue;

      const headline = data.reply.trim().replace(/^["']|["']$/g, '');

      if (!isValidHeadline(headline)) continue;

      await (supabase as any)
        .from('radar_pl_headlines')
        .upsert({ id_externo: idExterno, headline }, { onConflict: 'id_externo' });

      return headline;
    }

    return null;
  } catch {
    return null;
  }
}

export async function getOrGenerateAnalise(pl: PLData): Promise<string | null> {
  const idExterno = String(pl.id);

  // Check cache
  const { data: cached } = await (supabase as any)
    .from('radar_pl_headlines')
    .select('analise')
    .eq('id_externo', idExterno)
    .maybeSingle();

  if (cached?.analise) return cached.analise;

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const { data, error } = await supabase.functions.invoke('assistente-juridica', {
      body: {
        mode: 'analise_pl',
        ementa: pl.ementa,
        plNumero: pl.numero,
        plAno: pl.ano,
        autorNome: pl.autorNome,
        urlInteiroTeor: pl.urlInteiroTeor,
      },
    });

    if (error || !data?.reply) return null;

    // Cache it
    await (supabase as any)
      .from('radar_pl_headlines')
      .upsert({ id_externo: idExterno, analise: data.reply }, { onConflict: 'id_externo' });

    return data.reply;
  } catch {
    return null;
  }
}
