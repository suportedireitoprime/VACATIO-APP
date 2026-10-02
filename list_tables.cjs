const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({ connectionString: 'postgresql://postgres:39433679Wes%23@db.vooaldsmaddplxhcaouw.supabase.co:5432/postgres' });

async function run() {
  await client.connect();
  const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = UPPER(tablename) AND tablename NOT LIKE '%_vade_mecum_%'`);
  const tables = res.rows.map(r => r.tablename);
  console.log('Tables to migrate:', tables.join(', '));
  await client.end();
}
run();
