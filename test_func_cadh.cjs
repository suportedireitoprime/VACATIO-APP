const funcUrl = "https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/reextrair-lei-planalto";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo";

async function test() {
    console.log("Invocando a Edge Function reextrair-lei-planalto (CADH)...");
    const resFunc = await fetch(funcUrl, {
        method: "POST",
        headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "cadh", dry_run: true }) // dry_run: true primeiro para ver
    });

    if (resFunc.ok) {
        console.log("SUCESSO DA FUNÇÃO:");
        console.log(JSON.stringify(await resFunc.json(), null, 2));
    } else {
        console.log("ERRO NA FUNÇÃO:", resFunc.status, await resFunc.text());
    }
}
test();
