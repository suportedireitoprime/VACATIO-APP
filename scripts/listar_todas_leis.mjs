import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function main() {
  const { data: leis, error } = await supabase.from('vade_mecum_leis').select('id, slug, nome, categoria');
  if (error) {
    console.error(error);
    return;
  }
  fs.writeFileSync('scripts/todas_leis_supabase.json', JSON.stringify(leis, null, 2), 'utf-8');
  console.log(`Salvo ${leis.length} leis em scripts/todas_leis_supabase.json`);
}
main();
