import https from 'https';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

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

const CHECKPOINT_FILE = 'C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/blog_process_checkpoint.json';
const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, async (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      try {
        await pipeline(res, fs.createWriteStream(dest));
        resolve();
      } catch (err) {
        reject(err);
      }
    }).on('error', reject);
  });
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
    } else if (style.includes('heading2') || style.includes('título2') || style.includes('titulo2') || style.includes('heading3')) {
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

  return { title: foundTitle, summary: foundSummary, markdown: mdBlocks.join('\n\n'), images: embeddedImages };
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

const twoFiles = [
  {
    folderName: '03 - Senado Federal',
    folderSlug: '03-senado-federal',
    slug: 'artigo-108-o-senado-no-imperio',
    fileId: '1ICPkV1P4kzlmqdSnI5dmT6no8-alNz9C'
  },
  {
    folderName: '04 - Câmara dos Deputados',
    folderSlug: '04-camara-dos-deputados',
    slug: 'artigo-159-ulysses-guimaraes-quem-da-nome-ao-plenario',
    fileId: '1h3r5y9G2gOrT8zVWyHYMtGvGaVZSosCd'
  }
];

async function run() {
  for (const item of twoFiles) {
    const docxPath = `C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/${item.slug}.docx`;
    const unpackDir = `C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/unpack_${item.slug}`;

    console.log(`Downloading ${item.slug}...`);
    const downloadUrl = `https://drive.usercontent.google.com/download?id=${item.fileId}&export=download&confirm=t`;
    await downloadFile(downloadUrl, docxPath);

    if (fs.existsSync(unpackDir)) fs.rmSync(unpackDir, { recursive: true, force: true });
    fs.mkdirSync(unpackDir, { recursive: true });
    try {
      execFileSync('tar', ['-xf', docxPath, '-C', unpackDir]);
    } catch (e) {
      // Tar may warn about null padding, verify if document.xml exists
    }

    const docXmlPath = path.join(unpackDir, 'word', 'document.xml');
    if (!fs.existsSync(docXmlPath)) {
      throw new Error(`Failed to extract document.xml for ${item.slug}`);
    }
    const docXml = fs.readFileSync(docXmlPath, 'utf8');

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
        const r2Key = `blog-vadimeco/${item.folderSlug}/${item.slug}-${baseNoExt}.webp`;
        const uploadedUrl = await uploadImageToR2(webpBuffer, r2Key);

        const relKey = `media/${imgName}`;
        imageR2UrlMap[relKey] = uploadedUrl;
        if (!coverUrl) coverUrl = uploadedUrl;
      }
    }

    const parsed = parseDocxXml(docXml, rels, imageR2UrlMap);
    const title = parsed.title || item.slug.replace(/-/g, ' ');
    const summary = parsed.summary || title;
    const wordCount = parsed.markdown.split(/\s+/).length;
    const tempoLeitura = Math.max(3, Math.round(wordCount / 180));

    const postRecord = {
      id: item.slug,
      titulo: title,
      resumo: summary.slice(0, 300),
      conteudo_md: parsed.markdown,
      categoria: item.folderName,
      imagem_url: coverUrl || `${publicCdn}/blog-vadimeco/default-cover.webp`,
      autor: 'Redação Vadimeco',
      data_publicacao: new Date().toISOString(),
      tempo_leitura_min: tempoLeitura,
      publicado: true,
    };

    const { error: dbError } = await supabase.from('blog_edicao_posts').upsert(postRecord);
    if (dbError) throw dbError;

    console.log(`[SUCCESS 100%] Processed ${item.slug} (${title}) -> ${tempoLeitura} min`);
    checkpoint[`${item.folderSlug}__${item.slug}`] = { id: item.slug, title, coverUrl };
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));

    try { fs.unlinkSync(docxPath); } catch {}
    try { fs.rmSync(unpackDir, { recursive: true, force: true }); } catch {}
  }
}

run().catch(console.error);
