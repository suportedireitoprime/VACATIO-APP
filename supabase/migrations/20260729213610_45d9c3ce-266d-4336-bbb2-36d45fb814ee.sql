UPDATE public.biblioteca_leitura_nativa
SET status = 'pendente', erro_detalhe = NULL, progresso = 0, etapa = NULL
WHERE status = 'erro';