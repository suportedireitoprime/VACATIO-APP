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
  console.log(`Capas:       ${cdn}/capas/lei-cover-clt.webp`);
  console.log(`Capas Área:  ${cdn}/capas/areas/direito-penal.webp`);
  console.log(`Assets:      ${cdn}/assets/hero-figures/1-justice.webp`);
  console.log(`Intros:      ${cdn}/intros/intro-v1.mp4`);
  console.log(`Resumos PDF: ${cdn}/resumos/c-digo-civil/artigo-1.pdf`);
  console.log(`Mapas PDF:   ${cdn}/mapas/personalidade-e-capacidade-civil.pdf`);
  console.log(`Narrações:   ${cdn}/narracoes/vademecum/cp/art-121.mp3`);
}

listFolders().catch(console.error);
