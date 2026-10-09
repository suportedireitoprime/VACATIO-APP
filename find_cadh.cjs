const url = "https://tlpxubeagmxapkysgobk.supabase.co/rest/v1/";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo";

async function check() {
    const res = await fetch(url + "vade_mecum_leis?limit=5", {
        headers: { "apikey": key, "Authorization": "Bearer " + key }
    });
    if (res.ok) {
        console.log("SUCESSO:", await res.json());
    } else {
        console.log("ERRO:", res.status, await res.text());
    }
}
check();
