import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
const codigoCivilAudioDriveMap = JSON.parse(fs.readFileSync('src/data/codigoCivilAudioDriveMap.json', 'utf-8'));

async function test() {
  const validSlugs = new Set(['cpp', 'cp', 'cc', 'cdc']);
  const { data: storageFolders } = await supabase.storage.from('narracoes').list('vademecum', { limit: 100 });
  for (const f of storageFolders || []) {
    if (f.name && !f.name.includes('.')) validSlugs.add(f.name.toLowerCase());
  }

  console.log('Valid slugs in storage:', Array.from(validSlugs));

  let totalAudios = 0;
  for (const slug of validSlugs) {
    let count = 0;
    if (slug === 'cc') {
      count = Math.min(2046, Object.keys(codigoCivilAudioDriveMap).length);
    } else {
      const { data: files } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`, { limit: 2000 });
      count = (files || []).filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f.name)).length;
    }
    console.log(`Slug ${slug}: ${count} audios`);
    totalAudios += count;
  }
  console.log(`TOTAL AUDIOS ACROSS ALL LEIS: ${totalAudios}`);
}

test();
