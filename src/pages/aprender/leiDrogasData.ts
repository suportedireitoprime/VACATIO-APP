import { AulaSlide } from './crimesContraFamiliaData';

export interface AulaInfo {
  numero: number;
  titulo: string;
  subtitulo: string;
  duracaoEstimada: string;
  totalEtapas: number;
  descricao: string;
  prontaParaEstudo: boolean;
}

export const LEI_DROGAS_AULAS: AulaInfo[] = [
  {
    numero: 1,
    titulo: 'Lei de Drogas · Introdução e Bem Jurídico',
    subtitulo: 'Sistema Nacional de Políticas Públicas sobre Drogas (Lei 11.343/2006)',
    duracaoEstimada: '18 min',
    totalEtapas: 32,
    descricao: 'Bem jurídico tutelado (Saúde Pública), crime de perigo abstrato, norma penal em branco heterogênea e a Portaria 344 da Anvisa.',
    prontaParaEstudo: true,
  },
  {
    numero: 2,
    titulo: 'Posse e Porte para Consumo Pessoal (Art. 28)',
    subtitulo: 'A conduta do usuário e a natureza jurídica das sanções',
    duracaoEstimada: '15 min',
    totalEtapas: 32,
    descricao: 'Condutas típicas do art. 28, cultivo para uso pessoal e as sanções despenalizadoras (advertência, prestação de serviços e medidas educativas).',
    prontaParaEstudo: false,
  },
  {
    numero: 3,
    titulo: 'Despenalização vs Descriminalização e Decisão do STF',
    subtitulo: 'O RE 635.659 e a fixação de critérios objetivos para maconha',
    duracaoEstimada: '16 min',
    totalEtapas: 32,
    descricao: 'A repercussão geral no STF, quantidade presumida de porte, consequências administrativas e distinção doutrinária.',
    prontaParaEstudo: false,
  },
  {
    numero: 4,
    titulo: 'Tráfico de Drogas: O Tipo Fundamental (Art. 33, caput)',
    subtitulo: 'Tipo misto alternativo com 18 verbos nucleares',
    duracaoEstimada: '20 min',
    totalEtapas: 32,
    descricao: 'Consumação instantânea e permanente, pena de 5 a 15 anos de reclusão, multiplicidade de condutas no mesmo contexto fático.',
    prontaParaEstudo: false,
  },
  {
    numero: 5,
    titulo: 'Figuras Equiparadas ao Tráfico (Art. 33, § 1º)',
    subtitulo: 'Matéria-prima, insumos, cultivo e utilização de local',
    duracaoEstimada: '14 min',
    totalEtapas: 32,
    descricao: 'Insumos e precursores químicos, semeadura e colheita sem autorização, e ceder local público ou privado para o tráfico.',
    prontaParaEstudo: false,
  },
  {
    numero: 6,
    titulo: 'Tráfico Privilegiado (Art. 33, § 4º)',
    subtitulo: 'Causa de diminuição de pena de 1/6 a 2/3 e seus 4 requisitos cumulativos',
    duracaoEstimada: '18 min',
    totalEtapas: 32,
    descricao: 'Primariedade, bons antecedentes, não dedicação a atividades criminosas e não integração de organização criminosa. Afastamento da hediondez.',
    prontaParaEstudo: false,
  },
  {
    numero: 7,
    titulo: 'Uso Compartilhado de Drogas (Art. 33, § 3º)',
    subtitulo: 'Oferecimento eventual a pessoa do relacionamento, sem objetivo de lucro',
    duracaoEstimada: '12 min',
    totalEtapas: 32,
    descricao: 'Diferença entre tráfico comum e a infração de menor potencial ofensivo do uso conjunto.',
    prontaParaEstudo: false,
  },
  {
    numero: 8,
    titulo: 'Maquinário e Instrumentos para Drogas (Art. 34)',
    subtitulo: 'Fabricação, transporte e posse de objetos destinados à produção',
    duracaoEstimada: '14 min',
    totalEtapas: 32,
    descricao: 'Princípio da consunção quando absorvido pelo tráfico (Art. 33) e autonomia típica.',
    prontaParaEstudo: false,
  },
  {
    numero: 9,
    titulo: 'Associação para o Tráfico (Art. 35)',
    subtitulo: 'O dolo específico de reunião estável e permanente de duas ou mais pessoas',
    duracaoEstimada: '16 min',
    totalEtapas: 32,
    descricao: 'Distinção entre mero concurso eventual de agentes e o crime autônomo do art. 35.',
    prontaParaEstudo: false,
  },
  {
    numero: 10,
    titulo: 'Financiamento ou Custeio do Tráfico (Art. 36)',
    subtitulo: 'O investidor do tráfico de entorpecentes',
    duracaoEstimada: '14 min',
    totalEtapas: 32,
    descricao: 'Pena autônoma mais severa (8 a 20 anos), subsidiariedade e absorção.',
    prontaParaEstudo: false,
  },
  {
    numero: 11,
    titulo: 'Colaboração como Informante (Art. 37)',
    subtitulo: 'O "olheiro" ou "fogueteiro" do tráfico',
    duracaoEstimada: '12 min',
    totalEtapas: 32,
    descricao: 'Condição de não integração à quadrilha e repasse de informações a grupo ou associação.',
    prontaParaEstudo: false,
  },
  {
    numero: 12,
    titulo: 'Prescrição ou Ministração Culposa de Drogas (Art. 38)',
    subtitulo: 'Crime próprio de médicos, dentistas, farmacêuticos ou profissionais de saúde',
    duracaoEstimada: '12 min',
    totalEtapas: 32,
    descricao: 'A única modalidade culposa da Lei de Drogas.',
    prontaParaEstudo: false,
  },
  {
    numero: 13,
    titulo: 'Condução de Embarcação ou Aeronave (Art. 39)',
    subtitulo: 'Operação de meios de transporte sob o efeito de substâncias',
    duracaoEstimada: '11 min',
    totalEtapas: 32,
    descricao: 'Tutela da segurança dos transportes aquaviários e aéreos.',
    prontaParaEstudo: false,
  },
  {
    numero: 14,
    titulo: 'Causas Especiais de Aumento de Pena (Art. 40)',
    subtitulo: 'A majoração de 1/6 a 2/3: transnacionalidade, interestadualidade e locais protegidos',
    duracaoEstimada: '18 min',
    totalEtapas: 32,
    descricao: 'Análise detalhada dos 7 incisos do artigo 40 e súmulas do STJ (Súmula 587 e 607).',
    prontaParaEstudo: false,
  },
  {
    numero: 15,
    titulo: 'Critérios Especiais de Dosimetria (Art. 42)',
    subtitulo: 'Natureza e quantidade da substância com preponderância no cálculo da pena',
    duracaoEstimada: '16 min',
    totalEtapas: 32,
    descricao: 'Prevalência sobre o art. 59 do Código Penal e vedação do bis in idem na fração do privilégio.',
    prontaParaEstudo: false,
  },
  {
    numero: 16,
    titulo: 'Colaboração Premiada na Lei de Drogas (Art. 41)',
    subtitulo: 'Redução de pena de 1/3 a 2/3 pela identificação de comparsas',
    duracaoEstimada: '13 min',
    totalEtapas: 32,
    descricao: 'Requisitos específicos da delação eficaz na Lei 11.343/2006.',
    prontaParaEstudo: false,
  },
  {
    numero: 17,
    titulo: 'Procedimento Penal Especial (Arts. 54 a 59)',
    subtitulo: 'Defesa prévia obrigatória e contraditório preliminar antes do recebimento da denúncia',
    duracaoEstimada: '18 min',
    totalEtapas: 32,
    descricao: 'Rito especial, laudo toxicológico provisório e definitivo, e interrogatório como último ato.',
    prontaParaEstudo: false,
  },
  {
    numero: 18,
    titulo: 'Meios Extraordinários de Prova (Art. 53)',
    subtitulo: 'Infiltração policial e não atuação policial (entrega vigiada)',
    duracaoEstimada: '15 min',
    totalEtapas: 32,
    descricao: 'Autorização judicial, acompanhamento de carregamentos e limites operacionais.',
    prontaParaEstudo: false,
  },
  {
    numero: 19,
    titulo: 'Destruição e Incineração de Drogas (Arts. 50 e 50-A)',
    subtitulo: 'Procedimento administrativo e judicial de destruição de entorpecentes',
    duracaoEstimada: '12 min',
    totalEtapas: 32,
    descricao: 'Prazos legais com prisão em flagrante e sem prisão, preservação de amostras para contraperícia.',
    prontaParaEstudo: false,
  },
  {
    numero: 20,
    titulo: 'Revisão Geral e Jurisprudência dos Tribunais Superiores',
    subtitulo: 'Súmulas vinculantes, teses repetitivas e fechamento da matéria',
    duracaoEstimada: '22 min',
    totalEtapas: 32,
    descricao: 'Síntese das 20 aulas com mapa conceitual consolidado e questões comentadas de concursos de elite.',
    prontaParaEstudo: false,
  },
];

export const LEI_DROGAS_AULA_01_SLIDES: AulaSlide[] = [
  {
    tipo: 'Capa',
    img: 'capa',
    alt: 'Balança da justiça dourada ao lado da bandeira nacional e frascos simbólicos protegidos pela lei',
    kicker: 'Direito Penal · Lei de Drogas (Lei 11.343/2006)',
    titulo: 'Lei de Drogas: Sistema e Bem Jurídico',
    corpo: '<p class="lead">A Lei nº 11.343/2006 não é apenas uma lista de crimes e penas. Ela instituiu o <b>SISNAD</b>, o Sistema Nacional de Políticas Públicas sobre Drogas, separando radicalmente o tratamento dado ao <b>usuário dependente</b> do tratamento rigoroso imposto ao <b>traficante</b>.</p><p>Para compreender qualquer artigo desta lei, é fundamental responder a uma pergunta central: <b>o que o Estado busca proteger</b> quando tipifica essas condutas? A resposta é a <b>Saúde Pública</b>, tratada como um bem jurídico supraindividual e difuso.</p><p>Nesta aula de abertura, você vai dominar a arquitetura completa da lei: a natureza de <b>crime de perigo abstrato</b>, a complementação pela <b>norma penal em branco heterogênea</b> (a famosa Portaria 344 da Anvisa) e a linha divisória inicial entre o artigo 28 e o artigo 33.</p><div class="chips"><span class="chip">Lei 11.343/2006</span><span class="chip">Saúde Pública</span><span class="chip">Perigo Abstrato</span><span class="chip">Norma Penal em Branco</span></div>',
    narr: 'A Lei onze mil trezentos e quarenta e três de dois mil e seis não é apenas uma lista de crimes e penas. Ela instituiu o Sistema Nacional de Políticas Públicas sobre Drogas, separando radicalmente o tratamento dado ao usuário dependente do tratamento rigoroso imposto ao traficante. Para compreender qualquer artigo desta lei, é fundamental responder a uma pergunta central: o que o Estado busca proteger quando tipifica essas condutas? A resposta é a Saúde Pública, tratada como um bem jurídico supraindividual e difuso. Nesta aula de abertura, você vai dominar a arquitetura completa da lei: a natureza de crime de perigo abstrato, a complementação pela norma penal em branco heterogênea, a famosa Portaria trezentos e quarenta e quatro da Anvisa, e a linha divisória inicial entre o artigo vinte e oito e o artigo trinta e três.'
  },
  {
    tipo: 'Conteúdo',
    img: 'mapa',
    alt: 'Pergaminho antigo com bússola e quatro direções representando o roteiro pedagógico',
    kicker: 'Roteiro da aula',
    titulo: 'O caminho desta aula',
    corpo: '<p>Assim como na nossa metodologia de alto rendimento, esta aula está estruturada em <b>três blocos pedagógicos</b> e um fechamento rigoroso:</p><div class="viarow"><div class="vianum">1</div><div><h3>O terreno da Lei de Drogas</h3><p>O SISNAD, o bem jurídico tutelado (Saúde Pública) e a norma penal em branco heterogênea.</p></div></div><div class="viarow"><div class="vianum">2</div><div><h3>A grande divisão: Art. 28 x Art. 33</h3><p>A diferenciação entre consumo pessoal e tráfico, dolo de mercancia e critérios de prova.</p></div></div><div class="viarow"><div class="vianum">3</div><div><h3>Prática e fixação ativa</h3><p>Comparador deslizante, cena interativa com 5 pontos, ligar termos, lacunas e jurisprudência.</p></div></div><div class="viarow"><div class="vianum">4</div><div><h3>Fechamento e desafio</h3><p>Desafio com pontuação, a Pergunta de Ouro e o resumo dos pontos inegociáveis.</p></div></div><div class="vazada" aria-hidden="true"><img src="assets/img/mapa.webp" alt=""></div><p>Acompanhe o texto corrido e teste sua compreensão nas paradas ativas ao final de cada bloco. Vamos ao primeiro bloco!</p>',
    narr: 'O caminho desta aula. Esta aula está estruturada em três blocos pedagógicos e um fechamento rigoroso. Bloco um: O terreno da Lei de Drogas. O SISNAD, o bem jurídico tutelado que é a Saúde Pública e a norma penal em branco heterogênea. Bloco dois: A grande divisão: Artigo vinte e oito versus Artigo trinta e três. A diferenciação entre consumo pessoal e tráfico, dolo de mercancia e critérios de prova. Bloco três: Prática e fixação ativa. Comparador deslizante, cena interativa com cinco pontos, ligar termos, lacunas e jurisprudência. Fechamento: Desafio com pontuação, a Pergunta de Ouro e o resumo dos pontos inegociáveis.'
  },
  {
    tipo: 'Conteúdo',
    img: 'balanca',
    alt: 'Escudo protegendo a sociedade de substâncias nocivas',
    kicker: 'O bem jurídico',
    titulo: 'A Saúde Pública sob tutela penal',
    corpo: '<p>O bem jurídico tutelado pelos crimes da Lei 11.343/2006 é a <b>Saúde Pública</b>. Não se tutela a saúde individual de quem consome, mas sim a higidez física e mental da coletividade como um todo.</p><p>Disso decorre uma consequência jurídica fundamental: a maioria esmagadora dos crimes previstos nesta lei é classificada como <b>crime de perigo abstrato</b> (ou de perigo presumido). O legislador presume de forma absoluta que a circulação de substâncias entorpecentes coloca em risco a coletividade, sem exigir que alguém passe mal ou sofra dano concreto para que o crime se consume.</p><div class="box exemplo"><img class="wm" src="assets/img/balanca.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">EXEMPLO PRÁTICO</p><p>Se um indivíduo transporta dez quilos de cocaína lacrados em um fundo falso de veículo e é parado numa blitz rodoviária, o crime de tráfico já está perfeitamente consumado, mesmo que nenhum grama tenha chegado aos pulmões de terceiros. A Saúde Pública já sofreu o risco que a norma proíbe.</p></div></div><div class="frasechave"><p class="flabel">FRASE-CHAVE</p><p class="fq2">O tráfico tutela a Saúde Pública: é crime de perigo abstrato que dispensa comprovação de dano individual.</p></div><p>Essa classificação é pacífica no STF e no STJ e explica a severidade das condutas que veremos adiante.</p>',
    narr: 'A Saúde Pública sob tutela penal. O bem jurídico tutelado pelos crimes da Lei onze mil trezentos e quarenta e três é a Saúde Pública. Não se tutela a saúde individual de quem consome, mas sim a higidez física e mental da coletividade como um todo. Disso decorre uma consequência jurídica fundamental: a maioria esmagadora dos crimes previstos nesta lei é classificada como crime de perigo abstrato. O legislador presume de forma absoluta que a circulação de substâncias entorpecentes coloca em risco a coletividade, sem exigir comprovação de dano concreto. O tráfico tutela a Saúde Pública: é crime de perigo abstrato que dispensa comprovação de dano individual.'
  },
  {
    tipo: 'Conteúdo',
    img: 'capitulos',
    alt: 'Portas que conduzem aos eixos do SISNAD',
    kicker: 'Estrutura legal',
    titulo: 'A arquitetura do SISNAD e os 4 eixos',
    corpo: '<p>A Lei de Drogas substituiu a antiga Lei 6.368/1976 e adotou uma política de <b>redução de danos</b> e prevenção. Ela está dividida em quatro grandes eixos de atuação:</p><div class="viarow"><div class="vianum">1</div><div><h3>Prevenção e Educação</h3><p>Medidas sociais e escolares voltadas a evitar o primeiro contato com entorpecentes.</p></div></div><div class="viarow"><div class="vianum">2</div><div><h3>Tratamento e Reinserção</h3><p>Acolhimento médico e psicológico do dependente químico, sem criminalização hospitalar.</p></div></div><div class="viarow"><div class="vianum">3</div><div><h3>Repressão ao Tráfico</h3><p>Penas rigorosas para o comércio ilícito, associação e financiamento (Arts. 33 a 37).</p></div></div><div class="viarow"><div class="vianum">4</div><div><h3>Procedimento Especial</h3><p>Rito processual diferenciado com notificação prévia antes da denúncia (Arts. 54 a 59).</p></div></div><div class="vazada" aria-hidden="true"><img src="assets/img/capitulos.webp" alt=""></div><p>Entender essa divisão impede que o operador do direito confunda a resposta estatal dirigida ao doente com aquela destinada à organização criminosa.</p>',
    narr: 'A arquitetura do SISNAD e os quatro eixos. A Lei de Drogas substituiu a antiga Lei seis mil trezentos e sessenta e oito e adotou uma política de redução de danos e prevenção. Ela está dividida em quatro grandes eixos de atuação: Prevenção e Educação, Tratamento e Reinserção do dependente, Repressão ao Tráfico com penas rigorosas e Procedimento Especial com rito processual diferenciado. Entender essa divisão impede que o operador do direito confunda a resposta estatal dirigida ao dependente com aquela destinada à organização criminosa.'
  },
  {
    tipo: 'Conteúdo',
    img: 'familia',
    alt: 'Livro de leis aberto emitindo luz com selo oficial da Anvisa',
    kicker: 'Norma em branco',
    titulo: 'A Norma Penal em Branco Heterogênea',
    corpo: '<p>Abra a Lei 11.343/2006 e tente encontrar nela o conceito químico de <b>droga</b>. Você não vai encontrar. A lei se limita a punir quem importa, exporta, vende ou guarda "drogas", mas delega para outro órgão a definição exata de quais substâncias são proibidas.</p><p>Trata-se do clássico exemplo de <b>Norma Penal em Branco Heterogênea</b> (em sentido estrito): a regra proibitiva está na lei formal (emanada do Congresso Nacional), mas seu complemento emana de ato infralegal do Poder Executivo.</p><p>Esse complemento é a <b>Portaria SVS/MS nº 344/1998 da Anvisa</b> e suas resoluções de atualização periódica. É a Anvisa quem publica as listas F1, F2 (entorpecentes), E (plantas proscritas) e psicotrópicos.</p><div class="box exemplo"><img class="wm" src="assets/img/familia.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">PENSE ASSIM</p><p>Se a Anvisa retira uma substância da Portaria 344 (como ocorreu no passado com certas fórmulas inibidoras de apetite), ocorre <b>abolitio criminis</b> imediata, retroagindo para beneficiar o réu. Se ela inclui nova substância, a punição só vale para o futuro, respeitando a anterioridade penal.</p></div></div><div class="frasechave"><p class="flabel">NESTE BLOCO VOCÊ VIU</p><p class="fq2">O bem jurídico é a Saúde Pública (perigo abstrato) e a lei é norma penal em branco heterogênea integrada pela Portaria 344 da Anvisa.</p></div>',
    narr: 'A Norma Penal em Branco Heterogênea. A lei se limita a punir quem importa, vende ou guarda drogas, mas delega para outro órgão a definição de quais substâncias são proibidas. Trata-se de uma Norma Penal em Branco Heterogênea: a regra proibitiva está na lei federal, mas o complemento emana de ato do Poder Executivo, a Portaria trezentos e quarenta e quatro da Anvisa. Se a Anvisa retira uma substância da lista, ocorre abolitio criminis retroativa. Se inclui uma nova substância, a punição só incide para o futuro.'
  },
  {
    tipo: 'Conteúdo',
    img: 'bigamia',
    alt: 'Dois caminhos divergentes: um sinalizado para tratamento e outro para prisão',
    kicker: 'A grande distinção',
    titulo: 'Artigo 28 versus Artigo 33',
    corpo: '<p>Entramos no segundo bloco para examinar o coração da matéria: a distinção entre a <b>posse para consumo pessoal (Art. 28)</b> e o <b>tráfico ilícito (Art. 33)</b>.</p><p>Ambos os tipos penais compartilham verbos idênticos: "adquirir", "guardar", "ter em depósito", "transportar" ou "trazer consigo". A diferença não está no verbo objetivo, mas sim no <b>elemento subjetivo do tipo (o dolo específico)</b>: a destinação da droga para uso próprio.</p><p>No Artigo 28, a finalidade é exclusivamente o consumo pessoal. Já no Artigo 33, a finalidade é a circulação ou fornecimento a terceiros, ainda que gratuitamente.</p><div class="box exemplo"><img class="wm" src="assets/img/bigamia.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">OLHE COM CUIDADO</p><p>Para configurar o crime de tráfico (Art. 33), <b>não é necessário haver venda efetiva</b> nem recebimento de lucro. O próprio ato de "trazer consigo" ou "guardar" com finalidade de repasse a terceiros consuma o delito de 5 a 15 anos de reclusão.</p></div></div><div class="chips"><span class="chip">Artigo 28: Uso Próprio</span><span class="chip">Artigo 33: Repasse / Comércio</span><span class="chip">Mesmos Verbos</span><span class="chip">Dolo Distinto</span></div>',
    narr: 'Artigo vinte e oito versus Artigo trinta e três. Ambos os tipos penais compartilham verbos idênticos como guardar, transportar ou trazer consigo. A diferença não está no verbo objetivo, mas sim no elemento subjetivo do tipo: a destinação da droga. No Artigo vinte e oito, a finalidade é o consumo pessoal. No Artigo trinta e três, é o fornecimento a terceiros. Para configurar tráfico, não é necessário haver venda nem lucro: guardar para entregar a terceiro já consuma o delito.'
  },
  {
    tipo: 'Conteúdo',
    img: 'sujeitos',
    alt: 'Homem sentado recebendo orientação comunitária sem algemas',
    kicker: 'Artigo 28 em detalhes',
    titulo: 'A despenalização do Artigo 28',
    corpo: '<p>O artigo 28 da Lei 11.343/2006 estabelece que quem adquirir, guardar, tiver em depósito, transportar ou trouxer consigo, para consumo pessoal, drogas sem autorização será submetido às seguintes <b>penas alternativas</b>:</p><div class="viarow"><div class="vianum">I</div><div><h3>Advertência sobre os efeitos das drogas</h3><p>Aplicada pelo juiz em audiência de advertência e orientação.</p></div></div><div class="viarow"><div class="vianum">II</div><div><h3>Prestação de serviços à comunidade</h3><p>Em entidades de saúde, educacionais ou programas comunitários (máximo de 5 meses).</p></div></div><div class="viarow"><div class="vianum">III</div><div><h3>Medida educativa de comparecimento</h3><p>Participação em curso ou programa educativo sobre dependência.</p></div></div><div class="box exemplo"><img class="wm" src="assets/img/sujeitos.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">PEGADINHA DE PROVA</p><p>Houve <b>despenalização</b> (afastamento de pena privativa de liberdade), mas segundo a jurisprudência histórica do STF (RE 430.105), o fato continuou sendo infração penal sui generis, tramitando perante o Juizado Especial Criminal (JECRIM).</p></div></div>',
    narr: 'A despenalização do Artigo vinte e oito. O artigo vinte e oito estabelece penas alternativas para quem traz consigo droga para consumo pessoal: advertência, prestação de serviços à comunidade e medida educativa. Houve despenalização porque não há previsão de prisão, mas o STF historicamente entendeu que persistiu a natureza de infração penal sui generis, processada no Juizado Especial Criminal.'
  },
  {
    tipo: 'Conteúdo',
    img: 'condicoes',
    alt: 'Balança e critérios de prova perante o juiz criminal',
    kicker: 'Critérios do § 2º',
    titulo: 'Como o juiz diferencia usuário de traficante?',
    corpo: '<p>Como a pessoa flagrada com droga geralmente alega que a substância era para consumo próprio, a lei determinou expressamente no <b>Art. 28, § 2º</b> os critérios que o magistrado deve analisar para aferir a destinação:</p><div class="viarow"><div class="vianum">1</div><div><h3>Natureza e quantidade da substância</h3><p>Drogas de alto poder destrutivo e porções volumosas indicam mercancia.</p></div></div><div class="viarow"><div class="vianum">2</div><div><h3>Local e condições em que se desenvolveu a ação</h3><p>Ponto de venda conhecido, esconderijos, circulação suspeita de terceiros.</p></div></div><div class="viarow"><div class="vianum">3</div><div><h3>Circunstâncias sociais e pessoais</h3><p>Existência de trabalho lícito, ocupação e contexto socioeconômico.</p></div></div><div class="viarow"><div class="vianum">4</div><div><h3>Conduta e antecedentes do agente</h3><p>Histórico criminal prévio de condenações por tráfico ou receptação.</p></div></div><div class="frasechave"><p class="flabel">FRASE-CHAVE</p><p class="fq2">A quantidade da droga é apenas um dos critérios: o juiz deve analisar o contexto global do flagrante.</p></div>',
    narr: 'Como o juiz diferencia usuário de traficante. No artigo vinte e oito, parágrafo segundo, a lei estabeleceu quatro critérios que o juiz deve sopesar: natureza e quantidade da droga apreendida, local e condições da ação, circunstâncias sociais e pessoais do agente, e conduta e antecedentes. A quantidade de droga é apenas um dos critérios, devendo ser analisado o conjunto probatório.'
  },
  {
    tipo: 'Conteúdo',
    img: 'dolo',
    alt: 'Cofre com pacotes de entorpecentes e dinheiro em espécie',
    kicker: 'Artigo 33, caput',
    titulo: 'O tipo penal do Tráfico de Drogas',
    corpo: '<p>O artigo 33 da Lei 11.343/2006 é a espinha dorsal da repressão estatal. Ele descreve nada menos do que <b>18 condutas típicas</b> em um único caput:</p><p><i>"Importar, exportar, remeter, preparar, produzir, fabricar, adquirir, vender, expor à venda, oferecer, ter em depósito, transportar, trazer consigo, guardar, prescrever, ministrar, entregar a consumo ou fornecer drogas, ainda que gratuitamente, sem autorização ou em desacordo com determinação legal ou regulamentar."</i></p><p><b>Pena:</b> reclusão de <b>5 a 15 anos</b> e pagamento de <b>500 a 1.500 dias-multa</b>.</p><div class="box exemplo"><img class="wm" src="assets/img/dolo.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">TIPO MISTO ALTERNATIVO</p><p>Se o agente adquire a droga pela manhã, transporta no carro à tarde e a guarda em depósito à noite no mesmo contexto fático, ele <b>responde por um único crime de tráfico</b>, e não por três crimes em concurso material.</p></div></div>',
    narr: 'O tipo penal do Tráfico de Drogas. O artigo trinta e três prevê dezoito verbos nucleares com pena de reclusão de cinco a quinze anos e multa. Trata-se de crime de ação múltipla ou conteúdo variado: a prática de mais de uma conduta sobre o mesmo lote de substância, no mesmo contexto fático, configura crime único de tráfico.'
  },
  {
    tipo: 'Questão',
    img: 'questao',
    alt: 'Balança com ponto de interrogação dourado para teste de múltipla escolha',
    kicker: 'Questão de fixação',
    titulo: 'Teste seu raciocínio sobre a norma em branco',
    questao: 'Em relação à estrutura típica da Lei nº 11.343/2006 e à tutela da Saúde Pública, assinale a afirmativa juridicamente correta:',
    opcoes: [
      'O crime de tráfico de drogas exige comprovação de efetivo dano à integridade física de pelo menos um indivíduo para restar consumado.',
      'A Lei de Drogas classifica-se como norma penal em branco heterogênea, cujo rol de substâncias proibidas é definido pela Portaria 344/98 da Anvisa.',
      'Para a consumação do tráfico de drogas do Art. 33, caput, é imprescindível haver a efetiva venda onerosa com prova da transação financeira.',
      'O Artigo 28 comina pena privativa de liberdade de detenção caso o agente seja reincidente específico.'
    ],
    certa: 1,
    feedback: 'Excelente! A Lei 11.343/2006 não traz a fórmula química das substâncias proibidas, dependendo do complemento infralegal expedido pela Anvisa (Portaria 344/98), configurando clássica norma penal em branco heterogênea.'
  },
  {
    tipo: 'Flashcard',
    img: 'flashcards',
    alt: 'Cartão de estudo dourado com a balança da justiça no verso',
    kicker: 'Flashcard de memorização',
    frente: 'A condenação anterior com trânsito em julgado pelo crime do Art. 28 (posse para consumo pessoal) gera REINCIDÊNCIA para novo crime praticado pelo agente?',
    verso: '<p><b>NÃO GERA REINCIDÊNCIA!</b></p><p>O Supremo Tribunal Federal e o Superior Tribunal de Justiça consolidaram o entendimento de que a condenação prévia pelo Art. 28 não tem o condão de caracterizar reincidência, por ser desproporcional conferir esse efeito gravoso a uma conduta que não enseja nem sequer pena privativa de liberdade.</p>'
  },
  {
    tipo: 'Karaokê',
    img: 'panorama',
    alt: 'Símbolo musical dourado com texto sincronizado da regra jurídica',
    kicker: 'Karaokê de fixação',
    titulo: 'A regra de ouro da destinação de entorpecentes',
    frases: [
      'O bem tutelado é a Saúde Pública, em crime de perigo presumido.',
      'A Lei de Drogas é norma em branco complementada pela Anvisa.',
      'Usuário e traficante praticam os mesmos verbos objetivos da lei.',
      'O que separa o Artigo 28 do Artigo 33 é o dolo de mercancia ou repasse.',
      'Não se exige lucro nem venda: entregar gratuitamente já é tráfico de drogas!'
    ]
  },
  {
    tipo: 'Comparador',
    img: 'compcivil',
    img2: 'compreligioso',
    alt: 'Comparativo visual entre o regime do usuário e o regime do traficante',
    kicker: 'Comparador deslizante',
    titulo: 'Artigo 28 (Usuário) x Artigo 33 (Traficante)',
    rotuloL: 'Art. 28 · Consumo Próprio',
    rotuloR: 'Art. 33 · Tráfico Ilícito',
    intro: 'Arraste o cursor central para comparar o tratamento legal dispensado ao usuário e a resposta rigorosa imposta ao traficante:'
  },
  {
    tipo: 'Explorar',
    img: 'explorar',
    alt: 'Cena de apreensão policial com 5 elementos numerados para exploração vertical',
    kicker: 'Exploração de cena',
    titulo: 'Os 5 elementos de convicção em um flagrante',
    intro: 'Toque nos círculos pulsantes numerados para analisar os elementos que a autoridade policial e o juiz utilizam para classificar o delito:',
    pontos: [
      { x: 22, y: 35, titulo: '1. Acondicionamento individualizado', texto: 'Drogas fracionadas em pequenos invólucros plásticos prontos para repasse indicam forte evidência de tráfico.' },
      { x: 68, y: 28, titulo: '2. Balança de precisão', texto: 'A presença de instrumento de pesagem e contabilidade manuscrita afasta a presunção de mero usuário eventual.' },
      { x: 35, y: 64, titulo: '3. Dinheiro trocado em notas miúdas', texto: 'Quantias em notas de pequeno valor sem comprovação de renda lícita reforçam o comércio habitual no local.' },
      { x: 80, y: 72, titulo: '4. Local conhecido como ponto de venda', texto: 'Apreensão realizada em ponto notório de comércio clandestino sopesa nos termos do art. 28, § 2º.' },
      { x: 50, y: 88, titulo: '5. Ausência de apetrechos de uso imediato', texto: 'A inexistência de instrumentos para consumo imediato sugere que a droga estava em depósito para terceiros.' }
    ]
  },
  {
    tipo: 'Conteúdo',
    img: 'anulacao',
    alt: 'Selo de conclusão de bloco em ouro com ramos de louro',
    kicker: 'Fechamento do bloco',
    titulo: 'Síntese dos fundamentos penais',
    corpo: '<p>Completamos os dois primeiros blocos da aula. Você aprendeu a justificar a <b>natureza de perigo abstrato</b> da Saúde Pública, compreendeu como a <b>Portaria 344 da Anvisa</b> completa o tipo penal e fixou a linha divisória do <b>Artigo 28 contra o Artigo 33</b>.</p><div class="fimbloco"><p class="flabel">NESTE BLOCO VOCÊ VIU</p><ul><li><b>Elemento subjetivo:</b> dolo de consumo próprio despenaliza para o Artigo 28.</li><li><b>Tipo misto alternativo:</b> 18 verbos no Artigo 33 geram crime único no mesmo contexto.</li><li><b>Critérios judiciais:</b> quantidade, local, conduta e antecedentes orientam o enquadramento.</li><li><b>Reincidência:</b> o Artigo 28 não gera reincidência conforme súmula e teses superiores.</li></ul></div><p>No próximo bloco, consolidaremos a matéria com desafios práticos, lacunas, ligações de termos e questões das principais bancas de concurso.</p>',
    narr: 'Síntese dos fundamentos penais. Completamos os dois primeiros blocos da aula. Você aprendeu a justificar a natureza de perigo abstrato da Saúde Pública, compreendeu como a Portaria trezentos e quarenta e quatro da Anvisa completa o tipo penal e fixou a linha divisória do Artigo vinte e oito contra o Artigo trinta e três. No próximo bloco, consolidaremos a matéria com desafios práticos, lacunas, ligações de termos e questões de bancas.'
  },
  {
    tipo: 'Toque e revele',
    img: 'revelar',
    alt: 'Cartões pretos e dourados com revelação progressiva em três toques',
    kicker: 'Toque e revele',
    titulo: 'Três figuras especiais da Lei de Drogas',
    intro: 'Toque em cada uma das cartas abaixo para descobrir a pergunta e, em seguida, a solução dogmática correspondente:',
    cartas: [
      {
        p: 'O que caracteriza a figura do Tráfico Privilegiado prevista no Artigo 33, § 4º da lei?',
        r: 'É uma causa de diminuição de pena de um sexto a dois terços concedida ao réu primário, de bons antecedentes, que não se dedique a atividades criminosas nem integre organização criminosa. Não é crime hediondo!'
      },
      {
        p: 'O que ocorre com quem cultiva pequenas quantidades de plantas destinadas ao próprio consumo?',
        r: 'Responde pelo Artigo 28, § 1º da lei, sofrendo as mesmas penas alternativas do usuário (advertência, prestação de serviços ou medida educativa), sem prisão.'
      },
      {
        p: 'Qual é o crime de quem fornece droga gratuitamente a amigo para consumirem juntos no mesmo local?',
        r: 'Configura o Artigo 33, § 3º (uso compartilhado), infração de menor potencial ofensivo apenada com detenção de 6 meses a 1 ano, bem mais branda que o tráfico comum.'
      }
    ]
  },
  {
    tipo: 'Ligar termos',
    img: 'ligar',
    alt: 'Colunas de termos jurídicos com conexões luminosas douradas',
    kicker: 'Ligar termos',
    titulo: 'Associe o instituto à sua consequência jurídica',
    instrucao: 'Selecione um termo na coluna da esquerda e em seguida toque na sua definição correta na coluna da direita:',
    pares: [
      ['Saúde Pública', 'Bem jurídico supraindividual tutelado em perigo abstrato'],
      ['Portaria 344 da Anvisa', 'Complemento infralegal da norma penal em branco'],
      ['Tráfico Privilegiado', 'Causa de diminuição de pena de um sexto a dois terços'],
      ['Uso Compartilhado', 'Oferecimento eventual a pessoa conhecida sem lucro'],
      ['Artigo 28 da Lei', 'Infração despenalizada submetida ao rito do JECRIM']
    ],
    ordemDefs: [2, 0, 4, 1, 3]
  },
  {
    tipo: 'Completar',
    img: 'lacuna',
    alt: 'Texto do artigo 33 da lei com lacunas luminosas aguardando preenchimento',
    kicker: 'Completar lacunas',
    titulo: 'O núcleo do artigo 33, caput',
    intro: 'Toque nas palavras do banco abaixo para completar a redação fundamental do tipo penal do tráfico:',
    partes: [
      'Importar, exportar, remeter, preparar, produzir, fabricar, adquirir, vender, expor à venda, oferecer, ter em depósito, ',
      ', trazer consigo, guardar, prescrever, ministrar, entregar a consumo ou fornecer drogas, ainda que ',
      ', sem autorização ou em desacordo com determinação legal ou regulamentar: Pena de reclusão de ',
      ' anos e pagamento de quinhentos a mil e quinhentos dias-multa.'
    ],
    respostas: [
      'transportar',
      'gratuitamente',
      '5 a 15'
    ],
    banco: [
      'com lucro comprovado',
      'transportar',
      '5 a 15',
      'gratuitamente',
      '2 a 4',
      'consumir'
    ],
    feedbackFinal: 'Perfeito! Você reconstruiu a regra de ouro do Artigo 33: transportar é um dos 18 verbos e a entrega gratuita já configura o tráfico punido de 5 a 15 anos.'
  },
  {
    tipo: 'Verdadeiro ou falso',
    img: 'cartasvf',
    alt: 'Cartões verdes e vermelhos para julgamento rápido de proposições jurídicas',
    kicker: 'Verdadeiro ou falso',
    titulo: 'Julgue os enunciados sobre entorpecentes',
    intro: 'Avalie cada assertiva e decida se a afirmação é verdadeira ou falsa perante a jurisprudência dominante:',
    perguntas: [
      {
        q: 'O crime de tráfico de drogas exige para sua consumação que o agente obtenha vantagem financeira ou lucro comprovado na operação.',
        certa: 1, // Falso
        exp: 'Falso! O artigo 33 pune expressamente o fornecimento "ainda que gratuitamente". A ausência de lucro não desclassifica o tráfico.'
      },
      {
        q: 'A exclusão de uma substância do rol da Portaria 344/98 da Anvisa opera abolitio criminis retroativa em benefício do acusado.',
        certa: 0, // Verdadeiro
        exp: 'Verdadeiro! Por ser norma penal em branco heterogênea, a alteração favorável da norma integradora retroage para extinguir a punibilidade.'
      },
      {
        q: 'O Tráfico Privilegiado (Art. 33, § 4º) é considerado crime hediondo segundo o Pacote Anticrime (Lei 13.964/2019).',
        certa: 1, // Falso
        exp: 'Falso! O art. 112, § 5º da LEP, inserido pelo Pacote Anticrime, pacificou expressamente que o tráfico privilegiado NÃO é crime hediondo.'
      },
      {
        q: 'A competência para julgar a posse para consumo pessoal (Art. 28) é, em regra, da Justiça Estadual e do Juizado Especial Criminal.',
        certa: 0, // Verdadeiro
        exp: 'Verdadeiro! O Artigo 28 não prevê pena de prisão e tramita no rito da Lei 9.099/1995, salvo atração pela Justiça Federal em caso de internacionalidade.'
      },
      {
        q: 'O agente que guarda e vende drogas no mesmo contexto fático responde por dois crimes de tráfico em concurso material de delitos.',
        certa: 1, // Falso
        exp: 'Falso! O tipo é misto alternativo (crime de ação múltipla): praticar vários verbos sobre o mesmo objeto fático configura crime único.'
      }
    ]
  },
  {
    tipo: 'Linha do tempo',
    img: 'timeline',
    alt: 'Linha temporal dourada destacando os marcos da legislação de entorpecentes no Brasil',
    kicker: 'Evolução histórica',
    titulo: 'A linha do tempo da política de drogas',
    intro: 'Toque nos anos para acompanhar a transformação dogmática da legislação de drogas no Brasil:',
    marcos: [
      {
        ano: '1976',
        titulo: 'Lei nº 6.368/76 · O modelo carcerário estrito',
        texto: 'A antiga lei punia tanto o usuário quanto o traficante com penas de prisão, sem distinção de políticas de saúde pública.'
      },
      {
        ano: '1998',
        titulo: 'Portaria SVS/MS nº 344 · O catálogo da Anvisa',
        texto: 'Marco regulatório que instituiu as listas de controle especial de substâncias químicas, entorpecentes e psicotrópicos no país.'
      },
      {
        ano: '2006',
        titulo: 'Lei nº 11.343/06 · Nascimento do SISNAD e Art. 28',
        texto: 'Promulgação da lei vigente, com a despenalização do usuário e recrudescimento da pena base do tráfico para 5 a 15 anos.'
      },
      {
        ano: '2019',
        titulo: 'Lei nº 13.964/19 (Pacote Anticrime)',
        texto: 'Consolidação legal de que o tráfico privilegiado não possui natureza hedionda e criação da destruição acelerada de drogas.'
      },
      {
        ano: '2024',
        titulo: 'Julgamento do RE 635.659 no STF',
        texto: 'Fixação de critério quantitativo objetivo de até 40 gramas ou 6 plantas fêmeas para diferenciar usuário de maconha com natureza administrativa.'
      }
    ]
  },
  {
    tipo: 'Mapa mental',
    img: 'mapamental',
    alt: 'Árvore de conceitos ramificada em ouro conectando os pilares da Lei de Drogas',
    kicker: 'Mapa mental',
    titulo: 'Estrutura sistêmica da Lei de Drogas',
    intro: 'Abra os ramos do mapa mental para visualizar as conexões entre os pilares estudados:',
    centro: 'LEI 11.343/2006',
    ramos: [
      {
        nome: 'Tutela da Saúde Pública',
        texto: 'Bem jurídico coletivo de perigo abstrato. Não depende de dano concreto ou lesão a indivíduo específico.',
        chips: ['Perigo Abstrato', 'Bem Coletivo', 'Presunção Absoluta']
      },
      {
        nome: 'Norma em Branco',
        texto: 'Integração formal pela Portaria 344/98 da Anvisa. Revogações operam abolitio criminis imediata.',
        chips: ['Portaria 344', 'Anvisa', 'Retroatividade Benéfica']
      },
      {
        nome: 'Usuário (Art. 28)',
        texto: 'Dolo de uso pessoal exclusivo. Sanções sem cárcere: advertência, serviços comunitários e programa educativo.',
        chips: ['Sem Prisão', 'JECRIM', 'Não gera reincidência']
      },
      {
        nome: 'Tráfico Ilícito (Art. 33)',
        texto: '18 verbos nucleares de ação múltipla. Reclusão de 5 a 15 anos, admitindo o privilégio no § 4º se preenchidos os 4 requisitos.',
        chips: ['18 Verbos', 'Reclusão 5-15 anos', 'Privilégio § 4º']
      }
    ]
  },
  {
    tipo: 'Conteúdo',
    img: 'pegadinhas',
    alt: 'Alerta dourado com ponto de exclamação e símbolo de armadilha processual',
    kicker: 'Atenção redobrada',
    titulo: 'As 3 pegadinhas clássicas de concurso',
    corpo: '<p>Em provas da Magistratura, Ministério Público, Defensoria e OAB, as bancas adoram explorar três armadilhas conceituais recorrentes:</p><div class="box exemplo"><img class="wm" src="assets/img/pegadinhas.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">PEGADINHA 1 · O CONCEITO DE LUCRO</p><p>O tipo penal do artigo 33 <b>não exige proveito econômico</b>. Fornecer droga gratuitamente para amigos em festa é tráfico de drogas, e não mero favor social desprovido de relevância penal.</p></div></div><div class="box exemplo"><img class="wm" src="assets/img/pegadinhas.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">PEGADINHA 2 · A QUANTIDADE NÃO É ABSOLUTA</p><p>Pequena quantidade não garante automaticamente enquadramento no artigo 28. Se a pessoa com 2 gramas de crack for flagrada vendendo em local mapeado com balança e anotações, será tráfico.</p></div></div><div class="box exemplo"><img class="wm" src="assets/img/pegadinhas.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">PEGADINHA 3 · A REINCIDÊNCIA DO ART. 28</p><p>Condenação pretérita por uso próprio <b>não é idônea para gerar reincidência</b> em crime subsequente de roubo, furto ou tráfico (STF e STJ uníssonos).</p></div></div>',
    narr: 'As três pegadinhas clássicas de concurso. Pegadinha um: o tipo penal não exige proveito econômico nem lucro, fornecer gratuitamente é tráfico. Pegadinha dois: pequena quantidade não garante classificação como usuário se as circunstâncias revelarem comércio. Pegadinha três: condenação anterior pelo artigo vinte e oito não gera reincidência perante os tribunais superiores.'
  },
  {
    tipo: 'Questão de banca',
    img: 'questao2',
    alt: 'Emblema da OAB e das bancas de concurso com balança e livro dourado',
    kicker: 'Questão de banca examinadora',
    titulo: 'Simulado FGV / Exame de Ordem',
    questao: 'Lucas foi surpreendido por policiais civis enquanto guardava, no interior de sua residência, 15 porções de cocaína já embaladas e prontas para entrega, além de uma balança digital. Interrogado, Lucas alegou que adquiriu toda a substância de uma única vez para seu próprio consumo ao longo do mês. Considerando a disciplina da Lei nº 11.343/2006, é correto afirmar:',
    opcoes: [
      'A alegação de Lucas afasta compulsoriamente a tipicidade do tráfico, devendo o juiz trancar a ação penal pelo princípio da insignificância.',
      'O magistrado deverá avaliar a quantidade e a natureza da droga, o local, as condições da ação, as circunstâncias sociais e os antecedentes de Lucas para fixar a tipificação.',
      'Lucas responderá necessariamente por dois crimes de tráfico em concurso material: pelo verbo adquirir e pelo verbo guardar.',
      'Ainda que condenado por tráfico, Lucas terá direito automático à substituição da pena privativa de liberdade por restritivas de direitos, mesmo sendo líder de facção criminosa.'
    ],
    certa: 1,
    feedback: 'Correto! Conforme o Artigo 28, § 2º da Lei 11.343/2006, a classificação entre uso próprio e tráfico não decorre exclusivamente da alegação do réu, mas sim da análise global do fracionamento, instrumentos, circunstâncias da apreensão e antecedentes.'
  },
  {
    tipo: 'Flashcard',
    img: 'flashcards2',
    alt: 'Cartão de revisão com balança de dois pratos em equilíbrio perfeito',
    kicker: 'Flashcard 2',
    frente: 'Quais são os 4 REQUISITOS CUMULATIVOS exigidos para a concessão do Tráfico Privilegiado (Art. 33, § 4º)?',
    verso: '<p><b>OS 4 REQUISITOS CUMULATIVOS:</b></p><ol><li>Primariedade do agente;</li><li>Bons antecedentes criminais;</li><li>Não dedicação reiterada a atividades criminosas;</li><li>Não integração a organização criminosa.</li></ol><p>Preenchidos todos, a pena é reduzida de <b>1/6 a 2/3</b> e a hediondez fica afastada!</p>'
  },
  {
    tipo: 'Karaokê',
    img: 'ouro',
    alt: 'Troféu dourado irradiando claridade com frase de fechamento dogmático',
    kicker: 'Karaokê de consolidação',
    titulo: 'Síntese final para fixação imediata',
    frases: [
      'A Lei 11.343 protege a Saúde Pública com perigo presumido na lei.',
      'A Anvisa define a droga na Portaria 344 em norma penal em branco.',
      'O artigo 28 despenalizou o usuário, mantendo o rito no Juizado Especial.',
      'O artigo 33 tem 18 condutas em crime de ação múltipla alternativa.',
      'O tráfico privilegiado exige quatro requisitos e afasta o caráter hediondo!'
    ]
  },
  {
    tipo: 'Conteúdo',
    img: 'martelo',
    alt: 'Martelo do juiz sobre o livro de leis de Direito Penal',
    kicker: 'Panorama do bloco',
    titulo: 'Você dominou a base penal da Lei de Drogas',
    corpo: '<p>Você agora tem o domínio dos conceitos que derrubam mais de 70% dos candidatos em provas objetivas e discursivas de Direito Penal. Passamos pelo bem jurídico coletivo, pelas normas em branco, pelo dolo de mercancia e pelos critérios processuais de aferição.</p><div class="fimbloco"><p class="flabel">ESTE FOI O NOSSO PERCURSO</p><ul><li><b>Eixo preventivo:</b> distinção axiológica entre o dependente químico e o traficante.</li><li><b>Natureza material:</b> crime de perigo abstrato que dispensa resultado lesivo concreto.</li><li><b>Complementação heterogênea:</b> vinculação à Portaria 344/98 e efeitos da abolitio criminis.</li><li><b>Instrumentos de prova:</b> critérios cumulativos do Art. 28, § 2º para fixação da tipicidade.</li></ul></div><p>Prepare-se agora para o <b>Desafio Final</b> da aula: responda às 5 perguntas com placar acumulado e conquiste os 500 pontos máximos!</p>',
    narr: 'Você dominou a base penal da Lei de Drogas. Você agora tem o domínio dos conceitos fundamentais que diferenciam o usuário do traficante, a natureza da norma penal em branco e as regras do tráfico privilegiado. Prepare-se para o Desafio Final da aula: responda às cinco perguntas acumulando pontuação máxima.'
  },
  {
    tipo: 'Desafio',
    img: 'questao',
    alt: 'Arena de desafios e placar com estrelas douradas',
    kicker: 'Desafio final com pontuação',
    titulo: 'Desafio de Conhecimento: Lei de Drogas',
    intro: 'Responda a cada questão abaixo. Cada acerto vale 100 pontos acumulados no seu placar final:',
    perguntas: [
      {
        q: 'Qual é o bem jurídico tutelado primariamente nos crimes de tráfico de entorpecentes?',
        ops: [
          'A integridade física do comprador da droga.',
          'O patrimônio público e a arrecadação de tributos aduaneiros.',
          'A Saúde Pública como bem coletivo e supraindividual.',
          'A ordem econômica e financeira do sistema bancário.'
        ],
        certa: 2,
        exp: 'O bem tutelado é a Saúde Pública coletiva, sob a ótica de crime de perigo abstrato.'
      },
      {
        q: 'A respeito do Art. 28 da Lei 11.343/2006, é correto afirmar que:',
        ops: [
          'Previu penas de advertência, serviços comunitários e comparecimento a programa educativo, sem pena privativa de liberdade.',
          'Descriminalizou formalmente a posse de qualquer substância entorpecente.',
          'Comina pena de reclusão de 1 a 3 anos em caso de reincidência específica.',
          'Determina a decretação de prisão preventiva obrigatória se o usuário confessar o vício.'
        ],
        certa: 0,
        exp: 'Ocorreu despenalização com afastamento de prisão e adoção de medidas alternativas.'
      },
      {
        q: 'A Lei de Drogas é classificada pela doutrina penal como:',
        ops: [
          'Norma penal completa e autoaplicável que dispensa qualquer regulamentação externa.',
          'Norma penal em branco heterogênea, complementada pela Portaria 344 da Anvisa.',
          'Norma penal permissiva restritiva de direitos individuais.',
          'Tipo penal exclusivamente culposo de perigo concreto.'
        ],
        certa: 1,
        exp: 'O rol de substâncias proibidas depende do ato administrativo expedido pela Anvisa.'
      },
      {
        q: 'O agente que entrega gratuitamente porção de cocaína a um terceiro comete, em regra:',
        ops: [
          'Fato atípico, por ausência de proveito econômico comprovado.',
          'Mera infração administrativa de trânsito.',
          'Crime de Tráfico de Drogas (Art. 33, caput), que expressamente pune o fornecimento gratuito.',
          'Crime de curandeirismo previsto no Código Penal.'
        ],
        certa: 2,
        exp: 'O caput do Artigo 33 abrange expressamente a conduta de fornecer "ainda que gratuitamente".'
      },
      {
        q: 'O benefício do Tráfico Privilegiado (Art. 33, § 4º) acarreta:',
        ops: [
          'Diminuição de pena de um sexto a dois terços e afastamento da hediondez do delito.',
          'Aumento de pena pela transnacionalidade da substância.',
          'Extinção automática do processo sem resolução do mérito.',
          'Perdão judicial com isenção total de qualquer reprimenda.'
        ],
        certa: 0,
        exp: 'O privilégio reduz a sanção de 1/6 a 2/3 se preenchidos os 4 requisitos e afasta a hediondez.'
      }
    ]
  },
  {
    tipo: 'Conteúdo',
    img: 'ouro',
    alt: 'Cofre dourado iluminado revelando a pergunta de maior peso do exame',
    kicker: 'A pergunta mais valiosa',
    titulo: 'A Pergunta de Ouro da Lei de Drogas',
    corpo: '<p>Se você tivesse que guardar uma única lição desta aula inteira para defender seu cliente ou fundamentar uma peça acusatória, a pergunta indispensável é:</p><div class="box exemplo"><img class="wm" src="assets/img/ouro.webp" alt="" aria-hidden="true"><div class="excontent"><p class="blabel">PERGUNTA DE OURO</p><p><b>"Diante de um flagrante com substância entorpecente, quais são os 3 passos sucessivos para definir a tipicidade?"</b></p><p><b>Passo 1:</b> A substância está formalmente catalogada na Portaria 344/98 da Anvisa na data do fato?</p><p><b>Passo 2:</b> Há prova segura de destinação exclusiva a consumo pessoal (Art. 28) ou o contexto de fracionamento, local e petrechos indica circulação para terceiros (Art. 33)?</p><p><b>Passo 3:</b> Se configurado o tráfico, o agente preenche cumulativamente os quatro requisitos do Art. 33, § 4º para obter a fração de redução e o afastamento da hediondez?</p></div></div><p>Com essa sequência metódica em três passos, você soluciona qualquer caso prático de Lei de Drogas em qualquer tribunal do país.</p>',
    narr: 'A Pergunta de Ouro da Lei de Drogas. Diante de um flagrante com substância entorpecente, quais são os três passos sucessivos para definir a tipicidade? Passo um: a substância está catalogada na Portaria trezentos e quarenta e quatro da Anvisa na data do fato? Passo dois: há prova de destinação exclusiva a consumo pessoal ou o contexto indica circulação para terceiros? Passo três: se configurado o tráfico, o réu preenche os quatro requisitos do privilégio para reduzir a pena e afastar a hediondez? Com esses três passos, você soluciona qualquer caso.'
  },
  {
    tipo: 'Encerramento',
    img: 'fim',
    alt: 'Nascer do sol no horizonte iluminando a estátua da justiça com balança equilibrada',
    kicker: 'Encerramento da aula',
    titulo: 'O que você leva desta aula',
    corpo: '<p>Chegamos ao fim da primeira aula da Lei de Drogas. Você percorreu a arquitetura do <b>SISNAD</b>, compreendeu por que a <b>Saúde Pública</b> é tratada como bem de perigo abstrato e dominou a razão de ser da <b>Norma Penal em Branco Heterogênea</b>.</p><p>Você agora sabe com clareza o que separa o <b>Artigo 28 do Artigo 33</b>: não são os verbos da conduta, mas o elemento subjetivo do tipo demonstrado pelas circunstâncias materiais da apreensão. E desmistificou que o tráfico exige lucro ou venda, compreendendo o alcance do tráfico privilegiado.</p><div class="vazada" aria-hidden="true"><img src="assets/img/capa.webp" alt=""></div><p>Parabéns por concluir esta primeira etapa! Na <b>Aula 02</b>, mergulharemos a fundo no <b>Artigo 28</b>, na discussão histórica da despenalização e no recente julgamento do STF que redefiniu o porte de maconha. Revise os flashcards quando quiser e continue firme: o Direito Penal se constrói com técnica e raciocínio. <b>Bons estudos!</b></p>',
    pontos: [
      '<b>Saúde Pública:</b> bem jurídico coletivo tutelado em crime de perigo presumido.',
      '<b>Norma Heterogênea:</b> a Portaria 344 da Anvisa define o que é considerado droga no Brasil.',
      '<b>Artigo 28 x 33:</b> mesmos verbos objetivos, diferindo pelo dolo de consumo versus circulação.',
      '<b>Sem Lucro:</b> fornecer gratuitamente já consuma o tráfico de drogas de 5 a 15 anos de reclusão.',
      '<b>Tráfico Privilegiado:</b> causa redutora de 1/6 a 2/3 que afasta o caráter hediondo do delito.'
    ],
    narr: 'O que você leva desta aula. Chegamos ao fim da primeira aula da Lei de Drogas. Você percorreu a arquitetura do SISNAD, compreendeu por que a Saúde Pública é tratada como bem de perigo abstrato e dominou a razão de ser da Norma Penal em Branco Heterogênea. Você agora sabe com clareza o que separa o Artigo vinte e oito do Artigo trinta e três: não são os verbos da conduta, mas o elemento subjetivo demonstrado pelas circunstâncias materiais da apreensão. Parabéns por concluir esta primeira etapa! Na Aula dois, mergulharemos a fundo no Artigo vinte e oito. Bons estudos!'
  }
];
