import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function check() {
  const { count } = await supabase.from('blog_edicao_posts').select('*', { count: 'exact', head: true });
  console.log('FINAL TOTAL ARTICLES IN SUPABASE:', count);

  const { data } = await supabase.from('blog_edicao_posts').select('categoria');
  const catCounts = {};
  for (const r of data || []) {
    catCounts[r.categoria] = (catCounts[r.categoria] || 0) + 1;
  }
  console.log('\n--- CONTAGEM POR CATEGORIA ---');
  Object.keys(catCounts).sort().forEach(k => {
    console.log(`📁 ${k.padEnd(45)} -> ${catCounts[k]} artigos`);
  });
}
check();
