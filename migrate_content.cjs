const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const oldClient = createClient(
  'https://iftdrbxvekrhzstayjwp.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmdGRyYnh2ZWtyaHpzdGF5andwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4Mzc5OTksImV4cCI6MjA5OTQxMzk5OX0.7nyvQlO5IDI6E4dLYHl6yrqqaNd53RxJcDOTQ7yNh40'
);

const NEW_URL = "postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres";

async function run() {
  const pgClient = new Client({ connectionString: NEW_URL });
  await pgClient.connect();

  console.log("Baixando leis antigas...");
  const { data: leis, error: errLeis } = await oldClient.from('vade_mecum_leis').select('*');
  if (errLeis) throw new Error(JSON.stringify(errLeis));

  console.log(`Encontradas ${leis.length} leis.`);
  
  if (leis.length > 0) {
    const cols = Object.keys(leis[0]);
    for (const lei of leis) {
      const vals = Object.values(lei);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO vade_mecum_leis (${cols.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      try {
        await pgClient.query(query, vals);
      } catch (err) {
        console.error(`Erro inserir lei ${lei.id}:`, err.message);
      }
    }
  }

  console.log("Leis migradass. Baixando categorias antigas...");
  const { data: categorias, error: errCat } = await oldClient.from('vade_mecum_categorias').select('*');
  if (errCat) {
    console.warn("Erro ao ler categorias (ou não existe):", errCat.message);
  } else if (categorias && categorias.length > 0) {
    const cols = Object.keys(categorias[0]);
    for (const cat of categorias) {
      const vals = Object.values(cat);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const query = `
        INSERT INTO vade_mecum_categorias (${cols.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      try { await pgClient.query(query, vals); } catch(e) {}
    }
  }

  console.log("Categorias migradass. Baixando sumulas...");
  const { data: sumulas, error: errSum } = await oldClient.from('vade_mecum_sumulas').select('*');
  if (errSum) {
    console.warn("Erro ao ler sumulas (ou não existe):", errSum.message);
  } else if (sumulas && sumulas.length > 0) {
    const cols = Object.keys(sumulas[0]);
    for (const sum of sumulas) {
      const vals = Object.values(sum);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const query = `
        INSERT INTO vade_mecum_sumulas (${cols.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      try { await pgClient.query(query, vals); } catch(e) {}
    }
  }

  console.log("Migrando artigos...");
  
  let pageSize = 1000;
  let offset = 0;
  let totalMigrados = 0;

  while (true) {
    const { data: artigos, error: errArt } = await oldClient
      .from('vade_mecum_artigos')
      .select('*')
      .range(offset, offset + pageSize - 1);

    if (errArt) throw new Error(JSON.stringify(errArt));
    if (!artigos || artigos.length === 0) break;

    const cols = Object.keys(artigos[0]);
    for (const art of artigos) {
      const vals = Object.values(art);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO vade_mecum_artigos (${cols.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO NOTHING
      `;
      try {
        await pgClient.query(query, vals);
      } catch (err) {
        console.error(`Erro inserir artigo ${art.id}:`, err.message);
      }
    }

    totalMigrados += artigos.length;
    console.log(`Migrados ${totalMigrados} artigos...`);
    offset += pageSize;
  }

  console.log("Migração de conteúdo concluída!");
  await pgClient.end();
}

run();
