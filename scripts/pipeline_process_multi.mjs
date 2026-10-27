import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execFileSync } from 'child_process';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTQ5MzM5NiwiZXhwIjoyMTA3MDY5Mzk2fQ.uKcOa5aozLwLOinGs4oI-TJuBiTaYTA_Exa-nh5hdCQ';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: getEnv('R2_ENDPOINT'),
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  },
});
const bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicCdn = (getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev').replace(/\/+$/, '');

const foldersData = JSON.parse(
  fs.readFileSync('C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/clean_files_list.json', 'utf8')
);

const CHECKPOINT_FILE = 'C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/blog_process_checkpoint.json';
let checkpoint = {};
if (fs.existsSync(CHECKPOINT_FILE)) {
  try {
    checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch {}
}

function saveCheckpoint() {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

const TEMP_DIR = 'C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/temp_blog_multi';
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function downloadFile(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => stream.close(resolve));
    }).on('error', reject);
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseDocxXml(documentXml, relsMap, imageR2UrlMap) {
  const bodyMatch = documentXml.match(/<w:body>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) return { title: '', summary: '', markdown: '', images: [] };
  const body = bodyMatch[1];

  const elements = body.match(/<(w:p|w:tbl)[\s>][\s\S]*?<\/\1>/g) || [];

  const mdBlocks = [];
  let foundTitle = '';
  let foundSummary = '';
  const embeddedImages = [];
  let isFirstImage = true;

  for (const el of elements) {
    if (el.startsWith('<w:tbl')) {
      const rows = el.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
      if (rows.length === 0) continue;

      const tableData = [];
      for (const row of rows) {
        const cells = row.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [];
        const rowCells = cells.map(cell => {
          const tTags = cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
          return tTags.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join(' ');
        });
        tableData.push(rowCells);
      }

      if (tableData.length > 0) {
        const numCols = Math.max(...tableData.map(r => r.length));
        if (numCols > 0) {
          const mdTable = [];
          const header = tableData[0];
          while (header.length < numCols) header.push('');
          mdTable.push(`| ${header.join(' | ')} |`);
          mdTable.push(`| ${header.map(() => '---').join(' | ')} |`);
          for (let r = 1; r < tableData.length; r++) {
            const row = tableData[r];
            while (row.length < numCols) row.push('');
            mdTable.push(`| ${row.join(' | ')} |`);
          }
          mdBlocks.push(mdTable.join('\n'));
        }
      }
      continue;
    }

    const blipMatches = [...el.matchAll(/r:embed="([^"]+)"/g)];
    if (blipMatches.length > 0) {
      for (const bm of blipMatches) {
        const rId = bm[1];
        const target = relsMap[rId];
        if (target && target.includes('media/')) {
          embeddedImages.push(target);
          const r2Url = imageR2UrlMap[target];
          if (isFirstImage && mdBlocks.length <= 1) {
            isFirstImage = false;
          } else if (r2Url) {
            isFirstImage = false;
            mdBlocks.push(`\n![imagem](${r2Url})\n`);
          }
        }
      }
    }

    const styleMatch = el.match(/<w:pStyle\s+w:val="([^"]+)"/);
    const style = styleMatch ? styleMatch[1].toLowerCase() : '';
    const isListItem = el.includes('<w:numPr');

    const runs = el.match(/<w:r[\s>][\s\S]*?<\/w:r>/g) || [];
    let pText = '';

    for (const run of runs) {
      const isBold = /<w:b(\/>|\s+w:val="(1|true)")/.test(run);
      const isItalic = /<w:i(\/>|\s+w:val="(1|true)")/.test(run);
      const tMatches = run.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const text = tMatches.map(t => t.replace(/<[^>]+>/g, '')).join('');
      if (!text) continue;

      let formatted = text;
      if (isBold && isItalic) formatted = `***${formatted}***`;
      else if (isBold) formatted = `**${formatted}**`;
      else if (isItalic) formatted = `*${formatted}*`;

      pText += formatted;
    }

    pText = pText.trim();
    if (!pText) continue;

    if (!foundTitle) {
      foundTitle = pText.replace(/\*\*/g, '').replace(/\*/g, '');
      continue;
    }

    if (!foundSummary && !pText.startsWith('#') && !isListItem && pText.length > 30) {
      foundSummary = pText.replace(/\*\*/g, '').replace(/\*/g, '');
    }

    if (style.includes('heading1') || style.includes('título1') || style.includes('titulo1')) {
      mdBlocks.push(`## ${pText.replace(/^#+\s*/, '')}`);
    } else if (
      style.includes('heading2') ||
      style.includes('título2') ||
      style.includes('titulo2') ||
      style.includes('heading3')
    ) {
      mdBlocks.push(`### ${pText.replace(/^#+\s*/, '')}`);
    } else if (isListItem) {
      mdBlocks.push(`- ${pText}`);
    } else {
      if (pText.startsWith('**') && pText.endsWith('**') && pText.length < 80 && !pText.includes('.')) {
        mdBlocks.push(`## ${pText.slice(2, -2).trim()}`);
      } else {
        mdBlocks.push(pText);
      }
    }
  }

  return {
    title: foundTitle,
    summary: foundSummary,
    markdown: mdBlocks.join('\n\n'),
    images: embeddedImages
  };
}

async function uploadImageToR2(buffer, r2Key) {
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: r2Key,
    Body: buffer,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  });
  await r2.send(cmd);
  return `${publicCdn}/${r2Key}`;
}

async function processSingleArticle(folder, file, articleIndex) {
  const slug = file.filename.replace(/\.docx?$/i, '');
  const folderSlug = slugify(folder.folderName);
  const checkpointKey = `${folderSlug}__${slug}`;

  if (checkpoint[checkpointKey]) {
    return { skipped: true, slug };
  }

  const uniqueSubId = `${slug}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const docxPath = path.join(TEMP_DIR, `${uniqueSubId}.docx`);
  const unpackDir = path.join(TEMP_DIR, `unpack_${uniqueSubId}`);

  try {
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${file.fileId}&export=download`;
    await downloadFile(downloadUrl, docxPath);

    fs.mkdirSync(unpackDir, { recursive: true });
    execFileSync('tar', ['-xf', docxPath, '-C', unpackDir]);

    const relsXmlPath = path.join(unpackDir, 'word', '_rels', 'document.xml.rels');
    const rels = {};
    if (fs.existsSync(relsXmlPath)) {
      const relsXml = fs.readFileSync(relsXmlPath, 'utf8');
      for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
        rels[m[1]] = m[2];
      }
    }

    const mediaDir = path.join(unpackDir, 'word', 'media');
    const imageR2UrlMap = {};
    let coverUrl = '';

    if (fs.existsSync(mediaDir)) {
      const imageFiles = fs.readdirSync(mediaDir);
      for (const imgName of imageFiles) {
        const fullImgPath = path.join(mediaDir, imgName);
        const imgBuffer = fs.readFileSync(fullImgPath);
        const webpBuffer = await sharp(imgBuffer)
          .resize({ width: 1400, withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();

        const baseNoExt = imgName.replace(/\.[^.]+$/, '');
        const r2Key = `blog-vadimeco/${folderSlug}/${slug}-${baseNoExt}.webp`;
        const uploadedUrl = await uploadImageToR2(webpBuffer, r2Key);

        const relKey = `media/${imgName}`;
        imageR2UrlMap[relKey] = uploadedUrl;
        if (!coverUrl) coverUrl = uploadedUrl;
      }
    }

    const docXmlPath = path.join(unpackDir, 'word', 'document.xml');
    if (!fs.existsSync(docXmlPath)) {
      throw new Error('document.xml not found');
    }
    const docXml = fs.readFileSync(docXmlPath, 'utf8');
    const parsed = parseDocxXml(docXml, rels, imageR2UrlMap);

    const title = parsed.title || slug.replace(/-/g, ' ');
    const summary = parsed.summary || title;
    const wordCount = parsed.markdown.split(/\s+/).length;
    const tempoLeitura = Math.max(3, Math.round(wordCount / 180));

    const baseDate = new Date('2026-10-27T00:00:00Z');
    baseDate.setMinutes(baseDate.getMinutes() - articleIndex * 15);
    const dataPub = baseDate.toISOString();

    const postRecord = {
      id: slug,
      titulo: title,
      resumo: summary.slice(0, 300),
      conteudo_md: parsed.markdown,
      categoria: folder.folderName,
      imagem_url: coverUrl || `${publicCdn}/blog-vadimeco/default-cover.webp`,
      autor: 'Redação Vadimeco',
      data_publicacao: dataPub,
      tempo_leitura_min: tempoLeitura,
      publicado: true,
    };

    const { error: dbError } = await supabase.from('blog_edicao_posts').upsert(postRecord);
    if (dbError) throw dbError;

    checkpoint[checkpointKey] = { id: slug, title, coverUrl };
    saveCheckpoint();

    console.log(`[OK] ${folderSlug} -> ${slug} (${title}) [${tempoLeitura}m]`);
    return { ok: true, slug, title };
  } finally {
    if (fs.existsSync(docxPath)) try { fs.unlinkSync(docxPath); } catch {}
    if (fs.existsSync(unpackDir)) try { fs.rmSync(unpackDir, { recursive: true, force: true }); } catch {}
  }
}

// Concurrency pool
async function asyncPool(limit, items, iteratorFn) {
  const ret = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean).catch(clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}

async function main() {
  const allTasks = [];
  let idx = 0;
  for (const folder of foldersData) {
    for (const file of folder.files) {
      if (file.fileId) {
        allTasks.push({ folder, file, index: idx++ });
      }
    }
  }

  console.log(`Starting multi-worker pipeline for ${allTasks.length} total articles with concurrency 3...`);

  let count = 0;
  await asyncPool(3, allTasks, async (task) => {
    try {
      await processSingleArticle(task.folder, task.file, task.index);
      count++;
      if (count % 10 === 0) {
        console.log(`--- PROGRESS: ${count}/${allTasks.length} articles handled ---`);
      }
    } catch (err) {
      console.error(`Failed ${task.file.filename}:`, err.message);
    }
  });

  console.log(`\nALL DONE! Successfully processed articles.`);
}

main().catch(console.error);
