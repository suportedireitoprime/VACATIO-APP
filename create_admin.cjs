const { Client } = require('pg');

const NEW_URL = "postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres";

async function createAdmin() {
  const c = new Client({ connectionString: NEW_URL });
  await c.connect();

  try {
    // Verificar se a extensão pgcrypto existe
    await c.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // Atualizar senha do usuário existente
    const res = await c.query(`
      UPDATE auth.users
      SET encrypted_password = crypt('39433679', gen_salt('bf'))
      WHERE email = 'wn7corporation@gmail.com'
      RETURNING id;
    `);

    if (res.rowCount === 0) {
      console.log('Usuário não encontrado!');
    } else {
      console.log('Senha do usuário admin wn7corporation@gmail.com atualizada com sucesso no projeto novo!');
      console.log('Senha atualizada para: 39433679');
    }


  } catch(e) {
    console.error('ERRO:', e.message);
  } finally {
    await c.end();
  }
}

createAdmin();
