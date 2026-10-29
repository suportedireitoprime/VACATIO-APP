/**
 * Serviço de Cache Aquecido (SWR) para Áudio-Aulas
 * Permite renderização imediata do acervo (Frame 0 - 0ms)
 * e revalidação suave em background.
 */
import { supabase } from '@/integrations/supabase/client';
import { AUDIOAULAS_ACERVO_INICIAL, type AulaAudio } from '@/data/audioaulasAcervo';

const ACERVO_CACHE_KEY = 'vacatio:audioaulas_acervo_v2';
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

let memoryAcervo: AulaAudio[] | null = null;
let revalidatePromise: Promise<AulaAudio[]> | null = null;

export function getCachedAudioaulas(): AulaAudio[] {
  if (memoryAcervo && memoryAcervo.length > 0) return memoryAcervo;

  try {
    const raw = typeof window !== 'undefined'
      ? (localStorage.getItem(ACERVO_CACHE_KEY) || sessionStorage.getItem(ACERVO_CACHE_KEY))
      : null;
    if (raw) {
      const parsed = JSON.parse(raw) as { ts: number; items: AulaAudio[] };
      if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
        memoryAcervo = parsed.items;
        return parsed.items;
      }
    }
  } catch {}

  // Fallback imediato do acervo bundled
  memoryAcervo = (AUDIOAULAS_ACERVO_INICIAL as AulaAudio[]) || [];
  return memoryAcervo;
}

export function saveCachedAudioaulas(items: AulaAudio[]): void {
  if (!items || items.length === 0) return;
  memoryAcervo = items;
  try {
    if (typeof window !== 'undefined') {
      const payload = JSON.stringify({ ts: Date.now(), items });
      localStorage.setItem(ACERVO_CACHE_KEY, payload);
    }
  } catch {}
}

export async function warmAudioaulasCache(): Promise<AulaAudio[]> {
  if (revalidatePromise) return revalidatePromise;

  revalidatePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('audioaulas_acervo')
        .select('id, area, tema, sequencia, titulo, descricao, url_audio')
        .order('area', { ascending: true })
        .order('sequencia', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        saveCachedAudioaulas(data as AulaAudio[]);
        return data as AulaAudio[];
      }
    } catch (err) {
      console.warn('[audioaulasWarmup] Falha ao revalidar acervo remoto, mantendo cache:', err);
    } finally {
      revalidatePromise = null;
    }
    return getCachedAudioaulas();
  })();

  return revalidatePromise;
}
