import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  console.log('--- Checking CC, CP, CPP ---');

  for (const slug of ['cc', 'cp', 'cpp']) {
    const { data: files } = await supabase.storage.from('narracoes').list(`vademecum/${slug}`, { limit: 5000 });
    console.log(`vademecum/${slug} count:`, files?.length);
    if (files && files.length > 0) {
      console.log(`vademecum/${slug} first 5:`, files.slice(0, 5).map(f => f.name));
      console.log(`vademecum/${slug} last 5:`, files.slice(-5).map(f => f.name));
    }
  }

  // Also check table narracoes_artigos if exists
  try {
    const { count: narrCount, error: errNarr } = await supabase
      .from('narracoes_artigos')
      .select('id', { count: 'exact', head: true });
    console.log('narracoes_artigos table count:', narrCount, 'error:', errNarr);

    const { data: sampleNarr } = await supabase
      .from('narracoes_artigos')
      .select('tabela_nome, artigo_numero, audio_url')
      .limit(10);
    console.log('sample narracoes_artigos:', sampleNarr);

    // Group by tabela_nome
    const { data: allNarr } = await supabase
      .from('narracoes_artigos')
      .select('tabela_nome');
    if (allNarr) {
      const counts = {};
      for (const row of allNarr) {
        counts[row.tabela_nome] = (counts[row.tabela_nome] || 0) + 1;
      }
      console.log('narracoes_artigos by tabela_nome:', counts);
    }
  } catch (e) {
    console.log('narracoes_artigos error:', e.message);
  }
}

check().catch(console.error);
