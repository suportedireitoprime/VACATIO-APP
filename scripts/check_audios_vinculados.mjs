import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function check() {
  const { data: leis } = await supabase.from('vade_mecum_leis').select('id, slug, nome, categoria');
  console.log('=== CONTAGEM DE ÁUDIOS VINCULADOS NO BANCO ===');
  for (const l of leis) {
    const { count } = await supabase
      .from('vade_mecum_artigos')
      .select('*', { count: 'exact', head: true })
      .eq('lei_id', l.id)
      .not('narracao_url', 'is', null)
      .neq('narracao_url', '');
    if (count > 0) {
      console.log(`• ${l.nome} (${l.slug}): ${count} artigos com áudio no R2`);
    }
  }
}
check();
