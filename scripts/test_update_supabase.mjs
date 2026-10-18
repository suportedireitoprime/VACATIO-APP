import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function testUpdate() {
  const id = 'ffafb6ed-65ba-4066-876d-7691160a4e86';
  const url = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/narracoes/codigos/ctn/Art. 0002.mp3';

  console.log(`Tentando atualizar artigo ${id}...`);
  const { data, error } = await supabase
    .from('vade_mecum_artigos')
    .update({ narracao_url: url })
    .eq('id', id)
    .select();

  const { data: readBack } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, narracao_url')
    .eq('id', id);
  console.log('Artigo lido de volta:', readBack);
}
testUpdate();
