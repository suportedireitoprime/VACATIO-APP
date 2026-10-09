const { Client } = require('pg');
const newPgClient = new Client({ 
  connectionString: 'postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres' 
});
async function run() {
  await newPgClient.connect();
  const res = await newPgClient.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'vade_mecum_leis'
  `);
  console.log(res.rows.map(r => r.column_name));
  await newPgClient.end();
}
run();
