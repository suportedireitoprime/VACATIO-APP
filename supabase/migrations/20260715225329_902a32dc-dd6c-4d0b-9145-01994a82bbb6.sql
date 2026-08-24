-- Libera temas travados em "gerando" e volta modelo padrão para flash-lite (agora via Lovable AI Gateway)
UPDATE public.blog_edicao_temas SET status = 'pendente', erro = NULL WHERE status = 'gerando';
UPDATE public.blog_edicao_config SET modelo_texto = 'google/gemini-2.5-flash-lite';
ALTER TABLE public.blog_edicao_config ALTER COLUMN modelo_texto SET DEFAULT 'google/gemini-2.5-flash-lite';