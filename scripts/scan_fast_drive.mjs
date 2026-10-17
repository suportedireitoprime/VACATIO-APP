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

async function scanEntireDrive() {
  console.log('--- Scanning Google Drive Root ---');
  const rootId = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  const rootEntries = await fetchEntriesFromFolder(rootId);
  console.log(`Found ${rootEntries.length} items in root folder`);

  // Separate subfolders vs audios in root
  const subfolders = rootEntries.filter(e => !/\.(mp3|wav|m4a|ogg)/i.test(e.title));
  const directAudios = rootEntries.filter(e => /\.(mp3|wav|m4a|ogg)/i.test(e.title));
  console.log(`Subfolders: ${subfolders.length}, Direct audios: ${directAudios.length}`);

  const allAudios = new Map();
  for (const a of directAudios) {
    allAudios.set(a.id, a);
  }

  for (let i = 0; i < subfolders.length; i++) {
    const folder = subfolders[i];
    try {
      const files = await fetchEntriesFromFolder(folder.id);
      const audioFiles = files.filter(f => /\.(mp3|wav|m4a|ogg)/i.test(f.title) || /\bArt\b/i.test(f.title));
      for (const a of audioFiles) {
        allAudios.set(a.id, { ...a, folderName: folder.title });
      }
      console.log(`[${i + 1}/${subfolders.length}] ${folder.title}: ${audioFiles.length} audios (Accumulated: ${allAudios.size})`);
    } catch (e) {
      console.warn(`Error on folder ${folder.title}:`, e.message);
    }
  }

  console.log('\n======================================================');
  console.log(`GRAND TOTAL UNIQUE AUDIOS FOUND IN DRIVE: ${allAudios.size}`);
  console.log('======================================================');

  // Let's analyze article numbers
  const articleNums = new Set();
  for (const item of allAudios.values()) {
    const m = item.title.match(/(?:art(?:igo)?|_art)?[\s_.-]*(\d+)/i);
    if (m) articleNums.add(Number(m[1]));
  }
  console.log(`Total unique article numbers found: ${articleNums.size}`);
  const sorted = Array.from(articleNums).sort((a,b) => a - b);
  console.log(`Range: Art. ${sorted[0]} to Art. ${sorted[sorted.length - 1]}`);
}

scanEntireDrive().catch(console.error);
