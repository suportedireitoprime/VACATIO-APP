import fs from 'fs';
import path from 'path';

const driveDir = 'public/audio_aulas_drive';

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: 0 };
  const headers = lines[0].split(/[;,]/).map(h => h.trim().replace(/^"|"$/g, ''));
  return { headers, rows: lines.length - 1, sample: lines.slice(1, 4) };
}

function checkDrive() {
  console.log('=== AUDITORIA DAS PLANILHAS DE ÁUDIO-AULAS (DRIVE) ===\n');
  const files = [];
  const walk = (d) => {
    const list = fs.readdirSync(d);
    for (const item of list) {
      const full = path.join(d, item);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (item.endsWith('.csv')) files.push(full);
    }
  };
  walk(driveDir);

  for (const f of files) {
    const name = path.basename(f);
    const content = fs.readFileSync(f, 'utf-8');
    const { headers, rows, sample } = parseCSV(content);
    console.log(`📁 ${name}`);
    console.log(`   Linhas/Aulas: ${rows} itens`);
    console.log(`   Colunas: ${headers.slice(0, 5).join(' | ')}`);
    console.log(`   Amostra: ${sample[0]?.slice(0, 80)}...\n`);
  }
}

checkDrive();
