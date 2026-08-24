
CREATE TABLE public.informativos_stj (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edicao INTEGER NOT NULL,
  edicao_titulo TEXT,
  data_publicacao DATE,
  ordem INTEGER NOT NULL,
  secao TEXT,
  processo TEXT,
  ramo_direito TEXT,
  tema TEXT,
  destaque TEXT,
  inteiro_teor TEXT,
  informacoes_adicionais TEXT,
  raw TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edicao, ordem)
);
GRANT SELECT ON public.informativos_stj TO anon, authenticated;
GRANT ALL ON public.informativos_stj TO service_role;
ALTER TABLE public.informativos_stj ENABLE ROW LEVEL SECURITY;
CREATE POLICY "informativos_stj public read" ON public.informativos_stj FOR SELECT USING (true);
CREATE TRIGGER trg_informativos_stj_updated_at BEFORE UPDATE ON public.informativos_stj
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.informativos_stf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edicao INTEGER NOT NULL,
  edicao_titulo TEXT,
  data_publicacao DATE,
  ordem INTEGER NOT NULL,
  secao TEXT,
  processo TEXT,
  ramo_direito TEXT,
  tema TEXT,
  destaque TEXT,
  inteiro_teor TEXT,
  informacoes_adicionais TEXT,
  raw TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edicao, ordem)
);
GRANT SELECT ON public.informativos_stf TO anon, authenticated;
GRANT ALL ON public.informativos_stf TO service_role;
ALTER TABLE public.informativos_stf ENABLE ROW LEVEL SECURITY;
CREATE POLICY "informativos_stf public read" ON public.informativos_stf FOR SELECT USING (true);
CREATE TRIGGER trg_informativos_stf_updated_at BEFORE UPDATE ON public.informativos_stf
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
