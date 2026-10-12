const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateAllIcons() {
  const input = path.resolve(__dirname, '../src/assets/logo-vacatio-v2.webp');
  console.log('Lendo imagem fonte:', input);

  if (!fs.existsSync(input)) {
    console.error('Arquivo fonte não encontrado:', input);
    process.exit(1);
  }

  // 1. Assets raiz e resources para Capacitor
  await sharp(input).resize(1024, 1024).png().toFile('assets/icon.png');
  await sharp(input).resize(1024, 1024).png().toFile('assets/icon-foreground.png');
  await sharp(input).resize(1024, 1024).png().toFile('resources/icon.png');
  await sharp(input).resize(1024, 1024).png().toFile('resources/icon-foreground.png');
  console.log('✅ assets/ e resources/ gerados');

  // 2. Pasta public/
  await sharp(input).resize(512, 512).png().toFile('public/icon-512.png');
  await sharp(input).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(input).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  await sharp(input).resize(512, 512).png().toFile('public/app-icon.png');
  await sharp(input).resize(32, 32).png().toFile('public/favicon-32x32.png');
  await sharp(input).resize(16, 16).png().toFile('public/favicon-16x16.png');
  await sharp(input).resize(64, 64).png().toFile('public/favicon.png');
  console.log('✅ public/ gerado');

  // 3. Pasta public/assets/icons/
  const iconsDir = path.resolve(__dirname, 'public/assets/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  await sharp(input).resize(48, 48).webp().toFile('public/assets/icons/icon-48.webp');
  await sharp(input).resize(72, 72).webp().toFile('public/assets/icons/icon-72.webp');
  await sharp(input).resize(96, 96).webp().toFile('public/assets/icons/icon-96.webp');
  await sharp(input).resize(128, 128).webp().toFile('public/assets/icons/icon-128.webp');
  await sharp(input).resize(192, 192).webp().toFile('public/assets/icons/icon-192.webp');
  await sharp(input).resize(256, 256).webp().toFile('public/assets/icons/icon-256.webp');
  await sharp(input).resize(512, 512).webp().toFile('public/assets/icons/icon-512.webp');
  console.log('✅ public/assets/icons/ gerado');

  // 4. Android mipmap launchers
  const mipmaps = [
    { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48 },
    { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72 },
    { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96 },
    { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144 },
    { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192 },
  ];

  for (const m of mipmaps) {
    if (fs.existsSync(m.dir)) {
      await sharp(input).resize(m.size, m.size).png().toFile(path.join(m.dir, 'ic_launcher.png'));
      await sharp(input).resize(m.size, m.size).png().toFile(path.join(m.dir, 'ic_launcher_round.png'));
      await sharp(input).resize(m.size, m.size).png().toFile(path.join(m.dir, 'ic_launcher_foreground.png'));
    }
  }
  console.log('✅ Android mipmap launchers atualizados');
}

generateAllIcons().catch((err) => {
  console.error('Erro ao gerar ícones:', err);
  process.exit(1);
});
