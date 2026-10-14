import puppeteer from 'puppeteer';

async function main() {
  console.log('Iniciando Chromium com Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Acessando pasta raiz NARRAÇÕES MUSE...');
  await page.goto('https://drive.google.com/drive/folders/1dyuU8I6s1CqqlGqTUlewUu2faz9QQssj', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 2000));

  const map = new Map();
  let semNovos = 0;

  for (let step = 1; step <= 40; step++) {
    const itens = await page.evaluate(() => {
      const list = [];
      document.querySelectorAll('[data-id]').forEach(el => {
        const id = el.getAttribute('data-id');
        const text = (el.innerText || '').split('\n')[0].trim();
        if (id && text && !text.includes('drive_fe') && !text.includes('script')) {
          list.push({ id, text });
        }
      });

      // Localiza o elemento com rolagem no Google Drive
      const allDivs = Array.from(document.querySelectorAll('div'));
      const scrollableDiv = allDivs.find(d => {
        const style = window.getComputedStyle(d);
        return (style.overflowY === 'auto' || style.overflowY === 'scroll') && d.scrollHeight > d.clientHeight;
      });

      if (scrollableDiv) {
        scrollableDiv.scrollBy(0, 1000);
      } else {
        window.scrollBy(0, 1000);
      }

      return list;
    });

    let adicionou = 0;
    for (const it of itens) {
      if (!map.has(it.id)) {
        map.set(it.id, it.text);
        adicionou++;
      }
    }

    await page.keyboard.press('PageDown');
    await new Promise(r => setTimeout(r, 500));

    if (adicionou === 0) {
      semNovos++;
      if (semNovos >= 8) {
        console.log(`Parando após ${step} passos sem novos itens.`);
        break;
      }
    } else {
      semNovos = 0;
    }
  }

  console.log(`\n=== TOTAL DE PASTAS/ITENS ENCONTRADOS: ${map.size} ===`);
  const resultado = Array.from(map.entries()).map(([id, text]) => ({ id, text }));
  resultado.forEach(r => console.log(`[${r.id}] --> ${r.text}`));

  await browser.close();
}

main().catch(console.error);
