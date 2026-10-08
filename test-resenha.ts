import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(url, key);

async function check() {
  const { data: runs, error: e1 } = await supabase.from('radar_leis_runs').select('*').order('criado_em', { ascending: false }).limit(5);
  console.log('--- RUNS ---');
  console.log(runs, e1);

  const { data: atos, error: e2 } = await supabase.from('resenha_diaria').select('data_dou, numero_ato').order('data_dou', { ascending: false }).limit(20);
  console.log('--- ATOS ---');
  console.log(atos, e2);
}
check();
