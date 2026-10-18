import puppeteer from 'puppeteer';
import fs from 'fs';

const folderIds = JSON.parse(fs.readFileSync('scripts/drive_folders_enviadas.json', 'utf-8'));

async function main() {
  console.log(`=== INSPECIONANDO ${folderIds.length} PASTAS DO GOOGLE DRIVE ===\n`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const resultado = [];

  for (let i = 0; i < folderIds.length; i++) {
    const id = folderIds[i];
    const url = `https://drive.google.com/drive/folders/${id}`;
    console.log(`[${i + 1}/${folderIds.length}] Acessando: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2500));

      const title = await page.title();
      
      // Tentar pegar o título do elemento no Drive
      const folderName = await page.evaluate(() => {
        const h1 = document.querySelector('h1, [role="heading"], [data-target="title"]');
        if (h1 && h1.innerText) return h1.innerText.trim();
        const header = document.querySelector('[aria-level="1"], .WpHeLc');
        if (header && header.innerText) return header.innerText.trim();
        return document.title.replace(' - Google Drive', '').trim();
      });

      // Contar arquivos visíveis inicialmente
      const items = await page.evaluate(() => {
        const rows = document.querySelectorAll('[data-id], [role="row"]');
        const list = [];
        rows.forEach(el => {
          const text = el.innerText || '';
          if (text) {
            const first = text.split('\n')[0].trim();
            list.push(first);
          }
        });
        return list;
      });

      console.log(`   📁 Nome: "${folderName}" (Título: "${title}")`);
      console.log(`   Itens amostra: ${items.slice(0, 3).join(', ') || 'Nenhum item inicial detectado'}`);

      resultado.push({
        id,
        url,
        folderName,
        title,
        sampleItems: items.slice(0, 5)
      });
    } catch (err) {
      console.error(`   ❌ Erro ao acessar ${id}:`, err.message);
      resultado.push({ id, url, error: err.message });
    }
  }

  await browser.close();
  fs.writeFileSync('scripts/resultado_pastas_drive.json', JSON.stringify(resultado, null, 2));
  console.log('\n=== INSPEÇÃO CONCLUÍDA! Salvo em scripts/resultado_pastas_drive.json ===');
}

main();
