import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CP_FOLDER_ID = '1IwO3rzWUCFvmbGIlwLvQQtX4eSXXXYQW';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log(`Navegando para CP - Narrações: ${CP_FOLDER_ID}`);
  await page.goto(`https://drive.google.com/drive/folders/${CP_FOLDER_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise(r => setTimeout(r, 4000));

  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 500));
  }

  const cpFiles = await page.evaluate(() => {
    const list = [];
    document.querySelectorAll('[data-id], [role="row"]').forEach(el => {
      const id = el.getAttribute('data-id');
      const text = el.innerText || '';
      if (id && text) {
        list.push({ id, text: text.split('\n')[0].trim() });
      }
    });
    return list;
  });

  const uniqueCp = Array.from(new Map(cpFiles.map(i => [i.id, i])).values())
    .filter(f => !f.id.startsWith('_gd') && f.id.length > 15);

  console.log(`Arquivos encontrados na pasta CP - Narrações: ${uniqueCp.length}`);
  uniqueCp.forEach(f => console.log(`  - [${f.id}] ${f.text}`));

  await browser.close();
}

main().catch(console.error);
