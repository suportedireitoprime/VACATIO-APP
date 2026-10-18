import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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

const bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const catalog = JSON.parse(
  fs.readFileSync('scripts/data/filosofia_do_direito_drive_files.json', 'utf-8')
);

const allPairs = [];
for (const pasta of catalog) {
  for (const arq of pasta.arquivos) {
    allPairs.push({
      src: `narracoes/filosofia-do-direito/${pasta.subpasta}/${arq.name}`,
      dst: `narracoes/areas/filosofia-do-direito/${pasta.subpasta}/${arq.name}`,
    });
  }
}

async function syncAll() {
  console.log(`--- SINCRONIZANDO ${allPairs.length} ARQUIVOS COM CONCORRÊNCIA 6 ---`);
  let idx = 0;
  let copied = 0;
  let skipped = 0;

  async function worker() {
    while (idx < allPairs.length) {
      const cur = allPairs[idx++];
      try {
        const check = await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: cur.dst }));
        if ((check.ContentLength || 0) > 1024) {
          skipped++;
          continue;
        }
      } catch {
        /* proceed to copy */
      }

      try {
        const copySource = encodeURI(`${bucket}/${cur.src}`).replace(/\?/g, '%3F');
        await r2.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: copySource,
            Key: cur.dst,
            ContentType: 'audio/mpeg',
          })
        );
        copied++;
      } catch (err) {
        console.error(`Erro ao copiar ${cur.src}:`, err.message);
      }
    }
  }

  await Promise.all(Array.from({ length: 6 }, () => worker()));
  console.log(`\n🎉 Sincronização concluída! Copiados: ${copied}, Já presentes: ${skipped}, Total: ${allPairs.length}`);
}

syncAll().catch(console.error);
