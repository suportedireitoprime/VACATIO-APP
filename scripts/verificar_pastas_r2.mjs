import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const r2 = new S3Client({
  region: 'auto',
  endpoint: getEnv('R2_ENDPOINT'),
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  },
});
const bucket = getEnv('VITE_R2_BUCKET_NAME');

async function listFolders() {
  console.log(`Verificando pastas no bucket: "${bucket}"...\n`);
  
  // Listar com delimitador '/' para agrupar pastas raiz
  const cmd = new ListObjectsV2Command({
    Bucket: bucket,
    Delimiter: '/',
  });
  const res = await r2.send(cmd);
  
  console.log('--- PASTAS RAIZ ENCONTRADAS NO R2 ---');
  for (const prefix of res.CommonPrefixes || []) {
    // Para cada pasta, contar quantos itens tem dentro
    const subCmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix.Prefix,
      MaxKeys: 1000,
    });
    const subRes = await r2.send(subCmd);
    console.log(`📁 ${prefix.Prefix.padEnd(20)} -> ${subRes.Contents?.length || 0} arquivos mapeados`);
  }

  // Exemplos de URLs públicas
  const cdn = (getEnv('VITE_R2_PUBLIC_URL') || '').replace(/\/+$/, '');
  console.log('\n--- EXEMPLOS DE URLS PÚBLICAS NA CDN ---');
  // Exemplos de chaves reais em CP
  const cpCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'narracoes/vademecum/cp/',
    MaxKeys: 5,
  });
  const cpRes = await r2.send(cpCmd);
  console.log('\nAmostra de arquivos em narracoes/vademecum/cp:');
  console.log((cpRes.Contents || []).map(c => c.Key));

  const cpNewCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'narracoes/codigos/codigo-penal/',
    MaxKeys: 5,
  });
  const cpNewRes = await r2.send(cpNewCmd);
  console.log('\nAmostra de arquivos em narracoes/codigos/codigo-penal:');
  console.log((cpNewRes.Contents || []).map(c => c.Key));
}

listFolders().catch(console.error);
