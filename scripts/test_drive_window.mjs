import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  await page.goto('https://drive.google.com/drive/folders/1DgdBXmXEjeSyxABAfBf_jl_c3qr6-MBO', { waitUntil: 'networkidle2' });
  
  const driveData = await page.evaluate(() => {
    try {
      const str = JSON.stringify(window._DRIVE_ivd);
      return { len: str ? str.length : 0, snippet: str ? str.slice(0, 1000) : null };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Drive ivd data:', driveData);
  await browser.close();
}
test();
