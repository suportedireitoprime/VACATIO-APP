
-- 1. LEP_EXECUCAO_PENAL
CREATE TABLE public."LEP_EXECUCAO_PENAL" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  caput text NOT NULL DEFAULT ''::text,
  texto text NOT NULL DEFAULT ''::text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  titulo text,
  capitulo text,
  rotulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0
);
ALTER TABLE public."LEP_EXECUCAO_PENAL" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública LEP" ON public."LEP_EXECUCAO_PENAL" FOR SELECT USING (true);
CREATE POLICY "service_insert_lep" ON public."LEP_EXECUCAO_PENAL" FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_delete_lep" ON public."LEP_EXECUCAO_PENAL" FOR DELETE TO service_role USING (true);

-- 2. LMP_MARIA_PENHA
CREATE TABLE public."LMP_MARIA_PENHA" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  caput text NOT NULL DEFAULT ''::text,
  texto text NOT NULL DEFAULT ''::text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  titulo text,
  capitulo text,
  rotulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0
);
ALTER TABLE public."LMP_MARIA_PENHA" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública LMP" ON public."LMP_MARIA_PENHA" FOR SELECT USING (true);
CREATE POLICY "service_insert_lmp" ON public."LMP_MARIA_PENHA" FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_delete_lmp" ON public."LMP_MARIA_PENHA" FOR DELETE TO service_role USING (true);

-- 3. LD_LEI_DROGAS
CREATE TABLE public."LD_LEI_DROGAS" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  caput text NOT NULL DEFAULT ''::text,
  texto text NOT NULL DEFAULT ''::text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  titulo text,
  capitulo text,
  rotulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0
);
ALTER TABLE public."LD_LEI_DROGAS" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública LD" ON public."LD_LEI_DROGAS" FOR SELECT USING (true);
CREATE POLICY "service_insert_ld" ON public."LD_LEI_DROGAS" FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_delete_ld" ON public."LD_LEI_DROGAS" FOR DELETE TO service_role USING (true);

-- 4. LOC_ORGANIZACAO_CRIMINOSA
CREATE TABLE public."LOC_ORGANIZACAO_CRIMINOSA" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  caput text NOT NULL DEFAULT ''::text,
  texto text NOT NULL DEFAULT ''::text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  titulo text,
  capitulo text,
  rotulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0
);
ALTER TABLE public."LOC_ORGANIZACAO_CRIMINOSA" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública LOC" ON public."LOC_ORGANIZACAO_CRIMINOSA" FOR SELECT USING (true);
CREATE POLICY "service_insert_loc" ON public."LOC_ORGANIZACAO_CRIMINOSA" FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_delete_loc" ON public."LOC_ORGANIZACAO_CRIMINOSA" FOR DELETE TO service_role USING (true);

-- 5. LAA_ABUSO_AUTORIDADE
CREATE TABLE public."LAA_ABUSO_AUTORIDADE" (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL,
  caput text NOT NULL DEFAULT ''::text,
  texto text NOT NULL DEFAULT ''::text,
  incisos text[] DEFAULT '{}'::text[],
  paragrafos text[] DEFAULT '{}'::text[],
  titulo text,
  capitulo text,
  rotulo text,
  ordem integer NOT NULL DEFAULT 0,
  ordem_numero numeric NOT NULL DEFAULT 0
);
ALTER TABLE public."LAA_ABUSO_AUTORIDADE" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública LAA" ON public."LAA_ABUSO_AUTORIDADE" FOR SELECT USING (true);
CREATE POLICY "service_insert_laa" ON public."LAA_ABUSO_AUTORIDADE" FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_delete_laa" ON public."LAA_ABUSO_AUTORIDADE" FOR DELETE TO service_role USING (true);
