import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function extrairArtigoKey(nomeArquivo) {
  // Ignora nomes de pastas e arquivos genéricos
  if (/^cpp\s*-\s*arts/i.test(nomeArquivo) || /^cp\s*-\s*narra/i.test(nomeArquivo)) {
    return null;
  }

  const semExt = nomeArquivo.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();

  // Caso com sufixo letra (ex: "Art. 3º-A", "CPP Art. 13-A", "CPP_Art_28-A")
  const matchLetra = semExt.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)[\s_.-]*(?:[º°o]|\.º)?[\s_.-]*([a-zA-Z])\b/i);
  if (matchLetra) {
    return {
      num: matchLetra[1],
      sufixo: matchLetra[2].toLowerCase(),
      key: `${matchLetra[1]}-${matchLetra[2].toLowerCase()}`,
      label: `Art. ${matchLetra[1]}-${matchLetra[2].toUpperCase()}`,
    };
  }

  // Caso simples (ex: "Art. 1º", "CPP Art. 12", "art_5")
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

// Timeout helper para não deixar uploads travarem
function withTimeout(promise, ms, desc = 'operação') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout de ${ms}ms excedido em ${desc}`)), ms))
  ]);
}

const CPP_LEI_ID = '246e8691-ebe2-478d-991d-f3930635151a';
const CP_LEI_ID = 'cf9e9292-4fe0-4b23-ae89-611edbb92503';

const PASTAS = [
  // Todas as subpastas do CPP
  { id: '1VFY7Ic2dv9hGzVX8aZboLijh0kaKlMF4', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 1 a 12' },
  { id: '14zMqGkUVSr-TIHmWn-ftH7feyGL567fI', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 13 a 90' },
  { id: '1NNX36F0_Vcs2rJlLtMzhSGKFyjlaa4mH', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 91 a 170' },
  { id: '1eBc1L6J7iFO_fKmPlRluBAEsRnosYMxX', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 171 a 250' },
  { id: '1gBYt1-Rk3NhEyRzZdAsq_a7v66GCo5uc', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 251 a 330' },
  { id: '1qtCGQlhHOG4uHDJD5QrWT_sCylDZmSVK', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 331 a 410' },
  { id: '1muhAwkDaEkyRtkdKJWyBZ3Nc4tp8B8L-', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 411 a 490' },
  { id: '1kE0TDWIUChHVgpQx79qG2QJZ5ETWGByP', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 571 a 650' },
  { id: '11E0jm5ymXY0DTNF60YaLe6iI6pk_E6j4', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 651 a 730' },
  { id: '1Wsgtw_Tmbw7TDCehWBCHmleO2rSlPRSl', slug: 'cpp', leiId: CPP_LEI_ID, leiNome: 'Código de Processo Penal', name: 'CPP 731 a 811' },

  // Pastas do CP (Código Penal)
  { id: '1IwO3rzWUCFvmbGIlwLvQQtX4eSXXXYQW', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'Código Penal', name: 'CP Narrações' },
  { id: '1rsvR4YxmtssBSBf-Ymc3Diwo9P61egfA', slug: 'cp', leiId: CP_LEI_ID, leiNome: 'CP Backup' },
];

async function main() {
  console.log('=== SINCRONIZADOR RESILIENTE DE ÁUDIOS (CPP + CP) ===');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Mapear artigos já no banco
  const { data: artigosCPP } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('lei_id', CPP_LEI_ID);

  const { data: artigosCP } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('lei_id', CP_LEI_ID);

  // Mapear arquivos já no storage
  const { data: existingCPP } = await supabase.storage.from('narracoes').list('vademecum/cpp');
  const { data: existingCP } = await supabase.storage.from('narracoes').list('vademecum/cp');

  const uploadedCppKeys = new Set((existingCPP || []).map(f => extrairArtigoKey(f.name)?.key).filter(Boolean));
  const uploadedCpKeys = new Set((existingCP || []).map(f => extrairArtigoKey(f.name)?.key).filter(Boolean));

  console.log(`Arquivos já prontos no Storage: CPP=${uploadedCppKeys.size}, CP=${uploadedCpKeys.size}`);

  let totalBaixados = 0;
  let totalVinculados = 0;

  for (const pasta of PASTAS) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Processando: ${pasta.name} (${pasta.slug.toUpperCase()})`);

    let files = [];
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        await page.goto(`https://drive.google.com/drive/folders/${pasta.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));

        for (let s = 0; s < 8; s++) {
          await page.evaluate(() => window.scrollBy(0, 1500));
          await new Promise(r => setTimeout(r, 350));
        }

        files = await page.evaluate(() => {
          const map = new Map();
          document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
            const id = el.getAttribute('data-id');
            const text = el.innerText || '';
            if (id && text && (text.includes('.mp3') || text.includes('.wav') || text.includes('Art'))) {
              const firstLine = text.split('\n')[0].trim();
              if (!firstLine.toLowerCase().includes('arts.') && !firstLine.toLowerCase().includes('narrações')) {
                map.set(id, firstLine);
              }
            }
          });
          return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
        });

        if (files.length > 0) break;
      } catch (errNav) {
        console.warn(`Tentativa ${tentativa} na pasta ${pasta.name}: ${errNav.message}`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log(`Arquivos de áudio encontrados: ${files.length}`);

    const uploadedSet = pasta.slug === 'cpp' ? uploadedCppKeys : uploadedCpKeys;
    const artigosList = pasta.slug === 'cpp' ? artigosCPP : artigosCP;

    for (const f of files) {
      const info = extrairArtigoKey(f.name);
      if (!info) continue;

      if (uploadedSet.has(info.key)) {
        // Já está no storage, apenas garante que está vinculado no banco
        const art = artigosList?.find(a => extrairArtigoKey(a.numero)?.key === info.key);
        if (art && !art.narracao_url) {
          const { data: pubData } = supabase.storage
            .from('narracoes')
            .getPublicUrl(`vademecum/${pasta.slug}/art_${info.key}.mp3`);
          if (pubData?.publicUrl) {
            await supabase.from('vade_mecum_artigos').update({ narracao_url: pubData.publicUrl }).eq('id', art.id);
            totalVinculados++;
          }
        }
        continue;
      }

      console.log(`-> Baixando "${f.name}" (Art. ${info.key})...`);

      let buffer = null;
      const downloadUrls = [
        `https://drive.usercontent.google.com/download?id=${f.id}&export=download`,
        `https://drive.google.com/uc?export=download&id=${f.id}`
      ];

      for (const u of downloadUrls) {
        try {
          const res = await withTimeout(fetch(u), 15000, 'download');
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

      // Upload com timeout de 20s
      const storagePath = `vademecum/${pasta.slug}/art_${info.key}_${Date.now()}.mp3`;
      try {
        await withTimeout(
          supabase.storage.from('narracoes').upload(storagePath, buffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          }),
          20000,
          `upload ${storagePath}`
        );

        const { data: pubData } = supabase.storage.from('narracoes').getPublicUrl(storagePath);
        const publicUrl = pubData.publicUrl;
        uploadedSet.add(info.key);
        console.log(`   ✓ Salvo no Storage: ${publicUrl}`);

        // Vincular no banco
        const art = artigosList?.find(a => extrairArtigoKey(a.numero)?.key === info.key);
        if (art) {
          await supabase.from('vade_mecum_artigos').update({ narracao_url: publicUrl }).eq('id', art.id);
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
          totalVinculados++;
          console.log(`   ✓ Vinculado ao ${art.numero}!`);
        } else {
          try {
            await supabase.from('narracoes_artigos').upsert(
              {
                tabela_nome: pasta.slug,
                artigo_numero: info.label,
                lei_nome: pasta.leiNome,
                audio_url: publicUrl,
              },
              { onConflict: 'tabela_nome,artigo_numero' }
            );
            totalVinculados++;
            console.log(`   ✓ Salvo em narracoes_artigos para ${info.label}!`);
          } catch {}
        }
      } catch (errUp) {
        console.warn(`   Falha no upload de ${info.key}:`, errUp.message);
      }
    }
  }

  await browser.close();
  console.log(`\n==================================================`);
  console.log(`SINCRONIZAÇÃO COMPLETA FINALIZADA!`);
  console.log(`Total de áudios novos baixados e enviados: ${totalBaixados}`);
  console.log(`Total de artigos vinculados no banco: ${totalVinculados}`);
  console.log(`==================================================`);
}

main().catch(console.error);
