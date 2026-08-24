import type { ArtigoLei } from '@/data/mockData';
import { getPersistedArtigosCache, setPersistedArtigosCache } from '@/services/offlineDb';
import { LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY } from '@/lib/legislacaoBackend';

const supabaseUrl = LEIS_SUPABASE_URL;
const supabaseKey = LEIS_SUPABASE_ANON_KEY;

import { LEIS_CATALOG, getLeisPorTipo as _getLeisPorTipo } from '@/data/leisCatalog';

export { LEIS_CATALOG };

// ─────────────────────────────────────────────────────────────────────────
//  Ponte com o novo schema unificado (vade_mecum_leis / vade_mecum_artigos)
// ─────────────────────────────────────────────────────────────────────────

function normName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

type LeiRef = { id: string; slug: string };
let _leiIndexPromise: Promise<Map<string, LeiRef>> | null = null;

const STRUCTURAL_SUFFIX_RE = /(^|[.;:)])\s+(?=(?:PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s+(?:[IVXLCDM]+|[0-9]+|[ÚU]NICO|PRELIMINAR)\b)[\s\S]*$/i;

function cleanArticleText(value?: string | null): string {
  return (value || '')
    .replace(/(\d)o\b/g, '$1º')
    .replace(/°/g, 'º')
    .replace(STRUCTURAL_SUFFIX_RE, '$1')
    .trim();
}

async function getLegacyToVMIndex(forceRefresh = false): Promise<Map<string, LeiRef>> {
  if (forceRefresh) _leiIndexPromise = null;
  if (_leiIndexPromise) return _leiIndexPromise;
  _leiIndexPromise = (async () => {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/vade_mecum_leis?select=id,slug,nome,nome_curto&limit=1000`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const rows: Array<{ id: string; slug: string; nome: string; nome_curto: string | null }> =
      res.ok ? await res.json() : [];
    const byKey = new Map<string, LeiRef>();
    for (const r of rows) {
      const ref = { id: r.id, slug: r.slug };
      byKey.set(normName(r.nome), ref);
      if (r.nome_curto) byKey.set(normName(r.nome_curto), ref);
      byKey.set(normName(r.slug), ref);
    }
    const map = new Map<string, LeiRef>();
    for (const lei of LEIS_CATALOG) {
      const cand = [lei.nome, (lei as any).sigla, lei.id]
        .map((x) => normName(String(x || '')))
        .filter(Boolean);
      for (const key of cand) {
        const hit = byKey.get(key);
        if (hit) { map.set(lei.tabela_nome, hit); break; }
      }
    }
    return map;
  })();
  return _leiIndexPromise;
}

async function resolveLeiRef(tabelaNome: string): Promise<LeiRef | undefined> {
  const idx = await getLegacyToVMIndex();
  const hit = idx.get(tabelaNome);
  if (hit) return hit;
  const fresh = await getLegacyToVMIndex(true);
  const hit2 = fresh.get(tabelaNome);
  if (hit2) return hit2;
  // Fallback: pode ser um slug direto do vade_mecum_leis (ex.: estaduais)
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/vade_mecum_leis?select=id,slug,planalto_url&slug=eq.${encodeURIComponent(tabelaNome)}&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (res.ok) {
      const rows: Array<{ id: string; slug: string; planalto_url: string | null }> = await res.json();
      if (rows[0]) {
        if (rows[0].planalto_url) DYNAMIC_PLANALTO_URLS.set(rows[0].slug, rows[0].planalto_url);
        return { id: rows[0].id, slug: rows[0].slug };
      }
    }
  } catch {}

  return undefined;
}


async function fetchFromVadeMecum(leiId: string, offset: number, limit: number): Promise<ArtigoLei[]> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/vade_mecum_artigos?lei_id=eq.${leiId}&select=id,numero,texto,ordem,epigrafe&order=ordem.asc&offset=${offset}&limit=${limit}`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) {
      // Silencioso: rotas públicas podem chamar isso sem sessão; devolvemos vazio.
      if (res.status !== 401 && res.status !== 403) {
        console.warn('vade_mecum_artigos fetch failed', res.status);
      }
      return [];
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      return [];
    }
    const rows = await res.json();
    return (rows || [])
      .map((r: any) => ({
        id: r.id,
        numero: normalizeArtigoLabel(r.numero),
        caput: cleanArticleText(r.texto),
        titulo: r.epigrafe || undefined,
        capitulo: undefined,
        ordem: typeof r.ordem === 'number' ? r.ordem : undefined,
      }))
      .filter((a: ArtigoLei) => a.caput.trim() !== '');
  } catch (e) {
    console.error('fetchFromVadeMecum error', e);
    return [];
  }
}


export async function getLeisPorTipo(tipo: string) {
  // Tipos dinâmicos (estaduais/municipais) vêm direto do banco unificado.
  if (/^(estadual|municipal)_/.test(tipo)) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/vade_mecum_leis?select=id,slug,nome,nome_curto,categoria,planalto_url&categoria=eq.${encodeURIComponent(tipo)}&order=nome.asc&limit=1000`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (!res.ok) return [];
      const rows: Array<{ id: string; slug: string; nome: string; nome_curto: string | null; planalto_url: string | null }> = await res.json();
      return rows.map(r => {
        if (r.planalto_url) DYNAMIC_PLANALTO_URLS.set(r.slug, r.planalto_url);
        return {
          id: r.id,
          nome: r.nome_curto || r.nome,
          sigla: (r.nome_curto || r.slug || '').toUpperCase(),
          descricao: r.nome,
          tipo,
          tabela_nome: r.slug,
          url_planalto: r.planalto_url || undefined,
        };
      });


    } catch { return []; }
  }
  return _getLeisPorTipo(tipo);
}


export function getTodosOsTipos(): string[] {
  return ['constituicao', 'codigo', 'estatuto', 'lei-especial', 'previdenciario', 'lei-ordinaria', 'decreto', 'sumula'];
}

// In-memory cache
const artigosCache = new Map<string, ArtigoLei[]>();

function normalizeArtigoLabel(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return '';

  const normalized = raw
    .replace(/°/g, 'º')
    .replace(/^Art\.\s*(\d+)o\b/i, 'Art. $1º')
    .replace(/^Art\.\s*(\d+)-([A-Z])\b/i, (_, numero, sufixo) => {
      const artigoNumero = Number(numero);
      return artigoNumero >= 1 && artigoNumero <= 9
        ? `Art. ${artigoNumero}º-${String(sufixo).toUpperCase()}`
        : `Art. ${artigoNumero}-${String(sufixo).toUpperCase()}`;
    });

  const plainMatch = normalized.match(/^Art\.\s*(\d+)$/i);
  if (plainMatch) {
    const artigoNumero = Number(plainMatch[1]);
    return artigoNumero >= 1 && artigoNumero <= 9
      ? `Art. ${artigoNumero}º`
      : `Art. ${artigoNumero}`;
  }

  return normalized;
}

// Leis Ordinárias por ano
export const ANOS_LEIS_ORDINARIAS = [2026];
export const ANOS_DECRETOS = [2026];

export interface LeiOrdinaria {
  id: string;
  numero_lei: string;
  data_publicacao: string | null;
  ementa: string;
  url: string | null;
  ano: number;
  ordem: number;
  texto_completo: string | null;
  explicacao?: string | null;
}

const leisCache = new Map<string, LeiOrdinaria[]>();

export async function fetchLeisOrdinariasPorAno(ano: number): Promise<LeiOrdinaria[]> {
  const key = `leis:${ano}`;
  if (leisCache.has(key)) return leisCache.get(key)!;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/leis_ordinarias?ano=eq.${ano}&select=id,numero_lei,data_publicacao,ementa,url,ano,ordem,texto_completo&order=ordem.desc&limit=10000`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!res.ok) {
    console.error(`Erro ao buscar leis ordinárias de ${ano}:`, res.status);
    return [];
  }

  const data: LeiOrdinaria[] = await res.json();
  leisCache.set(key, data);
  return data;
}

export async function fetchDecretosPorAno(ano: number): Promise<LeiOrdinaria[]> {
  const key = `decretos:${ano}`;
  if (leisCache.has(key)) return leisCache.get(key)!;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/decretos?ano=eq.${ano}&select=id,numero_lei,data_publicacao,ementa,url,ano,ordem,texto_completo&order=ordem.desc&limit=10000`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!res.ok) {
    console.error(`Erro ao buscar decretos de ${ano}:`, res.status);
    return [];
  }

  const data2: LeiOrdinaria[] = await res.json();
  leisCache.set(key, data2);
  return data2;
}

export function getCachedArtigos(tabelaNome: string): ArtigoLei[] | null {
  const cached = artigosCache.get(tabelaNome) || null;
  return cached?.map((artigo) => ({ ...artigo, numero: normalizeArtigoLabel(artigo.numero) })) || null;
}

export async function fetchArtigosLei(_leiId: string, tabelaNome?: string | null): Promise<ArtigoLei[]> {
  if (!tabelaNome) return [];
  const cached = artigosCache.get(tabelaNome);
  if (cached) return cached.map((artigo) => ({ ...artigo, numero: normalizeArtigoLabel(artigo.numero) }));
  return fetchArtigosPaginado(tabelaNome, 0, 2000);
}

export async function fetchArtigosInstant(tabelaNome: string, count = 10): Promise<ArtigoLei[]> {
  const cached = artigosCache.get(tabelaNome);
  if (cached) return cached.slice(0, count).map((a) => ({ ...a, numero: normalizeArtigoLabel(a.numero) }));

  // Bundle nativo — se existir JSON embutido no APK, usa direto (offline, instantâneo).
  try {
    const { loadManifest, loadBundledLei, getBundleSlugForTabela } = await import('@/services/lawsBundle');
    const manifest = await loadManifest();
    if (manifest) {
      const slug = getBundleSlugForTabela(tabelaNome);
      if (slug) {
        const bundled = await loadBundledLei(slug);
        if (bundled && bundled.length > 0) {
          artigosCache.set(tabelaNome, bundled);
          setPersistedArtigosCache(tabelaNome, bundled);
          return bundled.slice(0, count);
        }
      }
    }
  } catch { /* segue pro fallback remoto */ }

  // Tenta primeiro na base unificada
  try {
    const ref = await resolveLeiRef(tabelaNome);
    if (ref) {
      const rows = await fetchFromVadeMecum(ref.id, 0, count);
      if (rows.length > 0) return rows;
    }
  } catch (e) { console.error('vm instant', e); }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(tabelaNome)}?select=id,numero,rotulo,texto,ordem_numero,titulo,capitulo&order=ordem_numero.asc&offset=0&limit=${count}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!res.ok) return [];
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) return [];
    const data = await res.json();
    return (data || [])
      .map((row: any) => ({
        id: row.id,
        numero: normalizeArtigoLabel(row.rotulo || row.numero),
        caput: cleanArticleText(row.texto || row.caput),
        titulo: row.titulo || undefined,
        capitulo: row.capitulo || undefined,
        ordem: typeof row.ordem_numero === 'number' ? row.ordem_numero : undefined,
      }))
      .filter((a: ArtigoLei) => a.caput.trim() !== '');
  } catch (e) {
    console.error('fetchArtigosInstant legacy fallback error', e);
    return [];
  }
}


export async function fetchArtigosPaginado(tabelaNome: string, offset: number, limit: number): Promise<ArtigoLei[]> {
  // 0) Bundle nativo — se existir manifest e essa lei tiver JSON embutido, usa direto.
  //    Isso vale para todos os offsets em builds Android (o arquivo é servido do APK).
  try {
    const { loadManifest, loadBundledLei, getBundleSlugForTabela } = await import('@/services/lawsBundle');
    const manifest = await loadManifest();
    if (manifest) {
      const slug = getBundleSlugForTabela(tabelaNome);
      if (slug) {
        const bundled = await loadBundledLei(slug);
        if (bundled && bundled.length > 0) {
          if (offset === 0) {
            artigosCache.set(tabelaNome, bundled);
            setPersistedArtigosCache(tabelaNome, bundled);
          }
          return bundled.slice(offset, offset + limit);
        }
      }
    }
  } catch (e) { /* segue pro fetch remoto */ }

  // Tenta primeiro na base unificada
  try {
    const ref = await resolveLeiRef(tabelaNome);
    if (ref) {
      // Paginação em blocos de 1000 (limite do PostgREST)
      const pageSize = 1000;
      const all: ArtigoLei[] = [];
      let cursor = offset;
      const target = Math.min(limit, 10000);
      while (all.length < target) {
        const remaining = target - all.length;
        const take = Math.min(pageSize, remaining);
        const rows = await fetchFromVadeMecum(ref.id, cursor, take);
        all.push(...rows);
        if (rows.length < take) break;
        cursor += take;
      }
      if (all.length > 0 && offset === 0) {
        artigosCache.set(tabelaNome, all);
        setPersistedArtigosCache(tabelaNome, all);
      }
      if (all.length > 0) return all;
    }
  } catch (e) { console.error('vm paginado', e); }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/${encodeURIComponent(tabelaNome)}?select=id,numero,rotulo,texto,ordem_numero,titulo,capitulo&order=ordem_numero.asc&offset=${offset}&limit=${limit}`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!res.ok) {
      console.error(`Erro ao buscar de ${tabelaNome}:`, res.status);
      return [];
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('json')) {
      console.error(`Erro ao buscar de ${tabelaNome}: resposta não-JSON (${ct})`);
      return [];
    }
    const data = await res.json();

    const artigos = (data || [])
      .map((row: any) => ({
        id: row.id,
        numero: normalizeArtigoLabel(row.rotulo || row.numero),
        caput: cleanArticleText(row.texto || row.caput),
        titulo: row.titulo || undefined,
        capitulo: row.capitulo || undefined,
        ordem: typeof row.ordem_numero === 'number' ? row.ordem_numero : undefined,
      }))
      .filter((a: ArtigoLei) => a.caput.trim() !== '');

    if (offset === 0) {
      artigosCache.set(tabelaNome, artigos);
      setPersistedArtigosCache(tabelaNome, artigos);
    }

    return artigos;
  } catch (e) {
    console.error(`fetchArtigosPaginado (${tabelaNome}) error`, e);
    return [];
  }
}


export function setCachedArtigos(tabelaNome: string, artigos: ArtigoLei[]) {
  artigosCache.set(tabelaNome, artigos);
  setPersistedArtigosCache(tabelaNome, artigos);
}

export function hasCachedArtigos(tabelaNome: string): boolean {
  const c = artigosCache.get(tabelaNome);
  return !!c && c.length > 0;
}

/**
 * Stale-while-revalidate loader.
 * Returns persisted (IndexedDB) artigos instantly if available, and
 * kicks a background revalidation. Falls back to null if nothing is stored.
 */
export async function loadPersistedArtigos(tabelaNome: string): Promise<ArtigoLei[] | null> {
  // Memory hit first — synchronous fast path
  const mem = artigosCache.get(tabelaNome);
  if (mem && mem.length > 0) {
    return mem.map((a) => ({ ...a, numero: normalizeArtigoLabel(a.numero) }));
  }
  try {
    const persisted = await getPersistedArtigosCache(tabelaNome);
    if (persisted && persisted.length > 0) {
      // Warm memory cache
      artigosCache.set(tabelaNome, persisted as ArtigoLei[]);
      return (persisted as ArtigoLei[]).map((a) => ({ ...a, numero: normalizeArtigoLabel(a.numero) }));
    }
  } catch { /* ignore */ }
  return null;
}

// Prefetch all artigos from LEIS_CATALOG with controlled concurrency
let prefetchPromise: Promise<void> | null = null;

// Priority tables to prefetch first (most used laws)
const PRIORITY_TABLES = new Set([
  'CF88_CONSTITUICAO_FEDERAL', 'CP_CODIGO_PENAL', 'CC_CODIGO_CIVIL',
  'CPC_CODIGO_PROCESSO_CIVIL', 'CPP_CODIGO_PROCESSO_PENAL',
  'CLT_CONSOLIDACAO_LEIS_TRABALHO', 'CDC_CODIGO_DEFESA_CONSUMIDOR',
  'CTN_CODIGO_TRIBUTARIO_NACIONAL', 'ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
  'CTB_CODIGO_TRANSITO_BRASILEIRO',
]);

// Boot: apenas hidrata em memória o cache já persistido em IndexedDB para as leis
// prioritárias — SEM fazer requisições à rede. O prefetch remoto de "todas as leis"
// era o principal ofensor de egress (217k chamadas a vade_mecum_artigos por ciclo).
// Agora só buscamos remotamente quando o usuário abre a lei de fato.
if (typeof window !== 'undefined') {
  const kick = () => {
    // Indexa a ponte legacy→VM só quando algo pedir (lazy)
    // e hidrata cache local sem tráfego de rede.
    (async () => {
      for (const tabela of PRIORITY_TABLES) {
        if (artigosCache.has(tabela)) continue;
        try {
          const persisted = await getPersistedArtigosCache(tabela);
          if (persisted && persisted.length > 0) {
            artigosCache.set(tabela, persisted as ArtigoLei[]);
          }
        } catch { /* ignore */ }
      }
    })();
  };
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(kick, { timeout: 4000 });
  } else {
    setTimeout(kick, 2000);
  }
}


// Prefetch tables by type for contextual priority
export function prefetchByTipo(tipo: string, concurrency = 4): Promise<void> {
  const tabelas = LEIS_CATALOG.filter(l => l.tipo === tipo && !artigosCache.has(l.tabela_nome));
  if (!tabelas.length) return Promise.resolve();
  let i = 0;
  const worker = async () => {
    while (i < tabelas.length) {
      const lei = tabelas[i++];
      if (!lei || artigosCache.has(lei.tabela_nome)) continue;
      try { await fetchArtigosPaginado(lei.tabela_nome, 0, 2000); } catch {}
    }
  };
  return Promise.all(Array.from({ length: Math.min(concurrency, tabelas.length) }, () => worker())).then(() => {});
}

export function prefetchAllArtigos(concurrency = 4, priorityOnly = false): Promise<void> {
  if (priorityOnly && prefetchPromise) return prefetchPromise;
  if (!priorityOnly && _fullPrefetchPromise) return _fullPrefetchPromise;

  const promise = (async () => {
    // Carrega o índice legacy→VM 1× e filtra o catálogo:
    // só prefetcha leis que tenham mapeamento no vade_mecum_leis ou bundle nativo.
    // Isso elimina a rajada de 404s (LCI_*, LINE_*, LAI_*, ...) no boot.
    let vmIndex: Map<string, LeiRef> | null = null;
    try { vmIndex = await getLegacyToVMIndex(); } catch { /* segue com null */ }

    let bundleSlugs: ((t: string) => string | null) | null = null;
    try {
      const mod = await import('@/services/lawsBundle');
      const manifest = await mod.loadManifest();
      if (manifest) bundleSlugs = (t) => mod.getBundleSlugForTabela(t);
    } catch { /* opcional */ }

    const queue = LEIS_CATALOG.filter(lei => {
      if (artigosCache.has(lei.tabela_nome)) return false;
      if (priorityOnly && !PRIORITY_TABLES.has(lei.tabela_nome)) return false;
      if (!priorityOnly && PRIORITY_TABLES.has(lei.tabela_nome)) return false;
      // Existe no VM unificado ou no bundle nativo? Caso contrário, pula
      // (a tabela legacy correspondente não existe mais e só gera 404).
      const hasVM = vmIndex?.has(lei.tabela_nome) ?? false;
      const hasBundle = bundleSlugs?.(lei.tabela_nome) != null;
      return hasVM || hasBundle;
    });
    let i = 0;

    const worker = async () => {
      while (i < queue.length) {
        const lei = queue[i++];
        if (!lei || artigosCache.has(lei.tabela_nome)) continue;
        try {
          await fetchArtigosPaginado(lei.tabela_nome, 0, 2000);
        } catch (e) {
          // Silently skip tables that don't exist yet
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  })();

  if (priorityOnly) {
    prefetchPromise = promise;
  } else {
    _fullPrefetchPromise = promise;
  }

  return promise;
}

let _fullPrefetchPromise: Promise<void> | null = null;

export function getLeisCatalog() {
  return LEIS_CATALOG;
}

// Map dinâmico slug -> URL do portal (para leis estaduais/municipais que não estão no LEIS_CATALOG estático).
const DYNAMIC_PLANALTO_URLS = new Map<string, string>();

export function getPlanaltoUrl(tabelaNome: string): string | null {
  const din = DYNAMIC_PLANALTO_URLS.get(tabelaNome);
  if (din) return din;
  const lei = LEIS_CATALOG.find(l => l.tabela_nome === tabelaNome);
  return lei?.url_planalto || null;
}

export function buildPlanaltoArticleUrl(tabelaNome: string, artigoNumero: string): string | null {
  const baseUrl = getPlanaltoUrl(tabelaNome);
  if (!baseUrl) return null;
  // Portais estaduais/municipais não usam #artN — devolve só a URL base.
  if (!/planalto\.gov\.br/i.test(baseUrl)) return baseUrl;
  const match = artigoNumero.match(/Art\.\s*(\d+)[º°]?(?:-([A-Z]))?/i);
  if (!match) return baseUrl;
  const num = match[1];
  const suffix = match[2] ? match[2].toLowerCase() : '';
  return `${baseUrl}#art${num}${suffix}`;
}

