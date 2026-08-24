INSERT INTO public.jurisprudencia_leis_map (slug_local, corpus_lei_id, nome_exibicao, ativo) VALUES
  ('CF88_CONSTITUICAO_FEDERAL', -1, 'Constituição Federal', true),
  ('CP_CODIGO_PENAL', 20, 'Código Penal', true),
  ('CC_CODIGO_CIVIL', 19, 'Código Civil', true),
  ('CPC_CODIGO_PROCESSO_CIVIL', 4, 'Código de Processo Civil', true),
  ('CPP_CODIGO_PROCESSO_PENAL', 3, 'Código de Processo Penal', true),
  ('CDC_CODIGO_DEFESA_CONSUMIDOR', 1, 'Código de Defesa do Consumidor', true),
  ('CLT_CONSOLIDACAO_LEIS_TRABALHO', 111, 'Consolidação das Leis do Trabalho', true),
  ('CTB_CODIGO_TRANSITO_BRASILEIRO', 42, 'Código de Trânsito Brasileiro', true),
  ('CTN_CODIGO_TRIBUTARIO_NACIONAL', 24, 'Código Tributário Nacional', true),
  ('CPM_CODIGO_PENAL_MILITAR', 64, 'Código Penal Militar', true),
  ('CPPM_CODIGO_PROCESSO_PENAL_MILITAR', 65, 'Código de Processo Penal Militar', true),
  ('CCOM_CODIGO_COMERCIAL', 181, 'Código Comercial', true)
ON CONFLICT (slug_local) DO UPDATE
SET corpus_lei_id = EXCLUDED.corpus_lei_id,
    nome_exibicao = EXCLUDED.nome_exibicao,
    ativo = true,
    updated_at = now();