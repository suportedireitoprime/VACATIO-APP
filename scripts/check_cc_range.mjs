import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data: files } = await supabase.storage.from('narracoes').list('vademecum/cc', { limit: 5000 });
  console.log('Total files in vademecum/cc:', files?.length);
  const nums = files.map(f => {
    const m = f.name.match(/\d+/);
    return m ? Number(m[0]) : null;
  }).filter(n => n !== null).sort((a,b) => a - b);
  console.log('Min article num:', nums[0], 'Max article num:', nums[nums.length - 1]);
  console.log('Total numbers parsed:', nums.length);
  console.log('Unique numbers:', new Set(nums).size);
}
check();
