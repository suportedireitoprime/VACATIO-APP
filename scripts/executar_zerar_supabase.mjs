import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function listAllInFolder(bucket, folder) {
  let allFiles = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !data || data.length === 0) break;
    allFiles.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return allFiles;
}

async function zerarStorage() {
  console.log('--- 1. ZERANDO SUPABASE STORAGE (BUCKET: narracoes) ---');
  
  // Listar todas as pastas dentro de vademecum
  const { data: subdirs } = await supabase.storage.from('narracoes').list('vademecum');
  let totalDeletados = 0;

  for (const item of (subdirs || [])) {
    const folderPath = `vademecum/${item.name}`;
    const files = await listAllInFolder('narracoes', folderPath);
    console.log(`Pasta "${folderPath}": ${files.length} arquivos para deletar.`);

    // Deletar em lotes de 100
    const pathsToDelete = files.map(f => `${folderPath}/${f.name}`);
    for (let i = 0; i < pathsToDelete.length; i += 100) {
      const chunk = pathsToDelete.slice(i, i + 100);
      const { data, error } = await supabase.storage.from('narracoes').remove(chunk);
      if (error) {
        console.error(`Erro ao deletar lote em ${folderPath}:`, error.message);
      } else {
        totalDeletados += (data?.length || chunk.length);
        console.log(`  Deletados ${Math.min(i + 100, pathsToDelete.length)}/${pathsToDelete.length}...`);
      }
    }
  }

  // Deletar test.txt da raiz se existir
  await supabase.storage.from('narracoes').remove(['test.txt']);

  console.log(`\nTOTAL DE ARQUIVOS DELETADOS DO STORAGE SUPABASE: ${totalDeletados}`);
}

async function zerarBancoArtigos() {
  console.log('\n--- 2. ZERANDO NARRACAO_URL EM VADE_MECUM_ARTIGOS ---');
  
  // Busca todos os artigos que possuem narracao_url não nula
  const { data: artigosComUrl, error: aErr } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, lei_id')
    .not('narracao_url', 'is', null)
    .neq('narracao_url', '');

  if (aErr) {
    console.error('Erro ao buscar artigos com narracao_url:', aErr.message);
    return;
  }

  console.log(`Artigos com narracao_url encontrados para limpar: ${artigosComUrl?.length || 0}`);

  if (artigosComUrl && artigosComUrl.length > 0) {
    const ids = artigosComUrl.map(a => a.id);
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const { error: uErr } = await supabase
        .from('vade_mecum_artigos')
        .update({ narracao_url: null })
        .in('id', chunk);

      if (uErr) {
        console.error(`Erro ao limpar lote ${i}:`, uErr.message);
      } else {
        console.log(`  Limpos ${Math.min(i + 50, ids.length)}/${ids.length} artigos...`);
      }
    }
  }

  console.log('Banco de artigos limpo com sucesso! Nenhuma narracao_url pendente.');
}

async function conferirTudoZerado() {
  console.log('\n--- 3. CONFERÊNCIA FINAL (STORAGE E BANCO) ---');
  
  // Storage
  const { data: checkStorage } = await supabase.storage.from('narracoes').list('vademecum');
  let restantesStorage = 0;
  for (const item of (checkStorage || [])) {
    const files = await listAllInFolder('narracoes', `vademecum/${item.name}`);
    restantesStorage += files.length;
  }
  console.log(`Arquivos restantes no Supabase Storage: ${restantesStorage}`);

  // Banco
  const { count: restantesBanco } = await supabase
    .from('vade_mecum_artigos')
    .select('id', { count: 'exact', head: true })
    .not('narracao_url', 'is', null)
    .neq('narracao_url', '');
  console.log(`Artigos com narracao_url no Banco Supabase: ${restantesBanco || 0}`);
}

async function run() {
  await zerarStorage();
  await zerarBancoArtigos();
  await conferirTudoZerado();
}

run();
