import puppeteer from 'puppeteer';

async function checkDrive() {
  console.log('Launching puppeteer to inspect CC Drive folder...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  const folderUrl = 'https://drive.google.com/drive/folders/1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  await page.goto(folderUrl, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Current URL:', page.url());
  const title = await page.title();
  console.log('Page Title:', title);

  // Scroll down multiple times to find all items
  let previousCount = 0;
  let allItems = new Map();

  for (let s = 0; s < 50; s++) {
    const items = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
        const id = el.getAttribute('data-id');
        const text = el.innerText || '';
        if (id && text) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          results.push({ id, text: lines[0], fullText: text });
        }
      });
      return results;
    });

    for (const item of items) {
      allItems.set(item.id, item);
    }

    if (allItems.size > previousCount) {
      console.log(`Scroll ${s + 1}: found ${allItems.size} items so far...`);
      previousCount = allItems.size;
    }

    await page.evaluate(() => {
      const scrollable = document.querySelector('[role="main"]') || window;
      window.scrollBy(0, 3000);
      if (document.querySelector('[role="main"]')) {
        document.querySelector('[role="main"]').scrollBy(0, 3000);
      }
    });
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\nTOTAL UNIQUE ITEMS IN DRIVE: ${allItems.size}`);
  const list = Array.from(allItems.values());
  const audios = list.filter(i => /\.(mp3|wav|m4a|ogg|opus)/i.test(i.text) || /\bArt\b/i.test(i.text));
  const folders = list.filter(i => !/\.(mp3|wav|m4a|ogg|opus|pdf|docx?|zip|rar)/i.test(i.text) && !/\bArt/i.test(i.text));

  console.log(`Audios: ${audios.length}, Folders: ${folders.length}`);
  console.log('Sample items:', list.slice(0, 10).map(i => i.text));
  if (folders.length > 0) {
    console.log('Folders detected:', folders.map(f => ({ id: f.id, name: f.text })));
  }

  await browser.close();
}

checkDrive().catch(console.error);
