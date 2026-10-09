const { Client } = require('pg');

const OLD_URL = "postgresql://postgres:39433679Wes%23@db.iftdrbxvekrhzstayjwp.supabase.co:5432/postgres";
const NEW_URL = "postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres";

async function testConn(url, name) {
  const c = new Client({ connectionString: url });
  try {
    await c.connect();
    console.log(`${name} OK`);
  } catch(e) {
    console.error(`${name} ERROR:`, e.message);
  } finally {
    await c.end();
  }
}

async function test() {
  await testConn(OLD_URL, "OLD");
  await testConn(NEW_URL, "NEW");
}

test();
