async function parseEmbeddedView(folderId) {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  
  // Extract items: <div class="flip-entry" ... data-id="..." ...> or links
  // Let's inspect the tags in html
  const entries = [];
  const regex = /<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].trim();
    if (href.includes('drive.google.com') || href.includes('folders/') || href.includes('file/d/')) {
      entries.push({ href, text });
    }
  }
  return { html, entries };
}

async function run() {
  const rootId = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  const { entries, html } = await parseEmbeddedView(rootId);
  console.log(`Found ${entries.length} link entries in embedded view of root`);
  console.log('Sample entries:', entries.slice(0, 15));
  
  // Also look for data-id or drive file IDs
  const fileIds = [];
  const reFiles = /file\/d\/([a-zA-Z0-9_-]+)/g;
  let m;
  while ((m = reFiles.exec(html)) !== null) {
    fileIds.push(m[1]);
  }
  console.log('file/d/ matches:', fileIds.length);

  const folderIds = [];
  const reFolders = /folders\/([a-zA-Z0-9_-]+)/g;
  while ((m = reFolders.exec(html)) !== null) {
    folderIds.push(m[1]);
  }
  console.log('folders/ matches:', new Set(folderIds).size);
}
run();
