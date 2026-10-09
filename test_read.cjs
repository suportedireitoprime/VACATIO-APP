const { Client } = require('pg');
const newPgClient = new Client({ 
  connectionString: 'postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres' 
});
async function run() {
  await newPgClient.connect();
  const res = await newPgClient.query("SELECT slug, url_planalto FROM vade_mecum_leis WHERE slug = 'cadh'");
  console.log(res.rows[0]);
  await newPgClient.end();
}
run();
