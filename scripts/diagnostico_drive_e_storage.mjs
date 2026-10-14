import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tlpxubeagmxapkysgobk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('=== 1. VERIFICANDO SUPABASE STORAGE ===');
  const { data: storageCPP, error: errCpp } = await supabase.storage.from('narracoes').list('vademecum/cpp', { limit: 1000 });
  const { data: storageCP, error: errCp } = await supabase.storage.from('narracoes').list('vademecum/cp', { limit: 1000 });

  console.log(`Arquivos em vademecum/cpp: ${storageCPP ? storageCPP.length : 0} (erro: ${errCpp?.message || 'nenhum'})`);
  console.log(`Arquivos em vademecum/cp: ${storageCP ? storageCP.length : 0} (erro: ${errCp?.message || 'nenhum'})`);

  console.log('\n=== 2. VERIFICANDO ARTIGOS NO BANCO DE DADOS ===');
  const { count: countTotalCPP } = await supabase
    .from('vade_mecum_artigos')
    .select('*', { count: 'exact', head: true })
    .eq('lei_id', '246e8691-ebe2-478d-991d-f3930635151a');

  const { count: countVinculadosCPP } = await supabase
    .from('vade_mecum_artigos')
    .select('*', { count: 'exact', head: true })
    .eq('lei_id', '246e8691-ebe2-478d-991d-f3930635151a')
    .not('narracao_url', 'is', null);

  const { count: countTotalCP } = await supabase
    .from('vade_mecum_artigos')
    .select('*', { count: 'exact', head: true })
    .eq('lei_id', 'cf9e9292-4fe0-4b23-ae89-611edbb92503');

  const { count: countVinculadosCP } = await supabase
    .from('vade_mecum_artigos')
    .select('*', { count: 'exact', head: true })
    .eq('lei_id', 'cf9e9292-4fe0-4b23-ae89-611edbb92503')
    .not('narracao_url', 'is', null);

  console.log(`CPP no banco: Total=${countTotalCPP}, com áudio vinculado=${countVinculadosCPP}`);
  console.log(`CP no banco: Total=${countTotalCP}, com áudio vinculado=${countVinculadosCP}`);

  console.log('\n=== 3. INSPECIONANDO GOOGLE DRIVE ===');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Investigar pasta raiz do Drive (Podcasts - Código Penal / CPP)
  const rootUrl = 'https://drive.google.com/drive/folders/1dyuU8I6s1CqqlGqTUlewUu2faz9QQssj';
  await page.goto(rootUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 400));
  }

  const rootItems = await page.evaluate(() => {
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

  const uniqueRoot = Array.from(new Map(rootItems.map(i => [i.id, i])).values());
  console.log(`Subpastas/itens na pasta Raiz: ${uniqueRoot.length}`);
  uniqueRoot.forEach(u => console.log(`  - [${u.id}] ${u.name}`));

  // Inspecionar pasta CP - Narrações (1IwO3rzWUCFvmbGIlwLvQQtX4eSXXXYQW)
  const cpFolder = uniqueRoot.find(u => u.name.toLowerCase().includes('cp -') || u.name.toLowerCase().includes('código penal'));
  if (cpFolder) {
    console.log(`\nInspecionando pasta CP: ${cpFolder.name} (${cpFolder.id})`);
    await page.goto(`https://drive.google.com/drive/folders/${cpFolder.id}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await new Promise(r => setTimeout(r, 400));
    }
    const cpSubItems = await page.evaluate(() => {
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
    const uniqueCp = Array.from(new Map(cpSubItems.map(i => [i.id, i])).values());
    console.log(`Itens na pasta CP: ${uniqueCp.length}`);
    uniqueCp.slice(0, 20).forEach(u => console.log(`  - [${u.id}] ${u.name}`));
  }

  await browser.close();
}

main().catch(console.error);
