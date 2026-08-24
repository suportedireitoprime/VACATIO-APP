#!/usr/bin/env node
/**
 * Prebuild helper:
 *   1. Copia os workflows do GitHub Actions (.github/workflows/*.yml) para
 *      src/generated/workflows/ e public/workflows/. A cópia pública evita que
 *      o build da Vercel dependa de imports `?raw` apontando para `.github/`,
 *      que fica fora do grafo seguro do Vite/Rollup em builds remotos.
 *   2. Copia o binário sql-wasm.wasm do pacote `sql.js` para public/assets/
 *      onde o web component `jeep-sqlite` procura por padrão. Sem isso, o
 *      SPA fallback devolve index.html no lugar do .wasm e o navegador
 *      lança "expected magic word 00 61 73 6d, found 3c 21 64 6f".
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

async function copyIfExists(from, to, label) {
  try {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
    console.log(`[prebuild] ${label}: ${path.relative(root, from)} -> ${path.relative(root, to)}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[prebuild] ${label}: origem não encontrada (${from}); ignorado`);
    } else {
      throw err;
    }
  }
}

async function copyWorkflows() {
  const files = ['build-android.yml', 'build-ios.yml'];
  for (const f of files) {
    const source = path.join(root, '.github/workflows', f);
    await copyIfExists(source, path.join(root, 'src/generated/workflows', f), 'workflow-src');
    await copyIfExists(source, path.join(root, 'public/workflows', f), 'workflow-public');
  }
  // Placeholders para o caso de o build rodar sem .github (workspace enxuto).
  for (const dir of [path.join(root, 'src/generated/workflows'), path.join(root, 'public/workflows')]) {
    await fs.mkdir(dir, { recursive: true });
    for (const f of files) {
      const p = path.join(dir, f);
      try {
        await fs.access(p);
      } catch {
        await fs.writeFile(p, `# ${f} indisponível neste build.\n`, 'utf8');
        console.warn(`[prebuild] workflow: placeholder criado em ${path.relative(root, p)}`);
      }
    }
  }
}

async function copySqlWasm() {
  let sqlJsPath = '';
  
  // Tentar encontrar o sql.js no pnpm (.pnpm/sql.js@.../node_modules/sql.js)
  try {
    const pnpmPath = path.join(root, 'node_modules/.pnpm');
    const dirs = await fs.readdir(pnpmPath);
    const sqlJsDir = dirs.find(d => d.startsWith('sql.js@'));
    if (sqlJsDir) {
      sqlJsPath = path.join(pnpmPath, sqlJsDir, 'node_modules/sql.js');
    }
  } catch(e) {}
  
  // Fallback para require.resolve (npm/yarn)
  if (!sqlJsPath) {
    try {
      sqlJsPath = path.dirname(require.resolve('sql.js/package.json'));
    } catch(e) {
      sqlJsPath = path.join(root, 'node_modules/sql.js');
    }
  }

  await copyIfExists(
    path.join(sqlJsPath, 'dist/sql-wasm.wasm'),
    path.join(root, 'public/assets/sql-wasm.wasm'),
    'sql-wasm',
  );
  // jeep-sqlite também procura o loader em /assets/sql-wasm.js em algumas
  // versões — copia se existir, ignora silenciosamente caso não exista.
  await copyIfExists(
    path.join(sqlJsPath, 'dist/sql-wasm.js'),
    path.join(root, 'public/assets/sql-wasm.js'),
    'sql-wasm-loader',
  );
}

await copyWorkflows();
await copySqlWasm();
