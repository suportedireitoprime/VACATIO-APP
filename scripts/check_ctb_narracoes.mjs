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

async function check() {
  console.log('=== 1. VERIFICANDO LEI CTB NO SUPABASE ===');
  const { data: leis } = await supa
    .from('vade_mecum_leis')
    .select('id, slug, nome, total_artigos')
    .or('slug.ilike.%ctb%,slug.ilike.%transito%,nome.ilike.%transito%');
  console.log('Leis encontradas:', leis);

  if (leis && leis.length > 0) {
    for (const lei of leis) {
      console.log(`\nVerificando artigos para: ${lei.nome} (slug: ${lei.slug}, id: ${lei.id})`);
      const { count: countComAudio } = await supa
        .from('vade_mecum_artigos')
        .select('id', { count: 'exact' })
        .eq('lei_id', lei.id)
        .not('narracao_url', 'is', null);
      console.log(`Artigos com narracao_url preenchida: ${countComAudio} de ${lei.total_artigos}`);

      // Checar especificamente Art. 3
      const { data: art3 } = await supa
        .from('vade_mecum_artigos')
        .select('id, numero, narracao_url')
        .eq('lei_id', lei.id)
        .eq('numero', '3')
        .maybeSingle();
      console.log('Art. 3:', art3);
    }
  }

  console.log('\n=== 2. VERIFICANDO NA TABELA NARRACOES_ARTIGOS ===');
  const { data: narracoes, count: countNarracoes } = await supa
    .from('narracoes_artigos')
    .select('id, tabela_nome, artigo_numero, audio_url', { count: 'exact' })
    .or('tabela_nome.ilike.%ctb%,tabela_nome.ilike.%transito%')
    .limit(10);
  console.log('Total em narracoes_artigos para CTB:', countNarracoes);
  console.log('Exemplos:', narracoes);

  // Também buscar quais tabelas existem em narracoes_artigos
  const { data: sampleRows } = await supa
    .from('narracoes_artigos')
    .select('tabela_nome')
    .limit(500);
  const distinctTabelas = new Set(sampleRows?.map(r => r.tabela_nome));
  console.log('Tabelas com narracao presentes em narracoes_artigos:', Array.from(distinctTabelas));

  console.log('\n=== 3. VERIFICANDO NO R2 (vacatio-midias) ===');
  const resNarracoes = await r2.send(new ListObjectsV2Command({
    Bucket: 'vacatio-midias',
    Prefix: 'narracoes/',
    Delimiter: '/',
    MaxKeys: 100
  }));
  console.log('Pastas em narracoes/ no R2:');
  console.log(resNarracoes.CommonPrefixes?.map(p => p.Prefix) || []);

  const resAudios = await r2.send(new ListObjectsV2Command({
    Bucket: 'vacatio-midias',
    Prefix: 'audios/',
    Delimiter: '/',
    MaxKeys: 100
  }));
  console.log('Pastas em audios/ no R2:');
  console.log(resAudios.CommonPrefixes?.map(p => p.Prefix) || []);
}

check().catch(console.error);
