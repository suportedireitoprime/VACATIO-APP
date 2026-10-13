const { Client } = require('pg');

const client = new Client({ 
  connectionString: 'postgresql://postgres:39433679Wes%23@db.tlpxubeagmxapkysgobk.supabase.co:5432/postgres' 
});

async function run() {
  await client.connect();
  console.log('Conectado ao Postgres do Supabase!');

  // 1. Criar tabela aprender_leis_aulas se não existir
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.aprender_leis_aulas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lei_id UUID REFERENCES public.vade_mecum_leis(id) ON DELETE CASCADE,
      artigo_id UUID REFERENCES public.vade_mecum_artigos(id) ON DELETE CASCADE,
      artigo_numero TEXT NOT NULL,
      titulo_aula TEXT,
      objetivo TEXT,
      slides JSONB NOT NULL DEFAULT '[]'::jsonb,
      modelo_ia TEXT,
      total_slides INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(lei_id, artigo_numero)
    );
  `);
  console.log('Tabela aprender_leis_aulas verificada/criada com sucesso!');

  // Habilitar RLS e criar policies para anon/authenticated ler e escrever
  await client.query(`
    ALTER TABLE public.aprender_leis_aulas ENABLE ROW LEVEL SECURITY;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'aprender_leis_aulas' AND policyname = 'Permitir leitura pública'
      ) THEN
        CREATE POLICY "Permitir leitura pública" ON public.aprender_leis_aulas FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'aprender_leis_aulas' AND policyname = 'Permitir escrita irrestrita admin'
      ) THEN
        CREATE POLICY "Permitir escrita irrestrita admin" ON public.aprender_leis_aulas FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `);
  console.log('Políticas RLS configuradas para aprender_leis_aulas!');

  // 2. Verificar quantidade de aulas já salvas
  const cont = await client.query('SELECT count(*) FROM public.aprender_leis_aulas');
  console.log('Aulas existentes:', cont.rows[0].count);

  await client.end();
}

run().catch(console.error);
