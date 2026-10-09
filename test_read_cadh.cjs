const { Client } = require('pg');
const newPgClient = new Client({ 
  connectionString: 'postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres' 
});
async function run() {
  await newPgClient.connect();
  const res = await newPgClient.query("SELECT slug, planalto_url FROM vade_mecum_leis WHERE slug = 'cadh'");
  console.log(res.rows[0]);
  
  // also let's just update it if it's wrong
  if(res.rows[0].planalto_url.includes('1990-1994')) {
      await newPgClient.query("UPDATE vade_mecum_leis SET planalto_url = 'https://www.planalto.gov.br/ccivil_03/decreto/d0678.htm' WHERE slug = 'cadh'");
      console.log("Updated to correct URL!");
  }
  await newPgClient.end();
}
run();
