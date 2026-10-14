import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CPP_LEI_ID = '246e8691-ebe2-478d-991d-f3930635151a';
const CP_LEI_ID = 'cf9e9292-4fe0-4b23-ae89-611edbb92503';

export function normalizarNumero(str) {
  if (!str) return '';
  if (/título|capítulo|livro/i.test(str)) return '';
  
  let clean = str
    .replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '')
    .replace(/^(cpp|cp|clt|cf|cc)[\s_.-]*/i, '')
    .replace(/^art(?:igo)?[\s_.-]*/i, '')
    .replace(/^_+/, '')
    .trim();

  // Com sufixo letra (ex: 3º-A, 3-b, 3-b_1791933764555)
  const mLetra = clean.match(/^(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])(?:_\d+)?$/i);
  if (mLetra) {
    const n = parseInt(mLetra[1], 10);
    const l = mLetra[2].toUpperCase();
    return `${n}-${l}`;
  }

  // Com timestamp de storage (ex: 1_1791933756627 ou 100_1791933447946)
  const mStorageNum = clean.match(/^(\d+)(?:_\d+)?$/);
  if (mStorageNum) {
    return String(parseInt(mStorageNum[1], 10));
  }

  // Com ordinal (ex: 1º, 2°)
  const mNum = clean.match(/^(\d+)(?:[º°o]|\.º)?$/i);
  if (mNum) {
    return String(parseInt(mNum[1], 10));
  }

  return clean.toLowerCase();
}

function withTimeout(promise, ms, desc = 'operação') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout de ${ms}ms excedido em ${desc}`)), ms))
  ]);
}

// Pastas a processar
const TODAS_AS_PASTAS = [
  // --- CÓDIGO PENAL (CP) ---
  { id: '1IwO3rzWUCFvmbGIlwLvQQtX4eSXXXYQW', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Arts. 1 a 10' },
  { id: '1tN2wQLvjUlis3JDf13nz8HZOubxfkSW7', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Arts. 11 a 90' },
  { id: '1gTkaokHSmPi8P_nKibpvCzkggHF6IMnS', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Arts. 91 a 170' },
  { id: '1voO27ra1eMx4xVfAAe-PgXD763ixdBIh', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Arts. 171 a 250' },
  { id: '1sLyUNvIfDOQ2zqSxlbVhZtsH2KDzIh_4', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Arts. 251 a 330' },
  { id: '1NiUAofr02jnMxARuqBtNeJkl5xUEFLuu', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Arts. 331 a 361' },

  // --- CÓDIGO DE PROCESSO PENAL (CPP) ---
  { id: '1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 1 a 12' },
  { id: '14zMqGkUVSr-TIHmWn-ftH7feyGL567fI', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 13 a 90' },
  { id: '1NNX36F0_Vcs2rJlLtMzhSGKFyjlaa4mH', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 91 a 170' },
  { id: '1eBc1L6J7iFO_fKmPlRluBAEsRnosYMxX', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 171 a 250' },
  { id: '1gBYt1-Rk3NhEyRzZdAsq_a7v66GCo5uc', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 251 a 330' },
  { id: '1qtCGQlhHOG4uHDJD5QrWT_sCylDZmSVK', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 331 a 410' },
  { id: '1muhAwkDaEkyRtkdKJWyBZ3Nc4tp8B8L-', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 411 a 490' },
  { id: '1kE0TDWIUChHVgpQx79qG2QJZ5ETWGByP', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 571 a 650' },
  { id: '11E0jm5ymXY0DTNF60YaLe6iI6pk_E6j4', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 651 a 730' },
  { id: '1Wsgtw_Tmbw7TDCehWBCHmleO2rSlPRSl', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP Arts. 731 a 811' },
];

async function carregarTodosArtigos(leiId) {
  let artigos = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('vade_mecum_artigos')
      .select('id, numero, narracao_url')
      .eq('lei_id', leiId)
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    artigos = artigos.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return artigos;
}

async function main() {
  console.log('=== SINCRONIZADOR MESTRE: GOOGLE DRIVE -> SUPABASE STORAGE -> BANCO ===');

  const [artigosCPP, artigosCP] = await Promise.all([
    carregarTodosArtigos(CPP_LEI_ID),
    carregarTodosArtigos(CP_LEI_ID),
  ]);

  const mapArtigosCPP = new Map(artigosCPP.map(a => [normalizarNumero(a.numero), a]).filter(([k]) => !!k));
  const mapArtigosCP = new Map(artigosCP.map(a => [normalizarNumero(a.numero), a]).filter(([k]) => !!k));

  console.log(`Artigos mapeados no banco: CPP=${mapArtigosCPP.size}, CP=${mapArtigosCP.size}`);

  // Carregar arquivos já existentes no storage
  const { data: storageCPP } = await supabase.storage.from('narracoes').list('vademecum/cpp', { limit: 1000 });
  const { data: storageCP } = await supabase.storage.from('narracoes').list('vademecum/cp', { limit: 1000 });

  const storageMapCPP = new Map((storageCPP || []).map(f => [normalizarNumero(f.name), f.name]).filter(([k]) => !!k));
  const storageMapCP = new Map((storageCP || []).map(f => [normalizarNumero(f.name), f.name]).filter(([k]) => !!k));

  console.log(`Chaves únicas no Storage: CPP=${storageMapCPP.size}, CP=${storageMapCP.size}`);

  // Iniciar Puppeteer
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let totalUploads = 0;
  let totalVinculados = 0;

  for (const pasta of TODAS_AS_PASTAS) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`📂 Lendo pasta: ${pasta.name} (${pasta.slug.toUpperCase()})`);

    const mapArtigos = pasta.slug === 'cpp' ? mapArtigosCPP : mapArtigosCP;
    const storageMap = pasta.slug === 'cpp' ? storageMapCPP : storageMapCP;

    let items = [];
    try {
      await page.goto(`https://drive.google.com/drive/folders/${pasta.id}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 2500));

      // Scroll para carregar todos os arquivos da pasta
      for (let s = 0; s < 12; s++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await new Promise(r => setTimeout(r, 350));
      }

      items = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
          const id = el.getAttribute('data-id');
          const text = el.innerText || '';
          if (id && text && (text.includes('.mp3') || text.includes('.wav') || text.includes('Art') || text.includes('CP'))) {
            const firstLine = text.split('\n')[0].trim();
            // Ignora títulos de pastas
            if (!firstLine.toLowerCase().includes('arts.') && !firstLine.toLowerCase().includes('narrações')) {
              list.push({ id, name: firstLine });
            }
          }
        });
        return list;
      });
    } catch (errNav) {
      console.warn(`Erro ao navegar para pasta ${pasta.name}:`, errNav.message);
      continue;
    }

    const uniqueFiles = Array.from(new Map(items.map(i => [i.id, i])).values())
      .filter(f => !f.id.startsWith('_gd') && f.id.length > 15);

    console.log(`Arquivos de áudio na pasta: ${uniqueFiles.length}`);

    for (const f of uniqueFiles) {
      const chave = normalizarNumero(f.name);
      if (!chave) {
        // Ignora arquivos que não são artigos
        continue;
      }

      let storageFileName = storageMap.get(chave);
      let publicUrl = null;

      if (storageFileName) {
        // Já existe no Storage!
        const { data: pubData } = supabase.storage.from('narracoes').getPublicUrl(`vademecum/${pasta.slug}/${storageFileName}`);
        publicUrl = pubData?.publicUrl;
      } else {
        // Precisa baixar do Drive e subir para o Supabase Storage!
        console.log(`⬇️ Baixando do Drive: "${f.name}" (Art. ${chave})...`);
        const downloadUrls = [
          `https://drive.usercontent.google.com/download?id=${f.id}&export=download`,
          `https://drive.google.com/uc?export=download&id=${f.id}`
        ];

        let buffer = null;
        for (const u of downloadUrls) {
          try {
            const res = await withTimeout(fetch(u), 15000, `download ${chave}`);
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
          console.warn(`   ⚠️ Falha ao baixar ${f.name} (id: ${f.id})`);
          continue;
        }

        storageFileName = `art_${chave.toLowerCase()}_${Date.now()}.mp3`;
        const storagePath = `vademecum/${pasta.slug}/${storageFileName}`;

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
          publicUrl = pubData.publicUrl;
          storageMap.set(chave, storageFileName);
          totalUploads++;
          console.log(`   ⬆️ Salvo no Storage: ${storagePath}`);
        } catch (errUp) {
          console.warn(`   ⚠️ Falha no upload de ${storagePath}:`, errUp.message);
          continue;
        }
      }

      // Agora vincula no Banco de Dados (vade_mecum_artigos + narracoes_artigos)
      if (publicUrl) {
        const art = mapArtigos.get(chave);
        if (art) {
          if (art.narracao_url !== publicUrl) {
            await supabase.from('vade_mecum_artigos').update({ narracao_url: publicUrl }).eq('id', art.id);
            art.narracao_url = publicUrl;
            totalVinculados++;
            console.log(`   🔗 Vinculado ao artigo ${art.numero} no Vade Mecum!`);
          }

          // Upsert em narracoes_artigos
          try {
            await supabase.from('narracoes_artigos').upsert(
              {
                tabela_nome: pasta.slug,
                artigo_numero: art.numero,
                lei_nome: pasta.leiNome,
                audio_url: publicUrl,
              },
              { onConflict: 'tabela_nome,artigo_numero' }
            );
          } catch {}
        } else {
          // Salva em narracoes_artigos mesmo se não estiver na tabela vade_mecum_artigos
          try {
            await supabase.from('narracoes_artigos').upsert(
              {
                tabela_nome: pasta.slug,
                artigo_numero: `Art. ${chave}`,
                lei_nome: pasta.leiNome,
                audio_url: publicUrl,
              },
              { onConflict: 'tabela_nome,artigo_numero' }
            );
          } catch {}
        }
      }
    }
  }

  await browser.close();

  console.log(`\n=========================================================`);
  console.log(`🎉 SINCRONIZAÇÃO COMPLETA FINALIZADA COM SUCESSO!`);
  console.log(`- Novos arquivos enviados para o Storage: ${totalUploads}`);
  console.log(`- Artigos vinculados no Vade Mecum: ${totalVinculados}`);
  console.log(`=========================================================`);
}

main().catch(console.error);
