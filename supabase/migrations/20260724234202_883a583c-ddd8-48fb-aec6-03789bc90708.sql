UPDATE public.biblioteca_leitura_nativa
SET conteudo_md_refinado = NULL,
    capitulos_json = NULL,
    preliminares_md = NULL,
    refino_status = 'pendente',
    refino_erro = NULL,
    refino_updated_at = NULL,
    status = 'processando',
    etapa = 'Aguardando refino',
    progresso = 0
WHERE livro_id = '123' AND livro_tabela = 'classicos';