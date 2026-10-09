const { createClient } = require('@supabase/supabase-js');
const oldClient = createClient(
  'https://iftdrbxvekrhzstayjwp.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
);
async function run() {
  const { data, error } = await oldClient.from('vade_mecum_leis').select('*').limit(1);
  console.log(Object.keys(data[0]));
}
run();
