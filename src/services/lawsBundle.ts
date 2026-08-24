/**
 * Loader do bundle nativo de leis + sync incremental.
 *
 * Fluxo:
 *  1. App abre → tenta ler /laws-bundle/manifest.json (embutido no APK/dist)
 *  2. Se existir, popula Dexie com o que ainda não tiver e usa bundle como fonte instantânea
 *  3. Em background, chama /laws-delta?since=<bundle_updated_at ou lastSync> e aplica alterações
 *  4. Persiste `lastSync` em localStorage para próxima abertura
 */
import type { ArtigoLei } from '@/data/mockData';
import { setPersistedArtigosCache, getPersistedArtigosCache } from '@/services/offlineDb';

import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY } from "@/lib/legislacaoBackend";
const SUPABASE_URL = LEIS_SUPABASE_URL;
const SUPABASE_KEY = LEIS_SUPABASE_ANON_KEY;
const LAST_SYNC_KEY = 'laws_bundle:last_sync';
const MANIFEST_URL = '/laws-bundle/manifest.json';

export interface ManifestLei {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  updated_at: string | null;
  count: number;
}
export interface Manifest {
  generated_at: string;
  bundle_updated_at: string | null;
  leis: ManifestLei[];
}

let _manifestPromise: Promise<Manifest | null> | null = null;
let _slugToId: Map<string, string> | null = null;
let _idToSlug: Map<string, string> | null = null;

export function loadManifest(): Promise<Manifest | null> {
  if (_manifestPromise) return _manifestPromise;
  _manifestPromise = (async () => {
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'force-cache' });
      if (!res.ok) return null;
      const m = (await res.json()) as Manifest;
      _slugToId = new Map(m.leis.map((l) => [l.slug, l.id]));
      _idToSlug = new Map(m.leis.map((l) => [l.id, l.slug]));
      return m;
    } catch {
      return null;
    }
  })();
  return _manifestPromise;
}

function normalizeArtigos(rows: any[]): ArtigoLei[] {
  return (rows || [])
    .map((r) => ({
      id: r.id,
      numero: (r.numero || '').replace(/(\d)o\b/g, '$1º').replace(/°/g, 'º'),
      caput: (r.texto || '').replace(/(\d)o\b/g, '$1º').replace(/°/g, 'º'),
      titulo: r.epigrafe || undefined,
      capitulo: undefined,
    }))
    .filter((a) => a.caput.trim() !== '');
}

/** Carrega artigos bundlados de uma lei (via slug). Retorna null se sem bundle. */
export async function loadBundledLei(slug: string): Promise<ArtigoLei[] | null> {
  try {
    const res = await fetch(`/laws-bundle/${slug}.json`, { cache: 'force-cache' });
    if (!res.ok) return null;
    const raw = await res.json();
    return normalizeArtigos(raw);
  } catch {
    return null;
  }
}

/**
 * Aquece a memória com todos os artigos bundlados no APK.
 * Chame no boot (após loadManifest) para que qualquer `getCachedArtigos`
 * subsequente retorne síncrono e sem I/O — abertura de lei fica instantânea.
 * Concorrência controlada (6) pra não travar main thread em Android modesto.
 */
let _primePromise: Promise<void> | null = null;
export function primeMemoryCacheFromBundle(concurrency = 6): Promise<void> {
  if (_primePromise) return _primePromise;
  _primePromise = (async () => {
    const manifest = await loadManifest();
    if (!manifest || !manifest.leis?.length) return;
    const { setCachedArtigos, hasCachedArtigos } = await import('@/services/legislacaoService');
    const { LEIS_CATALOG } = await import('@/data/leisCatalog');

    // Mapeia slug -> tabela_nome usando o mesmo matcher de matchesSlug.
    const slugToTabela = new Map<string, string>();
    for (const m of manifest.leis) {
      const lei = LEIS_CATALOG.find((l) => matchesSlug(l as any, m.slug));
      if (lei) slugToTabela.set(m.slug, lei.tabela_nome);
    }

    const queue = manifest.leis.filter((m) => {
      const t = slugToTabela.get(m.slug);
      return t && !hasCachedArtigos(t);
    });

    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const item = queue[i++];
        if (!item) continue;
        const tabela = slugToTabela.get(item.slug)!;
        try {
          const arts = await loadBundledLei(item.slug);
          if (arts && arts.length > 0) setCachedArtigos(tabela, arts);
        } catch { /* segue */ }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
  })();
  return _primePromise;
}

/** Sincroniza deltas de artigos alterados desde a última sync (ou desde o bundle). */
export async function syncLawsDelta(): Promise<{ applied: number; server_time: string } | null> {
  const manifest = await loadManifest();
  const bundleTs = manifest?.bundle_updated_at || null;
  const last = localStorage.getItem(LAST_SYNC_KEY) || bundleTs || '2000-01-01T00:00:00Z';

  try {
    const url = `${SUPABASE_URL}/functions/v1/laws-delta?since=${encodeURIComponent(last)}`;
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      server_time: string;
      count: number;
      artigos: Array<{ id: string; lei_id: string; numero: string; texto: string; epigrafe?: string | null }>;
    };

    if (payload.count > 0) {
      // Agrupa por lei
      const byLei = new Map<string, typeof payload.artigos>();
      for (const a of payload.artigos) {
        const arr = byLei.get(a.lei_id) || [];
        arr.push(a);
        byLei.set(a.lei_id, arr);
      }
      // Aplica no Dexie por tabela_nome (usando slug→id do manifest)
      const { LEIS_CATALOG } = await import('@/data/leisCatalog');
      for (const [leiId, novosArts] of byLei) {
        const slug = _idToSlug?.get(leiId);
        if (!slug) continue;
        // Encontra tabela_nome via fuzzy match slug
        const lei = LEIS_CATALOG.find((l) =>
          _slugToId?.get(slug) === leiId && matchesSlug(l, slug)
        );
        if (!lei) continue;

        const current = (await getPersistedArtigosCache(lei.tabela_nome)) || [];
        const currentById = new Map(current.map((a: any) => [a.id, a]));
        for (const n of novosArts) {
          currentById.set(n.id, {
            id: n.id,
            numero: (n.numero || '').replace(/(\d)o\b/g, '$1º').replace(/°/g, 'º'),
            caput: (n.texto || '').replace(/(\d)o\b/g, '$1º').replace(/°/g, 'º'),
            titulo: n.epigrafe || undefined,
            capitulo: undefined,
          });
        }
        const merged = Array.from(currentById.values());
        await setPersistedArtigosCache(lei.tabela_nome, merged);
      }
    }

    localStorage.setItem(LAST_SYNC_KEY, payload.server_time);
    return { applied: payload.count, server_time: payload.server_time };
  } catch (e) {
    console.warn('[lawsBundle] sync falhou:', e);
    return null;
  }
}

function matchesSlug(lei: { tabela_nome: string; nome: string; id: string }, slug: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  const s = norm(slug);
  return [lei.tabela_nome, lei.nome, lei.id].some((v) => norm(String(v || '')) === s);
}

export function getBundleSlugForTabela(tabelaNome: string): string | null {
  if (!_slugToId) return null;
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  const key = norm(tabelaNome);
  for (const slug of _slugToId.keys()) {
    if (norm(slug) === key || key.includes(norm(slug)) || norm(slug).includes(key)) return slug;
  }
  return null;
}
