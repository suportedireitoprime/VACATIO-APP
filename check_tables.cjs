const url = "https://tlpxubeagmxapkysgobk.supabase.co/rest/v1/";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscHh1YmVhZ214YXBreXNnb2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0OTMzOTYsImV4cCI6MjEwNzA2OTM5Nn0.3qKySrhlG6Kw1ZQYEaK4cELtzG2JlIi_CNHH4FV2ELo";

const tablesToCheck = [
    "vade_mecum_leis", 
    "vade_mecum_artigos", 
    "assinaturas", 
    "profiles",
    "artigos_anotacoes",
    "radar_proposicoes"
];

async function checkTables() {
    for (let table of tablesToCheck) {
        try {
            const res = await fetch(url + table + "?select=id&limit=1", {
                headers: {
                    "apikey": key,
                    "Authorization": "Bearer " + key
                }
            });
            if (res.ok) {
                console.log(`[OK] Tabela '${table}' existe.`);
            } else {
                console.log(`[FALHA] Tabela '${table}' retornou status ${res.status}: ${res.statusText}`);
            }
        } catch (e) {
            console.error(`Erro ao checar '${table}':`, e.message);
        }
    }
}

checkTables();
