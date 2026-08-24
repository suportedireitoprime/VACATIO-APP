CREATE TABLE IF NOT EXISTS public.horus_canais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jid text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  invite_link text,
  ativo boolean NOT NULL DEFAULT true,
  post_noticias boolean NOT NULL DEFAULT true,
  post_blog boolean NOT NULL DEFAULT true,
  post_leis boolean NOT NULL DEFAULT true,
  last_post_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.horus_canais TO authenticated;
GRANT ALL ON public.horus_canais TO service_role;

ALTER TABLE public.horus_canais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver canais do Horus" ON public.horus_canais;
CREATE POLICY "Admins podem ver canais do Horus"
ON public.horus_canais FOR SELECT TO authenticated
USING (public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.horus_canais_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS horus_canais_touch ON public.horus_canais;
CREATE TRIGGER horus_canais_touch BEFORE UPDATE ON public.horus_canais
FOR EACH ROW EXECUTE FUNCTION public.horus_canais_touch();