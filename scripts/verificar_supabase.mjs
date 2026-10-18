import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function check() {
  const { data } = await supabase.from('resumos_juridicos').select('*').limit(1);
  if (data && data[0]) {
    console.log('Chaves de resumos_juridicos:', Object.keys(data[0]));
    console.log('Resumo [0]:', {
      id: data[0].id,
      lei_id: data[0].lei_id,
      artigo_numero: data[0].artigo_numero,
      titulo: data[0].titulo,
      pdf_url: data[0].pdf_url,
      audio_url: data[0].audio_url,
    });
  }
}
check();
