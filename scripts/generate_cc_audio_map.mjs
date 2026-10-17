import fs from 'fs';

async function fetchEntriesFromFolder(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!res.ok) return [];
  const html = await res.text();
  const re = /class="flip-entry"\s+id="entry-([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
  let match;
  const items = [];
  while ((match = re.exec(html)) !== null) {
    items.push({ id: match[1], title: match[2].trim() });
  }
  return items;
}

function parseArtigoNum(title) {
  const clean = title.replace(/\.(mp3|wav|m4a|ogg|opus)$/i, '').trim();
  const m = clean.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)(?:[º°o]|\.º)?(?:-([a-zA-Z]))?/i);
  if (!m) return null;
  const num = m[1];
  const suf = m[2] ? `-${m[2].toLowerCase()}` : '';
  return `${num}${suf}`;
}

async function buildMap() {
  console.log('--- Generating Código Civil Drive Audio Map ---');
  const rootId = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  const rootEntries = await fetchEntriesFromFolder(rootId);
  const subfolders = rootEntries.filter(e => !/\.(mp3|wav|m4a|ogg)/i.test(e.title));
  const directAudios = rootEntries.filter(e => /\.(mp3|wav|m4a|ogg)/i.test(e.title));

  const audioMap = {}; // key -> drive download url
  let count = 0;

  for (const a of directAudios) {
    const k = parseArtigoNum(a.title);
    if (k && !audioMap[k]) {
      audioMap[k] = `https://drive.google.com/uc?export=download&id=${a.id}`;
      count++;
    }
  }

  for (let i = 0; i < subfolders.length; i++) {
    const folder = subfolders[i];
    try {
      const files = await fetchEntriesFromFolder(folder.id);
      for (const f of files) {
        const k = parseArtigoNum(f.title);
        if (k && !audioMap[k]) {
          audioMap[k] = `https://drive.google.com/uc?export=download&id=${f.id}`;
          count++;
        }
      }
    } catch (e) {
      console.warn(`Error on ${folder.title}:`, e.message);
    }
    if ((i + 1) % 25 === 0 || i === subfolders.length - 1) {
      console.log(`Progress: ${i + 1}/${subfolders.length} folders scanned, ${count} unique articles mapped.`);
    }
  }

  console.log(`\nWriting ${Object.keys(audioMap).length} mapped articles to src/data/codigoCivilAudioDriveMap.json...`);
  fs.writeFileSync('src/data/codigoCivilAudioDriveMap.json', JSON.stringify(audioMap, null, 2), 'utf-8');
  console.log('✓ Successfully wrote src/data/codigoCivilAudioDriveMap.json!');
}

buildMap().catch(console.error);
