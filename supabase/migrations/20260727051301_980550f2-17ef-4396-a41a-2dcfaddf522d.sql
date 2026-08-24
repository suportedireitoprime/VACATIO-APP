CREATE TABLE public.narracao_vozes_config (
  voz text PRIMARY KEY,
  genero text NOT NULL DEFAULT 'masculina',
  descricao text,
  ativa boolean NOT NULL DEFAULT true,
  padrao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.narracao_vozes_config TO authenticated;
GRANT ALL ON public.narracao_vozes_config TO service_role;

ALTER TABLE public.narracao_vozes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam vozes da narracao"
  ON public.narracao_vozes_config FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE UNIQUE INDEX narracao_vozes_config_padrao_unico
  ON public.narracao_vozes_config ((padrao)) WHERE padrao;

CREATE TRIGGER narracao_vozes_config_updated_at
  BEFORE UPDATE ON public.narracao_vozes_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();