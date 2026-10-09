const { createClient } = require('@supabase/supabase-js');
const oldClient = createClient(
  'https://tlpxubeagmxapkysgobk.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
);
async function run() {
  const { data, error } = await oldClient.from('vade_mecum_leis').select('*').limit(1);
  console.log(Object.keys(data[0]));
}
run();
