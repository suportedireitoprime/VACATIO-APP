/**
 * Converte todas as imagens PNG/JPG do /public/assets/ para WebP comprimido.
 * Mantém transparência (alpha) para PNGs com fundo transparente.
 * 
 * Uso: node scripts/convert-to-webp.mjs
 */
import sharp from 'sharp';
import { readdir, stat, unlink } from 'fs/promises';
import { join, extname, basename } from 'path';

const ASSETS_DIR = join(import.meta.dirname, '..', 'public', 'assets');
const QUALITY = 82; // WebP quality (good balance for mobile)
const MAX_WIDTH = 512; // Max width for cover images (they show at ~150px in cards)

async function convert() {
  const files = await readdir(ASSETS_DIR);
  const images = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f));

  console.log(`Found ${images.length} images to convert\n`);

  for (const file of images) {
    const inputPath = join(ASSETS_DIR, file);
    const name = basename(file, extname(file));
    const outputPath = join(ASSETS_DIR, `${name}.webp`);

    const inputStat = await stat(inputPath);
    const inputSize = inputStat.size;

    const metadata = await sharp(inputPath).metadata();
    const hasAlpha = metadata.hasAlpha;
    const needsResize = metadata.width > MAX_WIDTH;

    let pipeline = sharp(inputPath);

    if (needsResize) {
      pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }

    await pipeline
      .webp({ quality: QUALITY, effort: 6 })
      .toFile(outputPath);

    const outputStat = await stat(outputPath);
    const outputSize = outputStat.size;
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

    console.log(
      `✅ ${file} (${(inputSize / 1024).toFixed(1)}KB) → ${name}.webp (${(outputSize / 1024).toFixed(1)}KB) — ${savings}% smaller` +
      (needsResize ? ` [resized ${metadata.width}→${MAX_WIDTH}px]` : '')
    );
  }

  console.log('\nDone! Update code references from .png/.jpg to .webp');
}

convert().catch(console.error);
