import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

const r2 = new S3Client({
  region: 'auto',
  endpoint: getEnv('R2_ENDPOINT'),
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  },
});
const bucket = getEnv('VITE_R2_BUCKET_NAME');

async function listR2Files(prefix) {
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
  console.log('================================================================');
  console.log('📊 LEVANTAMENTO COMPLETO DE LEIS E ÁUDIO-LEIS / NARRAÇÕES');
  console.log('================================================================\n');

  // 1. Verificar Leis no Supabase
  const { data: leis, error: lErr } = await supabase
    .from('vade_mecum_leis')
    .select('id, slug, nome, categoria')
    .order('nome', { ascending: true });

  if (lErr) {
    console.error('Erro ao ler vade_mecum_leis:', lErr.message);
  }

  console.log(`Leis cadastradas em vade_mecum_leis: ${leis?.length || 0}`);

  // 2. Mapear arquivos no R2 por slug
  const r2NarracoesCP = await listR2Files('narracoes/vademecum/cp/');
  const r2NarracoesCC = await listR2Files('narracoes/vademecum/cc/');
  const r2NarracoesCPP = await listR2Files('narracoes/vademecum/cpp/');
  const r2NarracoesOAB = await listR2Files('narracoes/vademecum/estatuto-oab/');

  console.log('\n--- ARQUIVOS DE NARRAÇÃO NO R2 (POR LEI) ---');
  console.log(`Código Penal (CP):                  ${r2NarracoesCP.length} áudios`);
  console.log(`Código de Processo Penal (CPP):     ${r2NarracoesCPP.length} áudios`);
  console.log(`Código Civil (CC):                  ${r2NarracoesCC.length} áudios`);
  console.log(`Estatuto da OAB (EOAB):             ${r2NarracoesOAB.length} áudios`);

  // 3. Verificar cada lei de vade_mecum_leis com seus artigos
  const relatorio = [];

  for (const lei of (leis || [])) {
    const { data: artigos, count } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero, narracao_url', { count: 'exact' })
      .eq('lei_id', lei.id);

    const totalArtigos = artigos?.length || 0;
    const artigosComUrl = (artigos || []).filter(a => a.narracao_url && a.narracao_url.trim().length > 0).length;

    // Verificar se tem arquivos no R2
    const slug = (lei.slug || '').toLowerCase();
    let r2FilesCount = 0;
    if (slug === 'cp') r2FilesCount = r2NarracoesCP.length;
    else if (slug === 'cpp') r2FilesCount = r2NarracoesCPP.length;
    else if (slug === 'cc') r2FilesCount = r2NarracoesCC.length;
    else if (slug === 'estatuto-oab' || slug === 'eoab') r2FilesCount = r2NarracoesOAB.length;
    else {
      const custom = await listR2Files(`narracoes/vademecum/${slug}/`);
      r2FilesCount = custom.length;
    }

    const totalComAudio = Math.max(artigosComUrl, r2FilesCount);
    const porcentagem = totalArtigos > 0 ? Math.round((totalComAudio / totalArtigos) * 100) : 0;
    const status = porcentagem >= 95 ? 'COMPLETA (100%)' : porcentagem > 0 ? `PARCIAL (${porcentagem}%)` : 'SEM ÁUDIO (0%)';

    relatorio.push({
      lei: lei.nome,
      slug: lei.slug,
      categoria: lei.categoria,
      totalArtigos,
      totalComAudio,
      porcentagem,
      status
    });
  }

  // 4. Verificar tabela narracoes_artigos
  const { data: narracoesArtigos, error: naErr } = await supabase
    .from('narracoes_artigos')
    .select('tabela_nome, artigo_numero, audio_url')
    .limit(1000);

  const porTabela = {};
  if (narracoesArtigos) {
    for (const na of narracoesArtigos) {
      porTabela[na.tabela_nome] = (porTabela[na.tabela_nome] || 0) + 1;
    }
  }

  // 5. Verificar Audio-Aulas em public/audio_aulas_drive
  const driveDir = 'public/audio_aulas_drive';
  const audioAulasDrive = [];
  if (fs.existsSync(driveDir)) {
    const walk = (d) => {
      const list = fs.readdirSync(d);
      for (const item of list) {
        const full = path.join(d, item);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (item.endsWith('.csv')) audioAulasDrive.push({ file: item, path: full, size: fs.statSync(full).size });
      }
    };
    walk(driveDir);
  }

  console.log('\n--- RELATÓRIO CONSOLIDADO DAS LEIS NO VADE MECUM ---');
  relatorio.sort((a, b) => b.porcentagem - a.porcentagem);
  for (const r of relatorio) {
    console.log(`• ${r.lei.padEnd(45)} | Artigos: ${String(r.totalArtigos).padStart(4)} | Áudios: ${String(r.totalComAudio).padStart(4)} | ${r.status}`);
  }

  console.log('\n--- TABELA narracoes_artigos (DISTRIBUIÇÃO) ---');
  console.log(porTabela);

  console.log('\n--- ÁUDIO-AULAS / PLANILHAS DO GOOGLE DRIVE ENCONTRADAS ---');
  for (const a of audioAulasDrive) {
    console.log(`• ${a.file} (${(a.size / 1024).toFixed(1)} KB)`);
  }
}

main().catch(console.error);
