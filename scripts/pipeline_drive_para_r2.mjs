import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
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
const publicCdn = getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

// Carrega inventário
const inventario = JSON.parse(fs.readFileSync('scripts/inventario_completo_drive.json', 'utf-8'));
const todasLeis = JSON.parse(fs.readFileSync('scripts/todas_leis_supabase.json', 'utf-8'));

const leiSlugToDb = new Map();
for (const l of todasLeis) {
  leiSlugToDb.set(l.slug.toLowerCase(), l);
}

// Slugs especiais ou variações
const aliasMap = {
  'estatuto-oab': 'estatuto-oab',
  'eoab': 'estatuto-oab',
  'espf': 'lei-servidor',
  'lei-servidor': 'lei-servidor',
  'estatuto-mpe': 'estatuto-mpe',
  'eme': 'eme',
};

async function checkObjectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    return false;
  }
}

async function downloadFromDrive(fileId, retries = 3) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(30000)
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
      if (res.status === 429) {
        console.warn(`[Drive 429] Rate limit, aguardando ${attempt * 3}s...`);
        await new Promise(r => setTimeout(r, attempt * 3000));
      }
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise(r => setTimeout(r, attempt * 1500));
    }
  }
  throw new Error(`Falha ao baixar após ${retries} tentativas: ${fileId}`);
}

async function uploadToR2(key, buffer, contentType = 'audio/mpeg') {
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType
  }));
}

function normalizeKey(str) {
  if (!str) return '';
  const s = str.trim().toLowerCase().replace(/\./g, '');
  if (s.includes('único') || s.includes('unico')) return 'unico';
  const matchLetra = s.match(/(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-z])/i);
  if (matchLetra) {
    return `${Number(matchLetra[1])}-${matchLetra[2]}`;
  }
  const matchNum = s.match(/(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)/i);
  if (matchNum) {
    return `${Number(matchNum[1])}`;
  }
  return s.replace(/\D/g, '');
}

async function processLaw(slug, lawData) {
  const categoria = lawData.tipo === 'codigo' ? 'codigos' : 'estatutos';
  const dbSlug = aliasMap[slug] || slug;
  const dbLaw = leiSlugToDb.get(dbSlug);

  console.log(`\n===============================================================`);
  console.log(`📖 PROCESSANDO LEI: ${lawData.nome} (${slug})`);
  console.log(`   Categoria: ${categoria} | Total Arquivos Drive: ${lawData.totalArquivos}`);
  if (dbLaw) {
    console.log(`   Encontrada no Banco Supabase: ID ${dbLaw.id} (${dbLaw.nome})`);
  } else {
    console.log(`   ⚠️ Lei não encontrada no banco Supabase (arquivos serão salvos no R2)`);
  }
  console.log(`===============================================================`);

  // Carrega artigos do banco se existir
  const artigosDbMap = new Map();
  if (dbLaw) {
    let from = 0;
    const limit = 1000;
    while (true) {
      const { data: arts } = await supabase
        .from('vade_mecum_artigos')
        .select('id, numero, narracao_url')
        .eq('lei_id', dbLaw.id)
        .range(from, from + limit - 1);
      if (!arts || arts.length === 0) break;
      for (const a of arts) {
        const k = normalizeKey(a.numero);
        if (k) artigosDbMap.set(k, a);
      }
      if (arts.length < limit) break;
      from += limit;
    }
    console.log(`   Artigos indexados do banco: ${artigosDbMap.size}`);
  }

  const arquivos = lawData.arquivos;
  const concurrency = 8;
  let idx = 0;
  let uploadsCount = 0;
  let skipsCount = 0;
  let dbUpdatesCount = 0;

  async function worker() {
    while (idx < arquivos.length) {
      const currentIdx = idx++;
      const item = arquivos[currentIdx];
      const r2Key = `narracoes/${categoria}/${slug}/${item.nomeArquivo}`;
      const publicUrl = `${publicCdn}/${r2Key}`;

      try {
        // Verifica se já está no R2
        const exists = await checkObjectExists(r2Key);
        if (exists) {
          skipsCount++;
        } else {
          // Baixa do Drive e envia ao R2
          const buffer = await downloadFromDrive(item.driveFileId);
          await uploadToR2(r2Key, buffer);
          uploadsCount++;
        }

        // Se tem artigo no banco, atualiza narracao_url
        if (item.artigoKey && artigosDbMap.has(item.artigoKey)) {
          const artDb = artigosDbMap.get(item.artigoKey);
          if (artDb.narracao_url !== publicUrl) {
            await supabase
              .from('vade_mecum_artigos')
              .update({ narracao_url: publicUrl })
              .eq('id', artDb.id);
            dbUpdatesCount++;
          }
        }

        if ((currentIdx + 1) % 25 === 0 || currentIdx + 1 === arquivos.length) {
          console.log(`   [${slug.toUpperCase()}] Progresso: ${currentIdx + 1}/${arquivos.length} (Uploads: ${uploadsCount}, Já no R2: ${skipsCount}, Banco: ${dbUpdatesCount})`);
        }
      } catch (err) {
        console.error(`   ❌ Erro no arquivo ${item.nomeArquivo} (${item.driveFileId}):`, err.message);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`✅ Lei ${slug.toUpperCase()} finalizada! Total Uploads: ${uploadsCount} | Em cache R2: ${skipsCount} | Artigos vinculados no Banco: ${dbUpdatesCount}`);
}

async function runPipeline() {
  const specificLaw = process.argv[2];
  if (specificLaw) {
    if (!inventario[specificLaw]) {
      console.error(`Lei "${specificLaw}" não encontrada no inventário!`);
      process.exit(1);
    }
    await processLaw(specificLaw, inventario[specificLaw]);
    return;
  }

  console.log('Iniciando processamento de todas as leis...');
  for (const [slug, data] of Object.entries(inventario)) {
    await processLaw(slug, data);
  }
  console.log('\n🎉🎉🎉 PIPELINE COMPLETO CONCLUÍDO COM SUCESSO! 🎉🎉🎉');
}

runPipeline().catch(console.error);
