async function crawl(folderId, folderName = 'root', visited = new Set(), results = []) {
  if (visited.has(folderId)) return results;
  visited.add(folderId);

  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  let html = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!res.ok) return results;
    html = await res.text();
  } catch (e) {
    console.error(`Erro ao acessar folder ${folderName}:`, e.message);
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
      results.push({ id, title, folderName });
    }
  }

  for (const sub of subfolders) {
    await crawl(sub.id, `${folderName} > ${sub.title}`, visited, results);
  }

  return results;
}

async function run() {
  console.log('Crawling CTN recursively...');
  const t0 = Date.now();
  const ctnRootId = '1f-HRVj3yTZNqTBQ2KEnmmYEgvoQas7Yb';
  const files = await crawl(ctnRootId, 'CTN');
  console.log(`Crawl finalizado em ${(Date.now() - t0) / 1000}s!`);
  console.log(`Total de arquivos encontrados: ${files.length}`);

  // Deduplicar por id
  const unique = new Map();
  for (const f of files) {
    unique.set(f.id, f);
  }
  console.log(`Total de arquivos únicos: ${unique.size}`);

  // Extrair números de artigos
  const arts = new Set();
  for (const f of unique.values()) {
    const m = f.title.match(/(?:art(?:igo)?|_art)?[\s_.-]*0*(\d+)/i);
    if (m) arts.add(Number(m[1]));
  }
  const sortedArts = Array.from(arts).sort((a,b) => a - b);
  console.log(`Total de artigos distintos: ${sortedArts.length}`);
  console.log(`Menor artigo: ${sortedArts[0]}, Maior artigo: ${sortedArts[sortedArts.length - 1]}`);
  console.log('Primeiros 10:', sortedArts.slice(0, 10));
  console.log('Últimos 10:', sortedArts.slice(-10));
}

run();
