import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Acessa a pasta raiz
  await page.goto('https://drive.google.com/drive/folders/1dyuU8I6s1CqqlGqTUlewUu2faz9QQssj', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });

  await new Promise(r => setTimeout(r, 2000));

  // Tenta encontrar a busca do Drive
  const inputs = await page.$$('input');
  console.log(`Inputs encontrados na página: ${inputs.length}`);

  for (let i = 0; i < inputs.length; i++) {
    const aria = await page.evaluate(el => el.getAttribute('aria-label') || el.placeholder || '', inputs[i]);
    console.log(`Input ${i}: ${aria}`);
  }

  // Vamos também verificar o conteúdo das pastas 411 a 490 e 571 a 650 para ver o que tem nelas
  console.log('\n--- Inspecionando Pasta CPP 411 a 490 ---');
  await page.goto('https://drive.google.com/drive/folders/1muhAwkDaEkyRtkdKJWyBZ3Nc4tp8B8L-', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  for (let k = 0; k < 20; k++) {
    await page.keyboard.press('PageDown');
    await new Promise(r => setTimeout(r, 300));
  }
  const f411 = await page.evaluate(() => {
    const arr = [];
    document.querySelectorAll('[data-id]').forEach(el => {
      const text = (el.innerText || '').split('\n')[0].trim();
      if (text && (text.includes('Art') || text.includes('.mp3'))) arr.push(text);
    });
    return Array.from(new Set(arr));
  });
  console.log(`Itens em 411 a 490: ${f411.length}`);
  console.log('Primeiros e ultimos:', f411.slice(0, 5), '...', f411.slice(-5));

  await browser.close();
}

main().catch(console.error);
