/**
 * Serviço de download do "pack Aprender" para uso offline (Capacitor / web).
 *
 * Baixa e persiste no IndexedDB (via offlineDb):
 *   - areas, modulos, aulas publicadas
 *   - blocos (teoria / flashcards / questões) de cada aula
 *   - assets (mascotes e ilustrações usadas no hero)
 *
 * Reporta progresso via callback + reaproveita a tabela offlineCategories.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  db,
  setAprenderCache,
  putAprenderAsset,
  type OfflineCategoryEntry,
} from '@/services/offlineDb';

export type ProgressCallback = (progress: number, label?: string) => void;

const APRENDER_CATEGORY_ID = 'aprender-pack';

/** Assets fixos do Aprender que queremos disponíveis offline. */
async function collectAprenderAssetUrls(): Promise<string[]> {
  const urls = new Set<string>();
  try {
    // Mascotes de proficiência
    const mascotes = await import('@/lib/aprenderMascotes');
    Object.values(mascotes).forEach((v: any) => {
      if (typeof v === 'string' && v.startsWith('http')) urls.add(v);
      if (v && typeof v === 'object' && typeof v.url === 'string') urls.add(v.url);
    });
  } catch { /* opcional */ }

  // Hero illustrations
  try {
    const heros = await Promise.all([
      import('@/assets/aprender-hero/hero-1.png.asset.json'),
      import('@/assets/aprender-hero/hero-2.png.asset.json'),
      import('@/assets/aprender-hero/hero-3.png.asset.json'),
      import('@/assets/aprender-hero/hero-4.png.asset.json'),
      import('@/assets/aprender-hero/hero-5.png.asset.json'),
      import('@/assets/aprender-hero/hero-6.png.asset.json'),
    ]);
    heros.forEach((h: any) => { if (h?.default?.url) urls.add(h.default.url); });
  } catch { /* opcional */ }

  return [...urls];
}

async function downloadAsset(url: string): Promise<number> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return 0;
    const blob = await res.blob();
    await putAprenderAsset(url, blob, blob.type || 'application/octet-stream');
    return blob.size;
  } catch {
    return 0;
  }
}

/** Baixa o pack completo do Aprender e persiste. */
export async function downloadAprenderPack(
  onProgress?: ProgressCallback,
): Promise<OfflineCategoryEntry> {
  const started = Date.now();
  const uid = (await supabase.auth.getSession()).data.session?.user?.id ?? null;

  await db.offlineCategories.put({
    id: APRENDER_CATEGORY_ID,
    status: 'downloading',
    progress: 0,
    downloadedAt: 0,
    sizeBytes: 0,
    tabelasCount: 0,
  });

  const report = (p: number, label?: string) => {
    onProgress?.(p, label);
    db.offlineCategories.update(APRENDER_CATEGORY_ID, { progress: Math.round(p) }).catch(() => {});
  };

  try {
    // 1) Áreas + módulos + aulas
    report(2, 'Áreas');
    const { data: areas } = await supabase
      .from('aprender_areas')
      .select('id, slug, nome, descricao, cor, ordem')
      .order('ordem');
    const areasList = areas ?? [];

    report(8, 'Módulos');
    const { data: modulos } = await supabase
      .from('aprender_modulos')
      .select('id, area_id, titulo, ordem, resumo')
      .order('ordem');
    const modulosList = modulos ?? [];

    report(16, 'Aulas');
    const { data: aulas } = await supabase
      .from('aprender_aulas')
      .select('id, modulo_id, titulo, objetivo, duracao_est_min, ordem, status')
      .eq('status', 'published')
      .order('ordem');
    const aulasList = (aulas ?? []) as any[];

    // 2) Blocos por aula (paginado por grupo de aulas)
    report(24, 'Conteúdo das aulas');
    const aulaIds = aulasList.map((a: any) => a.id);
    const blocosPorAula = new Map<string, any[]>();
    const CHUNK = 40;
    let done = 0;
    for (let i = 0; i < aulaIds.length; i += CHUNK) {
      const batch = aulaIds.slice(i, i + CHUNK);
      const { data: blocos } = await supabase
        .from('aprender_blocos')
        .select('id, aula_id, ordem, tipo, payload, resposta_correta')
        .in('aula_id', batch)
        .order('ordem');
      (blocos ?? []).forEach((b: any) => {
        const arr = blocosPorAula.get(b.aula_id) ?? [];
        arr.push(b);
        blocosPorAula.set(b.aula_id, arr);
      });
      done += batch.length;
      const pct = 24 + (done / Math.max(1, aulaIds.length)) * 40; // 24 → 64
      report(pct, `Aulas ${done}/${aulaIds.length}`);
    }

    // 3) Persistir áreas e aulas no IndexedDB (via aprenderCache)
    report(66, 'Salvando local');
    const modulosByArea = new Map<string, any[]>();
    modulosList.forEach((m: any) => {
      const arr = modulosByArea.get(m.area_id) ?? [];
      arr.push(m);
      modulosByArea.set(m.area_id, arr);
    });

    for (const area of areasList) {
      const mods = modulosByArea.get(area.id) ?? [];
      const modIds = new Set(mods.map((m) => m.id));
      const areaAulas = aulasList.filter((a) => modIds.has(a.modulo_id));
      const snapshot = {
        area: { id: area.id, nome: area.nome, descricao: area.descricao, cor: area.cor },
        modulos: mods.map((m) => ({ id: m.id, titulo: m.titulo, ordem: m.ordem, resumo: m.resumo })),
        aulas: areaAulas,
        aulasPreparo: {},
        progresso: {},
      };
      await setAprenderCache(`area:${area.slug}:${uid ?? 'anon'}`, 'area', snapshot);
    }

    // Persistir cada aula com blocos
    let saved = 0;
    for (const aula of aulasList) {
      const bundle = { aula, blocos: blocosPorAula.get(aula.id) ?? [] };
      await setAprenderCache(`aula:${aula.id}`, 'aula', bundle);
      saved++;
      if (saved % 20 === 0) {
        const pct = 66 + (saved / Math.max(1, aulasList.length)) * 18; // 66 → 84
        report(pct, `Aulas salvas ${saved}/${aulasList.length}`);
      }
    }

    // 4) Assets (mascotes + hero)
    report(86, 'Ilustrações');
    const urls = await collectAprenderAssetUrls();
    let totalBytes = 0;
    for (let i = 0; i < urls.length; i++) {
      totalBytes += await downloadAsset(urls[i]);
      const pct = 86 + ((i + 1) / Math.max(1, urls.length)) * 12; // 86 → 98
      report(pct, `Imagens ${i + 1}/${urls.length}`);
    }

    // 5) Snapshot home
    const aulaIdsByArea: Record<string, string[]> = {};
    aulasList.forEach((a: any) => {
      const mod = modulosList.find((m: any) => m.id === a.modulo_id);
      if (!mod) return;
      (aulaIdsByArea[mod.area_id] ??= []).push(a.id);
    });
    const homeSnap = {
      areas: areasList.map((a) => ({ id: a.id, slug: a.slug, nome: a.nome, cor: a.cor })),
      aulaIdsByArea,
      proximaAulaId: aulasList[0]?.id ?? null,
      updatedAt: Date.now(),
    };
    await setAprenderCache(`home:${uid ?? 'anon'}`, 'home', homeSnap);

    report(100, 'Concluído');
    const entry: OfflineCategoryEntry = {
      id: APRENDER_CATEGORY_ID,
      status: 'downloaded',
      progress: 100,
      downloadedAt: Date.now(),
      sizeBytes: totalBytes,
      tabelasCount: aulasList.length,
    };
    await db.offlineCategories.put(entry);
     
    console.info('[aprenderOffline] pack pronto em', Date.now() - started, 'ms');
    return entry;
  } catch (err: any) {
    await db.offlineCategories.put({
      id: APRENDER_CATEGORY_ID,
      status: 'error',
      progress: 0,
      downloadedAt: Date.now(),
      sizeBytes: 0,
      tabelasCount: 0,
      error: err?.message ?? 'erro desconhecido',
    });
    throw err;
  }
}

export async function isAprenderPackDownloaded(): Promise<boolean> {
  const entry = await db.offlineCategories.get(APRENDER_CATEGORY_ID);
  return entry?.status === 'downloaded';
}

export async function clearAprenderPack(): Promise<void> {
  await db.aprenderCache.clear();
  await db.aprenderAssets.clear();
  await db.offlineCategories.delete(APRENDER_CATEGORY_ID);
}

export { APRENDER_CATEGORY_ID };
