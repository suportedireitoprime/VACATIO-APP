import puppeteer from 'puppeteer';

async function listFolder() {
  console.log('Iniciando Puppeteer para inspecionar pasta de capas no Drive...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const folderUrl = 'https://drive.google.com/drive/folders/15dB8UU9wy4OEw8kWd5o1gTxjz1NnVsV_';
  console.log('Acessando:', folderUrl);
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 45000 });

  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 600));
  }

  const title = await page.title();
  console.log('Título da página:', title);

  const items = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text) {
        const firstLine = text.split('\n')[0].trim();
        list.push({ id, name: firstLine, fullText: text.substring(0, 150) });
      }
    });
    return list;
  });

  await browser.close();

  const map = new Map();
  for (const it of items) {
    if (it.name && !map.has(it.id)) {
      map.set(it.id, it);
    }
  }

  const unique = Array.from(map.values());
  console.log(`Total de itens únicos encontrados: ${unique.length}`);
  console.log('Itens encontrados:');
  unique.forEach((u, idx) => console.log(`${idx + 1}. [${u.id}] ${u.name}`));

  return unique;
}

listFolder().catch(console.error);
