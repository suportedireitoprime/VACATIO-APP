import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const LEIS_SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const LEIS_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';

const supabase = createClient(LEIS_SUPABASE_URL, LEIS_SUPABASE_ANON_KEY);

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
const r2PublicDomain = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev';

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
        if (item.Key && !item.Key.endsWith('.keep') && /\.(mp3|wav|m4a|ogg|opus)$/i.test(item.Key)) {
          files.push(item.Key);
        }
      }
    }
    token = res.NextContinuationToken;
  } while (token);
  return files;
}

// Extrai a chave normalizada de um número de artigo ou nome de arquivo
// Ex: "Art. 0001.mp3" -> "1", "Art. 0011-A.mp3" -> "11-a", "10" -> "10", "1º" -> "1"
function extrairChaveArtigo(texto) {
  if (!texto) return '';
  const clean = texto.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  const withoutDots = clean.replace(/\./g, '');
  
  // Trata sufixo com letra (ex: "Art 0011-A" -> "11-a" ou "11-A" -> "11-a")
  const mLetra = withoutDots.match(/(?:art(?:igo)?\s*)?0*(\d+)(?:[º°o])?[-_\s]*([a-zA-Z])\b/i);
  if (mLetra) {
    return `${parseInt(mLetra[1], 10)}-${mLetra[2].toLowerCase()}`;
  }

  // Trata número simples (ex: "Art 0001" -> "1", "0010" -> "10", "1º" -> "1")
  const mNum = withoutDots.match(/(?:art(?:igo)?\s*)?0*(\d+)(?:[º°o])?\b/i);
  if (mNum) {
    return `${parseInt(mNum[1], 10)}`;
  }

  if (/único|unico/i.test(withoutDots)) return 'unico';
  return withoutDots.toLowerCase().trim();
}

async function auditarEVincular() {
  console.log('================================================================');
  console.log('🚀 INICIANDO AUDITORIA E VINCULAÇÃO TOTAL DE NARRAÇÕES (R2 + DB)');
  console.log('================================================================\n');

  // 1. Listar TODOS os arquivos de narração no R2
  let todosArquivosR2 = [];
  if (fs.existsSync('scripts/r2_narracoes_cache.json')) {
    console.log('Carregando lista de arquivos R2 do cache local...');
    todosArquivosR2 = JSON.parse(fs.readFileSync('scripts/r2_narracoes_cache.json', 'utf-8'));
  } else {
    console.log('Listando todos os arquivos em "narracoes/" no Cloudflare R2...');
    todosArquivosR2 = await listR2Files('narracoes/');
    fs.writeFileSync('scripts/r2_narracoes_cache.json', JSON.stringify(todosArquivosR2));
  }
  console.log(`Total de arquivos de áudio no R2: ${todosArquivosR2.length}`);

  // Agrupar arquivos R2 por pasta
  const r2PorPasta = new Map();
  for (const key of todosArquivosR2) {
    const parts = key.split('/');
    // ex: narracoes/estatutos/estatuto-eca/Art. 0001.mp3 -> pasta = "estatutos/estatuto-eca"
    // ou narracoes/leis/ca/art_1.mp3 -> pasta = "leis/ca"
    // ou narracoes/vademecum/cp/art_1.mp3 -> pasta = "vademecum/cp"
    if (parts.length >= 3) {
      const pastaRel = parts.slice(1, parts.length - 1).join('/').toLowerCase();
      if (!r2PorPasta.has(pastaRel)) r2PorPasta.set(pastaRel, []);
      r2PorPasta.get(pastaRel).push(key);
    }
  }

  console.log(`Pastas identificadas no R2: ${r2PorPasta.size}`);

  // 2. Buscar todas as leis no Supabase
  const { data: leis, error: lErr } = await supabase
    .from('vade_mecum_leis')
    .select('id, slug, nome, categoria')
    .order('nome', { ascending: true });

  if (lErr) {
    console.error('Erro ao buscar leis:', lErr);
    return;
  }

  console.log(`Leis no banco: ${leis.length}\n`);

  const relatorio = [];

  for (const lei of leis) {
    const slug = (lei.slug || '').toLowerCase().trim();
    
    // Tenta encontrar a pasta correspondente no R2
    // Possíveis caminhos:
    // "estatutos/" + slug
    // "leis/" + slug
    // "vademecum/" + slug
    // ou busca direta por nome ou pasta contendo slug
    let pastaR2Encontrada = null;
    let arquivosDaLei = [];

    const candidatos = [
      `estatutos/${slug}`,
      `leis/${slug}`,
      `vademecum/${slug}`,
      slug
    ];

    for (const c of candidatos) {
      if (r2PorPasta.has(c)) {
        pastaR2Encontrada = c;
        arquivosDaLei = r2PorPasta.get(c);
        break;
      }
    }

    if (!pastaR2Encontrada) {
      // Tentar match parcial se slug for por exemplo "eca" e pasta for "estatutos/estatuto-eca"
      for (const [pasta, arqs] of r2PorPasta.entries()) {
        const ultParte = pasta.split('/').pop();
        if (ultParte === slug || ultParte === `lei-${slug}` || ultParte === `estatuto-${slug}` || slug === ultParte.replace(/^(lei|estatuto)-/, '')) {
          pastaR2Encontrada = pasta;
          arquivosDaLei = arqs;
          break;
        }
      }
    }

    // Buscar artigos desta lei no banco
    let artigos = [];
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page } = await supabase
        .from('vade_mecum_artigos')
        .select('id, numero, narracao_url')
        .eq('lei_id', lei.id)
        .range(from, from + pageSize - 1);
      if (!page || page.length === 0) break;
      artigos = artigos.concat(page);
      if (page.length < pageSize) break;
      from += pageSize;
    }

    const totalArtigos = artigos.length;
    let comAudioNoBanco = artigos.filter(a => a.narracao_url && a.narracao_url.trim().length > 0).length;
    let vinculadosNestaExecucao = 0;

    // Se temos arquivos no R2 para esta lei, vamos vincular os que estão faltando no banco!
    if (arquivosDaLei.length > 0 && totalArtigos > 0) {
      // Mapa chave -> arquivo R2
      const mapaR2 = new Map();
      for (const r2Key of arquivosDaLei) {
        const filename = r2Key.split('/').pop();
        const chave = extrairChaveArtigo(filename);
        if (chave) mapaR2.set(chave, r2Key);
      }

      const updates = [];
      for (const art of artigos) {
        const chaveArt = extrairChaveArtigo(art.numero);
        if (mapaR2.has(chaveArt)) {
          const r2Key = mapaR2.get(chaveArt);
          const expectedUrl = `${r2PublicDomain}/${r2Key}`;
          if (!art.narracao_url || art.narracao_url !== expectedUrl) {
            updates.push({ id: art.id, narracao_url: expectedUrl });
          }
        }
      }

      if (updates.length > 0) {
        console.log(`[VINCULANDO] ${lei.nome} (${slug}): ${updates.length} artigos sendo vinculados ao R2...`);
        // Atualizar em lotes de 100
        for (let i = 0; i < updates.length; i += 100) {
          const batch = updates.slice(i, i + 100);
          await Promise.all(batch.map(u => 
            supabase
              .from('vade_mecum_artigos')
              .update({ narracao_url: u.narracao_url })
              .eq('id', u.id)
          ));
        }
        vinculadosNestaExecucao = updates.length;
        comAudioNoBanco += updates.filter(u => {
          const prev = artigos.find(a => a.id === u.id);
          return !prev?.narracao_url;
        }).length;
      }
    }

    relatorio.push({
      id: lei.id,
      nome: lei.nome,
      slug: slug,
      categoria: lei.categoria,
      totalArtigos,
      comAudioNoBanco,
      r2Arquivos: arquivosDaLei.length,
      vinculadosNestaExecucao,
      pastaR2: pastaR2Encontrada || 'Nenhuma'
    });
  }

  // Salvar relatório em JSON
  fs.writeFileSync('scripts/relatorio_geral_narracoes.json', JSON.stringify(relatorio, null, 2));

  console.log('\n================================================================');
  console.log('📊 RESUMO DA AUDITORIA E VINCULAÇÃO');
  console.log('================================================================');
  
  const completas = relatorio.filter(r => r.totalArtigos > 0 && r.comAudioNoBanco >= r.totalArtigos);
  const parciais = relatorio.filter(r => r.comAudioNoBanco > 0 && r.comAudioNoBanco < r.totalArtigos);
  const semAudio = relatorio.filter(r => r.comAudioNoBanco === 0);

  console.log(`Total de Leis Analisadas: ${relatorio.length}`);
  console.log(`✅ Leis com 100% de Narração: ${completas.length}`);
  console.log(`🟡 Leis com Narração Parcial: ${parciais.length}`);
  console.log(`❌ Leis SEM Narração (0%):    ${semAudio.length}`);

  console.log('\n--- DETALHE DO ECA ---');
  const ecaInfo = relatorio.find(r => r.slug === 'estatuto-eca' || r.nome.includes('Criança'));
  console.log(ecaInfo);
}

auditarEVincular().catch(console.error);
