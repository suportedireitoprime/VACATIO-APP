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

async function main() {
  const res = await r2.send(new ListObjectsV2Command({
    Bucket: bucket,
    Delimiter: '/',
    MaxKeys: 1000
  }));
  console.log('--- PASTAS RAIZ NO BUCKET R2 (' + bucket + ') ---');
  console.log(res.CommonPrefixes?.map(p => p.Prefix) || []);
}

main();
