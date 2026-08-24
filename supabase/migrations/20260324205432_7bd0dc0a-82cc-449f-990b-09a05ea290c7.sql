
CREATE TABLE IF NOT EXISTS public."CE_CODIGO_ELEITORAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CE_CODIGO_ELEITORAL" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CE" ON public."CE_CODIGO_ELEITORAL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CE" ON public."CE_CODIGO_ELEITORAL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CE" ON public."CE_CODIGO_ELEITORAL" FOR DELETE TO public USING (true);
CREATE INDEX idx_ce_ordem ON public."CE_CODIGO_ELEITORAL" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CFLOR_CODIGO_FLORESTAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CFLOR_CODIGO_FLORESTAL" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CFLOR" ON public."CFLOR_CODIGO_FLORESTAL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CFLOR" ON public."CFLOR_CODIGO_FLORESTAL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CFLOR" ON public."CFLOR_CODIGO_FLORESTAL" FOR DELETE TO public USING (true);
CREATE INDEX idx_cflor_ordem ON public."CFLOR_CODIGO_FLORESTAL" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CAGUA_CODIGO_AGUAS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CAGUA_CODIGO_AGUAS" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CAGUA" ON public."CAGUA_CODIGO_AGUAS" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CAGUA" ON public."CAGUA_CODIGO_AGUAS" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CAGUA" ON public."CAGUA_CODIGO_AGUAS" FOR DELETE TO public USING (true);
CREATE INDEX idx_cagua_ordem ON public."CAGUA_CODIGO_AGUAS" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CMIN_CODIGO_MINAS" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CMIN_CODIGO_MINAS" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CMIN" ON public."CMIN_CODIGO_MINAS" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CMIN" ON public."CMIN_CODIGO_MINAS" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CMIN" ON public."CMIN_CODIGO_MINAS" FOR DELETE TO public USING (true);
CREATE INDEX idx_cmin_ordem ON public."CMIN_CODIGO_MINAS" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CPM_CODIGO_PENAL_MILITAR" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CPM_CODIGO_PENAL_MILITAR" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CPM" ON public."CPM_CODIGO_PENAL_MILITAR" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CPM" ON public."CPM_CODIGO_PENAL_MILITAR" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CPM" ON public."CPM_CODIGO_PENAL_MILITAR" FOR DELETE TO public USING (true);
CREATE INDEX idx_cpm_ordem ON public."CPM_CODIGO_PENAL_MILITAR" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CPPM_CODIGO_PROCESSO_PENAL_MILITAR" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CPPM_CODIGO_PROCESSO_PENAL_MILITAR" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CPPM" ON public."CPPM_CODIGO_PROCESSO_PENAL_MILITAR" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CPPM" ON public."CPPM_CODIGO_PROCESSO_PENAL_MILITAR" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CPPM" ON public."CPPM_CODIGO_PROCESSO_PENAL_MILITAR" FOR DELETE TO public USING (true);
CREATE INDEX idx_cppm_ordem ON public."CPPM_CODIGO_PROCESSO_PENAL_MILITAR" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CBA_CODIGO_BRASILEIRO_AERONAUTICA" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CBA_CODIGO_BRASILEIRO_AERONAUTICA" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CBA" ON public."CBA_CODIGO_BRASILEIRO_AERONAUTICA" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CBA" ON public."CBA_CODIGO_BRASILEIRO_AERONAUTICA" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CBA" ON public."CBA_CODIGO_BRASILEIRO_AERONAUTICA" FOR DELETE TO public USING (true);
CREATE INDEX idx_cba_ordem ON public."CBA_CODIGO_BRASILEIRO_AERONAUTICA" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CTEL_CODIGO_TELECOMUNICACOES" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CTEL_CODIGO_TELECOMUNICACOES" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CTEL" ON public."CTEL_CODIGO_TELECOMUNICACOES" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CTEL" ON public."CTEL_CODIGO_TELECOMUNICACOES" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CTEL" ON public."CTEL_CODIGO_TELECOMUNICACOES" FOR DELETE TO public USING (true);
CREATE INDEX idx_ctel_ordem ON public."CTEL_CODIGO_TELECOMUNICACOES" (ordem_numero);

CREATE TABLE IF NOT EXISTS public."CCOM_CODIGO_COMERCIAL" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL, rotulo text, texto text NOT NULL DEFAULT '', caput text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0, ordem_numero numeric NOT NULL DEFAULT 0,
  titulo text, capitulo text, incisos text[] DEFAULT '{}', paragrafos text[] DEFAULT '{}'
);
ALTER TABLE public."CCOM_CODIGO_COMERCIAL" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública CCOM" ON public."CCOM_CODIGO_COMERCIAL" FOR SELECT TO public USING (true);
CREATE POLICY "Inserção CCOM" ON public."CCOM_CODIGO_COMERCIAL" FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Deleção CCOM" ON public."CCOM_CODIGO_COMERCIAL" FOR DELETE TO public USING (true);
CREATE INDEX idx_ccom_ordem ON public."CCOM_CODIGO_COMERCIAL" (ordem_numero);
