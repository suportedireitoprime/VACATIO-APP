import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
  endpoint: getEnv('R2_ENDPOINT') || 'https://f654819db5e99f6d7f9475abf6e3f834.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
  },
});
const bucket = getEnv('VITE_R2_BUCKET_NAME') || 'vacatio-midias';
const publicUrl = (getEnv('VITE_R2_PUBLIC_URL') || 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev').replace(/\/+$/, '');

const CHECKPOINT_FILE = 'C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/blog_narracoes_sync_checkpoint.json';

function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    }
  } catch {}
  return { completed: {}, failed: {} };
}

function saveCheckpoint(cp) {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save checkpoint:', err.message);
  }
}

async function fetchWithRetry(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        console.warn(`[Attempt ${attempt}] Status ${res.status} for ${url}. Waiting...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function processItem(row, postMap, checkpoint) {
  const num = parseInt(parseFloat(row.A), 10);
  const title = row.C;
  const rawSec = parseFloat(row.G);
  const durationSec = isNaN(rawSec) ? null : Math.round(rawSec);
  const driveLink = row.H || '';

  const mDrive = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!mDrive) {
    console.error(`Row ${num} has invalid Drive link: ${driveLink}`);
    return;
  }
  const fileId = mDrive[1];

  let post = postMap.get(num);
  let postId = post ? post.id : null;

  if (!postId) {
    if (num === 50) {
      postId = 'artigo-50-quando-voce-precisa-de-um-advogado';
    } else {
      console.error(`Row ${num} not found in DB!`);
      return;
    }
  }

  if (checkpoint.completed[postId]) {
    // Already done
    return;
  }

  const key = `blog/audios/${postId}.mp3`;
  const finalAudioUrl = `${publicUrl}/${key}`;

  console.log(`[${num}/500] Baixando Drive (${fileId}) -> R2 (${key})...`);
  const downloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  const res = await fetchWithRetry(downloadUrl);
  const buf = Buffer.from(await res.arrayBuffer());

  // Upload to R2
  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000',
    })
  );

  // Update or insert in Supabase
  if (num === 50 && !post) {
    await supabase.from('blog_edicao_posts').upsert({
      id: postId,
      titulo: title,
      resumo: 'Saiba quando a lei exige a presença de um advogado e quando você mesmo pode defender seus direitos no Judiciário.',
      categoria: '01 - Leis - o que são e como funcionam',
      autor: 'Redação Vadimeco',
      tempo_leitura_min: Math.round(durationSec ? durationSec / 60 : 11),
      publicado: true,
      data_publicacao: '2026-10-27T00:00:00+00:00',
      audio_url: finalAudioUrl,
      audio_duration_seconds: durationSec,
      audio_voice: 'Professora',
      audio_model: 'avocado_v2:MAI_01',
      audio_generated_at: new Date().toISOString(),
    });
  } else {
    const { error } = await supabase
      .from('blog_edicao_posts')
      .update({
        audio_url: finalAudioUrl,
        audio_duration_seconds: durationSec,
        audio_voice: 'Professora',
        audio_model: 'avocado_v2:MAI_01',
        audio_generated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (error) {
      throw error;
    }
  }

  checkpoint.completed[postId] = {
    num,
    audio_url: finalAudioUrl,
    duration: durationSec,
    bytes: buf.length,
    updated_at: new Date().toISOString(),
  };
  saveCheckpoint(checkpoint);
  console.log(`✓ [${num}/500] Concluído: ${postId} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

async function main() {
  console.log('=== SINCRONIZAÇÃO DE TODAS AS 500 NARRAÇÕES PARA O CLOUDFLARE R2 ===');
  const sheetData = JSON.parse(
    fs.readFileSync('C:/Users/ext_wpereira/.gemini/antigravity-ide/brain/d55a13f8-6106-433c-97c1-d83f43e31272/scratch/sheet2_parsed.json', 'utf8')
  ).slice(1);

  console.log('Total de linhas no Excel:', sheetData.length);

  // Fetch all posts from Supabase
  const { data: posts, error } = await supabase.from('blog_edicao_posts').select('id, titulo');
  if (error) throw error;
  console.log('Total de posts no Supabase:', posts.length);

  const postByNum = new Map();
  posts.forEach((p) => {
    const m = p.id.match(/^artigo-(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      postByNum.set(num, p);
    }
  });

  const checkpoint = loadCheckpoint();
  const alreadyDone = Object.keys(checkpoint.completed).length;
  console.log(`Já concluídos anteriormente: ${alreadyDone}/500`);

  // Concurrency pool
  const CONCURRENCY = 6;
  const queue = [...sheetData];
  let running = 0;
  let finished = 0;
  let failed = 0;

  async function next() {
    if (queue.length === 0) return;
    const row = queue.shift();
    running++;
    try {
      await processItem(row, postByNum, checkpoint);
      finished++;
    } catch (err) {
      failed++;
      console.error(`Erro ao processar linha ${row.A} (${row.C}):`, err.message);
      checkpoint.failed[row.A] = err.message;
      saveCheckpoint(checkpoint);
    } finally {
      running--;
      if (queue.length > 0) {
        await next();
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(next());
  }
  await Promise.all(workers);

  console.log(`=== SINCRONIZAÇÃO FINALIZADA ===`);
  console.log(`Sucessos: ${Object.keys(checkpoint.completed).length}/500`);
  console.log(`Falhas: ${failed}`);
}

main().catch(console.error);
