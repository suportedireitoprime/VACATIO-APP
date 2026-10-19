import fetch from 'node-fetch';
import fs from 'fs';

const FOLDERS = [
  { area: 'Direito Penal', id: '1GnhklC5TPcefkmZJbi2nfdeBwKOS0bXC' },
  { area: 'Direito Constitucional', id: '1qrhg4LBQwwO9QytaWCwyazDuslsyRWXj' },
  { area: 'Direito do Trabalho', id: '1NU2l9lAVaDVL49EaZc1lcCVL8KF2ReQC' },
  { area: 'Direito Ambiental', id: '16M12PS1UQivOEE5Zh6n3J3Ge0BPiz2lr' },
  { area: 'Direito Urbanístico', id: '1WhGLbjHHLaVZ7pAocjQ7d6IU5fI-6Vsg' },
  { area: 'Formação Complementar', id: '1EP_p1zgjA7wTWF-wF52mhqehpaUBn0d0' },
  { area: 'Direito Processual do Trabalho', id: '1J3YSY8QS2JmZibH6x-Rq_iQQ0BtkDFkE' },
  { area: 'Português', id: '1t2_x2BkX8SMpj4NXpRj6NUueBKxkbr09' },
  { area: 'Direito Internacional Privado', id: '1Hwm5ycoFay4NXfMyqKoFibENvp-PZ5kS' },
  { area: 'Direito Desportivo', id: '1naLwp8nFhb81vJFyVa1vcsGimjqpF_5H' },
  { area: 'Direito Financeiro', id: '1-foULZkKGloeV2xTKeDT_41Qaa4hGjcz' },
  { area: 'Direito Empresarial', id: '1NSOBt8u96ZjjI9TTslaVS4b17yRxMCPf' },
  { area: 'Lei Penal Especial', id: '1-PvDG_MbKZDWF7Tjdq5xyPb6YTqAse58' },
  { area: 'Políticas Públicas', id: '1f-RGWzdxAbXqrTDU4VKUqWekgwcetzlp' },
  { area: 'Direito Administrativo', id: '1RHqLwhOgiQM8pYHHr9HlXOfJfi_gVn2w' },
  { area: 'Direito Previdenciário', id: '1askPjQI8_xiC0FwD89YUlXGlLbePrbkT' },
  { area: 'Direitos Humanos', id: '1cfAnJ0YLegH7oMByymH-2grjflqTDGcq' },
  { area: 'Direito Processual Penal', id: '11f7RbK_z9mzB5VWeaulRoTXqmKxWT3Lp' },
];

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

async function fetchEntries(folderId, retries = 3) {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 20000,
      });
      if (res.ok) {
        const html = await res.text();
        const re = /class="flip-entry"\s+id="entry-([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
        let match;
        const items = [];
        const seen = new Set();
        while ((match = re.exec(html)) !== null) {
          const id = match[1];
          const name = match[2].trim();
          if (!seen.has(id)) {
            seen.add(id);
            items.push({ id, name });
          }
        }
        return items;
      }
      if (res.status === 429) {
        console.warn(`[Drive 429] Rate limit ao buscar pasta ${folderId}, aguardando ${attempt * 3}s...`);
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }
  return [];
}

async function main() {
  console.log(`================================================================`);
  console.log(`🔍 INICIANDO MAPEAMENTO DAS 18 ÁREAS DO GOOGLE DRIVE`);
  console.log(`================================================================\n`);

  const inventory = [];
  let totalAudiosGeral = 0;

  for (let i = 0; i < FOLDERS.length; i++) {
    const f = FOLDERS[i];
    const areaSlug = slugify(f.area);
    console.log(`\n[${i + 1}/${FOLDERS.length}] 📂 Mapeando área: "${f.area}" (${f.id})...`);
    
    const rootEntries = await fetchEntries(f.id);
    console.log(`   -> Encontrados ${rootEntries.length} itens na raiz da área.`);

    const subfolders = rootEntries.filter((e) => !e.name.toLowerCase().endsWith('.mp3'));
    const directAudios = rootEntries.filter((e) => e.name.toLowerCase().endsWith('.mp3'));

    const areaResult = {
      area: f.area,
      areaSlug,
      folderId: f.id,
      totalArquivos: 0,
      subpastas: [],
    };

    if (directAudios.length > 0) {
      console.log(`   -> ${directAudios.length} áudios diretos na raiz.`);
      areaResult.subpastas.push({
        subpasta: 'Geral',
        subpastaId: f.id,
        arquivos: directAudios,
      });
      areaResult.totalArquivos += directAudios.length;
    }

    for (let j = 0; j < subfolders.length; j++) {
      const sub = subfolders[j];
      try {
        const files = await fetchEntries(sub.id);
        const audioFiles = files.filter((fl) => fl.name.toLowerCase().endsWith('.mp3'));
        console.log(`      [${j + 1}/${subfolders.length}] 📁 "${sub.name}": ${audioFiles.length} áudios`);
        areaResult.subpastas.push({
          subpasta: sub.name,
          subpastaId: sub.id,
          arquivos: audioFiles,
        });
        areaResult.totalArquivos += audioFiles.length;
      } catch (err) {
        console.error(`      ❌ Erro ao acessar subpasta "${sub.name}":`, err.message);
      }
      // Pequeno delay entre subpastas para não atingir rate-limit
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log(`   ✅ Total de áudios em "${f.area}": ${areaResult.totalArquivos}`);
    totalAudiosGeral += areaResult.totalArquivos;
    inventory.push(areaResult);
  }

  console.log(`\n================================================================`);
  console.log(`🎉 MAPEAMENTO CONCLUÍDO COM SUCESSO!`);
  console.log(`📊 TOTAL GERAL DE ÁUDIOS ENCONTRADOS: ${totalAudiosGeral}`);
  console.log(`================================================================\n`);

  fs.mkdirSync('scripts/data', { recursive: true });
  fs.writeFileSync(
    'scripts/data/audioaulas_18_areas_inventory.json',
    JSON.stringify(inventory, null, 2),
    'utf-8'
  );
  console.log('Inventário salvo em: scripts/data/audioaulas_18_areas_inventory.json');
}

main().catch(console.error);
