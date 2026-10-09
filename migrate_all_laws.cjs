const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const oldClient = createClient('https://tlpxubeagmxapkysgobk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo');
const newClient = createClient('https://vooaldsmaddplxhcaouw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvb2FsZHNtYWRkcGx4aGNhb3V3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg5MzY4OSwiZXhwIjoyMTA2NDY5Njg5fQ.tCWbou0an9sWEjpp3XJnIud5VafBS8roeVvigWU2Nyc');

const pgClient = new Client({ connectionString: 'postgresql://postgres:39433679Wes%23@db.vooaldsmaddplxhcaouw.supabase.co:5432/postgres' });

async function migrateTable(tableName) {
  console.log('Migrating', tableName);
  let page = 0;
  const pageSize = 1000;
  let allData = [];
  while(true) {
    const { data, error } = await oldClient.from(tableName).select('*').range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { 
      if (error.code !== 'PGRST205') {
         console.error('Error fetching', tableName, error); 
      }
      break; 
    }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    page++;
  }
  
  if (allData.length > 0) {
    console.log(`Fetched ${allData.length} rows from ${tableName}. Inserting...`);
    // chunk inserts
    for (let i = 0; i < allData.length; i += 500) {
      const chunk = allData.slice(i, i + 500);
      const { error } = await newClient.from(tableName).upsert(chunk);
      if (error) console.error('Error inserting chunk into', tableName, error);
    }
    console.log(`Inserted ${allData.length} rows into ${tableName}.`);
  } else {
    console.log(`No data found for ${tableName}.`);
  }
}

async function run() {
  await pgClient.connect();
  const res = await pgClient.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = UPPER(tablename) AND tablename NOT LIKE '%_vade_mecum_%'`);
  const tables = res.rows.map(r => r.tablename);
  await pgClient.end();
  
  for (const table of tables) {
    await migrateTable(table);
  }
  
  console.log('All migrations completed!');
}
run();
