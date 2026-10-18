import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function checkExactCounts() {
  const slugs = ['cp', 'cpp', 'cc', 'eoab', 'clt', 'cf88', 'cpc', 'ctn', 'cdc', 'eca', 'ei', 'epd'];
  console.log('=== CONTAGEM EXATA DE ARTIGOS NO BANCO SUPABASE ===\n');

  for (const s of slugs) {
    const { data: lei } = await supabase.from('vade_mecum_leis').select('id, nome, slug').or(`slug.eq.${s},slug.eq.${s.toUpperCase()}`).limit(1).maybeSingle();
    if (!lei) {
      console.log(`Lei [${s}]: Não encontrada por slug`);
      continue;
    }
    const { count } = await supabase.from('vade_mecum_artigos').select('*', { count: 'exact', head: true }).eq('lei_id', lei.id);
    const { count: comAudio } = await supabase.from('vade_mecum_artigos').select('*', { count: 'exact', head: true }).eq('lei_id', lei.id).not('narracao_url', 'is', null).neq('narracao_url', '');
    console.log(`• ${lei.nome} (${lei.slug}): Total Artigos = ${count} | Artigos com URL de áudio = ${comAudio}`);
  }
}

checkExactCounts();
