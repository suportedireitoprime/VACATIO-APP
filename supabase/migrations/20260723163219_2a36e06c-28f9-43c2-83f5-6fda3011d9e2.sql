-- Sementes de mapeamento vade_mecum_leis.slug → Corpus927 (Enfam) corpus_lei_id.
-- Regra especial: corpus_lei_id = -1 é um sentinel indicando que a lei não é indexada
-- pelo Corpus927 (ex.: Constituição Federal) e o app deve usar fallback direto STF/STJ.

INSERT INTO public.jurisprudencia_leis_map (slug_local, corpus_lei_id, nome_exibicao, ativo)
VALUES
  -- Constituição — não existe no Corpus927; sentinel = fallback direto
  ('cf', -1, 'Constituição Federal', true),

  -- Códigos principais
  ('cc',   19, 'Código Civil', true),
  ('cp',   20, 'Código Penal', true),
  ('cpc',   4, 'Código de Processo Civil', true),
  ('cpp',   3, 'Código de Processo Penal', true),
  ('cdc',   1, 'Código de Defesa do Consumidor', true),
  ('clt', 111, 'Consolidação das Leis do Trabalho', true),
  ('ctb',  42, 'Código de Trânsito Brasileiro', true),
  ('ctn',  24, 'Código Tributário Nacional', true),
  ('cpm',  64, 'Código Penal Militar', true),
  ('cppm', 65, 'Código de Processo Penal Militar', true),
  ('cpi',  90, 'Código de Propriedade Industrial', true),
  ('ccom', 181, 'Código Comercial', true),

  -- Estatutos
  ('estatuto-eca',                 6, 'Estatuto da Criança e do Adolescente', true),
  ('estatuto-idoso',             128, 'Estatuto do Idoso', true),
  ('estatuto-desarmamento',       44, 'Estatuto do Desarmamento', true),
  ('estatuto-oab',               129, 'Estatuto da OAB', true),
  ('estatuto-indio',              72, 'Estatuto do Índio', true),
  ('estatuto-militares',         100, 'Estatuto dos Militares', true),
  ('estatuto-terra',             108, 'Estatuto da Terra', true),
  ('estatuto-pessoa-deficiencia',172, 'Estatuto da Pessoa com Deficiência', true),

  -- Leis penais / processuais especiais
  ('lei-crimes-hediondos',       36, 'Lei dos Crimes Hediondos', true),
  ('lei-crimes-ambientais',      46, 'Lei de Crimes Ambientais', true),
  ('lei-contravencoes',          92, 'Lei das Contravenções Penais', true),
  ('lei-tortura',                41, 'Lei da Tortura', true),
  ('lei-lavagem',                43, 'Lei de Lavagem de Dinheiro', true),
  ('lei-crimes-financeiro',      56, 'Crimes contra o Sistema Financeiro Nacional', true),
  ('lei-crimes-tributario',      38, 'Crimes contra a Ordem Tributária', true),
  ('lei-crimes-democraticos',   112, 'Crimes de Preconceito de Raça/Cor', true),

  -- Códigos/leis "curtas" comuns
  ('cdd',                        10, 'Lei de Drogas', true),
  ('lei-drogas',                 10, 'Lei de Drogas', true),
  ('lei-maria-da-penha',         11, 'Lei Maria da Penha', true),
  ('lei-execucao-penal',          2, 'Lei de Execução Penal', true),

  -- Ações constitucionais / coletivas / improbidade
  ('lei-acao-civil-publica',     15, 'Lei da Ação Civil Pública', true),
  ('lei-improbidade',            16, 'Lei de Improbidade Administrativa', true),

  -- Licitações e concessões
  ('lei-14133-2021',            203, 'Lei de Licitações e Contratos (14.133/2021)', true),
  ('nova-lei-licitacoes',       203, 'Lei de Licitações e Contratos (14.133/2021)', true),
  ('lei-8666',                   21, 'Lei de Licitações (8.666/1993)', true),

  -- Leis complementares
  ('lc-inelegibilidades',        97, 'Lei das Inelegibilidades (LC 64/1990)', true),
  ('lc-iss',                     28, 'ISS (LC 116/2003)', true),
  ('lc-responsabilidade-fiscal', 76, 'Lei de Responsabilidade Fiscal (LC 101/2000)', true),

  -- Outras
  ('lei-arbitragem',             93, 'Lei da Arbitragem', true),
  ('lei-bem-familia',           126, 'Impenhorabilidade do Bem de Família', true),

  -- Compat com slugs legados usados no app
  ('codigo-penal',               20, 'Código Penal', true),
  ('codigo-civil',               19, 'Código Civil', true),
  ('codigo-processo-civil',       4, 'Código de Processo Civil', true),
  ('codigo-processo-penal',       3, 'Código de Processo Penal', true),
  ('codigo-defesa-consumidor',    1, 'Código de Defesa do Consumidor', true),
  ('codigo-trabalho',           111, 'Consolidação das Leis do Trabalho', true),
  ('constituicao',               -1, 'Constituição Federal', true),
  ('constituicao-federal',       -1, 'Constituição Federal', true)
ON CONFLICT (slug_local) DO UPDATE
SET corpus_lei_id = EXCLUDED.corpus_lei_id,
    nome_exibicao = EXCLUDED.nome_exibicao,
    ativo         = true,
    updated_at    = now();