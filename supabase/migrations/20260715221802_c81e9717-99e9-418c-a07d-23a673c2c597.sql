
CREATE TABLE public.overlay_frases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('filosofos', 'curiosidade', 'termo')),
  texto TEXT NOT NULL,
  legenda TEXT,
  voz_preferida TEXT,
  ativa BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.overlay_frases TO authenticated;
GRANT SELECT ON public.overlay_frases TO anon;
GRANT ALL ON public.overlay_frases TO service_role;

ALTER TABLE public.overlay_frases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública das frases"
  ON public.overlay_frases FOR SELECT
  USING (true);

CREATE POLICY "Autenticados podem gerenciar frases"
  ON public.overlay_frases FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX overlay_frases_categoria_idx ON public.overlay_frases(categoria, ativa, ordem);

CREATE POLICY "Service role gerencia audios de frases"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'narracoes-frases')
  WITH CHECK (bucket_id = 'narracoes-frases');

-- ============ SEED: 30 FILÓSOFOS ============
INSERT INTO public.overlay_frases (categoria, texto, legenda, ordem) VALUES
('filosofos', 'A justiça é a firme e constante vontade de dar a cada um o que é seu.', 'Ulpiano', 1),
('filosofos', 'Onde não há lei, não há liberdade.', 'John Locke', 2),
('filosofos', 'A liberdade consiste em fazer tudo o que as leis permitem.', 'Montesquieu', 3),
('filosofos', 'A justiça, sem a força, é impotente; a força, sem a justiça, é tirânica.', 'Blaise Pascal', 4),
('filosofos', 'A lei injusta não é lei.', 'Santo Agostinho', 5),
('filosofos', 'O homem é a medida de todas as coisas.', 'Protágoras', 6),
('filosofos', 'Só é livre quem obedece à lei que ele mesmo se deu.', 'Rousseau', 7),
('filosofos', 'A justiça atrasada não é justiça, senão injustiça qualificada e manifesta.', 'Rui Barbosa', 8),
('filosofos', 'O direito é a arte do bom e do justo.', 'Celso', 9),
('filosofos', 'Poder sem limites é sempre tirania.', 'Rui Barbosa', 10),
('filosofos', 'A finalidade do Direito é a paz; o meio de atingi-la, a luta.', 'Rudolf von Ihering', 11),
('filosofos', 'Não há liberdade quando as leis permitem que o homem deixe de ser pessoa e se torne coisa.', 'Cesare Beccaria', 12),
('filosofos', 'A pena deve ser proporcional ao crime.', 'Cesare Beccaria', 13),
('filosofos', 'A verdadeira medida dos crimes é o dano causado à sociedade.', 'Cesare Beccaria', 14),
('filosofos', 'A justiça é a virtude por excelência das instituições sociais.', 'John Rawls', 15),
('filosofos', 'Age de tal maneira que a máxima da tua vontade possa valer como princípio de legislação universal.', 'Immanuel Kant', 16),
('filosofos', 'A dignidade humana é o valor supremo que atravessa toda a ordem jurídica.', 'Immanuel Kant', 17),
('filosofos', 'Onde acaba a lei, começa a tirania.', 'William Pitt', 18),
('filosofos', 'A lei é a razão livre de paixão.', 'Aristóteles', 19),
('filosofos', 'A justiça é o alicerce dos reinos.', 'Cícero', 20),
('filosofos', 'A salvação do povo é a lei suprema.', 'Cícero', 21),
('filosofos', 'Quem defende a sua causa antes de ouvir a outra, ainda que fale a verdade, não é justo.', 'Sêneca', 22),
('filosofos', 'A lei deve ser breve, para que os ignorantes a compreendam.', 'Sêneca', 23),
('filosofos', 'Direito é aquilo que a autoridade competente decide que é.', 'Hans Kelsen', 24),
('filosofos', 'O direito só se realiza plenamente quando encontra na consciência do juiz o senso do justo.', 'Miguel Reale', 25),
('filosofos', 'A todos assiste o direito de ter direitos.', 'Hannah Arendt', 26),
('filosofos', 'O direito não deve ser apenas conhecido — deve ser sentido como algo vivo.', 'Pontes de Miranda', 27),
('filosofos', 'Sem justiça, a força é tirania; sem força, a justiça é utopia.', 'Norberto Bobbio', 28),
('filosofos', 'A democracia é o governo do poder público em público.', 'Norberto Bobbio', 29),
('filosofos', 'O direito existe para realizar-se. Realizar o direito é a vida do direito.', 'Rudolf von Ihering', 30);

-- ============ SEED: 30 CURIOSIDADES ============
INSERT INTO public.overlay_frases (categoria, texto, legenda, ordem) VALUES
('curiosidade', 'A Constituição de 1988 é chamada de Constituição Cidadã por ter sido a mais participativa da história do Brasil.', 'Curiosidade constitucional', 1),
('curiosidade', 'O Código Civil brasileiro atual entrou em vigor em 2003, substituindo o de 1916, que durou 87 anos.', 'História do Direito', 2),
('curiosidade', 'O habeas corpus surgiu na Inglaterra em 1215, com a Magna Carta, e chegou ao Brasil em 1830.', 'Origem do habeas corpus', 3),
('curiosidade', 'O Supremo Tribunal Federal foi criado em 1890, inspirado na Suprema Corte dos Estados Unidos.', 'História do STF', 4),
('curiosidade', 'O júri popular no Brasil existe desde 1822 e é garantia constitucional para crimes dolosos contra a vida.', 'Tribunal do Júri', 5),
('curiosidade', 'A OAB foi criada em 18 de novembro de 1930, pelo Decreto nº 19.408.', 'História da OAB', 6),
('curiosidade', 'A palavra "direito" vem do latim directus, que significa reto, aquilo que está em linha reta.', 'Etimologia', 7),
('curiosidade', 'O Código de Hamurabi, de 1750 a.C., é um dos primeiros conjuntos escritos de leis da humanidade.', 'História mundial', 8),
('curiosidade', 'A palavra "advogado" vem do latim ad vocatus, que significa "chamado para".', 'Etimologia', 9),
('curiosidade', 'O CPC de 2015 foi o primeiro código brasileiro elaborado inteiramente em democracia.', 'Processo Civil', 10),
('curiosidade', 'O princípio da insignificância foi consolidado no Brasil pela jurisprudência do STF.', 'Direito Penal', 11),
('curiosidade', 'O Brasil já teve 7 Constituições: 1824, 1891, 1934, 1937, 1946, 1967 e 1988.', 'Constitucionalismo', 12),
('curiosidade', 'A prescrição penal pode extinguir a punibilidade mesmo antes da sentença.', 'Direito Penal', 13),
('curiosidade', 'O Direito Romano é a base de quase todo o sistema jurídico ocidental atual.', 'Origens do Direito', 14),
('curiosidade', 'A CLT foi promulgada em 1º de maio de 1943, no governo de Getúlio Vargas.', 'Direito do Trabalho', 15),
('curiosidade', 'O CDC brasileiro é considerado uma das leis mais avançadas do mundo em defesa do consumidor.', 'CDC de 1990', 16),
('curiosidade', 'O Estatuto da Criança e do Adolescente, de 1990, adotou a doutrina da proteção integral.', 'ECA', 17),
('curiosidade', 'A ação popular é uma garantia constitucional exclusiva do cidadão eleitor.', 'Ações constitucionais', 18),
('curiosidade', 'O mandado de injunção só existe no Brasil e busca suprir a falta de norma regulamentadora.', 'Remédio constitucional', 19),
('curiosidade', 'O princípio "nulla poena sine lege" existe desde o Direito Romano.', 'Princípio da legalidade', 20),
('curiosidade', 'A separação dos poderes foi teorizada por Montesquieu em O Espírito das Leis, em 1748.', 'Teoria clássica', 21),
('curiosidade', 'O Brasil adota o sistema misto de controle de constitucionalidade: difuso e concentrado.', 'Controle de constitucionalidade', 22),
('curiosidade', 'A duração razoável do processo virou direito fundamental com a Emenda 45 de 2004.', 'Reforma do Judiciário', 23),
('curiosidade', 'O advogado é indispensável à administração da Justiça, conforme o artigo 133 da Constituição.', 'CF/88, art. 133', 24),
('curiosidade', 'Direitos fundamentais têm aplicação imediata segundo o parágrafo 1º do artigo 5º da Constituição.', 'CF/88, art. 5º', 25),
('curiosidade', 'Estima-se que apenas cerca de vinte por cento dos brasileiros conheçam seus direitos constitucionais básicos.', 'Cultura jurídica', 26),
('curiosidade', 'Cláusula pétrea é uma norma que não pode ser abolida nem por Emenda Constitucional.', 'CF/88, art. 60', 27),
('curiosidade', 'O Brasil tem mais faculdades de Direito do que o restante do mundo somado.', 'Ensino jurídico', 28),
('curiosidade', 'A Lei Maria da Penha, de 2006, foi considerada pela ONU uma das melhores leis do mundo contra violência doméstica.', 'Lei 11.340/2006', 29),
('curiosidade', 'A presunção de inocência é conhecida também pelo brocardo in dubio pro reo.', 'Direito Penal', 30);

-- ============ SEED: 30 TERMOS JURÍDICOS ============
INSERT INTO public.overlay_frases (categoria, texto, legenda, ordem) VALUES
('termo', 'Habeas corpus: garantia constitucional que protege a liberdade de locomoção contra ilegalidade ou abuso de poder.', 'Termo jurídico', 1),
('termo', 'Litispendência: existência de duas ações idênticas em curso simultâneo — uma delas deve ser extinta.', 'Termo jurídico', 2),
('termo', 'Prescrição: perda da pretensão pelo decurso do tempo previsto em lei.', 'Termo jurídico', 3),
('termo', 'Decadência: extinção do próprio direito pelo transcurso do prazo legal para exercê-lo.', 'Termo jurídico', 4),
('termo', 'Coisa julgada: qualidade que torna imutável a decisão judicial após esgotados os recursos.', 'Termo jurídico', 5),
('termo', 'Litisconsórcio: pluralidade de partes no polo ativo ou passivo do processo.', 'Termo jurídico', 6),
('termo', 'Contraditório: direito da parte de ser ouvida e de reagir a todo ato processual.', 'Termo jurídico', 7),
('termo', 'Ampla defesa: direito de utilizar todos os meios de prova e argumentos admitidos em direito.', 'Termo jurídico', 8),
('termo', 'Devido processo legal: garantia de que ninguém será privado de bens ou liberdade sem processo justo.', 'Termo jurídico', 9),
('termo', 'Sub judice: expressão latina que significa sob julgamento, assunto ainda pendente de decisão.', 'Termo jurídico', 10),
('termo', 'Ex tunc: efeitos retroativos, que retroagem à data original do ato.', 'Termo jurídico', 11),
('termo', 'Ex nunc: efeitos que só valem a partir da decisão, sem retroagir.', 'Termo jurídico', 12),
('termo', 'Erga omnes: expressão que significa contra todos, eficácia oponível a qualquer pessoa.', 'Termo jurídico', 13),
('termo', 'Inter partes: eficácia limitada apenas às partes do processo.', 'Termo jurídico', 14),
('termo', 'Data venia: expressão de cortesia usada ao discordar de outra opinião — com o devido respeito.', 'Termo jurídico', 15),
('termo', 'Ad hoc: designação para função específica, apenas para determinado ato ou caso.', 'Termo jurídico', 16),
('termo', 'Amicus curiae: amigo da corte — terceiro que colabora com informações relevantes ao processo.', 'Termo jurídico', 17),
('termo', 'Ratio decidendi: fundamento essencial da decisão, que forma o precedente vinculante.', 'Termo jurídico', 18),
('termo', 'Obiter dictum: comentário lateral do julgador, sem força vinculante.', 'Termo jurídico', 19),
('termo', 'Sursis: suspensão condicional da execução da pena privativa de liberdade.', 'Termo jurídico', 20),
('termo', 'Dolo: vontade consciente de praticar o crime; consciência e vontade do resultado.', 'Termo jurídico', 21),
('termo', 'Culpa: conduta sem intenção, resultante de imprudência, negligência ou imperícia.', 'Termo jurídico', 22),
('termo', 'Fumus boni juris: fumaça do bom direito — plausibilidade do direito alegado.', 'Termo jurídico', 23),
('termo', 'Periculum in mora: perigo da demora — risco de dano pela espera da decisão final.', 'Termo jurídico', 24),
('termo', 'Ônus da prova: dever da parte de comprovar os fatos que alega.', 'Termo jurídico', 25),
('termo', 'Preclusão: perda da faculdade processual por não exercê-la no momento adequado.', 'Termo jurídico', 26),
('termo', 'Recurso ex officio: reexame obrigatório da sentença pelo tribunal, independentemente de pedido.', 'Termo jurídico', 27),
('termo', 'Súmula vinculante: enunciado do STF de observância obrigatória por juízes e administração pública.', 'Termo jurídico', 28),
('termo', 'Repercussão geral: requisito de admissibilidade do recurso extraordinário no STF.', 'Termo jurídico', 29),
('termo', 'Modulação de efeitos: técnica que permite ao STF definir a partir de quando sua decisão produzirá efeitos.', 'Termo jurídico', 30);

CREATE OR REPLACE FUNCTION public.update_overlay_frases_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_overlay_frases_updated_at
BEFORE UPDATE ON public.overlay_frases
FOR EACH ROW EXECUTE FUNCTION public.update_overlay_frases_updated_at();
