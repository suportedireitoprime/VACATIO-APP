import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2 = new S3Client({
  region: 'auto',
  endpoint: getEnv('R2_ENDPOINT') || getEnv('VITE_R2_ENDPOINT'),
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID') || getEnv('VITE_R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY') || getEnv('VITE_R2_SECRET_ACCESS_KEY'),
  },
});
const bucket = getEnv('VITE_R2_BUCKET_NAME');

async function downloadAndUploadTest() {
  const fileId = '1m-dDodDLOx0HKN3bJwF4cpqLXFabAZqp'; // Art. 0002.mp3 do CTN
  const key = 'narracoes/codigos/ctn/Art. 0002.mp3';

  console.log(`Baixando do Google Drive (${fileId})...`);
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const res = await fetch(downloadUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });

  if (!res.ok) {
    throw new Error(`Falha ao baixar do drive: status ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`Download concluído! Tamanho: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(1)} KB)`);

  console.log(`Enviando para o Cloudflare R2 em ${key}...`);
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: 'audio/mpeg'
  }));

  console.log(`✅ Sucesso! URL pública: https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/${key}`);
}

downloadAndUploadTest().catch(console.error);
