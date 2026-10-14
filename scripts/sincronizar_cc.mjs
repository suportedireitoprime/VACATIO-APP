import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CC_LEI_ID = '32ae6146-3fd4-42e7-8879-81413f0f41cc';
const CC_DRIVE_FOLDER_ID = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';

function extrairArtigoKey(nomeArquivo) {
  if (!nomeArquivo) return null;
  const semExt = nomeArquivo.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();

  // Caso com sufixo letra (ex: "Art. 10-A", "CC Art. 1-A", "art_12-b")
  const matchLetra = semExt.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])\b/i);
  if (matchLetra) {
    return {
      num: matchLetra[1],
      sufixo: matchLetra[2].toLowerCase(),
      key: `${matchLetra[1]}-${matchLetra[2].toLowerCase()}`,
      label: `Art. ${matchLetra[1]}-${matchLetra[2].toUpperCase()}`,
    };
  }

  // Caso simples (ex: "Art. 1º", "CC Art. 12", "art_5", "1")
  const matchSimples = semExt.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?/i);
  if (matchSimples) {
    const numInt = Number(matchSimples[1]);
    const label = numInt >= 1 && numInt <= 9 ? `Art. ${numInt}º` : `Art. ${numInt}`;
    return {
      num: matchSimples[1],
      sufixo: '',
      key: matchSimples[1],
      label,
    };
  }

  return null;
}

function withTimeout(promise, ms, desc = 'operação') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout de ${ms}ms excedido em ${desc}`)), ms)),
  ]);
}

async function coletarArquivosDePasta(page, folderId, folderName = 'Raiz') {
  console.log(`\nInspecionando pasta do Drive: "${folderName}" (${folderId})...`);
  const url = `https://drive.google.com/drive/folders/${folderId}`;

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  } catch (e) {
    console.warn(`Aviso ao abrir ${folderName}: ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 3000));

  const finalUrl = page.url();
  if (finalUrl.includes('accounts.google.com/v3/signin') || finalUrl.includes('signin/identifier')) {
    console.error(`\n❌ ACESSO RESTRITO NO GOOGLE DRIVE!`);
    console.error(`A pasta https://drive.google.com/drive/folders/${folderId} exige login no Google.`);
    console.error(`Para permitir a sincronização automática dos áudios:`);
    console.error(`1. Acesse o Google Drive com sua conta.`);
    console.error(`2. Clique com botão direito na pasta "${folderName}" > "Compartilhar".`);
    console.error(`3. Em "Acesso geral", mude de "Restrito" para "Qualquer pessoa com o link" (Leitor).`);
    return { restricted: true, files: [], subfolders: [] };
  }

  // Scrolla para carregar itens lazy-loaded
  for (let s = 0; s < 12; s++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 400));
  }

  const itens = await page.evaluate(() => {
    const map = new Map();
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text) {
        const firstLine = text.split('\n')[0].trim();
        // Detecta se é arquivo de áudio ou pasta
        const isAudio = /\.(mp3|wav|m4a|ogg|opus)/i.test(text) || /\bArt(?:igo)?\b/i.test(firstLine);
        const isFolder = !/\.(mp3|wav|m4a|ogg|opus|pdf|docx?|zip|rar)/i.test(firstLine) && !/\bArt/i.test(firstLine);
        map.set(id, { id, name: firstLine, isAudio, isFolder });
      }
    });
    return Array.from(map.values());
  });

  const files = itens.filter(i => i.isAudio);
  const subfolders = itens.filter(i => i.isFolder && i.id !== folderId && i.id !== '_gd');

  console.log(`Itens detectados em "${folderName}": ${files.length} áudio(s), ${subfolders.length} subpasta(s).`);
  return { restricted: false, files, subfolders };
}

export async function sincronizarCodigoCivil() {
  console.log('====================================================');
  console.log('🚀 SINCRONIZADOR DE NARRAÇÕES: CÓDIGO CIVIL (CC)');
  console.log('====================================================');

  console.log('1. Carregando artigos do Código Civil no Supabase...');
  const { data: artigosCC, error: errArtigos } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('lei_id', CC_LEI_ID)
    .order('ordem', { ascending: true });

  if (errArtigos) {
    console.error('Erro ao buscar artigos do CC:', errArtigos);
    return;
  }
  console.log(`Total de artigos cadastrados no CC: ${artigosCC?.length || 0}`);

  console.log('2. Verificando áudios já enviados no Supabase Storage (vademecum/cc)...');
  const { data: existingStorage, error: errStorage } = await supabase.storage
    .from('narracoes')
    .list('vademecum/cc', { limit: 5000 });

  const existingKeys = new Set(
    (existingStorage || []).map(f => extrairArtigoKey(f.name)?.key).filter(Boolean)
  );
  console.log(`Áudios já existentes no Storage: ${existingKeys.size}`);

  console.log('3. Inicializando navegador para explorar Google Drive...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  const filaPastas = [{ id: CC_DRIVE_FOLDER_ID, name: 'Código Civil Raiz' }];
  const todosArquivos = [];
  const pastasProcessadas = new Set();
  let acessoRestrito = false;

  while (filaPastas.length > 0) {
    const pastaAtual = filaPastas.shift();
    if (pastasProcessadas.has(pastaAtual.id)) continue;
    pastasProcessadas.add(pastaAtual.id);

    const res = await coletarArquivosDePasta(page, pastaAtual.id, pastaAtual.name);
    if (res.restricted) {
      acessoRestrito = true;
      break;
    }

    todosArquivos.push(...res.files);
    for (const sub of res.subfolders) {
      if (!pastasProcessadas.has(sub.id)) {
        filaPastas.push({ id: sub.id, name: sub.name });
      }
    }
  }

  await browser.close();

  if (acessoRestrito) {
    console.log('\n❌ Sincronização interrompida devido a permissão restrita da pasta no Google Drive.');
    return { sucesso: false, restrito: true };
  }

  // Remove duplicados de arquivos por ID
  const mapUnicos = new Map();
  for (const f of todosArquivos) {
    mapUnicos.set(f.id, f);
  }
  const arquivosUnicos = Array.from(mapUnicos.values());
  console.log(`\nTotal de arquivos de áudio únicos encontrados no Drive: ${arquivosUnicos.length}`);

  let totalBaixados = 0;
  let totalVinculados = 0;

  for (const f of arquivosUnicos) {
    const info = extrairArtigoKey(f.name);
    if (!info) continue;

    const storagePath = `vademecum/cc/art_${info.key}.mp3`;

    if (existingKeys.has(info.key)) {
      // Já está no storage, apenas garante vinculação no banco
      const art = artigosCC?.find(a => a.numero === info.key || extrairArtigoKey(a.numero)?.key === info.key);
      if (art && !art.narracao_url) {
        const { data: pubData } = supabase.storage.from('narracoes').getPublicUrl(storagePath);
        if (pubData?.publicUrl) {
          await supabase.from('vade_mecum_artigos').update({ narracao_url: pubData.publicUrl }).eq('id', art.id);
          try {
            await supabase.from('narracoes_artigos').upsert(
              {
                tabela_nome: 'cc',
                artigo_numero: art.numero,
                lei_nome: 'Código Civil',
                audio_url: pubData.publicUrl,
              },
              { onConflict: 'tabela_nome,artigo_numero' }
            );
          } catch {}
          totalVinculados++;
          console.log(`✓ Vinculado artigo existente no banco: Art. ${info.key}`);
        }
      }
      continue;
    }

    console.log(`-> Baixando do Drive: "${f.name}" (Art. ${info.key})...`);
    let buffer = null;
    const downloadUrls = [
      `https://drive.usercontent.google.com/download?id=${f.id}&export=download`,
      `https://drive.google.com/uc?export=download&id=${f.id}`,
    ];

    for (const u of downloadUrls) {
      try {
        const res = await withTimeout(fetch(u), 20000, 'download');
        if (res.ok) {
          const ab = await res.arrayBuffer();
          if (ab.byteLength > 1000) {
            buffer = Buffer.from(ab);
            break;
          }
        }
      } catch {}
    }

    if (!buffer) {
      console.warn(`[AVISO] Não foi possível baixar ${f.name}`);
      continue;
    }

    totalBaixados++;

    // Upload para Supabase Storage
    try {
      await withTimeout(
        supabase.storage.from('narracoes').upload(storagePath, buffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        }),
        25000,
        `upload ${storagePath}`
      );

      const { data: pubData } = supabase.storage.from('narracoes').getPublicUrl(storagePath);
      const publicUrl = pubData.publicUrl;
      existingKeys.add(info.key);
      console.log(`   ✓ Salvo no Storage: ${publicUrl}`);

      // Vincular ao artigo no banco de dados
      const art = artigosCC?.find(a => a.numero === info.key || extrairArtigoKey(a.numero)?.key === info.key);
      if (art) {
        await supabase.from('vade_mecum_artigos').update({ narracao_url: publicUrl }).eq('id', art.id);
        try {
          await supabase.from('narracoes_artigos').upsert(
            {
              tabela_nome: 'cc',
              artigo_numero: art.numero,
              lei_nome: 'Código Civil',
              audio_url: publicUrl,
            },
            { onConflict: 'tabela_nome,artigo_numero' }
          );
        } catch {}
        totalVinculados++;
        console.log(`   ✓ Vinculado ao artigo ${art.numero} no banco!`);
      } else {
        try {
          await supabase.from('narracoes_artigos').upsert(
            {
              tabela_nome: 'cc',
              artigo_numero: info.label,
              lei_nome: 'Código Civil',
              audio_url: publicUrl,
            },
            { onConflict: 'tabela_nome,artigo_numero' }
          );
          totalVinculados++;
          console.log(`   ✓ Salvo em narracoes_artigos para ${info.label}!`);
        } catch {}
      }
    } catch (errUp) {
      console.warn(`   Falha no upload do Art. ${info.key}:`, errUp.message);
    }
  }

  console.log('\n====================================================');
  console.log(`SINCRONIZAÇÃO DO CÓDIGO CIVIL CONCLUÍDA!`);
  console.log(`Total de áudios novos baixados e enviados: ${totalBaixados}`);
  console.log(`Total de artigos vinculados no banco: ${totalVinculados}`);
  console.log('====================================================');

  return { sucesso: true, totalBaixados, totalVinculados };
}

// Execução direta via node
if (process.argv[1]?.endsWith('sincronizar_cc.mjs')) {
  sincronizarCodigoCivil().catch(console.error);
}
