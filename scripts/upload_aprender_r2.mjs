import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="?([^"\\r\\n]+)"?`));
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
const bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicCdn = (getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev').replace(/\/+$/, '');

async function checkFolder(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const re = /<div class="flip-entry" id="entry-([^"]+)"([\s\S]*?)<div class="flip-entry-title">([^<]+)<\/div>/g;
  let m;
  const items = [];
  while ((m = re.exec(html)) !== null) {
    const isFolder = m[2].includes('/drive/folders/');
    items.push({ id: m[1], title: m[3].trim(), isFolder });
  }
  return items;
}

async function downloadFromDrive(fileId) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function uploadToR2(key, buffer, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${publicCdn}/${key}`;
}

async function checkObjectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadAulaAssets(audioFolderId, imgFolderId, targetBasePath) {
  console.log(`\n--- Sincronizando Mídias de Aprender para R2: ${targetBasePath} ---`);

  // 1. Áudios
  if (audioFolderId) {
    const audios = await checkFolder(audioFolderId);
    console.log(`Encontrados ${audios.length} arquivos de áudio.`);
    for (let i = 0; i < audios.length; i++) {
      const a = audios[i];
      const key = `${targetBasePath}/audio/${a.title}`;
      if (await checkObjectExists(key)) {
        process.stdout.write(`\r   [Áudio] ${i + 1}/${audios.length} (Já no R2: ${a.title})`);
      } else {
        const buf = await downloadFromDrive(a.id);
        await uploadToR2(key, buf, 'audio/mpeg');
        process.stdout.write(`\r   [Áudio] ${i + 1}/${audios.length} (Enviado: ${a.title})`);
      }
    }
    console.log('\n   ✔ Áudios sincronizados.');
  }

  // 2. Imagens
  if (imgFolderId) {
    const imgs = await checkFolder(imgFolderId);
    console.log(`Encontrados ${imgs.length} arquivos de imagem.`);
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const key = `${targetBasePath}/imagens/${img.title}`;
      const ext = img.title.split('.').pop().toLowerCase();
      const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
      if (await checkObjectExists(key)) {
        process.stdout.write(`\r   [Imagem] ${i + 1}/${imgs.length} (Já no R2: ${img.title})`);
      } else {
        const buf = await downloadFromDrive(img.id);
        await uploadToR2(key, buf, mime);
        process.stdout.write(`\r   [Imagem] ${i + 1}/${imgs.length} (Enviado: ${img.title})`);
      }
    }
    console.log('\n   ✔ Imagens sincronizadas.');
  }

  console.log(`\n🎉 Sincronização de ${targetBasePath} no R2 concluída!`);
}

async function main() {
  // Testar com Aula 01 de Crimes Contra a Família
  // Audio: 1-HDLF5a8fp8FUUTmwMjmVBvCUIcM5u5-
  // Imagens: 1RNMviduGLLNkoBjjYSQ_LnZzrrlx2Dl8
  await uploadAulaAssets(
    '1-HDLF5a8fp8FUUTmwMjmVBvCUIcM5u5-',
    '1RNMviduGLLNkoBjjYSQ_LnZzrrlx2Dl8',
    'aprender/direito-penal/crimes-contra-a-familia/aula-01'
  );
}

main().catch(console.error);
