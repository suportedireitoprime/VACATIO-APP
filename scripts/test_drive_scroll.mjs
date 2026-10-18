import puppeteer from 'puppeteer';

async function testScroll() {
  console.log('Testing puppeteer scroll on CTN subfolder...');
  const t0 = Date.now();
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  await page.goto('https://drive.google.com/drive/folders/1DgdBXmXEjeSyxABAfBf_jl_c3qr6-MBO', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const itemsMap = new Map();
  let noNewCount = 0;

  for (let s = 0; s < 30; s++) {
    const batch = await page.evaluate(() => {
      const list = [];
      document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
        const id = el.getAttribute('data-id');
        const text = el.innerText || '';
        if (id && text && (text.includes('.mp3') || text.includes('Art.'))) {
          list.push({ id, name: text.split('\n')[0].trim() });
        }
      });
      return list;
    });

    const prevSize = itemsMap.size;
    for (const b of batch) {
      itemsMap.set(b.id, b.name);
    }

    if (itemsMap.size === prevSize) {
      noNewCount++;
      if (noNewCount >= 3) break;
    } else {
      noNewCount = 0;
    }

    await page.evaluate(() => {
      window.scrollBy(0, 5000);
      const scrollable = document.querySelector('[role="main"]') || document.querySelector('[data-view-id]') || window;
      if (scrollable.scrollBy) scrollable.scrollBy(0, 5000);
    });
    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`Finished in ${(Date.now() - t0) / 1000}s. Total items found: ${itemsMap.size}`);
  const names = Array.from(itemsMap.values()).sort();
  console.log('First 5:', names.slice(0, 5));
  console.log('Last 5:', names.slice(-5));
  await browser.close();
}
testScroll();
