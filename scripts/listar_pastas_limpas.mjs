import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/resultado_pastas_drive.json', 'utf-8'));
data.forEach((d, idx) => {
  const cleanTitle = (d.title || '').replace(' - Google Drive', '').trim();
  const subItems = (d.sampleItems || []).filter(s => !s.startsWith('window.WIZ_global_data') && s !== cleanTitle);
  console.log(`${idx + 1}. [${cleanTitle}] (ID: ${d.id})`);
  if (subItems.length > 0) {
    console.log(`   Itens / Subpastas: ${subItems.slice(0, 5).join(' | ')}`);
  }
});
