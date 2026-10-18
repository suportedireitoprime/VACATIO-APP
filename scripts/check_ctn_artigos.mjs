import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function testArtigos() {
  const ctnId = 'cd50fe48-c5bd-4b1e-a216-a4859b72e94e';
  const { data: artigos, error } = await supabase
    .from('vade_mecum_artigos')
    .select('id, numero, ordem, narracao_url')
    .eq('lei_id', ctnId)
    .order('ordem')
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }
  console.log('Primeiros 10 artigos do CTN no banco:');
  for (const a of artigos) {
    console.log(`- ID: ${a.id} | Numero: "${a.numero}" | Ordem: ${a.ordem} | Narracao: ${a.narracao_url}`);
  }
}
testArtigos();
