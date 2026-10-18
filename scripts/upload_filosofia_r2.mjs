import { S3Client, PutObjectCommand, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// 1. Carrega credenciais do .env
const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const endpoint = getEnv('R2_ENDPOINT') || getEnv('VITE_R2_ENDPOINT');
const accessKeyId = getEnv('R2_ACCESS_KEY_ID') || getEnv('VITE_R2_ACCESS_KEY_ID');
const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY') || getEnv('VITE_R2_SECRET_ACCESS_KEY');
const bucketName = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicUrl = getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

// 2. Carrega inventário do Drive
const rawCatalog = JSON.parse(
  fs.readFileSync('scripts/data/filosofia_do_direito_drive_files.json', 'utf-8')
);

// Achata lista de arquivos
const todosArquivos = [];
for (const pasta of rawCatalog) {
  for (const arq of pasta.arquivos) {
    todosArquivos.push({
      subpasta: pasta.subpasta,
      fileId: arq.id,
      name: arq.name,
    });
  }
}

console.log(`================================================================`);
console.log(`🚀 INICIANDO UPLOAD PARA CLOUDFLARE R2`);
console.log(`📁 Total de arquivos a processar: ${todosArquivos.length}`);
console.log(`🪣 Bucket de destino: ${bucketName}`);
console.log(`🌐 CDN Pública: ${publicUrl}`);
console.log(`================================================================\n`);

async function checkObjectExists(key) {
  try {
    const res = await r2.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return (res.ContentLength || 0) > 1024;
  } catch {
    return false;
  }
}

async function downloadFromDrive(fileId, retries = 5) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(60000),
      });

      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }

      if (res.status === 429) {
        const delay = attempt * 4000;
        console.warn(`⏳ [Rate limit 429] Aguardando ${delay / 1000}s para tentar novamente...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.warn(`⚠️ HTTP ${res.status} ao baixar arquivo ${fileId} (tentativa ${attempt}/${retries})`);
      }
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = attempt * 2000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`Falha definitiva ao baixar arquivo ${fileId} após ${retries} tentativas.`);
}

async function uploadToR2(key, buffer) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'audio/mpeg',
    })
  );
}

async function copyObjectR2(sourceKey, destKey) {
  await r2.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: destKey,
      ContentType: 'audio/mpeg',
    })
  );
}

// Arquivo de progresso persistente
const progressPath = 'scripts/data/filosofia_upload_progress.json';
let progress = {};
if (fs.existsSync(progressPath)) {
  try {
    progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
  } catch {
    progress = {};
  }
}

function saveProgress() {
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
}

async function processItem(item, idx, total) {
  const primaryKey = `narracoes/filosofia-do-direito/${item.subpasta}/${item.name}`;
  const alternateKey = `narracoes/areas/filosofia-do-direito/${item.subpasta}/${item.name}`;

  const prefix = `[${String(idx + 1).padStart(3, ' ')}/${total}]`;

  // Checa se já está completo no progresso e no R2
  if (progress[primaryKey] && progress[primaryKey].status === 'success') {
    const exists = await checkObjectExists(primaryKey);
    if (exists) {
      console.log(`${prefix} ⏭️ Já existente no R2: ${item.name}`);
      return;
    }
  }

  // Verifica no R2 antes de baixar
  const existsInR2 = await checkObjectExists(primaryKey);
  if (existsInR2) {
    console.log(`${prefix} ⏭️ Já presente no bucket R2: ${item.name}`);
    // Garante cópia na rota alternativa
    try {
      const altExists = await checkObjectExists(alternateKey);
      if (!altExists) {
        await copyObjectR2(primaryKey, alternateKey);
      }
    } catch {
      /* ignore copy error */
    }

    progress[primaryKey] = {
      status: 'success',
      primaryKey,
      alternateKey,
      url: `${publicUrl}/${primaryKey}`,
      updatedAt: new Date().toISOString(),
    };
    saveProgress();
    return;
  }

  console.log(`${prefix} 📥 Baixando do Drive: ${item.name}...`);
  const t0 = Date.now();
  const buffer = await downloadFromDrive(item.fileId);
  const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  const downloadSec = ((Date.now() - t0) / 1000).toFixed(1);

  console.log(`${prefix} 📤 Enviando para R2 (${sizeMb} MB baixados em ${downloadSec}s)...`);
  const t1 = Date.now();
  await uploadToR2(primaryKey, buffer);
  const uploadSec = ((Date.now() - t1) / 1000).toFixed(1);

  // Espelha também na pasta alternativa
  try {
    await copyObjectR2(primaryKey, alternateKey);
  } catch (copyErr) {
    console.warn(`   ⚠️ Aviso ao copiar para ${alternateKey}:`, copyErr.message);
  }

  console.log(
    `${prefix} ✅ Salvo com sucesso! (${sizeMb} MB em ${uploadSec}s) -> ${primaryKey}`
  );

  progress[primaryKey] = {
    status: 'success',
    fileId: item.fileId,
    name: item.name,
    subpasta: item.subpasta,
    sizeBytes: buffer.length,
    sizeMb: parseFloat(sizeMb),
    primaryKey,
    alternateKey,
    url: `${publicUrl}/${primaryKey}`,
    updatedAt: new Date().toISOString(),
  };
  saveProgress();
}

// Pool com concorrência controlada
async function runPool(items, concurrency = 3) {
  let index = 0;
  const total = items.length;

  async function worker(workerId) {
    while (index < total) {
      const curIdx = index++;
      const item = items[curIdx];
      try {
        await processItem(item, curIdx, total);
      } catch (err) {
        console.error(`❌ Erro no item ${curIdx + 1} (${item.name}):`, err.message);
        progress[`narracoes/filosofia-do-direito/${item.subpasta}/${item.name}`] = {
          status: 'error',
          error: err.message,
          updatedAt: new Date().toISOString(),
        };
        saveProgress();
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, id) => worker(id));
  await Promise.all(workers);
}

async function main() {
  const tStart = Date.now();
  await runPool(todosArquivos, 3);
  const totalMin = ((Date.now() - tStart) / 60000).toFixed(1);

  console.log(`\n================================================================`);
  console.log(`🎉 PROCESSAMENTO CONCLUÍDO EM ${totalMin} MINUTOS!`);
  console.log(`Total de arquivos processados: ${todosArquivos.length}`);
  console.log(`Status salvo em: ${progressPath}`);
  console.log(`================================================================\n`);
}

main().catch((err) => {
  console.error('Fatal error in main:', err);
  process.exit(1);
});
