#!/usr/bin/env node
/**
 * Exporta todas as leis + artigos do Supabase para JSON bundlável.
 *
 * Saída:
 *   dist/laws-bundle/manifest.json  → [{ id, slug, nome, nome_curto, updated_at, count }]
 *   dist/laws-bundle/<slug>.json    → [{ id, numero, texto, ordem, epigrafe, updated_at, revogado }]
 *
 * Rodado no CI (post-build). Requer VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
 * Falha silenciosa se as env vars estiverem ausentes (não quebra o build web em dev).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const OUT_DIR = process.env.LAWS_BUNDLE_OUT || 'dist/laws-bundle';
const PAGE_SIZE = 1000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[export-laws] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY ausentes; pulando bundle.');
  process.exit(0);
}

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function fetchAllPages(pathAndQuery) {
  const rows = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${pathAndQuery}&offset=${offset}&limit=${PAGE_SIZE}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Supabase ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('[export-laws] baixando lista de leis…');
  const leis = await fetchAllPages('vade_mecum_leis?select=id,slug,nome,nome_curto');

  const manifest = [];
  for (const lei of leis) {
    if (!lei.slug) continue;
    process.stdout.write(`[export-laws] ${lei.slug}… `);
    try {
      const artigos = await fetchAllPages(
        `vade_mecum_artigos?lei_id=eq.${lei.id}&select=id,numero,texto,ordem,epigrafe,ult_alteracao_em,revogado&order=ordem.asc`
      );
      let maxUpdated = null;
      for (const a of artigos) {
        if (a.ult_alteracao_em && (!maxUpdated || a.ult_alteracao_em > maxUpdated)) {
          maxUpdated = a.ult_alteracao_em;
        }
      }
      await writeFile(join(OUT_DIR, `${lei.slug}.json`), JSON.stringify(artigos));
      manifest.push({
        id: lei.id,
        slug: lei.slug,
        nome: lei.nome,
        nome_curto: lei.nome_curto,
        updated_at: maxUpdated,
        count: artigos.length,
      });
      console.log(`${artigos.length} artigos`);
    } catch (e) {
      console.log(`ERRO: ${e.message}`);
    }
  }

  const bundleUpdatedAt = manifest.reduce(
    (max, l) => (l.updated_at && (!max || l.updated_at > max) ? l.updated_at : max),
    null
  );
  await writeFile(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ generated_at: new Date().toISOString(), bundle_updated_at: bundleUpdatedAt, leis: manifest }, null, 2)
  );
  console.log(`[export-laws] OK — ${manifest.length} leis, bundle_updated_at=${bundleUpdatedAt}`);
}

main().catch((e) => {
  console.error('[export-laws] FALHOU:', e);
  process.exit(1);
});
