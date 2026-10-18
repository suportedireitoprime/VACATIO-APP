import puppeteer from 'puppeteer';
import fs from 'fs';

async function main() {
  console.log('=== TESTANDO ESTRUTURA INTERNA DE PASTAS DO DRIVE ===\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Testar CTN (1f-HRVj3yTZNqTBQ2KEnmmYEgvoQas7Yb)
  console.log('Acessando CTN...');
  await page.goto('https://drive.google.com/drive/folders/1f-HRVj3yTZNqTBQ2KEnmmYEgvoQas7Yb', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const ctnSubfolders = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text) {
        list.push({ id, name: text.split('\n')[0].trim() });
      }
    });
    return list;
  });

  console.log('Subpastas encontradas no CTN:', ctnSubfolders);

  // Se houver subpastas, entra na primeira
  if (ctnSubfolders.length > 0) {
    const firstSub = ctnSubfolders.find(s => s.name.includes('Sistema Tributário') || s.name.includes('01.'));
    if (firstSub) {
      console.log(`\nEntrando na subpasta "${firstSub.name}" (${firstSub.id})...`);
      await page.goto(`https://drive.google.com/drive/folders/${firstSub.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));

      const files = await page.evaluate(() => {
        const list = [];
        document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
          const id = el.getAttribute('data-id');
          const text = el.innerText || '';
          if (id && text) {
            list.push({ id, name: text.split('\n')[0].trim() });
          }
        });
        return list;
      });

      console.log(`Arquivos encontrados na subpasta (total ${files.length}):`, files.slice(0, 10));
    }
  }

  // Testar estatutos (1k6TKqrGxGwbHb8Ym0b-V3iWLI3IEC8KQ)
  console.log('\n\nAcessando pasta "estatutos"...');
  await page.goto('https://drive.google.com/drive/folders/1k6TKqrGxGwbHb8Ym0b-V3iWLI3IEC8KQ', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const estatutosSub = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text) {
        list.push({ id, name: text.split('\n')[0].trim() });
      }
    });
    return list;
  });

  console.log('Estatutos encontrados dentro da pasta estatutos:', estatutosSub);

  await browser.close();
}

main();
