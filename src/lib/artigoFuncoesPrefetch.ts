/**
 * Pré-carregamento das funções do artigo (Anotações, Videoaulas, Termos,
 * Jurisprudência, Perguntar, Grafo, Lembretes, Baixar, Compartilhar…).
 *
 * Duas frentes para o clique ser instantâneo:
 *  1. Código: os chunks lazy dos sheets descem em background assim que o
 *     artigo abre (e de novo quando o menu "Funções" abre).
 *  2. Dados: as consultas que cada sheet faria ao abrir já são disparadas
 *     antes e ficam em cache — o sheet monta com os dados prontos.
 */
import { supabase } from '@/integrations/supabase/client';

type Entry<T = unknown> = { data?: T; promise?: Promise<T>; ts: number };

const store = new Map<string, Entry>();
const DEFAULT_TTL = 5 * 60 * 1000;

export function getCachedData<T>(key: string, ttl = DEFAULT_TTL): T | undefined {
  const entry = store.get(key);
  if (!entry || entry.data === undefined) return undefined;
  if (Date.now() - entry.ts > ttl) return undefined;
  return entry.data as T;
}

export function primeCache<T>(key: string, data: T) {
  store.set(key, { data, ts: Date.now() });
}

export function invalidateCache(key: string) {
  store.delete(key);
}

/** Executa o loader uma única vez por chave (dedupe) e guarda o resultado. */
export function loadCached<T>(key: string, loader: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const entry = store.get(key) as Entry<T> | undefined;
  if (entry) {
    if (entry.data !== undefined && Date.now() - entry.ts <= ttl) return Promise.resolve(entry.data);
    if (entry.promise) return entry.promise;
  }
  const promise = loader()
    .then((data) => {
      store.set(key, { data, ts: Date.now() });
      return data;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });
  store.set(key, { promise, ts: Date.now() });
  return promise;
}

function idle(fn: () => void, timeout = 1200) {
  if (typeof window === 'undefined') return;
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(fn, { timeout });
  else window.setTimeout(fn, 200);
}

/* ------------------------------------------------------------------ */
/* 1. Chunks dos sheets                                                */
/* ------------------------------------------------------------------ */

let chunksPrefetched = false;

/** Baixa em background todos os chunks das funções do artigo. */
export function prefetchArtigoFuncoesChunks() {
  if (chunksPrefetched) return;
  chunksPrefetched = true;
  idle(() => {
    const loaders = [
      () => import('@/components/vademecum/AnotacoesSheet'),
      () => import('@/components/vademecum/PerguntarSheet'),
      () => import('@/components/vademecum/VideoaulasListSheet'),
      () => import('@/components/vademecum/VideoaulaSheet'),
      () => import('@/components/vademecum/LembretesArtigoSheet'),
      () => import('@/components/vademecum/BaixarArtigoSheet'),
      () => import('@/components/vademecum/GrafoOverlay'),
      () => import('@/components/vademecum/GrifoFotoSheet'),
      () => import('@/components/vademecum/GrifoVoiceSheet'),
      () => import('@/components/vademecum/GrifoEraseSheet'),
      () => import('@/components/vademecum/KaraokeOverlay'),
      () => import('@/components/vademecum/GeracaoAnimacaoOverlay'),
    ];
    // Sequencial para não competir com o conteúdo do artigo pela banda.
    loaders.reduce<Promise<unknown>>(
      (chain, load) => chain.then(() => load().catch(() => undefined)),
      Promise.resolve(),
    );
  });
}

/* ------------------------------------------------------------------ */
/* 2. Dados                                                            */
/* ------------------------------------------------------------------ */

export interface AnotacoesPayload {
  notes: any[];
  highlights: unknown;
}

export function anotacoesKey(tabela: string, numero: string, userId: string) {
  return `anotacoes:${tabela}:${numero}:${userId}`;
}

export function loadAnotacoes(tabela: string, numero: string, userId: string): Promise<AnotacoesPayload> {
  return loadCached(anotacoesKey(tabela, numero, userId), async () => {
    const [notesResult, highlightsResult] = await Promise.all([
      supabase
        .from('artigos_anotacoes')
        .select('id, anotacao, audio_url, audio_duration_ms, created_at')
        .eq('tabela_codigo', tabela)
        .eq('numero_artigo', numero)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('artigos_grifos')
        .select('highlights')
        .eq('tabela_codigo', tabela)
        .eq('numero_artigo', numero)
        .eq('user_id', userId)
        .maybeSingle(),
    ]);
    if (notesResult.error) throw notesResult.error;
    if (highlightsResult.error) throw highlightsResult.error;
    return {
      notes: (notesResult.data || []) as any[],
      highlights: highlightsResult.data?.highlights,
    };
  });
}

export function videoaulasKey(tabela: string, numero: string) {
  return `videoaulas:${tabela}:${numero}`;
}

export interface VideoaulasPayload {
  videos: any[];
  fetchedAt: string | null;
  stale: boolean;
  quotaExceeded: boolean;
}

export function loadVideoaulas(
  tabela: string,
  numero: string,
  leiNome?: string,
): Promise<VideoaulasPayload> {
  return loadCached(
    videoaulasKey(tabela, numero),
    async () => {
      let friendlyLei = leiNome;
      if (!friendlyLei || friendlyLei === tabela) {
        try {
          const { getLeisCatalog } = await import('@/services/legislacaoService');
          const cat = getLeisCatalog?.() || [];
          const found = cat.find((l: any) => l.tabela_nome === tabela);
          if (found?.nome) friendlyLei = found.nome;
        } catch { /* ignore */ }
      }
      const { data, error } = await supabase.functions.invoke('buscar-videoaulas', {
        body: { tabelaNome: tabela, artigoNumero: numero, leiNome: friendlyLei || tabela },
      });
      if (error) throw error;
      let list = (data?.videos || []) as any[];
      try {
        const ids = list.map((v) => v.videoId);
        if (ids.length > 0) {
          const { data: stats } = await supabase
            .from('videoaula_conteudo')
            .select('video_id, likes_count, dislikes_count')
            .in('video_id', ids);
          const map = new Map<string, number>();
          (stats || []).forEach((s: any) =>
            map.set(s.video_id, (s.likes_count || 0) - (s.dislikes_count || 0)),
          );
          list = [...list].sort((a, b) => (map.get(b.videoId) || 0) - (map.get(a.videoId) || 0));
        }
      } catch { /* ignore ranking errors */ }
      return {
        videos: list,
        fetchedAt: data?.fetched_at || null,
        stale: Boolean(data?.stale),
        quotaExceeded: Boolean(data?.quotaExceeded),
      };
    },
    30 * 60 * 1000,
  );
}

export function termosKey(tabela: string, numero: string) {
  return `termos:${tabela}:${numero}`;
}

/** Busca só o conteúdo já existente (local + banco). Nunca gera com IA. */
export function loadTermosExistentes(tabela: string, numero: string): Promise<string | null> {
  return loadCached(termosKey(tabela, numero), async () => {
    const { getLocalAiCache, setLocalAiCache } = await import('@/lib/aiCacheLocal');
    const local = getLocalAiCache(tabela, numero, 'termos');
    if (local) return local;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
    const { data } = await supabase
      .from('artigo_ai_cache')
      .select('conteudo')
      .eq('tabela_codigo', tabela)
      .eq('numero_artigo', numero)
      .eq('tipo', 'termos')
      .maybeSingle();
    const conteudo = (data?.conteudo as string | undefined) || null;
    if (conteudo) setLocalAiCache(tabela, numero, 'termos', conteudo);
    return conteudo;
  });
}

/**
 * Dispara em background tudo o que as funções do artigo precisam.
 * Seguro para chamar várias vezes (dedupe por chave).
 */
export function prefetchArtigoFuncoesDados(opts: {
  tabela?: string;
  numero?: string;
  leiNome?: string;
  userId?: string | null;
}) {
  const { tabela, numero, leiNome, userId } = opts;
  if (!tabela || !numero) return;
  idle(() => {
    loadTermosExistentes(tabela, numero).catch(() => {});
    if (userId) loadAnotacoes(tabela, numero, userId).catch(() => {});
    // Videoaulas custam uma chamada externa: só depois das demais.
    window.setTimeout(() => {
      loadVideoaulas(tabela, numero, leiNome).catch(() => {});
    }, 1500);
  });
}