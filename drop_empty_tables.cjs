const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({ connectionString: 'postgresql://postgres:39433679Wes%23@db.vooaldsmaddplxhcaouw.supabase.co:5432/postgres' });

async function run() {
  await client.connect();
  const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = UPPER(tablename) AND tablename NOT LIKE '%_vade_mecum_%' AND tablename != 'HISTORICO_ALTERACOES'`);
  const tables = res.rows.map(r => r.tablename);
  
  for (const table of tables) {
    console.log('Dropping', table);
    await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
  }
  
  console.log('All empty law tables dropped!');
  await client.end();
}
run();
