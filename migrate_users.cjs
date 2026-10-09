const { Client } = require('pg');

const OLD_URL = "postgresql://postgres:39433679Wes%23@db.iftdrbxvekrhzstayjwp.supabase.co:5432/postgres";
const NEW_URL = "postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres";

async function migrate() {
  const oldClient = new Client({ connectionString: OLD_URL });
  const newClient = new Client({ connectionString: NEW_URL });

  await oldClient.connect();
  await newClient.connect();

  try {
    console.log("Conectado a ambos os bancos de dados.");

    // 1. Obter usuários antigos
    const resUsers = await oldClient.query('SELECT * FROM auth.users');
    const users = resUsers.rows;
    console.log(`Encontrados ${users.length} usuários na base antiga.`);

    // Migrar cada usuário
    for (const u of users) {
      const cols = Object.keys(u);
      const vals = Object.values(u);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO auth.users (${cols.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;

      try {
        await newClient.query(query, vals);
        console.log(`Usuário migrado: ${u.email}`);
      } catch (err) {
        console.error(`Erro ao migrar usuário ${u.email}:`, err.message);
      }
    }

    // 2. Obter auth.identities
    const resIdentities = await oldClient.query('SELECT * FROM auth.identities');
    const identities = resIdentities.rows;
    console.log(`Encontradas ${identities.length} identidades na base antiga.`);

    for (const idn of identities) {
      const cols = Object.keys(idn);
      const vals = Object.values(idn);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO auth.identities (${cols.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (provider_id, provider) DO NOTHING
      `;

      try {
        await newClient.query(query, vals);
      } catch (err) {
        console.error(`Erro ao migrar identidade ${idn.id}:`, err.message);
      }
    }

    console.log("Migração de usuários concluída com sucesso!");

  } catch (err) {
    console.error("Erro na migração:", err);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

migrate();
