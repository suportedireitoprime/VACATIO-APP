import { supabase } from '@/integrations/supabase/client';
import { bundle } from '@/services/offlineBundle';


export type NoticiaFonte = 'migalhas';

export interface Noticia {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;          // markdown do Migalhas (lazy)
  conteudo_md?: string | null;
  imagem_url: string | null;
  categoria: string;
  link: string;
  data_publicacao: string;
  fonte: NoticiaFonte;
}

const SNAPSHOT_KEY = 'noticias:snapshot:v4';
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000; // 24h (offline-friendly)
const MIN_REFETCH_MS = 15 * 60 * 1000;  // 15 min entre revalidações

let noticiasCache: Noticia[] | null = null;
let fetchPromise: Promise<void> | null = null;
let lastFetchTime = 0;
const subscribers = new Set<(data: Noticia[]) => void>();
// Cache lazy do markdown por id (dedup entre visualizações)
const conteudoCache = new Map<string, string>();

const sortNoticias = (items: Noticia[]) =>
  [...items].sort((a, b) => {
    const dateDiff = new Date(b.data_publicacao).getTime() - new Date(a.data_publicacao).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });

// Hidrata cache do sessionStorage sincronamente (renderização instantânea entre reloads)
function hydrateFromStorage() {
  if (noticiasCache) return;
  try {
    const raw = typeof window !== 'undefined'
      ? (localStorage.getItem(SNAPSHOT_KEY) || sessionStorage.getItem(SNAPSHOT_KEY))
      : null;
    if (!raw) return;
    const parsed = JSON.parse(raw) as { savedAt: number; items: Noticia[] };
    if (!parsed?.items?.length) return;
    // Offline: sempre usa o snapshot, mesmo velho. Online: respeita TTL.
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (!isOffline && Date.now() - parsed.savedAt > SNAPSHOT_TTL_MS) return;
    noticiasCache = sortNoticias(parsed.items);
    lastFetchTime = parsed.savedAt;
  } catch {
    // ignore
  }
}
hydrateFromStorage();

function persistSnapshot(items: Noticia[]) {
  try {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify({ savedAt: Date.now(), items: items.slice(0, 40) });
    localStorage.setItem(SNAPSHOT_KEY, payload);
    sessionStorage.setItem(SNAPSHOT_KEY, payload);
  } catch {
    // quota / privacy mode — ignore
  }
}

function notify() {
  if (!noticiasCache) return;
  for (const cb of subscribers) {
    try { cb(noticiasCache); } catch { /* ignore */ }
  }
}

export function subscribeNoticias(cb: (data: Noticia[]) => void): () => void {
  subscribers.add(cb);
  return () => { subscribers.delete(cb); };
}

export function getNoticiasCache(): Noticia[] | null {
  return noticiasCache ? sortNoticias(noticiasCache) : null;
}

export async function prefetchNoticias(force = false): Promise<void> {
  const now = Date.now();
  if (!force && noticiasCache && (now - lastFetchTime) < MIN_REFETCH_MS) return;
  if (fetchPromise) return fetchPromise;
  // Offline: mantém o snapshot já hidratado e nem tenta rede.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (noticiasCache) notify();
    return;
  }

  // Colunas leves: SEM conteudo_md (o markdown é buscado sob demanda ao abrir).
  const MIGALHAS_COLS_LIST = 'id, titulo, resumo, imagem_url, categoria, link, data_publicacao';

  fetchPromise = (async () => {
    const juridicas = await supabase
      .from('noticias_juridicas' as any)
      .select(MIGALHAS_COLS_LIST)
      .not('imagem_url', 'is', null)
      .neq('imagem_url', '')
      .order('data_publicacao', { ascending: false })
      .limit(40);

    const combined: Noticia[] = [];

    if (!juridicas.error && juridicas.data) {
      for (const n of juridicas.data as any[]) {
        if (!n.imagem_url?.trim()) continue;
        combined.push({
          id: `migalhas:${n.id}`,
          titulo: n.titulo,
          resumo: n.resumo || '',
          conteudo: n.resumo || '',
          conteudo_md: null,
          imagem_url: n.imagem_url,
          categoria: n.categoria || 'Notícia Jurídica',
          link: n.link,
          data_publicacao: n.data_publicacao,
          fonte: 'migalhas',
        });
      }
    }

    // Fallback: bundle nativo (Electron / sem rede)
    if (combined.length === 0) {
      const bundled = await bundle.noticias<any>();
      for (const n of bundled) {
        if (!n.imagem_url?.trim()) continue;
        combined.push({
          id: `migalhas:${n.id}`,
          titulo: n.titulo,
          resumo: n.resumo || '',
          conteudo: n.conteudo_md || n.resumo || '',
          conteudo_md: n.conteudo_md,
          imagem_url: n.imagem_url,
          categoria: n.categoria || 'Notícia Jurídica',
          link: n.link,
          data_publicacao: n.data_publicacao,
          fonte: 'migalhas',
        });
      }
    }

    noticiasCache = sortNoticias(combined);
    lastFetchTime = Date.now();
    persistSnapshot(noticiasCache);
    notify();
  })();

  try {
    await fetchPromise;
  } finally {
    fetchPromise = null;
  }
}

/**
 * Busca o conteúdo markdown da notícia sob demanda (ao abrir).
 * Evita puxar `conteudo_md` de 40 notícias na listagem.
 */
export async function fetchNoticiaConteudo(id: string): Promise<string | null> {
  const cached = conteudoCache.get(id);
  if (cached !== undefined) return cached;
  // Persistência: se já foi aberta antes, ficou salva pra offline.
  try {
    const persisted = typeof window !== 'undefined' ? localStorage.getItem(`noticia:md:${id}`) : null;
    if (persisted) {
      conteudoCache.set(id, persisted);
      if (noticiasCache) {
        noticiasCache = noticiasCache.map((n) => (n.id === id ? { ...n, conteudo_md: persisted, conteudo: persisted } : n));
        notify();
      }
      return persisted;
    }
  } catch { /* ignore */ }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;
  const dbId = id.startsWith('migalhas:') ? id.slice('migalhas:'.length) : id;
  try {
    const { data, error } = await supabase
      .from('noticias_juridicas' as any)
      .select('conteudo_md')
      .eq('id', dbId)
      .maybeSingle();
    if (error || !data) return null;
    const md = (data as any).conteudo_md as string | null;
    if (md) {
      conteudoCache.set(id, md);
      try { localStorage.setItem(`noticia:md:${id}`, md); } catch { /* quota */ }
    }
    // Atualiza a entrada em cache (in-memory) para que reaberturas sejam instantâneas
    if (md && noticiasCache) {
      noticiasCache = noticiasCache.map((n) => (n.id === id ? { ...n, conteudo_md: md, conteudo: md } : n));
      notify();
    }
    return md;
  } catch {
    return null;
  }
}

// Refresh em background — apenas UMA vez, muito depois do boot, para manter o cache
// morno sem virar um loop de 5 minutos (que era um dos maiores ofensores de egress).
if (typeof window !== 'undefined') {
  const scheduleRefresh = () => {
    setTimeout(() => prefetchNoticias().catch(() => {}), 30_000);
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(scheduleRefresh);
  } else {
    setTimeout(scheduleRefresh, 2000);
  }
}
