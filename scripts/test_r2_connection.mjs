import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const endpoint = getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com';
const accessKeyId = getEnv('R2_ACCESS_KEY_ID');
const secretAccessKey = getEnv('R2_SECRET_ACCESS_KEY');
const bucketName = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicUrl = getEnv('VITE_R2_PUBLIC_URL');

console.log('--- TESTANDO CONEXÃO COM O CLOUDFLARE R2 ---');
console.log('Bucket:', bucketName);
console.log('Endpoint:', endpoint);
console.log('Public URL:', publicUrl);

const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  try {
    // 1. Upload de um pequeno arquivo de teste
    const testKey = 'test/teste-conexao.txt';
    console.log(`Enviando arquivo de teste para ${testKey}...`);
    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: Buffer.from('Conexao com Cloudflare R2 realizada com sucesso! ' + new Date().toISOString()),
        ContentType: 'text/plain',
      })
    );
    console.log('✅ Upload de teste realizado com sucesso!');

    // 2. Listar objetos no bucket
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 10,
      })
    );
    console.log('✅ Listagem do R2 OK! Arquivos encontrados:', res.Contents?.map(c => c.Key));
    console.log(`✅ URL pública do arquivo de teste: ${publicUrl}/${testKey}`);

    // 3. Checar banco Supabase
    const supabaseUrl = getEnv('VITE_SUPABASE_URL');
    const supabaseKey = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: audioaulas } = await supabase.from('audioaulas_acervo').select('id, titulo, url_audio').not('url_audio', 'is', null).limit(3);
    console.log('\nExemplos em audioaulas_acervo:');
    audioaulas?.forEach(a => console.log(`  - [ID ${a.id}] ${a.titulo} -> ${a.url_audio}`));

    const { data: artigos } = await supabase.from('vade_mecum_artigos').select('id, numero, narracao_url').not('narracao_url', 'is', null).limit(3);
    console.log('\nExemplos em vade_mecum_artigos:');
    artigos?.forEach(a => console.log(`  - [Art. ${a.numero}] -> ${a.narracao_url}`));

    console.log('\n🚀 TUDO PRONTO PARA A MIGRAÇÃO!');
  } catch (err) {
    console.error('❌ Erro no teste do R2:', err);
  }
}

main();
