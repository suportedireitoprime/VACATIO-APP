import fs from 'fs';

const progressPath = 'scripts/data/audioaulas_18_areas_upload_progress.json';
const inventoryPath = 'scripts/data/audioaulas_18_areas_inventory.json';

const TOTAL_AULAS = 2101;
const startTime = Date.now();

function renderBar(percent, width = 30) {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function monitor() {
  console.clear();
  console.log('================================================================');
  console.log('🎧 VACATIO APP — MONITOR DE UPLOAD CLOUDFLARE R2');
  console.log('================================================================\n');

  if (!fs.existsSync(progressPath)) {
    console.log('Aguardando inicialização do progresso...');
    return;
  }

  try {
    const raw = fs.readFileSync(progressPath, 'utf-8');
    const data = JSON.parse(raw);
    const keys = Object.keys(data);
    const successItems = keys.filter(k => data[k].status === 'success');
    const count = successItems.length;
    const percent = ((count / TOTAL_AULAS) * 100).toFixed(1);

    let totalBytes = 0;
    for (const k of successItems) {
      totalBytes += data[k].sizeBytes || 0;
    }
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

    const bar = renderBar(parseFloat(percent), 35);

    console.log(` Progresso:  [${bar}] ${percent}%`);
    console.log(` Aulas:      ${count} de ${TOTAL_AULAS} enviadas`);
    console.log(` Volume:     ${totalGb} GB (${totalMb} MB) transferidos`);
    console.log(` Destino:    Cloudflare R2 (bucket: vacatio-midias)`);
    console.log(` CDN:        https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev\n`);

    console.log('--- ÚLTIMAS AULAS ENVIADAS COM SUCESSO ---');
    const last5 = successItems.slice(-6).reverse();
    for (const k of last5) {
      const item = data[k];
      const name = item.fileName || item.name || k.split('/').pop();
      const area = item.area || 'Direito';
      const size = item.sizeMb ? `${item.sizeMb} MB` : 'OK';
      console.log(` ✔ [${area}] ${name} (${size})`);
    }

    console.log('\n----------------------------------------------------------------');
    console.log('Pressione CTRL + C para fechar o monitor (o upload continuará).');
    console.log('----------------------------------------------------------------');
  } catch (err) {
    console.log('Lendo dados de progresso...');
  }
}

monitor();
setInterval(monitor, 1500);
