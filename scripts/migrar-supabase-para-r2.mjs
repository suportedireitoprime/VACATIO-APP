import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. Ler variáveis do .env
const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2Endpoint = getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com';
const r2AccessKey = getEnv('R2_ACCESS_KEY_ID');
const r2SecretKey = getEnv('R2_SECRET_ACCESS_KEY');
const r2Bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const r2PublicUrl = (getEnv('VITE_R2_PUBLIC_URL') || '').replace(/\/+$/, '');

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!r2AccessKey || !r2SecretKey) {
  console.error('❌ Chaves do Cloudflare R2 não encontradas no .env');
  process.exit(1);
}

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

const supabase = createClient(supabaseUrl, supabaseKey);

// Mapeamento de tipos MIME
function getMimeType(filename) {
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.wav')) return 'audio/wav';
  if (filename.endsWith('.m4a') || filename.endsWith('.aac')) return 'audio/mp4';
  if (filename.endsWith('.webp')) return 'image/webp';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.pdf')) return 'application/pdf';
  if (filename.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

// Verifica se arquivo já existe no R2 para evitar re-upload
async function existsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Lista recursivamente todos os arquivos em um bucket do Supabase
async function listarArquivosSupabase(bucket, pasta = '') {
  const lista = [];
  try {
    const { data, error } = await supabase.storage.from(bucket).list(pasta, { limit: 1000 });
    if (error || !data) return lista;

    for (const item of data) {
      if (item.id === null) {
        // É uma subpasta
        const subCaminho = pasta ? `${pasta}/${item.name}` : item.name;
        const subItens = await listarArquivosSupabase(bucket, subCaminho);
        lista.push(...subItens);
      } else if (item.name && item.name !== '.emptyFolderPlaceholder') {
        const itemCaminho = pasta ? `${pasta}/${item.name}` : item.name;
        lista.push({
          caminho: itemCaminho,
          tamanho: item.metadata?.size || 0,
        });
      }
    }
  } catch (err) {
    console.warn(`Erro ao listar ${bucket}/${pasta}:`, err.message);
  }
  return lista;
}

// Migra um arquivo individual
async function migrarArquivo(bucket, arquivo) {
  const r2Key = `${bucket}/${arquivo.caminho}`;

  // Se já existir no R2, pula
  const jaExiste = await existsInR2(r2Key);
  if (jaExiste) {
    return { status: 'skipped', r2Key };
  }

  // Baixa do Supabase
  const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(arquivo.caminho);
  if (dlErr || !blob) {
    throw new Error(`Falha no download de ${bucket}/${arquivo.caminho}: ${dlErr?.message}`);
  }

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = getMimeType(arquivo.caminho);

  // Envia para o Cloudflare R2
  await r2.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return { status: 'uploaded', r2Key, size: buffer.length };
}

// Execução com concorrência controlada
async function executarComConcorrencia(itens, limite, fn) {
  const resultados = [];
  const emAndamento = new Set();

  for (const item of itens) {
    const p = fn(item).then((res) => {
      emAndamento.delete(p);
      return res;
    });
    resultados.push(p);
    emAndamento.add(p);
    if (emAndamento.size >= limite) {
      await Promise.race(emAndamento);
    }
  }
  return Promise.all(resultados);
}

async function iniciarMigracao() {
  console.log('====================================================');
  console.log('🚀 INICIANDO MIGRAÇÃO SUPABASE ➔ CLOUDFLARE R2');
  console.log(`Bucket de Destino no R2: ${r2Bucket}`);
  console.log(`URL Pública da CDN: ${r2PublicUrl}`);
  console.log('====================================================\n');

  // Buckets a migrar
  const BUCKETS = ['narracoes', 'narracao-artigos', 'aulas-audio', 'custom_pdfs', 'push-covers'];

  let totalGeral = 0;
  let enviadosGeral = 0;
  let ignoradosGeral = 0;
  let errosGeral = 0;

  for (const bucket of BUCKETS) {
    console.log(`\n📦 Verificando bucket: "${bucket}"...`);
    const arquivos = await listarArquivosSupabase(bucket);
    console.log(`   Encontrados ${arquivos.length} arquivo(s) em "${bucket}".`);

    if (arquivos.length === 0) continue;

    totalGeral += arquivos.length;
    let contador = 0;

    await executarComConcorrencia(arquivos, 5, async (arq) => {
      contador++;
      const prefix = `[${contador}/${arquivos.length}]`;
      try {
        const res = await migrarArquivo(bucket, arq);
        if (res.status === 'skipped') {
          ignoradosGeral++;
          console.log(`   ${prefix} ⏩ Já existe no R2: ${res.r2Key}`);
        } else {
          enviadosGeral++;
          const kb = (res.size / 1024).toFixed(1);
          console.log(`   ${prefix} ✅ Migrado (${kb} KB): ${res.r2Key}`);
        }
      } catch (err) {
        errosGeral++;
        console.error(`   ${prefix} ❌ Erro em ${arq.caminho}:`, err.message);
      }
    });
  }

  console.log('\n====================================================');
  console.log('🎉 MIGRAÇÃO CONCLUÍDA!');
  console.log(`Total de arquivos mapeados: ${totalGeral}`);
  console.log(`Novos uploads para o R2:    ${enviadosGeral}`);
  console.log(`Já existiam no R2 (pulados): ${ignoradosGeral}`);
  console.log(`Erros:                       ${errosGeral}`);
  console.log('====================================================');
}

iniciarMigracao().catch(console.error);
