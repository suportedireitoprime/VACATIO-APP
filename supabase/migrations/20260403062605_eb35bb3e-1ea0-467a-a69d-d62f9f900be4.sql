
CREATE TABLE public.legislacao_alteracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  tipo_alteracao text NOT NULL CHECK (tipo_alteracao IN ('artigo_novo', 'artigo_revogado', 'texto_alterado')),
  artigo_numero text,
  texto_anterior text,
  texto_atual text,
  detectado_em timestamptz NOT NULL DEFAULT now(),
  revisado boolean NOT NULL DEFAULT false
);

ALTER TABLE public.legislacao_alteracoes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_leg_alt_tabela ON public.legislacao_alteracoes (tabela_nome);
CREATE INDEX idx_leg_alt_revisado ON public.legislacao_alteracoes (revisado) WHERE NOT revisado;

CREATE POLICY "Service role full access on legislacao_alteracoes"
  ON public.legislacao_alteracoes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
