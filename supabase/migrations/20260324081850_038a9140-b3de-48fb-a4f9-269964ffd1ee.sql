-- Drop old unused tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.incisos CASCADE;
DROP TABLE IF EXISTS public.paragrafos CASCADE;
DROP TABLE IF EXISTS public.artigos_lei CASCADE;
DROP TABLE IF EXISTS public.leis CASCADE;

-- Add index on ordem_numero for default ordering on CP_CODIGO_PENAL
CREATE INDEX IF NOT EXISTS idx_cp_codigo_penal_ordem ON public."CP_CODIGO_PENAL" (ordem_numero ASC);