#!/usr/bin/env node
/**
 * Exporta todo o conteúdo de leitura para public/offline-bundle/*.json.
 * Consumido pelo build Electron / apps mobile pra funcionar 100% offline.
 *
 * Requer env:
 *   SUPABASE_URL (ou VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY (preferencial) OU SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Carrega .env local se existir (dev)
try {
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {}

const URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!URL || !KEY) {
  console.error('[offline-bundle] SUPABASE_URL / KEY ausentes — pulando export.');
  process.exit(0);
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });
const OUT = path.resolve('public/offline-bundle');
await mkdir(OUT, { recursive: true });

async function fetchAll(table, select, orderCol = null) {
  const step = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + step - 1);
    if (orderCol) q = q.order(orderCol, { ascending: true });
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return rows;
}

async function dump(name, rows) {
  const file = path.join(OUT, `${name}.json`);
  await writeFile(file, JSON.stringify(rows));
  const kb = Math.round(JSON.stringify(rows).length / 1024);
  console.log(`[offline-bundle] ${name}: ${rows.length} rows (${kb} KB)`);
}

const TARGETS = [
  {
    name: 'resumos',
    fn: () =>
      fetchAll(
        'resumos_juridicos',
        'id, area, tema, subtema, ordem_tema, ordem_subtema, markdown, exemplos, termos',
      ),
  },
  {
    name: 'blog-posts',
    fn: async () => {
      const { data } = await supabase
        .from('blog_edicao_posts')
        .select(
          'id, titulo, resumo, conteudo_md, imagem_url, categoria, autor, tempo_leitura_min, data_publicacao, created_at',
        )
        .eq('publicado', true)
        .order('data_publicacao', { ascending: false })
        .limit(200);
      return data ?? [];
    },
  },
  {
    name: 'noticias',
    fn: async () => {
      const { data } = await supabase
        .from('noticias_juridicas')
        .select('*')
        .order('data_publicacao', { ascending: false })
        .limit(200);
      return data ?? [];
    },
  },
  {
    name: 'tematica-obras',
    fn: async () => {
      const { data } = await supabase
        .from('tematica_juridica_obras')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      return data ?? [];
    },
  },
  { name: 'biblioteca-classicos', fn: () => fetchAll('biblioteca_classicos', '*') },
  { name: 'biblioteca-oab', fn: () => fetchAll('biblioteca_oab', '*') },
  { name: 'biblioteca-estudos', fn: () => fetchAll('biblioteca_estudos', '*') },
  { name: 'biblioteca-portugues', fn: () => fetchAll('biblioteca_portugues', '*') },
  { name: 'biblioteca-lideranca', fn: () => fetchAll('biblioteca_lideranca', '*') },
  { name: 'biblioteca-fora-da-toga', fn: () => fetchAll('biblioteca_fora_da_toga', '*') },
  {
    name: 'biblioteca-pesquisa-cientifica',
    fn: () => fetchAll('biblioteca_pesquisa_cientifica', '*'),
  },
];

const manifest = { generated_at: new Date().toISOString(), files: {} };

for (const t of TARGETS) {
  try {
    const rows = await t.fn();
    await dump(t.name, rows);
    manifest.files[t.name] = { count: rows.length, path: `/offline-bundle/${t.name}.json` };
  } catch (e) {
    console.warn(`[offline-bundle] falha ${t.name}: ${e.message}`);
    manifest.files[t.name] = { count: 0, error: e.message };
  }
}

await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[offline-bundle] concluído: ${Object.keys(manifest.files).length} arquivos`);
