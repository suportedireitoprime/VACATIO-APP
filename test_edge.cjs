const url = "https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/buscar-atualizacao-mistral";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo";

async function test() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      lei_id: "test",
      planalto_url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm"
    })
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
