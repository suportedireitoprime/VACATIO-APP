import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

async function listR2(prefix) {
  const files = [];
  let token = undefined;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
      MaxKeys: 1000
    }));
    if (res.Contents) {
      for (const item of res.Contents) {
        if (item.Key && !item.Key.endsWith('.keep')) {
          files.push(item.Key);
        }
      }
    }
    token = res.NextContinuationToken;
  } while (token);
  return files;
}

async function main() {
  console.log('--- AUDITORIA CLOUDFLARE R2 ---');
  console.log('Bucket R2:', bucket);
  
  const allNarracoes = await listR2('narracoes/');
  console.log(`Total de arquivos em "narracoes/": ${allNarracoes.length}`);

  // Agrupar por pasta
  const folders = {};
  for (const f of allNarracoes) {
    const parts = f.split('/');
    const dir = parts.slice(0, 3).join('/');
    folders[dir] = (folders[dir] || 0) + 1;
  }
  console.log('Pastas em R2 narracoes/:', folders);
}

main();
