import puppeteer from 'puppeteer';
import fs from 'fs';

const SUBFOLDERS = [
  { id: '12rGUEHIAbjJtNvkvecX5_WfERDpP8vFL', nome: '01. Filosofia do Direito' },
  { id: '1xX1RhkOTUAw1UE7W5-COMw8NaIvkBrFn', nome: '02. Teoria da Norma Jurídica' },
  { id: '18gGc_leTaTEgcP3UhDy64eEq08oaHfk8', nome: '03. História do Direito' },
  { id: '1rbSSNOBjgP_-A2_33J3DjQSqjofzpJLe', nome: '04. Filosofia do Direito na Antiguidade' },
  { id: '1j1okySTsAsMxfWOn0EGtgDA87ouR6CIr', nome: '05. Filosofia do Direito na Modernidade' },
  { id: '1sxpgodfd2fUz734Jzy-S6Wv10n-FjXh2', nome: '06. Hans Kelsen' },
  { id: '1U2wiXFcMXcvQluZ2pT6wBxZzjcSpibY6', nome: '07. Introdução à Hermenêutica Jurídica' },
  { id: '1Y24fAcBDqdOi-99aKHMysGAxsXKJ-6jI', nome: '08. Hermenêutica e Métodos Interpretativos' },
  { id: '1FdAo2V7yWVaWE63dda-x61GV75a1s8Uj', nome: '09. Introdução ao Estudo do Direito' },
  { id: '1dpNO-pvqs8zk_XL-YrhimOM9yCYxVLBQ', nome: '10. LINDB' },
  { id: '11RXxgDtV9Nb1BaeitNJkI4DXwGmnGzF3', nome: '11. Ciência Política' },
  { id: '1-oWm5fVixJ16A91nFTv5bqJiuy2x_NeW', nome: '12. A Formação do Capitalismo' },
  { id: '1rruhnHZ-Vc_7v7RSWbJwNnz8TfEU3j7v', nome: '13. Pragmatismo Jurídico' },
  { id: '1zzrGOU_8teC9d6FnmllbQQCrRBSrqhHn', nome: '14. Direito Romano' },
  { id: '1xkNJm4WOEKQINc7s8XAUMs2WQkifOgXI', nome: '15. Direito, Psicologia e Neurociência' },
];

async function main() {
  console.log('Iniciando rastreamento de todas as 15 pastas de Filosofia do Direito...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const resultadoCompleto = [];

  for (let i = 0; i < SUBFOLDERS.length; i++) {
    const sub = SUBFOLDERS[i];
    console.log(`[${i + 1}/${SUBFOLDERS.length}] Acessando "${sub.nome}" (${sub.id})...`);
    const url = `https://drive.google.com/drive/folders/${sub.id}`;
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      for (let s = 0; s < 8; s++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await new Promise(r => setTimeout(r, 400));
      }

      const items = await page.evaluate(() => {
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

      const map = new Map();
      for (const it of items) {
        if (it.name && it.name.toLowerCase().endsWith('.mp3') && !map.has(it.id)) {
          map.set(it.id, it);
        }
      }

      const files = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      console.log(`   -> Encontrados ${files.length} arquivos mp3.`);

      resultadoCompleto.push({
        subpasta: sub.nome,
        subpastaId: sub.id,
        totalArquivos: files.length,
        arquivos: files,
      });
    } catch (err) {
      console.error(`Erro ao acessar ${sub.nome}:`, err.message);
    }
  }

  await browser.close();

  const totalGeral = resultadoCompleto.reduce((acc, cur) => acc + cur.totalArquivos, 0);
  console.log(`\n=== FIM DO RASTREAMENTO ===`);
  console.log(`Total geral de áudios encontrados: ${totalGeral}`);

  fs.mkdirSync('scripts/data', { recursive: true });
  fs.writeFileSync(
    'scripts/data/filosofia_do_direito_drive_files.json',
    JSON.stringify(resultadoCompleto, null, 2),
    'utf-8'
  );
  console.log('Salvo em: scripts/data/filosofia_do_direito_drive_files.json');
}

main().catch(console.error);
