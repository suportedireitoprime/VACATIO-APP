
-- Tabela de cache para deputados
CREATE TABLE public.radar_deputados (
  id bigint PRIMARY KEY,
  nome text NOT NULL,
  sigla_partido text,
  sigla_uf text,
  foto_url text,
  email text,
  legislatura_id integer,
  dados_json jsonb DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_deputados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública radar_deputados" ON public.radar_deputados FOR SELECT TO public USING (true);
CREATE POLICY "Inserção radar_deputados" ON public.radar_deputados FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção radar_deputados" ON public.radar_deputados FOR DELETE TO public USING (true);
CREATE POLICY "Update radar_deputados" ON public.radar_deputados FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Tabela de cache para senadores
CREATE TABLE public.radar_senadores (
  codigo text PRIMARY KEY,
  nome text NOT NULL,
  sigla_partido text,
  sigla_uf text,
  foto_url text,
  dados_json jsonb DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radar_senadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública radar_senadores" ON public.radar_senadores FOR SELECT TO public USING (true);
CREATE POLICY "Inserção radar_senadores" ON public.radar_senadores FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção radar_senadores" ON public.radar_senadores FOR DELETE TO public USING (true);
CREATE POLICY "Update radar_senadores" ON public.radar_senadores FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Tabela de cache para proposições
CREATE TABLE public.radar_proposicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_externo text NOT NULL,
  fonte text NOT NULL CHECK (fonte IN ('camara', 'senado')),
  sigla_tipo text,
  numero integer,
  ano integer,
  ementa text,
  autor text,
  situacao text,
  ultima_tramitacao text,
  dados_json jsonb DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_externo, fonte)
);

ALTER TABLE public.radar_proposicoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública radar_proposicoes" ON public.radar_proposicoes FOR SELECT TO public USING (true);
CREATE POLICY "Inserção radar_proposicoes" ON public.radar_proposicoes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção radar_proposicoes" ON public.radar_proposicoes FOR DELETE TO public USING (true);
CREATE POLICY "Update radar_proposicoes" ON public.radar_proposicoes FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Tabela de cache para votações
CREATE TABLE public.radar_votacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_externo text NOT NULL,
  fonte text NOT NULL CHECK (fonte IN ('camara', 'senado')),
  data timestamptz,
  descricao text,
  resultado text,
  dados_json jsonb DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_externo, fonte)
);

ALTER TABLE public.radar_votacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública radar_votacoes" ON public.radar_votacoes FOR SELECT TO public USING (true);
CREATE POLICY "Inserção radar_votacoes" ON public.radar_votacoes FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção radar_votacoes" ON public.radar_votacoes FOR DELETE TO public USING (true);
CREATE POLICY "Update radar_votacoes" ON public.radar_votacoes FOR UPDATE TO public USING (true) WITH CHECK (true);
