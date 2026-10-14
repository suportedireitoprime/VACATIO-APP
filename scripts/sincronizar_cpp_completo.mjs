import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CPP_LEI_ID = '246e8691-ebe2-478d-991d-f3930635151a';

const PASTAS_CPP = [
  { name: 'CPP - Arts. 1 a 12', id: '1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4' },
  { name: 'CPP - Arts. 13 a 90', id: '14zMqGkUVSr-TIHmWn-ftH7feyGL567fI' },
  { name: 'CPP - Arts. 91 a 170', id: '1NNX36F0_Vcs2rJlLtMzhSGKFyjlaa4mH' },
  { name: 'CPP - Arts. 171 a 250', id: '1eBc1L6J7iFO_fKmPlRluBAEsRnosYMxX' },
  { name: 'CPP - Arts. 251 a 330', id: '1gBYt1-Rk3NhEyRzZdAsq_a7v66GCo5uc' },
  { name: 'CPP - Arts. 331 a 410', id: '1qtCGQlhHOG4uHDJD5QrWT_sCylDZmSVK' },
  { name: 'CPP - Arts. 411 a 490', id: '1muhAwkDaEkyRtkdKJWyBZ3Nc4tp8B8L-' },
  { name: 'CPP - Arts. 571 a 650', id: '1kE0TDWIUChHVgpQx79qG2QJZ5ETWGByP' },
  { name: 'CPP - Arts. 651 a 730', id: '11E0jm5ymXY0DTNF60YaLe6iI6pk_E6j4' },
  { name: 'CPP - Arts. 731 a 811', id: '1Wsgtw_Tmbw7TDCehWBCHmleO2rSlPRSl' },
];

function normalizarChaveArtigo(nomeArquivo) {
  let limpo = nomeArquivo.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  limpo = limpo.replace(/^(cpp|cp)[\s_.-]*/i, '');
  limpo = limpo.replace(/^art(?:igo)?[\s_.-]*/i, '');

  const comLetra = limpo.match(/^(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])\b/i);
  if (comLetra) {
    return `${comLetra[1]}-${comLetra[2].toLowerCase()}`;
  }

  const simples = limpo.match(/^(\d+)/);
  if (simples) {
    return simples[1];
  }

  return null;
}

function withTimeout(promise, ms, desc = 'operação') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms em ${desc}`)), ms)),
  ]);
}

async function carregarArtigosDoBanco() {
  const artigos = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero, narracao_url')
      .eq('lei_id', CPP_LEI_ID)
      .range(from, from + size - 1);
    if (!data || data.length === 0) break;
    artigos.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return artigos;
}

async function listarStorageJaExistente() {
  const { data } = await supabase.storage.from('narracoes').list('vademecum/cpp', { limit: 1000 });
  const map = new Map();
  for (const f of data || []) {
    const key = normalizarChaveArtigo(f.name);
    if (key) map.set(key, f.name);
  }
  return map;
}

async function baixarComRetentativas(fileId, fileName) {
  const urls = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];
  for (const url of urls) {
    try {
      const res = await withTimeout(fetch(url), 20000, `download ${fileName}`);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 2000) return buf;
      }
    } catch {}
  }
  return null;
}

async function main() {
  console.log('=== ROBÔ DE SINCRONIZAÇÃO COMPLETA DO CPP ===');
  console.log('Carregando artigos do banco e storage...');
  const [artigosDb, storageExistente] = await Promise.all([
    carregarArtigosDoBanco(),
    listarStorageJaExistente(),
  ]);

  console.log(`Artigos do CPP no banco: ${artigosDb.length}`);
  console.log(`Áudios já existentes no Storage: ${storageExistente.size}`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  let totalBaixadosAgora = 0;
  let totalVinculados = 0;

  for (const pasta of PASTAS_CPP) {
    console.log(`\n==================================================`);
    console.log(`VARRER PASTA: ${pasta.name} (${pasta.id})`);

    await page.goto(`https://drive.google.com/drive/folders/${pasta.id}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await new Promise(r => setTimeout(r, 2500));

    const arquivosMap = new Map();
    let semNovos = 0;

    for (let scroll = 0; scroll < 45; scroll++) {
      const achados = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll('[data-id]').forEach(el => {
          const id = el.getAttribute('data-id');
          const text = (el.innerText || '').split('\n')[0].trim();
          if (id && text && (text.includes('.mp3') || text.includes('.wav') || text.includes('Art'))) {
            list.push({ id, text });
          }
        });
        return list;
      });

      let novos = 0;
      for (const a of achados) {
        if (!arquivosMap.has(a.id)) {
          arquivosMap.set(a.id, a.text);
          novos++;
        }
      }

      await page.keyboard.press('PageDown');
      await new Promise(r => setTimeout(r, 400));

      if (novos === 0) {
        semNovos++;
        if (semNovos >= 10) break;
      } else {
        semNovos = 0;
      }
    }

    const listaArquivos = Array.from(arquivosMap.entries()).map(([id, name]) => ({ id, name }));
    console.log(`Total de áudios encontrados na pasta: ${listaArquivos.length}`);

    for (const f of listaArquivos) {
      const key = normalizarChaveArtigo(f.name);
      if (!key) continue;

      // Se já está no storage
      if (storageExistente.has(key)) {
        const nomeNoStorage = storageExistente.get(key);
        const art = artigosDb.find(a => normalizarChaveArtigo(a.numero) === key);
        if (art && !art.narracao_url) {
          const { data: pubData } = supabase.storage
            .from('narracoes')
            .getPublicUrl(`vademecum/cpp/${nomeNoStorage}`);
          if (pubData?.publicUrl) {
            await supabase.from('vade_mecum_artigos').update({ narracao_url: pubData.publicUrl }).eq('id', art.id);
            totalVinculados++;
          }
        }
        continue;
      }

      console.log(`[BAIXANDO] ${f.name} (Chave Art. ${key})...`);
      const buffer = await baixarComRetentativas(f.id, f.name);
      if (!buffer) {
        console.warn(`[AVISO] Falha ao baixar ${f.name}`);
        continue;
      }

      const ext = f.name.toLowerCase().endsWith('.wav') ? 'wav' : 'mp3';
      const storagePath = `vademecum/cpp/art_${key}_${Date.now()}.${ext}`;

      try {
        const { error: upErr } = await supabase.storage.from('narracoes').upload(storagePath, buffer, {
          contentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
          upsert: true,
        });

        if (upErr) {
          console.error(`Erro no upload de ${storagePath}:`, upErr.message);
          continue;
        }

        totalBaixadosAgora++;
        storageExistente.set(key, storagePath.split('/').pop());

        const { data: pubData } = supabase.storage.from('narracoes').getPublicUrl(storagePath);
        const pubUrl = pubData?.publicUrl;

        const art = artigosDb.find(a => normalizarChaveArtigo(a.numero) === key);
        if (art && pubUrl) {
          await supabase.from('vade_mecum_artigos').update({ narracao_url: pubUrl }).eq('id', art.id);
          totalVinculados++;
        }
        console.log(`-> Salvo com sucesso! (Total novos baixados: ${totalBaixadosAgora})`);
      } catch (err) {
        console.error(`Erro ao subir ${storagePath}:`, err.message);
      }
    }
  }

  await browser.close();
  console.log(`\n=== FINALIZADO COM SUCESSO! ===`);
  console.log(`Novos áudios baixados e enviados ao Storage: ${totalBaixadosAgora}`);
  console.log(`Total de artigos vinculados no banco: ${totalVinculados}`);
}

main().catch(console.error);
