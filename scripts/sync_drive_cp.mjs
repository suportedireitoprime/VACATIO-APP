import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extrairArtigoKey(nomeArquivo) {
  const semExt = nomeArquivo.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  const matchLetra = semExt.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])\b/i);
  if (matchLetra) {
    return { num: matchLetra[1], sufixo: matchLetra[2].toLowerCase(), key: matchLetra[1] + '-' + matchLetra[2].toLowerCase() };
  }
  const matchSimples = semExt.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?/i);
  if (matchSimples) {
    return { num: matchSimples[1], sufixo: '', key: matchSimples[1] };
  }
  return null;
}

async function sincronizarCP() {
  console.log('=== Iniciando sincronização completa do Código Penal (CP) ===');
  console.log('Conectando ao Supabase:', SUPABASE_URL);

  // 1. Obter a lista de arquivos da pasta CP - Narrações via Chrome
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const folderUrl = 'https://drive.google.com/drive/folders/1IwO3rzWUCFvmbGIlwLvQQtX4eSXXXYQW';
  console.log('Acessando pasta do Drive:', folderUrl);
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Rolar para baixo para garantir que todos os arquivos sejam renderizados
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.scrollBy(0, 1200));
    await new Promise(r => setTimeout(r, 500));
  }

  const rawItems = await page.evaluate(() => {
    const map = new Map();
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text && (text.includes('.mp3') || text.includes('CP Art'))) {
        const firstLine = text.split('\n')[0].trim();
        if (firstLine.includes('.mp3') || firstLine.includes('CP Art')) {
          map.set(id, firstLine);
        }
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  });

  await browser.close();

  console.log(`Encontrados ${rawItems.length} arquivos de áudio no Google Drive.`);

  // 2. Buscar artigos do CP no Supabase
  const leiId = 'cf9e9292-4fe0-4b23-ae89-611edbb92503';
  const { data: artigosDb, error: errDb } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('lei_id', leiId);

  if (errDb) {
    console.error('Erro ao buscar artigos do CP:', errDb);
  }

  console.log(`Artigos cadastrados no banco para o CP: ${artigosDb ? artigosDb.length : 0}`);

  let enviados = 0;

  for (const item of rawItems) {
    const info = extrairArtigoKey(item.name);
    if (!info) {
      console.log('Não foi possível identificar o artigo:', item.name);
      continue;
    }

    console.log(`\nBaixando ${item.name} (Drive ID: ${item.id}) -> Art. ${info.key}...`);

    try {
      const downloadUrl = `https://drive.usercontent.google.com/download?id=${item.id}&export=download`;
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        console.error(`Falha no download (${res.status}):`, downloadUrl);
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`-> Baixado com sucesso: ${(buffer.length / 1024).toFixed(1)} KB`);

      const storagePath = `vademecum/cp/art_${info.key}_${Date.now()}.mp3`;

      // Upload para o Supabase Storage (bucket 'narracoes')
      const { error: upErr } = await supabase.storage
        .from('narracoes')
        .upload(storagePath, buffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (upErr) {
        console.error('-> Erro no upload para Supabase Storage:', upErr);
        continue;
      }

      const { data: pubData } = supabase.storage
        .from('narracoes')
        .getPublicUrl(storagePath);

      const publicUrl = pubData.publicUrl;
      console.log(`-> Salvo com sucesso no Storage: ${publicUrl}`);

      // Atualizar no banco
      const artCorrespondente = artigosDb?.find(a => {
        const clean = String(a.numero || '').trim().toLowerCase().replace(/[º°o\.]/g, '');
        return clean === info.key || clean === info.num;
      });

      if (artCorrespondente) {
        await supabase
          .from('vade_mecum_artigos')
          .update({ narracao_url: publicUrl })
          .eq('id', artCorrespondente.id);

        try {
          await supabase.from('narracoes_artigos').upsert(
            {
              tabela_nome: 'cp',
              artigo_numero: artCorrespondente.numero,
              lei_nome: 'Código Penal',
              audio_url: publicUrl,
            },
            { onConflict: 'tabela_nome,artigo_numero' }
          );
        } catch {}

        console.log(`-> Vinculado ao Artigo ${artCorrespondente.numero} no banco!`);
      }

      enviados++;
    } catch (e) {
      console.error(`Erro ao processar ${item.name}:`, e);
    }
  }

  console.log(`\n🎉 Sincronização finalizada! Total de áudios enviados para o Storage: ${enviados}`);
}

sincronizarCP();
