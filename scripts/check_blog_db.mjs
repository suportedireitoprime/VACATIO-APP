import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`${k}="([^"]+)"`));
  return m ? m[1] : process.env[k];
};

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_PUBLISHABLE_KEY'));

async function check() {
  const { data, error } = await supabase.from('blog_edicao_posts').select('id, titulo, categoria, publicado').limit(10);
  console.log('Error:', error);
  console.log('Posts count in Supabase:', data ? data.length : 0);
  if (data && data.length) {
    console.log(data);
  }
}
check();
