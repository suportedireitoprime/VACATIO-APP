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

// Arquivo de progresso persistente
const progressPath = 'scripts/data/audioaulas_18_areas_upload_progress.json';
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
        signal: AbortSignal.timeout(90000),
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
  try {
    const copySource = encodeURI(`${bucketName}/${sourceKey}`).replace(/\?/g, '%3F');
    await r2.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: copySource,
        Key: destKey,
        ContentType: 'audio/mpeg',
      })
    );
  } catch (err) {
    // ignore copy error
  }
}

async function main() {
  const inventoryPath = 'scripts/data/audioaulas_18_areas_inventory.json';
  if (!fs.existsSync(inventoryPath)) {
    console.error('Arquivo de inventário não encontrado:', inventoryPath);
    process.exit(1);
  }

  const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf-8'));

  // Achata a lista completa de arquivos para processamento
  const queue = [];
  for (const areaItem of inventory) {
    for (const sub of areaItem.subpastas) {
      for (const arq of sub.arquivos) {
        queue.push({
          area: areaItem.area,
          areaSlug: areaItem.areaSlug,
          subpasta: sub.subpasta,
          subpastaId: sub.subpastaId,
          fileId: arq.id,
          fileName: arq.name,
        });
      }
    }
  }

  console.log(`================================================================`);
  console.log(`🚀 INICIANDO UPLOAD MASSIVO DE ÁUDIO-AULAS PARA O CLOUDFLARE R2`);
  console.log(`📁 Total de arquivos a processar: ${queue.length}`);
  console.log(`🪣 Bucket de destino: ${bucketName}`);
  console.log(`🌐 CDN Pública: ${publicUrl}`);
  console.log(`⚡ Concorrência: 5 downloads/uploads simultâneos`);
  console.log(`================================================================\n`);

  let completedCount = 0;
  let skippedCount = 0;
  let uploadedCount = 0;
  let totalBytesUploaded = 0;
  const startTime = Date.now();

  let queueIndex = 0;
  const CONCURRENCY = 6;

  async function worker(workerId) {
    while (queueIndex < queue.length) {
      const idx = queueIndex++;
      const item = queue[idx];
      const prefix = `[${String(idx + 1).padStart(4, ' ')}/${queue.length}]`;
      const primaryKey = `narracoes/${item.areaSlug}/${item.subpasta}/${item.fileName}`;
      const alternateKey = `narracoes/areas/${item.areaSlug}/${item.subpasta}/${item.fileName}`;

      // 1. Checa no arquivo de progresso
      if (progress[primaryKey] && progress[primaryKey].status === 'success') {
        completedCount++;
        skippedCount++;
        continue;
      }

      // 2. Checa se já existe no bucket R2
      const alreadyInR2 = await checkObjectExists(primaryKey);
      if (alreadyInR2) {
        progress[primaryKey] = {
          status: 'success',
          area: item.area,
          areaSlug: item.areaSlug,
          subpasta: item.subpasta,
          fileName: item.fileName,
          primaryKey,
          alternateKey,
          url: `${publicUrl}/${encodeURI(primaryKey)}`,
          updatedAt: new Date().toISOString(),
        };
        completedCount++;
        skippedCount++;
        if (completedCount % 10 === 0) saveProgress();
        continue;
      }

      // 3. Download do Drive e Upload para o R2
      try {
        const t0 = Date.now();
        const buffer = await downloadFromDrive(item.fileId);
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
        const dlSec = ((Date.now() - t0) / 1000).toFixed(1);

        const t1 = Date.now();
        await uploadToR2(primaryKey, buffer);
        const upSec = ((Date.now() - t1) / 1000).toFixed(1);

        // Copia para alternateKey em background
        void copyObjectR2(primaryKey, alternateKey);

        progress[primaryKey] = {
          status: 'success',
          area: item.area,
          areaSlug: item.areaSlug,
          subpasta: item.subpasta,
          fileName: item.fileName,
          fileId: item.fileId,
          sizeBytes: buffer.length,
          sizeMb: parseFloat(sizeMb),
          primaryKey,
          alternateKey,
          url: `${publicUrl}/${encodeURI(primaryKey)}`,
          updatedAt: new Date().toISOString(),
        };

        completedCount++;
        uploadedCount++;
        totalBytesUploaded += buffer.length;

        const totalMb = (totalBytesUploaded / (1024 * 1024)).toFixed(1);
        const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);

        console.log(
          `${prefix} ✅ [W${workerId}] ${item.area} -> ${item.fileName} (${sizeMb} MB baixado em ${dlSec}s, enviado em ${upSec}s) | Total: ${totalMb} MB (${elapsedMin} min)`
        );

        if (completedCount % 5 === 0) {
          saveProgress();
        }
      } catch (err) {
        console.error(`${prefix} ❌ Erro em "${item.fileName}":`, err.message);
        progress[primaryKey] = {
          status: 'error',
          error: err.message,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  const workers = [];
  for (let w = 1; w <= CONCURRENCY; w++) {
    workers.push(worker(w));
  }
  await Promise.all(workers);

  saveProgress();

  const totalMin = ((Date.now() - startTime) / 60000).toFixed(1);
  const totalMb = (totalBytesUploaded / (1024 * 1024)).toFixed(2);

  console.log(`\n================================================================`);
  console.log(`🎉 UPLOAD DE TODAS AS ÁUDIO-AULAS CONCLUÍDO!`);
  console.log(`✅ Processados: ${completedCount}/${queue.length}`);
  console.log(`📤 Enviados agora: ${uploadedCount} arquivos (${totalMb} MB)`);
  console.log(`⏭️ Já existentes / pulados: ${skippedCount} arquivos`);
  console.log(`⏱️ Tempo total de execução: ${totalMin} minutos`);
  console.log(`================================================================\n`);
}

main().catch(console.error);
