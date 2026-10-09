const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:39433679Wes%23@db.vooaldsmaddplxhcaouw.supabase.co:5432/postgres' });
client.connect().then(() => {
    return client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
}).then(res => {
    console.log(res.rows.map(r => r.tablename).join(', '));
    client.end();
}).catch(console.error);
