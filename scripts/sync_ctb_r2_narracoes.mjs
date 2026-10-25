import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTQ5MzM5NiwiZXhwIjoyMTA3MDY5Mzk2fQ.uKcOa5aozLwLOinGs4oI-TJuBiTaYTA_Exa-nh5hdCQ';
const supa = createClient(SUPABASE_URL, SERVICE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  },
});
const publicBaseUrl = getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

async function run() {
  console.log('Listando todos os áudios do CTB no R2...');
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

  console.log(`Encontrados ${allKeys.length} arquivos no R2 para CTB`);

  // Mapa de arquivos por número de artigo normalizado
  // Ex: 'Art. 0003.mp3' -> '3', 'Art. 0007-A.mp3' -> '7-a'
  const r2AudioMap = new Map();
  for (const key of allKeys) {
    if (!key.endsWith('.mp3')) continue;
    const filename = key.split('/').pop() || '';
    // Padrão: Art. 0003.mp3 ou Art. 0007-A.mp3
    const match = filename.match(/Art\.\s*0*([0-9]+(?:-[A-Za-z]+)?)\.mp3/i);
    if (match) {
      const artNum = match[1].toLowerCase();
      r2AudioMap.set(artNum, `${publicBaseUrl}/${key}`);
    }
  }

  console.log(`Mapeados ${r2AudioMap.size} artigos de áudio do CTB no R2`);
  console.log('Exemplos mapeados:', Array.from(r2AudioMap.entries()).slice(0, 10));

  // Buscar todos os artigos do CTB em vade_mecum_artigos
  const { data: ctbLei } = await supa
    .from('vade_mecum_leis')
    .select('id, total_artigos')
    .eq('slug', 'ctb')
    .single();

  if (!ctbLei) {
    console.error('CTB não encontrado no Supabase!');
    return;
  }

  const { data: artigos, error } = await supa
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('lei_id', ctbLei.id);

  if (error) {
    console.error('Erro ao buscar artigos do CTB:', error);
    return;
  }

  console.log(`Total de registros de artigos no CTB: ${artigos.length}`);

  let updatedCount = 0;
  for (const art of artigos) {
    const cleanNum = art.numero.trim().toLowerCase();
    const r2Url = r2AudioMap.get(cleanNum);

    // Se encontramos áudio no R2 e o banco está com narracao_url nula ou diferente
    if (r2Url && (!art.narracao_url || art.narracao_url !== r2Url)) {
      console.log(`Atualizando Art. ${art.numero}: ${r2Url}`);
      const { error: upErr } = await supa
        .from('vade_mecum_artigos')
        .update({ narracao_url: r2Url })
        .eq('id', art.id);

      if (upErr) {
        console.error(`Erro ao atualizar Art. ${art.numero}:`, upErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 Sincronização concluída! ${updatedCount} artigos do CTB foram atualizados com a URL de narração do R2!`);

  // Verificar especificamente o Art. 3 agora
  const { data: art3 } = await supa
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('lei_id', ctbLei.id)
    .eq('numero', '3')
    .single();
  console.log('\nVerificação final do Art. 3 do CTB:', art3);
}

run().catch(console.error);
