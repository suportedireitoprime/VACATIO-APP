const url = "https://tlpxubeagmxapkysgobk.supabase.co/rest/v1/";
const funcUrl = "https://tlpxubeagmxapkysgobk.supabase.co/functions/v1/reextrair-lei-planalto";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo";

const cadh = {
  slug: "cadh",
  nome: "Convenção Americana sobre Direitos Humanos",
  url_planalto: "http://www.planalto.gov.br/ccivil_03/decreto/1990-1994/d0678.htm"
};

async function test() {
    console.log("Limpando...");
    await fetch(url + "vade_mecum_leis?slug=eq.cadh", {
        method: "DELETE",
        headers: { "apikey": key, "Authorization": "Bearer " + key }
    });

    console.log("Inserindo CADH na tabela vade_mecum_leis...");
    const resInsert = await fetch(url + "vade_mecum_leis", {
        method: "POST",
        headers: { "apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify(cadh)
    });
    
    if (!resInsert.ok) {
       console.log("Erro ao inserir:", resInsert.status, await resInsert.text());
    } else {
       console.log("Inserido!");
    }

    console.log("Invocando a Edge Function reextrair-lei-planalto...");
    const resFunc = await fetch(funcUrl, {
        method: "POST",
        headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "cadh", dry_run: false })
    });

    if (resFunc.ok) {
        console.log("SUCESSO DA FUNÇÃO:");
        console.log(JSON.stringify(await resFunc.json(), null, 2));
    } else {
        console.log("ERRO NA FUNÇÃO:", resFunc.status, await resFunc.text());
    }
}
test();
