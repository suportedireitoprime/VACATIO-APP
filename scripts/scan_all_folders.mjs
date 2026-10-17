import puppeteer from 'puppeteer';

async function scanAllFolders() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  const rootId = '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7';
  await page.goto(`https://drive.google.com/drive/folders/${rootId}`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  // Extract all subfolders from root
  const subfolders = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('[data-id]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = (el.innerText || '').split('\n')[0].trim();
      if (id && text && id !== '_gd' && id !== '1DJ0PJOlGVzLamMc2YfSW8OyvR1qK67g7') {
        list.push({ id, name: text });
      }
    });
    return list;
  });

  console.log(`Found ${subfolders.length} subfolders in root:`);
  let totalAudioFilesAcrossDrive = 0;

  for (let i = 0; i < subfolders.length; i++) {
    const folder = subfolders[i];
    try {
      await page.goto(`https://drive.google.com/drive/folders/${folder.id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const files = await page.evaluate(() => {
        const audioList = [];
        document.querySelectorAll('[data-id]').forEach(el => {
          const id = el.getAttribute('data-id');
          const text = (el.innerText || '').split('\n')[0].trim();
          if (id && text && (/\.(mp3|wav|m4a|ogg)/i.test(text) || /\bArt\b/i.test(text))) {
            audioList.push({ id, name: text });
          }
        });
        return audioList;
      });

      totalAudioFilesAcrossDrive += files.length;
      console.log(`[${i + 1}/${subfolders.length}] "${folder.name}": ${files.length} audios (Total: ${totalAudioFilesAcrossDrive})`);
    } catch (e) {
      console.warn(`Error scanning folder ${folder.name}:`, e.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`GRAND TOTAL AUDIOS IN GOOGLE DRIVE: ${totalAudioFilesAcrossDrive}`);
  console.log(`======================================================`);

  await browser.close();
}

scanAllFolders().catch(console.error);
