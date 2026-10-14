import puppeteer from 'puppeteer';

async function listFolder() {
  console.log('Iniciando Puppeteer para inspecionar a pasta do Google Drive...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const folderUrl = 'https://drive.google.com/drive/folders/1dyuU8I6s1CqqlGqTUlewUu2faz9QQssj';
  console.log('Acessando:', folderUrl);
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 45000 });

  // Rola a página várias vezes para carregar tudo
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 600));
  }

  const items = await page.evaluate(() => {
    const list = [];
    // Busca todos os elementos com data-id ou role="row"
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text) {
        const firstLine = text.split('\n')[0].trim();
        list.push({ id, name: firstLine, fullText: text.substring(0, 100) });
      }
    });
    return list;
  });

  // Título da pasta
  const title = await page.title();
  console.log('Título da página:', title);

  await browser.close();

  // Filtrar arquivos únicos
  const map = new Map();
  for (const it of items) {
    if (it.name && !map.has(it.id)) {
      map.set(it.id, it);
    }
  }

  const unique = Array.from(map.values());
  console.log(`Total de itens únicos encontrados: ${unique.length}`);
  console.log('Exemplos de itens:');
  unique.slice(0, 25).forEach(u => console.log(`- [${u.id}] ${u.name}`));

  return unique;
}

listFolder().catch(console.error);
