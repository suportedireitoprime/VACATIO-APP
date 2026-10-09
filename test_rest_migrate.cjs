const { createClient } = require('@supabase/supabase-js');

const oldClient = createClient(
  'https://iftdrbxvekrhzstayjwp.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
);

const newClient = createClient(
  'https://tlpxubeagmxapkysgobk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo'
);

async function checkOldData() {
  const { data: leis, error } = await oldClient.from('vade_mecum_leis').select('*');
  if (error) {
    console.error("Erro ao ler old leis:", error);
    return;
  }
  console.log(`Leis no projeto antigo: ${leis?.length}`);
  if (leis.length > 0) console.log("Primeira lei:", Object.keys(leis[0]));

  const { data: artigos, error: errArt } = await oldClient.from('vade_mecum_artigos').select('id').limit(10);
  if (errArt) {
    console.error("Erro ao ler old artigos:", errArt);
    return;
  }
  console.log(`Consegue ler artigos? Sim. ${artigos.length} lidos.`);
}

checkOldData();
