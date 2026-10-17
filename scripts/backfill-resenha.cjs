const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const months = ['08', '07', '06', '05', '04'];

async function runBackfill() {
  console.log('Starting backfill for months:', months.join(', '));
  for (const m of months) {
    console.log(`\n---> Scraping month ${m}...`);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-resenha-diaria', {
        body: { meses: [m], notify: false }
      });
      if (error) {
        console.error(`Error month ${m}:`, error);
      } else {
        console.log(`Month ${m} result:`, JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error(`Exception month ${m}:`, e);
    }
  }

  // Count total rows in resenha_diaria
  const { count } = await supabase
    .from('resenha_diaria')
    .select('*', { count: 'exact', head: true });
  console.log(`\n=== Total rows now in resenha_diaria: ${count} ===`);
}

runBackfill();
