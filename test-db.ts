import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('vade_mecum_leis')
    .select('id, slug, nome, nome_curto, categoria');

  if (error) {
    console.error('Error fetching laws:', error);
    return;
  }

  console.log(`Found ${data.length} laws.`);
  // Group by category
  const categories = {};
  data.forEach(l => {
    categories[l.categoria] = (categories[l.categoria] || 0) + 1;
  });
  console.log('Categories:', categories);

  // Print all laws so I can analyze them
  data.forEach(l => {
    console.log(`[${l.categoria}] ${l.nome_curto || ''} - ${l.nome} (${l.slug})`);
  });
}

run();
