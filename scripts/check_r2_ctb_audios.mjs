import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2 = new S3Client({
  region: 'auto',
  endpoint: getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  },
});

async function run() {
  const res = await r2.send(new ListObjectsV2Command({
    Bucket: 'vacatio-midias',
    Prefix: 'narracoes/codigos/ctb/Art. 000',
    MaxKeys: 30
  }));
  console.log('Arquivos encontrados em narracoes/codigos/ctb/Art. 000*:');
  console.log(res.Contents?.map(c => c.Key) || []);

  // Vamos listar TODOS os arquivos de narracoes/codigos/ctb/
  let allKeys = [];
  let token = undefined;
  do {
    const listRes = await r2.send(new ListObjectsV2Command({
      Bucket: 'vacatio-midias',
      Prefix: 'narracoes/codigos/ctb/',
      ContinuationToken: token,
      MaxKeys: 1000
    }));
    allKeys = allKeys.concat(listRes.Contents?.map(c => c.Key) || []);
    token = listRes.NextContinuationToken;
  } while (token);

  console.log(`\nTotal de arquivos de áudio do CTB no R2: ${allKeys.length}`);
  const primeiros = allKeys.slice(0, 15);
  console.log('Primeiros arquivos:', primeiros);

  // Checar especificamente Art. 0001, Art. 0002, Art. 0003
  for (const n of ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009']) {
    const found = allKeys.filter(k => k.includes(`Art. ${n}`) || k.includes(`Art.${n}`) || k.includes(`art_${n}`) || k.includes(`art-${n}`));
    console.log(`Busca Art. ${n}:`, found);
  }
}

run().catch(console.error);
