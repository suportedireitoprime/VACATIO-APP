import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURAÇÕES DE BACKEND E R2
// ============================================================================
const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf-8') : '';
function getEnv(key) {
  const m = envFile.match(new RegExp(`${key}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`));
  return m ? m[1].trim() : process.env[key];
}

const R2_CONFIG = {
  endpoint: getEnv('R2_ENDPOINT') || getEnv('VITE_R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com',
  accessKeyId: getEnv('R2_ACCESS_KEY_ID') || getEnv('VITE_R2_ACCESS_KEY_ID'),
  secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY') || getEnv('VITE_R2_SECRET_ACCESS_KEY'),
  bucketName: getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias',
  publicUrl: (getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev').replace(/\/+$/, ''),
};

const LEIS_SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const LEIS_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';

const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

// Arquivo de estado persistente para retomar de onde parou
const PROGRESS_FILE = 'scripts/robo_progresso_r2.json';
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {
      return { leisFinalizadas: {}, audiosFinalizados: {} };
    }
  }
  return { leisFinalizadas: {}, audiosFinalizados: {} };
}
function saveProgress(prog) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2), 'utf8');
  } catch {}
}

// ============================================================================
// CATEGORIZAÇÃO DAS 72 LEIS
// ============================================================================
const CATEGORIA_NOMES = {
  penal: 'Penal Especial',
  admin: 'Administrativo e Gestão Pública',
  codigos: 'Códigos e Legislação Setorial',
  processual: 'Processual e Juizados',
  civil: 'Civil, Empresarial e Digital',
  social: 'Previdenciário, Social e Eleitoral',
};

const CATEGORIA_SLUGS = {
  // Penal Especial
  laa: 'penal', lch: 'penal', ld: 'penal', 'lei-lep': 'penal', 'lei-lavagem-dinheiro': 'penal',
  'lei-organizacoes-criminosas': 'penal', 'lei-maria-penha': 'penal', 'lei-crimes-tributario': 'penal',
  'lei-anticorrupcao': 'penal', 'lei-antiterrorismo': 'penal', 'lei-contravencoes-penais': 'penal',
  'lei-crimes-ambientais': 'penal', 'lei-crimes-sistema-financeiro': 'penal', lci: 'penal',
  'lei-interceptacao-telefonica': 'penal', 'lei-prisao-temporaria': 'penal', 'lei-racismo': 'penal',
  'lei-tortura': 'penal', 'lei-13964': 'penal',
  // Administrativo & Gestão
  'lei-8112': 'admin', 'lei-acesso-informacao': 'admin', 'lei-improbidade': 'admin',
  'lei-processo-administrativo': 'admin', lrf: 'admin', 'lei-licitacoes-14133': 'admin',
  'lei-concessoes': 'admin', 'lei-ppp': 'admin', lcade: 'admin', loman: 'admin',
  'lei-organica-mp': 'admin', 'lei-organica-tcu': 'admin', 'decreto-etica': 'admin',
  // Códigos & Legislação Setorial
  cba: 'codigos', ctel: 'codigos', ccom: 'codigos', cagua: 'codigos', cmin: 'codigos',
  'lei-12651': 'codigos', cpi: 'codigos', 'estatuto-museus': 'codigos',
  // Processual & Juizados
  'lei-juizados-especiais': 'processual', 'lei-juizados-federais': 'processual',
  'lei-acao-civil-publica': 'processual', 'lei-acao-popular': 'processual',
  'lei-arbitragem': 'processual', 'lei-execucao-fiscal': 'processual',
  'lei-mediacao': 'processual', 'lei-habeas-data': 'processual', lmi: 'processual',
  'lei-mandado-seguranca': 'processual',
  // Civil & Empresarial
  'lei-falencias': 'civil', 'lei-locacoes': 'civil', 'lei-lgpd': 'civil',
  'lei-sa': 'civil', 'lei-alienacao-parental': 'civil', 'lei-alimentos': 'civil',
  'lei-direitos-autorais': 'civil', 'lei-lindb': 'civil', 'lei-liberdade-economica': 'civil',
  'lei-registros-publicos': 'civil', 'lei-marco-civil-internet': 'civil', 'lc-182': 'civil',
  // Previdenciário & Social
  'lei-13445': 'social', complementar: 'social', 'lei-beneficios-previdencia': 'social',
  'lei-custeio-seguridade': 'social', 'lei-loas': 'social', 'lc-135': 'social',
  'lei-eleicoes': 'social', 'lei-ldb': 'social', 'lei-sus': 'social', 'lei-partidos-politicos': 'social',
};

// ============================================================================
// FUNÇÕES AUXILIARES DE R2 E GOOGLE DRIVE
// ============================================================================
async function checkObjectExistsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadBufferToR2(key, buffer, contentType = 'audio/mpeg') {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${R2_CONFIG.publicUrl}/${key}`;
}

async function downloadFromDrive(fileId, retries = 3) {
  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(35000),
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, attempt * 4000));
      }
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw new Error(`Falha no download do Drive (${fileId})`);
}

/**
 * Rastreador recursivo de arquivos .mp3 em pastas do Google Drive
 */
async function crawlDriveFolder(folderId, visited = new Set(), results = []) {
  if (visited.has(folderId)) return results;
  visited.add(folderId);

  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return results;
    html = await res.text();
  } catch {
    return results;
  }

  const re = /<div class="flip-entry" id="entry-([^"]+)"([\s\S]*?)<div class="flip-entry-title">([^<]+)<\/div>/g;
  let m;
  const subfolders = [];
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const body = m[2];
    const title = m[3].trim();

    if (body.includes('/drive/folders/')) {
      subfolders.push({ id, title });
    } else if (body.includes('/file/d/') || /\.(mp3|wav|m4a|ogg)$/i.test(title)) {
      results.push({ id, title });
    }
  }

  for (const sub of subfolders) {
    await crawlDriveFolder(sub.id, visited, results);
  }

  return results;
}

/**
 * Extrai a chave de comparação do artigo a partir do nome do arquivo
 * Ex: "Art. 0009.mp3" -> "9", "Art. 0015-A.mp3" -> "15-a"
 */
function extractArtigoKey(filename) {
  let clean = filename.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  clean = clean.replace(/_\d{10,}$/, '');
  const cleanNoDots = clean.replace(/\./g, '');

  if (/art(?:igo)?\.?\s*[úu]nico/i.test(clean)) return 'unico';

  const regexComLetra = /(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])(?:\b|_|$)/i;
  const matchLetra = cleanNoDots.match(regexComLetra);
  if (matchLetra) {
    return `${Number(matchLetra[1])}-${matchLetra[2].toLowerCase()}`;
  }

  const regexSimples = /(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)(?:[º°o]|\.º)?/i;
  const matchSimples = cleanNoDots.match(regexSimples);
  if (matchSimples) {
    return `${Number(matchSimples[1])}`;
  }
  return null;
}

function normalizeDbNumero(numero) {
  if (!numero) return '';
  const s = numero.trim().toLowerCase().replace(/\./g, '');
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

// ============================================================================
// FORMATADORES DE TEMPO E TERMINAL
// ============================================================================
function formatDuration(ms) {
  if (!ms || ms < 0 || !isFinite(ms)) return '--:--';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
  return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

function renderProgressBar(current, total, width = 24) {
  if (!total || total === 0) return `[${' '.repeat(width)}] 0%`;
  const ratio = Math.min(1, current / total);
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const pct = Math.round(ratio * 100);
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct.toString().padStart(3, ' ')}%`;
}

// ============================================================================
// PROCESSAMENTO PRINCIPAL DE UMA LEI
// ============================================================================
async function processarLei(leiItem, progressoGlobal, metricas) {
  const { posicao, titulo_pasta_drive, url_drive, lei_id, lei_slug, lei_nome, lei_sigla, norma_ano } = leiItem;
  const folderId = url_drive.split('/').pop().split('?')[0];

  const catCode = CATEGORIA_SLUGS[lei_slug] || 'geral';
  const catNome = CATEGORIA_NOMES[catCode] || 'Legislação';

  console.log(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m[${posicao}/72] 📖 ${lei_sigla} - ${lei_nome}\x1b[0m \x1b[90m(${norma_ano})\x1b[0m`);
  console.log(`\x1b[90mCategoria: ${catNome} | Slug: ${lei_slug} | ID: ${lei_id}\x1b[0m`);
  console.log(`\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);

  // 1. Rastrear arquivos na pasta do Google Drive
  process.stdout.write(`🔍 Rastreador: escaneando pasta do Drive... `);
  const arquivosDrive = await crawlDriveFolder(folderId);
  console.log(`\x1b[32mEncontrados ${arquivosDrive.length} áudios.\x1b[0m`);

  if (arquivosDrive.length === 0) {
    console.log(`\x1b[33m⚠️ Nenhum arquivo de áudio localizado na pasta do Drive.\x1b[0m`);
    return { arquivosCount: 0, uploads: 0, jaNoR2: 0, vinculados: 0 };
  }

  // 2. Carregar artigos da lei no Supabase
  const artigosDbMap = new Map();
  if (lei_id) {
    let from = 0;
    const limit = 1000;
    while (true) {
      const res = await fetch(
        `${LEIS_SUPABASE_URL}/rest/v1/vade_mecum_artigos?select=id,numero,narracao_url&lei_id=eq.${lei_id}&order=ordem.asc&limit=${limit}&offset=${from}`,
        {
          headers: {
            apikey: LEIS_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${LEIS_SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) break;
      const rows = await res.json();
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        const k = normalizeDbNumero(r.numero);
        if (k) artigosDbMap.set(k, r);
      }
      if (rows.length < limit) break;
      from += limit;
    }
  }

  // 3. Processar uploads com concorrência moderada (3 workers)
  const concurrency = 3;
  let idx = 0;
  let uploads = 0;
  let jaNoR2 = 0;
  let vinculados = 0;

  const totalParaProcessar = arquivosDrive.length;

  async function worker() {
    while (idx < arquivosDrive.length) {
      const currentIdx = idx++;
      const item = arquivosDrive[currentIdx];

      // Formatar nome do arquivo de forma limpa (ex: Art. 0005.mp3)
      const nomeLimpo = item.title.trim();
      const r2Key = `narracoes/leis/${lei_slug}/${nomeLimpo}`;
      const publicUrl = `${R2_CONFIG.publicUrl}/${r2Key}`;

      try {
        // Verificar se já está no R2
        let exists = progressoGlobal.audiosFinalizados[r2Key];
        if (!exists) {
          exists = await checkObjectExistsInR2(r2Key);
        }

        if (exists) {
          jaNoR2++;
        } else {
          // Baixar do Drive e subir para o Cloudflare R2
          const buffer = await downloadFromDrive(item.id);
          await uploadBufferToR2(r2Key, buffer);
          uploads++;
          progressoGlobal.audiosFinalizados[r2Key] = true;
        }

        // Vincular no banco se artigo existir
        const artKey = extractArtigoKey(nomeLimpo);
        if (artKey && artigosDbMap.has(artKey)) {
          const artRow = artigosDbMap.get(artKey);
          if (artRow.narracao_url !== publicUrl) {
            await fetch(`${LEIS_SUPABASE_URL}/rest/v1/vade_mecum_artigos?id=eq.${artRow.id}`, {
              method: 'PATCH',
              headers: {
                apikey: LEIS_SUPABASE_ANON_KEY,
                Authorization: `Bearer ${LEIS_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ narracao_url: publicUrl }),
            });
            vinculados++;
          }
        }

        metricas.audiosProcessadosTotal++;
        const agora = Date.now();
        const decorridoMs = agora - metricas.inicioMs;
        const mediaPorAudioMs = decorridoMs / metricas.audiosProcessadosTotal;
        const restantesAudios = metricas.estimativaTotalAudios - metricas.audiosProcessadosTotal;
        const etaMs = restantesAudios * mediaPorAudioMs;

        const pBar = renderProgressBar(currentIdx + 1, totalParaProcessar, 16);
        const pGlobal = renderProgressBar(metricas.audiosProcessadosTotal, metricas.estimativaTotalAudios, 16);

        process.stdout.write(
          `\r\x1b[K   \x1b[32m${pBar}\x1b[0m ${currentIdx + 1}/${totalParaProcessar} áudios | ` +
          `\x1b[36mGlobal: ${pGlobal}\x1b[0m | ` +
          `\x1b[33mETA: ${formatDuration(etaMs)}\x1b[0m`
        );
      } catch (err) {
        console.error(`\n   \x1b[31m❌ Falha em ${nomeLimpo}: ${err.message}\x1b[0m`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  progressoGlobal.leisFinalizadas[lei_slug] = true;
  saveProgress(progressoGlobal);

  console.log(`\n\x1b[32m   ✔ Concluída: ${uploads} enviados | ${jaNoR2} já no R2 | ${vinculados} vinculados no banco.\x1b[0m`);

  return { arquivosCount: totalParaProcessar, uploads, jaNoR2, vinculados };
}

// ============================================================================
// EXECUÇÃO DO ROBÔ COMPLETO
// ============================================================================
async function runRobot() {
  const startTime = Date.now();
  console.clear();
  console.log(`\x1b[1m\x1b[35m=======================================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[37m🤖 VACATIO APP — ROBÔ DE SINCRONIZAÇÃO DE ÁUDIOS PARA O CLOUDFLARE R2\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m=======================================================================\x1b[0m`);
  console.log(`\x1b[90mDestino R2:\x1b[0m ${R2_CONFIG.bucketName} (${R2_CONFIG.publicUrl})`);
  console.log(`\x1b[90mBanco Leis:\x1b[0m ${LEIS_SUPABASE_URL}`);

  const leisData = JSON.parse(fs.readFileSync('scripts/drive_72_leis_mapeadas.json', 'utf8'));

  // Argumentos da linha de comando
  const args = process.argv.slice(2);
  const argLei = args.find((a) => a.startsWith('--lei='))?.split('=')[1]?.toLowerCase();
  const argCat = args.find((a) => a.startsWith('--categoria='))?.split('=')[1]?.toLowerCase();
  const argStart = parseInt(args.find((a) => a.startsWith('--start='))?.split('=')[1] || '1', 10);

  let listaParaRodar = leisData;
  if (argLei) {
    listaParaRodar = leisData.filter(
      (l) => l.lei_slug.toLowerCase() === argLei || l.lei_sigla.toLowerCase() === argLei
    );
  } else if (argCat) {
    listaParaRodar = leisData.filter((l) => CATEGORIA_SLUGS[l.lei_slug] === argCat);
  }

  if (argStart > 1) {
    listaParaRodar = listaParaRodar.filter((l) => l.posicao >= argStart);
  }

  console.log(`\n📊 \x1b[1mPlano de Execução:\x1b[0m ${listaParaRodar.length} leis selecionadas para processamento.`);

  const progresso = loadProgress();

  // Métrica global
  const estimativaTotalAudios = listaParaRodar.reduce((acc, cur) => acc + (cur.total_artigos || 50), 0);
  const metricas = {
    inicioMs: Date.now(),
    estimativaTotalAudios,
    audiosProcessadosTotal: 0,
  };

  let leisConcluidas = 0;
  for (let i = 0; i < listaParaRodar.length; i++) {
    const item = listaParaRodar[i];
    await processarLei(item, progresso, metricas);
    leisConcluidas++;

    const tempoDecorrido = Date.now() - startTime;
    console.log(
      `\x1b[90mProgresso de Leis: ${leisConcluidas}/${listaParaRodar.length} concluídas | ` +
      `Tempo decorrido: ${formatDuration(tempoDecorrido)}\x1b[0m`
    );
  }

  const tempoFinal = Date.now() - startTime;
  console.log(`\n\x1b[1m\x1b[32m🎉🎉🎉 PROCESSO CONCLUÍDO COM SUCESSO! 🎉🎉🎉\x1b[0m`);
  console.log(`\x1b[37mTempo total de execução:\x1b[0m ${formatDuration(tempoFinal)}`);
  console.log(`\x1b[37mLeis processadas:\x1b[0m ${leisConcluidas} de ${listaParaRodar.length}`);
}

runRobot().catch((err) => {
  console.error(`\x1b[31mErro fatal no robô:\x1b[0m`, err);
  process.exit(1);
});
