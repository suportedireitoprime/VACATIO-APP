const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

// Old Supabase API to fetch data
const oldClient = createClient(
  'https://iftdrbxvekrhzstayjwp.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
);

// New Database via PG
const newPgClient = new Client({ 
  connectionString: 'postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres' 
});

async function run() {
  try {
    console.log("Connecting to new DB...");
    await newPgClient.connect();
    console.log("Connected successfully to new DB!");

    // Let's reload schema cache just in case for later
    await newPgClient.query("NOTIFY pgrst, 'reload schema'");
    
    console.log("Fetching vade_mecum_leis from old DB...");
    const { data: leis, error } = await oldClient.from('vade_mecum_leis').select('*');
    if (error) {
      console.error("Error fetching old laws:", error);
      process.exit(1);
    }
    
    console.log(`Found ${leis.length} laws. Inserting into new DB...`);
    
    for (const lei of leis) {
        // Construct parameterized insert
        const keys = Object.keys(lei);
        const values = Object.values(lei);
        
        const placeholders = keys.map((_, i) => `$${i+1}`).join(', ');
        const colNames = keys.map(k => `"${k}"`).join(', ');
        
        const query = `
          INSERT INTO public.vade_mecum_leis (${colNames}) 
          VALUES (${placeholders}) 
          ON CONFLICT (id) DO UPDATE SET 
          ${keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ')}
        `;
        
        try {
            await newPgClient.query(query, values);
        } catch (e) {
            console.error(`Error inserting lei ${lei.slug}:`, e.message);
        }
    }
    
    console.log("Migration of vade_mecum_leis completed!");
    await newPgClient.end();
  } catch (err) {
    console.error("Fatal error:", err.message);
  }
}

run();
