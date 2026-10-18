import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
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

async function cleanPrefix(prefix) {
  let totalDeleted = 0;
  let token = undefined;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
      MaxKeys: 1000
    }));

    if (res.Contents && res.Contents.length > 0) {
      const keys = res.Contents.map(c => ({ Key: c.Key }));
      await r2.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys }
      }));
      totalDeleted += keys.length;
    }
    token = res.NextContinuationToken;
  } while (token);
  console.log(`Deletados ${totalDeleted} de ${prefix}`);
}

async function main() {
  await cleanPrefix('narracoes/codigos/codigo-civil/');
  await cleanPrefix('narracoes/codigos/codigo-penal/');
  await cleanPrefix('narracoes/codigos/codigo-processo-penal/');
  await cleanPrefix('narracoes/estatutos/eoab/');
  await cleanPrefix('narracoes/test.txt');
  console.log('✅ Limpeza concluída!');
}

main().catch(console.error);
