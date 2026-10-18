import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const mediaExts = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg', '.mp3', '.mp4', '.webm', '.pdf']);

const allSrc = walk('src/assets');
const allPublic = walk('public');
const all = [...allSrc, ...allPublic].filter(f => mediaExts.has(path.extname(f).toLowerCase()));

console.log(`Total de arquivos de mídia encontrados: ${all.length}`);

const porExt = {};
for (const f of all) {
  const ext = path.extname(f).toLowerCase();
  porExt[ext] = (porExt[ext] || 0) + 1;
}
console.log('Por extensão:', porExt);

// Classificação por pasta/categoria
const categorias = {
  capas: [],
  assets_gerais: [],
  audioaulas: [],
  intros: [],
  sons_efeitos: [],
  outros: []
};

for (const f of all) {
  const norm = f.replace(/\\/g, '/');
  const base = path.basename(norm);
  if (base.startsWith('lei-cover-') || base.startsWith('capa-') || base.startsWith('norma-cover-') || norm.includes('/pessoal/capa-') || base.startsWith('direito-') || base.includes('-cover')) {
    categorias.capas.push(norm);
  } else if (norm.includes('audio_aulas_drive')) {
    categorias.audioaulas.push(norm);
  } else if (norm.includes('/intros/')) {
    categorias.intros.push(norm);
  } else if (norm.endsWith('.mp3')) {
    categorias.sons_efeitos.push(norm);
  } else {
    categorias.assets_gerais.push(norm);
  }
}

console.log('\n--- RESUMO DE CATEGORIAS ---');
console.log(`Capas: ${categorias.capas.length}`);
console.log(`Assets gerais (ilustrações, heros, personas, etc): ${categorias.assets_gerais.length}`);
console.log(`Audioaulas do Drive: ${categorias.audioaulas.length}`);
console.log(`Intros em vídeo: ${categorias.intros.length}`);
console.log(`Efeitos sonoros: ${categorias.sons_efeitos.length}`);

console.log('\nExemplos de Capas:');
console.log(categorias.capas.slice(0, 10));

console.log('\nExemplos de Assets Gerais:');
console.log(categorias.assets_gerais.slice(0, 10));
