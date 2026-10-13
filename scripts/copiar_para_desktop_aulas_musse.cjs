const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../public/audio_aulas_drive');

const desktopPaths = [
  'C:\\Users\\ext_wpereira\\OneDrive - Vitamina Work Life S.A\\Escritorio\\AULAS MUSSE',
  'C:\\Users\\ext_wpereira\\Desktop\\AULAS MUSSE',
];

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);

    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
      console.log(`Copiado: ${curTarget}`);
    }
  }
}

console.log('=== Copiando estrutura de Áudio Aulas para a Área de Trabalho ===');

for (const dest of desktopPaths) {
  try {
    const parentDir = path.dirname(dest);
    if (fs.existsSync(parentDir)) {
      console.log(`\nCopiando para: ${dest}...`);
      copyFolderRecursiveSync(srcDir, dest);
      console.log(`Sucesso em: ${dest}`);
    }
  } catch (err) {
    console.error(`Erro ao copiar para ${dest}:`, err.message);
  }
}

console.log('\n=== Concluído! Pasta AULAS MUSSE pronta na Área de Trabalho ===');
