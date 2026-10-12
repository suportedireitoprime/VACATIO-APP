const { Client } = require('pg');
const crypto = require('crypto');

// Datasets
const ced2015Arts = require('./data/oab-ced-2015.cjs');
const ced1995Arts = require('./data/oab-ced-1995.cjs');
const regulamentoArts = require('./data/oab-regulamento-geral.cjs');
const provimentos = require('./data/oab-provimentos.cjs');
const resolucoes = require('./data/oab-resolucoes.cjs');

const BATCH_SIZE = 25;

const NORMS_TO_POPULATE = [
  // 1. Códigos
  {
    lei: {
      slug: 'codigo-etica-oab-2015',
      nome: 'Código de Ética e Disciplina da OAB (CED 2015)',
      nome_curto: 'CED/2015',
      categoria: 'oab',
      ordem: 241,
      ementa: 'Dispõe sobre o Código de Ética e Disciplina da Ordem dos Advogados do Brasil – OAB.',
      numero_lei: 'Res. 02/2015',
      ano_lei: 2015,
      planalto_url: 'https://www.oab.org.br/visualizador/19/codigo-de-etica-e-disciplina'
    },
    artigos: ced2015Arts
  },
  {
    lei: {
      slug: 'codigo-etica-oab-1995',
      nome: 'Código de Ética e Disciplina da OAB de 1995 (Histórico)',
      nome_curto: 'CED/1995',
      categoria: 'oab',
      ordem: 242,
      ementa: 'Código de Ética e Disciplina da OAB editado pelo Conselho Federal em 13 de fevereiro de 1995.',
      numero_lei: 'CED 1995',
      ano_lei: 1995,
      planalto_url: 'https://www.oab.org.br'
    },
    artigos: ced1995Arts
  },

  // 2. Regulamentos
  {
    lei: {
      slug: 'regulamento-geral-oab',
      nome: 'Regulamento Geral do Estatuto da Advocacia e da OAB',
      nome_curto: 'Reg. Geral OAB',
      categoria: 'oab',
      ordem: 243,
      ementa: 'Regulamenta a Lei nº 8.906, de 4 de julho de 1994, que dispõe sobre o Estatuto da Advocacia e a Ordem dos Advogados do Brasil.',
      numero_lei: 'Reg. Geral',
      ano_lei: 1994,
      planalto_url: 'https://www.oab.org.br/visualizador/18/regulamento-geral'
    },
    artigos: regulamentoArts
  },

  // 3. Provimentos
  provimentos.provimento205,
  provimentos.provimento188,
  provimentos.provimento112,
  provimentos.provimento144,

  // 4. Resoluções
  resolucoes.resolucao02,
  resolucoes.resolucao01
];

async function main() {
  console.log('====================================================');
  console.log('INICIANDO POPULAÇÃO EM LOTES DO SUPABASE (NORMATIVOS OAB)');
  console.log('Tamanho de cada lote (BATCH_SIZE):', BATCH_SIZE);
  console.log('====================================================\n');

  const client = new Client({
    connectionString: 'postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Conexão PostgreSQL Supabase estabelecida com sucesso!\n');

  // Atualizar Estatuto da OAB (Lei 8.906/1994) para garantir que seja identificado como categoria 'oab' e 'estatuto'
  await client.query(`
    UPDATE vade_mecum_leis 
    SET categoria = 'oab',
        nome_curto = 'EOAB',
        ementa = 'Dispõe sobre o Estatuto da Advocacia e a Ordem dos Advogados do Brasil (OAB).'
    WHERE slug = 'estatuto-oab' OR slug = 'eoab'
  `);
  console.log('✓ Estatuto da OAB (Lei 8.906/94) verificado e sincronizado.');

  for (const item of NORMS_TO_POPULATE) {
    const { lei, artigos } = item;
    console.log(`\n----------------------------------------------------`);
    console.log(`Processando Norma: ${lei.nome} (${lei.slug})`);
    console.log(`Total de artigos a inserir: ${artigos.length}`);

    // 1. Inserir ou atualizar na tabela vade_mecum_leis
    const checkLei = await client.query('SELECT id FROM vade_mecum_leis WHERE slug = $1', [lei.slug]);
    let leiId;

    if (checkLei.rows.length > 0) {
      leiId = checkLei.rows[0].id;
      await client.query(`
        UPDATE vade_mecum_leis 
        SET nome = $1, nome_curto = $2, categoria = $3, total_artigos = $4,
            ementa = $5, numero_lei = $6, ano_lei = $7, planalto_url = $8, updated_at = NOW()
        WHERE id = $9
      `, [
        lei.nome,
        lei.nome_curto,
        lei.categoria,
        artigos.length,
        lei.ementa,
        lei.numero_lei,
        lei.ano_lei,
        lei.planalto_url,
        leiId
      ]);
      console.log(`✓ Registro da lei atualizado no banco (ID: ${leiId})`);
    } else {
      leiId = crypto.randomUUID();
      await client.query(`
        INSERT INTO vade_mecum_leis 
          (id, slug, nome, nome_curto, categoria, ordem, planalto_url, total_artigos, created_at, updated_at, numero_lei, ano_lei, ementa)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, $10, $11)
      `, [
        leiId,
        lei.slug,
        lei.nome,
        lei.nome_curto,
        lei.categoria,
        lei.ordem || 250,
        lei.planalto_url,
        artigos.length,
        lei.numero_lei,
        lei.ano_lei,
        lei.ementa
      ]);
      console.log(`✓ Registro da lei criado no banco (ID: ${leiId})`);
    }

    // 2. Limpar artigos existentes para recarga limpa
    await client.query('DELETE FROM vade_mecum_artigos WHERE lei_id = $1', [leiId]);

    // 3. Processar inserção em LOTES (Chunks de BATCH_SIZE)
    const totalBatches = Math.ceil(artigos.length / BATCH_SIZE);
    console.log(`Iniciando inserção em ${totalBatches} lote(s)...`);

    for (let b = 0; b < totalBatches; b++) {
      const startIdx = b * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, artigos.length);
      const batchSlice = artigos.slice(startIdx, endIdx);

      console.log(`  -> [LOTE ${b + 1}/${totalBatches}] Inserindo artigos ${startIdx + 1} a ${endIdx}...`);

      // Construir query de inserção múltipla parametrizada
      const values = [];
      const placeholders = [];
      let paramCount = 1;

      for (let i = 0; i < batchSlice.length; i++) {
        const art = batchSlice[i];
        const artId = crypto.randomUUID();
        placeholders.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, NOW(), NOW())`);
        values.push(
          artId,
          leiId,
          art.numero,
          art.texto,
          art.ordem || (startIdx + i + 1),
          art.epigrafe || null
        );
        paramCount += 6;
      }

      const insertQuery = `
        INSERT INTO vade_mecum_artigos 
          (id, lei_id, numero, texto, ordem, epigrafe, created_at, updated_at)
        VALUES 
          ${placeholders.join(', ')}
      `;

      await client.query(insertQuery, values);
      console.log(`  ✓ [LOTE ${b + 1}/${totalBatches}] OK (${batchSlice.length} artigos gravados).`);
    }

    console.log(`Norma ${lei.slug} finalizada com sucesso!`);
  }

  // Verificação final
  const countCheck = await client.query(`
    SELECT l.slug, l.nome, l.categoria, count(a.id) as artigos_gravados
    FROM vade_mecum_leis l
    LEFT JOIN vade_mecum_artigos a ON a.lei_id = l.id
    WHERE l.categoria = 'oab' OR l.slug ILIKE '%oab%'
    GROUP BY l.id, l.slug, l.nome, l.categoria
    ORDER BY l.slug;
  `);

  console.log('\n====================================================');
  console.log('RESUMO FINAL DE NORMATIVOS OAB NO SUPABASE:');
  console.table(countCheck.rows);
  console.log('====================================================\n');

  await client.end();
}

main().catch((err) => {
  console.error('\n❌ ERRO NA POPULAÇÃO DO SUPABASE:', err);
  process.exit(1);
});
