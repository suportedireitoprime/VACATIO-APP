import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 1. Carrega credenciais do .env
const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2Endpoint = getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com';
const r2AccessKey = getEnv('R2_ACCESS_KEY_ID');
const r2SecretKey = getEnv('R2_SECRET_ACCESS_KEY');
const r2Bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicBaseUrl = getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

const r2 = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKey,
    secretAccessKey: r2SecretKey,
  },
});

// Diretório temporário e de assets
const TEMP_DIR = 'scripts/temp_capas';
const ASSETS_DIR = 'src/assets';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Carrega lista de arquivos extraídos do Google Drive
const filesRaw = JSON.parse(fs.readFileSync('scripts/drive_files_found.json', 'utf8'));
const uniqueFiles = new Map();
filesRaw.forEach(f => {
  if (!uniqueFiles.has(f.name)) uniqueFiles.set(f.name, f);
});

console.log(`🚀 Iniciando download, conversão WebP, compressão e upload de ${uniqueFiles.size} capas para o Cloudflare R2...`);

async function downloadWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Falha no download após ${maxRetries} tentativas: ${url}`);
}

async function run() {
  const summary = [];
  let totalOrigBytes = 0;
  let totalCompBytes = 0;

  let count = 0;
  for (const [name, fileInfo] of uniqueFiles) {
    count++;
    console.log(`\n[${count}/${uniqueFiles.size}] Processando: ${name} (ID: ${fileInfo.id})...`);
    
    // URL de download do Google Drive
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileInfo.id}&export=download`;
    const origBuffer = await downloadWithRetry(downloadUrl);
    totalOrigBytes += origBuffer.byteLength;

    // Processamento e compressão via Sharp
    // Dimensões ideais para covers de cabeçalho: largura máx 1600px mantendo aspect ratio
    const img = sharp(origBuffer);
    const meta = await img.metadata();

    let transform = img;
    if (meta.width && meta.width > 1600) {
      transform = transform.resize({ width: 1600, withoutEnlargement: true });
    }

    // Comprime para WebP otimizado (quality 82, effort 6 para máxima compressão sem perda perceptível)
    const compressedBuffer = await transform.webp({
      quality: 82,
      effort: 6,
      smartSubsample: true
    }).toBuffer();

    totalCompBytes += compressedBuffer.byteLength;
    const savings = ((1 - compressedBuffer.byteLength / origBuffer.byteLength) * 100).toFixed(1);
    console.log(`   📉 Original: ${(origBuffer.byteLength / 1024).toFixed(1)} KB ➔ Otimizado: ${(compressedBuffer.byteLength / 1024).toFixed(1)} KB (-${savings}%)`);

    // Salva em disco local no TEMP_DIR e em ASSETS_DIR
    const localTempPath = path.join(TEMP_DIR, name);
    fs.writeFileSync(localTempPath, compressedBuffer);

    const localAssetPath = path.join(ASSETS_DIR, name);
    fs.writeFileSync(localAssetPath, compressedBuffer);

    // Upload para Cloudflare R2
    // Subir em 'capas/leis/' e também 'capas/'
    const r2Key1 = `capas/leis/${name}`;
    const r2Key2 = `capas/${name}`;

    await r2.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2Key1,
      Body: compressedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    await r2.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2Key2,
      Body: compressedBuffer,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));

    const publicUrl = `${publicBaseUrl}/${r2Key1}`;
    console.log(`   ☁️ R2 Upload OK: ${publicUrl}`);

    summary.push({
      name,
      id: fileInfo.id,
      origSize: origBuffer.byteLength,
      compSize: compressedBuffer.byteLength,
      savings: `${savings}%`,
      publicUrl
    });
  }

  const overallSavings = ((1 - totalCompBytes / totalOrigBytes) * 100).toFixed(1);
  console.log(`\n======================================================`);
  console.log(`🎉 CONCLUÍDO COM SUCESSO!`);
  console.log(`Total de arquivos: ${uniqueFiles.size}`);
  console.log(`Tamanho original total: ${(totalOrigBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Tamanho comprimido total: ${(totalCompBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Economia total de banda: ${overallSavings}%`);
  console.log(`======================================================\n`);

  fs.writeFileSync('scripts/capas_upload_summary.json', JSON.stringify(summary, null, 2), 'utf8');
}

run().catch(err => {
  console.error('❌ Erro durante o processo:', err);
  process.exit(1);
});
