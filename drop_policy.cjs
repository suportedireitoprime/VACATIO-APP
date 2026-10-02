const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:39433679Wes%23@db.vooaldsmaddplxhcaouw.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query(`SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'`);
  for (const row of res.rows) {
    console.log('Dropping policy', row.policyname);
    await client.query(`DROP POLICY IF EXISTS "${row.policyname}" ON storage.objects`);
  }
  console.log('All policies on storage.objects dropped');
  await client.end();
}
run();
