async function checkSubfolderFiles() {
  const subfolderId = '1_ny8L6tgyM502fNLZZhcPWusRFukfDpX'; // Da Personalidade e da Capacidade
  const url = `https://drive.google.com/embeddedfolderview?id=${subfolderId}#list`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const html = await res.text();
  console.log('Subfolder html length:', html.length);
  
  // Extract all flip-entry titles and IDs
  const re = /class="flip-entry"\s+id="entry-([^"]+)"[\s\S]*?<div class="flip-entry-title">([^<]+)<\/div>/g;
  let match;
  const items = [];
  while ((match = re.exec(html)) !== null) {
    items.push({ id: match[1], title: match[2] });
  }
  console.log(`Found ${items.length} items in subfolder:`);
  console.log(items.slice(0, 15));
}
checkSubfolderFiles();
