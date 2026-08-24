export interface Lei {
  id: string;
  nome: string;
  sigla: string;
  categoria: string;
  tipo: 'constituicao' | 'codigo' | 'estatuto' | 'lei-ordinaria' | 'decreto' | 'sumula';
  descricao: string;
  dataPublicacao: string;
  artigos: ArtigoLei[];
}

export interface ArtigoLei {
  id: string;
  numero: string;
  caput: string;
  paragrafos?: string[];
  incisos?: string[];
  capitulo?: string;
  titulo?: string;
  /** Sort order from DB. Values > 10000 indicate ADCT / Disposições Transitórias in CF88. */
  ordem?: number;
}

export interface Explicacao {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  autor: string;
  dataPublicacao: string;
  categoria: string;
  leisRelacionadas: string[];
  tags: string[];
}

export interface Atualizacao {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  dataPublicacao: string;
  categoria: string;
  tipo: 'nova_lei' | 'alteracao' | 'noticia' | 'jurisprudencia';
  destaque: boolean;
}

export const CATEGORIAS = [
  'Constitucional', 'Civil', 'Penal', 'Trabalho', 'Administrativo',
  'Tributário', 'Processual Civil', 'Processual Penal', 'Ambiental', 'Consumidor',
  'Empresarial', 'Eleitoral', 'Previdenciário', 'Criança e Adolescente',
];

export const LEIS: Lei[] = [
  // ===== CONSTITUIÇÃO =====
  {
    id: '1',
    nome: 'Constituição Federal de 1988',
    sigla: 'CF/88',
    categoria: 'Constitucional',
    tipo: 'constituicao',
    descricao: 'Constituição da República Federativa do Brasil',
    dataPublicacao: '1988-10-05',
    artigos: [
      {
        id: '1-1', numero: 'Art. 1º', caput: 'A República Federativa do Brasil, formada pela união indissolúvel dos Estados e Municípios e do Distrito Federal, constitui-se em Estado Democrático de Direito e tem como fundamentos:',
        titulo: 'Dos Princípios Fundamentais',
        incisos: ['I - a soberania;', 'II - a cidadania;', 'III - a dignidade da pessoa humana;', 'IV - os valores sociais do trabalho e da livre iniciativa;', 'V - o pluralismo político.'],
        paragrafos: ['Parágrafo único. Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos desta Constituição.'],
      },
      {
        id: '1-2', numero: 'Art. 2º', caput: 'São Poderes da União, independentes e harmônicos entre si, o Legislativo, o Executivo e o Judiciário.',
        titulo: 'Dos Princípios Fundamentais',
      },
      {
        id: '1-3', numero: 'Art. 3º', caput: 'Constituem objetivos fundamentais da República Federativa do Brasil:',
        titulo: 'Dos Princípios Fundamentais',
        incisos: ['I - construir uma sociedade livre, justa e solidária;', 'II - garantir o desenvolvimento nacional;', 'III - erradicar a pobreza e a marginalização e reduzir as desigualdades sociais e regionais;', 'IV - promover o bem de todos, sem preconceitos de origem, raça, sexo, cor, idade e quaisquer outras formas de discriminação.'],
      },
      {
        id: '1-5', numero: 'Art. 5º', caput: 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade, nos termos seguintes:',
        titulo: 'Dos Direitos e Garantias Fundamentais',
        capitulo: 'Dos Direitos e Deveres Individuais e Coletivos',
        incisos: [
          'I - homens e mulheres são iguais em direitos e obrigações, nos termos desta Constituição;',
          'II - ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei;',
          'III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;',
          'IV - é livre a manifestação do pensamento, sendo vedado o anonimato;',
          'V - é assegurado o direito de resposta, proporcional ao agravo, além da indenização por dano material, moral ou à imagem;',
        ],
      },
    ],
  },

  // ===== CÓDIGOS =====
  {
    id: '2',
    nome: 'Código Civil',
    sigla: 'CC/2002',
    categoria: 'Civil',
    tipo: 'codigo',
    descricao: 'Lei nº 10.406, de 10 de janeiro de 2002',
    dataPublicacao: '2002-01-10',
    artigos: [
      { id: '2-1', numero: 'Art. 1º', caput: 'Toda pessoa é capaz de direitos e deveres na ordem civil.', titulo: 'Das Pessoas Naturais', capitulo: 'Da Personalidade e Da Capacidade' },
      { id: '2-2', numero: 'Art. 2º', caput: 'A personalidade civil da pessoa começa do nascimento com vida; mas a lei põe a salvo, desde a concepção, os direitos do nascituro.', titulo: 'Das Pessoas Naturais', capitulo: 'Da Personalidade e Da Capacidade' },
      { id: '2-3', numero: 'Art. 3º', caput: 'São absolutamente incapazes de exercer pessoalmente os atos da vida civil os menores de 16 (dezesseis) anos.', titulo: 'Das Pessoas Naturais', capitulo: 'Da Personalidade e Da Capacidade' },
      { id: '2-4', numero: 'Art. 4º', caput: 'São incapazes, relativamente a certos atos ou à maneira de os exercer:', titulo: 'Das Pessoas Naturais', capitulo: 'Da Personalidade e Da Capacidade',
        incisos: ['I - os maiores de dezesseis e menores de dezoito anos;', 'II - os ébrios habituais e os viciados em tóxico;', 'III - aqueles que, por causa transitória ou permanente, não puderem exprimir sua vontade;', 'IV - os pródigos.'],
        paragrafos: ['Parágrafo único. A capacidade dos indígenas será regulada por legislação especial.'],
      },
    ],
  },
  {
    id: '3',
    nome: 'Código Penal',
    sigla: 'CP',
    categoria: 'Penal',
    tipo: 'codigo',
    descricao: 'Decreto-Lei nº 2.848, de 7 de dezembro de 1940',
    dataPublicacao: '1940-12-07',
    artigos: [
      { id: '3-1', numero: 'Art. 1º', caput: 'Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.', titulo: 'Parte Geral', capitulo: 'Aplicação da Lei Penal' },
      { id: '3-2', numero: 'Art. 2º', caput: 'Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.', titulo: 'Parte Geral', capitulo: 'Aplicação da Lei Penal',
        paragrafos: ['Parágrafo único. A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.'],
      },
      { id: '3-121', numero: 'Art. 121', caput: 'Matar alguém:', titulo: 'Parte Especial', capitulo: 'Dos Crimes Contra a Pessoa',
        paragrafos: ['Pena - reclusão, de seis a vinte anos.'],
      },
    ],
  },
  {
    id: '4',
    nome: 'Código de Processo Civil',
    sigla: 'CPC/2015',
    categoria: 'Processual Civil',
    tipo: 'codigo',
    descricao: 'Lei nº 13.105, de 16 de março de 2015',
    dataPublicacao: '2015-03-16',
    artigos: [
      { id: '4-1', numero: 'Art. 1º', caput: 'O processo civil será ordenado, disciplinado e interpretado conforme os valores e as normas fundamentais estabelecidos na Constituição da República Federativa do Brasil, observando-se as disposições deste Código.', titulo: 'Das Normas Fundamentais do Processo Civil' },
    ],
  },
  {
    id: '5',
    nome: 'Código de Processo Penal',
    sigla: 'CPP',
    categoria: 'Processual Penal',
    tipo: 'codigo',
    descricao: 'Decreto-Lei nº 3.689, de 3 de outubro de 1941',
    dataPublicacao: '1941-10-03',
    artigos: [
      { id: '5-1', numero: 'Art. 1º', caput: 'O processo penal reger-se-á, em todo o território brasileiro, por este Código, ressalvados:', titulo: 'Disposições Preliminares',
        incisos: ['I - os tratados, as convenções e regras de direito internacional;', 'II - as prerrogativas constitucionais do Presidente da República, dos ministros de Estado, nos crimes conexos com os do Presidente da República, e dos ministros do Supremo Tribunal Federal, nos crimes de responsabilidade;'],
      },
    ],
  },
  {
    id: '7',
    nome: 'Código de Defesa do Consumidor',
    sigla: 'CDC',
    categoria: 'Consumidor',
    tipo: 'codigo',
    descricao: 'Lei nº 8.078, de 11 de setembro de 1990',
    dataPublicacao: '1990-09-11',
    artigos: [
      { id: '7-1', numero: 'Art. 1º', caput: 'O presente código estabelece normas de proteção e defesa do consumidor, de ordem pública e interesse social, nos termos dos arts. 5°, inciso XXXII, 170, inciso V, da Constituição Federal e art. 48 de suas Disposições Transitórias.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '9',
    nome: 'Código Tributário Nacional',
    sigla: 'CTN',
    categoria: 'Tributário',
    tipo: 'codigo',
    descricao: 'Lei nº 5.172, de 25 de outubro de 1966',
    dataPublicacao: '1966-10-25',
    artigos: [
      { id: '9-1', numero: 'Art. 1º', caput: 'Esta Lei regula, com fundamento na Emenda Constitucional n. 18, de 1º de dezembro de 1965, o sistema tributário nacional e estabelece, com fundamento no artigo 5º, inciso XV, alínea b, da Constituição Federal, as normas gerais de direito tributário aplicáveis à União, aos Estados, ao Distrito Federal e aos Municípios, sem prejuízo da respectiva legislação complementar, supletiva ou regulamentar.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '11',
    nome: 'Código de Trânsito Brasileiro',
    sigla: 'CTB',
    categoria: 'Administrativo',
    tipo: 'codigo',
    descricao: 'Lei nº 9.503, de 23 de setembro de 1997',
    dataPublicacao: '1997-09-23',
    artigos: [
      { id: '11-1', numero: 'Art. 1º', caput: 'O trânsito de qualquer natureza nas vias terrestres do território nacional, abertas à circulação, rege-se por este Código.', titulo: 'Disposições Preliminares',
        paragrafos: ['§ 1º Considera-se trânsito a utilização das vias por pessoas, veículos e animais, isolados ou em grupos, conduzidos ou não, para fins de circulação, parada, estacionamento e operação de carga ou descarga.'],
      },
    ],
  },
  {
    id: '12',
    nome: 'Código Eleitoral',
    sigla: 'CE',
    categoria: 'Eleitoral',
    tipo: 'codigo',
    descricao: 'Lei nº 4.737, de 15 de julho de 1965',
    dataPublicacao: '1965-07-15',
    artigos: [
      { id: '12-1', numero: 'Art. 1º', caput: 'Este Código contém normas destinadas a assegurar a organização e o exercício de direitos políticos, precipuamente os de votar e ser votado.', titulo: 'Introdução' },
    ],
  },
  {
    id: '13',
    nome: 'Código Penal Militar',
    sigla: 'CPM',
    categoria: 'Penal',
    tipo: 'codigo',
    descricao: 'Decreto-Lei nº 1.001, de 21 de outubro de 1969',
    dataPublicacao: '1969-10-21',
    artigos: [
      { id: '13-1', numero: 'Art. 1º', caput: 'Não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.', titulo: 'Parte Geral', capitulo: 'Da Aplicação da Lei Penal Militar' },
    ],
  },
  {
    id: '14',
    nome: 'Código de Processo Penal Militar',
    sigla: 'CPPM',
    categoria: 'Processual Penal',
    tipo: 'codigo',
    descricao: 'Decreto-Lei nº 1.002, de 21 de outubro de 1969',
    dataPublicacao: '1969-10-21',
    artigos: [
      { id: '14-1', numero: 'Art. 1º', caput: 'O processo penal militar reger-se-á pelas normas contidas neste Código, assim como pelos dispositivos legais concernentes.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '15',
    nome: 'Código Florestal',
    sigla: 'CF/2012',
    categoria: 'Ambiental',
    tipo: 'codigo',
    descricao: 'Lei nº 12.651, de 25 de maio de 2012',
    dataPublicacao: '2012-05-25',
    artigos: [
      { id: '15-1', numero: 'Art. 1º-A', caput: 'Esta Lei estabelece normas gerais sobre a proteção da vegetação, áreas de Preservação Permanente e as áreas de Reserva Legal; a exploração florestal, o suprimento de matéria-prima florestal, o controle da origem dos produtos florestais e o controle e prevenção dos incêndios florestais, e prevê instrumentos econômicos e financeiros para o alcance de seus objetivos.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '16',
    nome: 'Código Comercial',
    sigla: 'CCom',
    categoria: 'Empresarial',
    tipo: 'codigo',
    descricao: 'Lei nº 556, de 25 de junho de 1850 (parte segunda)',
    dataPublicacao: '1850-06-25',
    artigos: [
      { id: '16-1', numero: 'Art. 457', caput: 'O contrato de fretamento é aquele pelo qual uma das partes se obriga a transportar ou fazer transportar mercadoria, por água, de um porto a outro, mediante retribuição.', titulo: 'Do Comércio Marítimo' },
    ],
  },

  // ===== ESTATUTOS =====
  {
    id: '8',
    nome: 'Estatuto da Criança e do Adolescente',
    sigla: 'ECA',
    categoria: 'Criança e Adolescente',
    tipo: 'estatuto',
    descricao: 'Lei nº 8.069, de 13 de julho de 1990',
    dataPublicacao: '1990-07-13',
    artigos: [
      { id: '8-1', numero: 'Art. 1º', caput: 'Esta Lei dispõe sobre a proteção integral à criança e ao adolescente.', titulo: 'Disposições Preliminares' },
      { id: '8-2', numero: 'Art. 2º', caput: 'Considera-se criança, para os efeitos desta Lei, a pessoa até doze anos de idade incompletos, e adolescente aquela entre doze e dezoito anos de idade.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '17',
    nome: 'Estatuto do Idoso',
    sigla: 'EI',
    categoria: 'Civil',
    tipo: 'estatuto',
    descricao: 'Lei nº 10.741, de 1º de outubro de 2003',
    dataPublicacao: '2003-10-01',
    artigos: [
      { id: '17-1', numero: 'Art. 1º', caput: 'É instituído o Estatuto do Idoso, destinado a regular os direitos assegurados às pessoas com idade igual ou superior a 60 (sessenta) anos.', titulo: 'Disposições Preliminares' },
      { id: '17-2', numero: 'Art. 2º', caput: 'O idoso goza de todos os direitos fundamentais inerentes à pessoa humana, sem prejuízo da proteção integral de que trata esta Lei, assegurando-se-lhe, por lei ou por outros meios, todas as oportunidades e facilidades, para preservação de sua saúde física e mental e seu aperfeiçoamento moral, intelectual, espiritual e social, em condições de liberdade e dignidade.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '18',
    nome: 'Estatuto da Pessoa com Deficiência',
    sigla: 'EPD',
    categoria: 'Civil',
    tipo: 'estatuto',
    descricao: 'Lei nº 13.146, de 6 de julho de 2015',
    dataPublicacao: '2015-07-06',
    artigos: [
      { id: '18-1', numero: 'Art. 1º', caput: 'É instituída a Lei Brasileira de Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência), destinada a assegurar e a promover, em condições de igualdade, o exercício dos direitos e das liberdades fundamentais por pessoa com deficiência, visando à sua inclusão social e cidadania.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '19',
    nome: 'Estatuto da Igualdade Racial',
    sigla: 'EIR',
    categoria: 'Civil',
    tipo: 'estatuto',
    descricao: 'Lei nº 12.288, de 20 de julho de 2010',
    dataPublicacao: '2010-07-20',
    artigos: [
      { id: '19-1', numero: 'Art. 1º', caput: 'Esta Lei institui o Estatuto da Igualdade Racial, destinado a garantir à população negra a efetivação da igualdade de oportunidades, a defesa dos direitos étnicos individuais, coletivos e difusos e o combate à discriminação e às demais formas de intolerância étnica.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '20',
    nome: 'Estatuto da Cidade',
    sigla: 'EC',
    categoria: 'Administrativo',
    tipo: 'estatuto',
    descricao: 'Lei nº 10.257, de 10 de julho de 2001',
    dataPublicacao: '2001-07-10',
    artigos: [
      { id: '20-1', numero: 'Art. 1º', caput: 'Na execução da política urbana, de que tratam os arts. 182 e 183 da Constituição Federal, será aplicado o previsto nesta Lei.', titulo: 'Diretrizes Gerais',
        paragrafos: ['Parágrafo único. Para todos os efeitos, esta Lei, denominada Estatuto da Cidade, estabelece normas de ordem pública e interesse social que regulam o uso da propriedade urbana em prol do bem coletivo, da segurança e do bem-estar dos cidadãos, bem como do equilíbrio ambiental.'],
      },
    ],
  },
  {
    id: '21',
    nome: 'Estatuto do Desarmamento',
    sigla: 'ED',
    categoria: 'Penal',
    tipo: 'estatuto',
    descricao: 'Lei nº 10.826, de 22 de dezembro de 2003',
    dataPublicacao: '2003-12-22',
    artigos: [
      { id: '21-1', numero: 'Art. 1º', caput: 'O Sistema Nacional de Armas – Sinarm, instituído no Ministério da Justiça, no âmbito da Polícia Federal, tem circunscrição em todo o território nacional.', titulo: 'Do Sistema Nacional de Armas' },
    ],
  },
  {
    id: '22',
    nome: 'Estatuto da OAB',
    sigla: 'EOAB',
    categoria: 'Administrativo',
    tipo: 'estatuto',
    descricao: 'Lei nº 8.906, de 4 de julho de 1994',
    dataPublicacao: '1994-07-04',
    artigos: [
      { id: '22-1', numero: 'Art. 1º', caput: 'São atividades privativas de advocacia: I – a postulação a qualquer órgão do Poder Judiciário e aos juizados especiais; II – as atividades de consultoria, assessoria e direção jurídicas.', titulo: 'Da Atividade de Advocacia' },
    ],
  },
  {
    id: '23',
    nome: 'Estatuto do Torcedor',
    sigla: 'ET',
    categoria: 'Civil',
    tipo: 'estatuto',
    descricao: 'Lei nº 10.671, de 15 de maio de 2003',
    dataPublicacao: '2003-05-15',
    artigos: [
      { id: '23-1', numero: 'Art. 1º', caput: 'Este Estatuto estabelece normas de proteção e defesa do torcedor.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '24',
    nome: 'Estatuto da Juventude',
    sigla: 'EJ',
    categoria: 'Civil',
    tipo: 'estatuto',
    descricao: 'Lei nº 12.852, de 5 de agosto de 2013',
    dataPublicacao: '2013-08-05',
    artigos: [
      { id: '24-1', numero: 'Art. 1º', caput: 'Esta Lei institui o Estatuto da Juventude e dispõe sobre os direitos dos jovens, os princípios e diretrizes das políticas públicas de juventude e o Sistema Nacional de Juventude - SINAJUVE.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '54',
    nome: 'Estatuto da Advocacia Pública',
    sigla: 'EAP',
    categoria: 'Administrativo',
    tipo: 'estatuto',
    descricao: 'Lei Complementar nº 73, de 10 de fevereiro de 1993',
    dataPublicacao: '1993-02-10',
    artigos: [
      { id: '54-1', numero: 'Art. 1º', caput: 'A Advocacia-Geral da União é a instituição que, diretamente ou através de órgão vinculado, representa a União, judicial e extrajudicialmente.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '55',
    nome: 'Estatuto dos Militares',
    sigla: 'EM',
    categoria: 'Administrativo',
    tipo: 'estatuto',
    descricao: 'Lei nº 6.880, de 9 de dezembro de 1980',
    dataPublicacao: '1980-12-09',
    artigos: [
      { id: '55-1', numero: 'Art. 1º', caput: 'O presente Estatuto regula a situação, obrigações, deveres, direitos e prerrogativas dos membros das Forças Armadas.', titulo: 'Disposições Preliminares' },
    ],
  },

  // ===== LEIS ORDINÁRIAS =====
  {
    id: '6',
    nome: 'Consolidação das Leis do Trabalho',
    sigla: 'CLT',
    categoria: 'Trabalho',
    tipo: 'lei-ordinaria',
    descricao: 'Decreto-Lei nº 5.452, de 1º de maio de 1943',
    dataPublicacao: '1943-05-01',
    artigos: [
      { id: '6-1', numero: 'Art. 1º', caput: 'Esta Consolidação estatui as normas que regulam as relações individuais e coletivas de trabalho nela previstas.', titulo: 'Introdução' },
      { id: '6-2', numero: 'Art. 2º', caput: 'Considera-se empregador a empresa, individual ou coletiva, que, assumindo os riscos da atividade econômica, admite, assalaria e dirige a prestação pessoal de serviço.', titulo: 'Introdução' },
    ],
  },
  {
    id: '10',
    nome: 'Lei de Drogas',
    sigla: 'Lei 11.343/06',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 11.343, de 23 de agosto de 2006',
    dataPublicacao: '2006-08-23',
    artigos: [
      { id: '10-1', numero: 'Art. 1º', caput: 'Esta Lei institui o Sistema Nacional de Políticas Públicas sobre Drogas - Sisnad; prescreve medidas para prevenção do uso indevido, atenção e reinserção social de usuários e dependentes de drogas; estabelece normas para repressão à produção não autorizada e ao tráfico ilícito de drogas e define crimes.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '25',
    nome: 'Lei Maria da Penha',
    sigla: 'Lei 11.340/06',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 11.340, de 7 de agosto de 2006',
    dataPublicacao: '2006-08-07',
    artigos: [
      { id: '25-1', numero: 'Art. 1º', caput: 'Esta Lei cria mecanismos para coibir e prevenir a violência doméstica e familiar contra a mulher, nos termos do § 8º do art. 226 da Constituição Federal.', titulo: 'Disposições Gerais' },
      { id: '25-5', numero: 'Art. 5º', caput: 'Para os efeitos desta Lei, configura violência doméstica e familiar contra a mulher qualquer ação ou omissão baseada no gênero que lhe cause morte, lesão, sofrimento físico, sexual ou psicológico e dano moral ou patrimonial.', titulo: 'Da Violência Doméstica e Familiar Contra a Mulher' },
    ],
  },
  {
    id: '26',
    nome: 'Lei Geral de Proteção de Dados',
    sigla: 'LGPD',
    categoria: 'Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 13.709, de 14 de agosto de 2018',
    dataPublicacao: '2018-08-14',
    artigos: [
      { id: '26-1', numero: 'Art. 1º', caput: 'Esta Lei dispõe sobre o tratamento de dados pessoais, inclusive nos meios digitais, por pessoa natural ou por pessoa jurídica de direito público ou privado, com o objetivo de proteger os direitos fundamentais de liberdade e de privacidade e o livre desenvolvimento da personalidade da pessoa natural.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '27',
    nome: 'Lei de Improbidade Administrativa',
    sigla: 'LIA',
    categoria: 'Administrativo',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 8.429, de 2 de junho de 1992',
    dataPublicacao: '1992-06-02',
    artigos: [
      { id: '27-1', numero: 'Art. 1º', caput: 'O sistema de responsabilização por atos de improbidade administrativa tutelará a probidade na organização do Estado e no exercício de suas funções, como forma de assegurar a integridade do patrimônio público e social.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '28',
    nome: 'Lei de Execução Penal',
    sigla: 'LEP',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 7.210, de 11 de julho de 1984',
    dataPublicacao: '1984-07-11',
    artigos: [
      { id: '28-1', numero: 'Art. 1º', caput: 'A execução penal tem por objetivo efetivar as disposições de sentença ou decisão criminal e proporcionar condições para a harmônica integração social do condenado e do internado.', titulo: 'Do Objeto e da Aplicação da Lei de Execução Penal' },
    ],
  },
  {
    id: '29',
    nome: 'Lei do Inquilinato',
    sigla: 'LI',
    categoria: 'Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 8.245, de 18 de outubro de 1991',
    dataPublicacao: '1991-10-18',
    artigos: [
      { id: '29-1', numero: 'Art. 1º', caput: 'A locação de imóvel urbano regula-se pelo disposto nesta lei.', titulo: 'Da Locação em Geral',
        paragrafos: ['Parágrafo único. Continuam regulados pelo Código Civil e pelas leis especiais: a) as locações de imóveis de propriedade da União, dos Estados e dos Municípios; b) as vagas autônomas de garagem ou de espaços para estacionamento de veículos; c) os espaços destinados à publicidade; d) os apart-hotéis, hotéis-residência ou equiparados.'],
      },
    ],
  },
  {
    id: '30',
    nome: 'Lei de Crimes Ambientais',
    sigla: 'LCA',
    categoria: 'Ambiental',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 9.605, de 12 de fevereiro de 1998',
    dataPublicacao: '1998-02-12',
    artigos: [
      { id: '30-1', numero: 'Art. 1º', caput: 'As condutas e atividades consideradas lesivas ao meio ambiente serão punidas com sanções penais e administrativas, na forma estabelecida nesta Lei.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '31',
    nome: 'Lei dos Juizados Especiais',
    sigla: 'LJE',
    categoria: 'Processual Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 9.099, de 26 de setembro de 1995',
    dataPublicacao: '1995-09-26',
    artigos: [
      { id: '31-1', numero: 'Art. 1º', caput: 'Os Juizados Especiais Cíveis e Criminais, órgãos da Justiça Ordinária, serão criados pela União, no Distrito Federal e nos Territórios, e pelos Estados, para conciliação, processo, julgamento e execução, nas causas de sua competência.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '32',
    nome: 'Lei de Licitações e Contratos',
    sigla: 'LLC',
    categoria: 'Administrativo',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 14.133, de 1º de abril de 2021',
    dataPublicacao: '2021-04-01',
    artigos: [
      { id: '32-1', numero: 'Art. 1º', caput: 'Esta Lei estabelece normas gerais de licitação e contratação para as Administrações Públicas diretas, autárquicas e fundacionais da União, dos Estados, do Distrito Federal e dos Municípios.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '33',
    nome: 'Lei de Abuso de Autoridade',
    sigla: 'LAA',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 13.869, de 5 de setembro de 2019',
    dataPublicacao: '2019-09-05',
    artigos: [
      { id: '33-1', numero: 'Art. 1º', caput: 'Esta Lei define os crimes de abuso de autoridade, cometidos por agente público, servidor ou não, que, no exercício de suas funções ou a pretexto de exercê-las, abuse do poder que lhe tenha sido atribuído.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '34',
    nome: 'Lei de Crimes Hediondos',
    sigla: 'LCH',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 8.072, de 25 de julho de 1990',
    dataPublicacao: '1990-07-25',
    artigos: [
      { id: '34-1', numero: 'Art. 1º', caput: 'São considerados hediondos os seguintes crimes, todos tipificados no Decreto-Lei nº 2.848, de 7 de dezembro de 1940 - Código Penal, consumados ou tentados.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '35',
    nome: 'Lei de Falências e Recuperação Judicial',
    sigla: 'LFR',
    categoria: 'Empresarial',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 11.101, de 9 de fevereiro de 2005',
    dataPublicacao: '2005-02-09',
    artigos: [
      { id: '35-1', numero: 'Art. 1º', caput: 'Esta Lei disciplina a recuperação judicial, a recuperação extrajudicial e a falência do empresário e da sociedade empresária, doravante referidos simplesmente como devedor.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '36',
    nome: 'Lei de Migração',
    sigla: 'LM',
    categoria: 'Administrativo',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 13.445, de 24 de maio de 2017',
    dataPublicacao: '2017-05-24',
    artigos: [
      { id: '36-1', numero: 'Art. 1º', caput: 'Esta Lei dispõe sobre os direitos e os deveres do migrante e do visitante, regula a sua entrada e estada no País e estabelece princípios e diretrizes para as políticas públicas para o emigrante.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '37',
    nome: 'Marco Civil da Internet',
    sigla: 'MCI',
    categoria: 'Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 12.965, de 23 de abril de 2014',
    dataPublicacao: '2014-04-23',
    artigos: [
      { id: '37-1', numero: 'Art. 1º', caput: 'Esta Lei estabelece princípios, garantias, direitos e deveres para o uso da internet no Brasil e determina as diretrizes para atuação da União, dos Estados, do Distrito Federal e dos Municípios em relação à matéria.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '38',
    nome: 'Lei Anticorrupção',
    sigla: 'LAC',
    categoria: 'Administrativo',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 12.846, de 1º de agosto de 2013',
    dataPublicacao: '2013-08-01',
    artigos: [
      { id: '38-1', numero: 'Art. 1º', caput: 'Esta Lei dispõe sobre a responsabilização objetiva administrativa e civil de pessoas jurídicas pela prática de atos contra a administração pública, nacional ou estrangeira.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '39',
    nome: 'Lei de Acesso à Informação',
    sigla: 'LAI',
    categoria: 'Administrativo',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 12.527, de 18 de novembro de 2011',
    dataPublicacao: '2011-11-18',
    artigos: [
      { id: '39-1', numero: 'Art. 1º', caput: 'Esta Lei dispõe sobre os procedimentos a serem observados pela União, Estados, Distrito Federal e Municípios, com o fim de garantir o acesso a informações previsto no inciso XXXIII do art. 5º, no inciso II do § 3º do art. 37 e no § 2º do art. 216 da Constituição Federal.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '40',
    nome: 'Lei de Tortura',
    sigla: 'LT',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 9.455, de 7 de abril de 1997',
    dataPublicacao: '1997-04-07',
    artigos: [
      { id: '40-1', numero: 'Art. 1º', caput: 'Constitui crime de tortura: I - constranger alguém com emprego de violência ou grave ameaça, causando-lhe sofrimento físico ou mental.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '41',
    nome: 'Lei de Organizações Criminosas',
    sigla: 'LOC',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 12.850, de 2 de agosto de 2013',
    dataPublicacao: '2013-08-02',
    artigos: [
      { id: '41-1', numero: 'Art. 1º', caput: 'Esta Lei define organização criminosa e dispõe sobre a investigação criminal, os meios de obtenção da prova, infrações penais correlatas e o procedimento criminal a ser aplicado.', titulo: 'Disposições Preliminares' },
    ],
  },
  {
    id: '42',
    nome: 'Lei do Mandado de Segurança',
    sigla: 'LMS',
    categoria: 'Processual Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 12.016, de 7 de agosto de 2009',
    dataPublicacao: '2009-08-07',
    artigos: [
      { id: '42-1', numero: 'Art. 1º', caput: 'Conceder-se-á mandado de segurança para proteger direito líquido e certo, não amparado por habeas corpus ou habeas data, sempre que, ilegalmente ou com abuso de poder, qualquer pessoa física ou jurídica sofrer violação ou houver justo receio de sofrê-la por parte de autoridade.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '43',
    nome: 'Lei de Arbitragem',
    sigla: 'LA',
    categoria: 'Processual Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 9.307, de 23 de setembro de 1996',
    dataPublicacao: '1996-09-23',
    artigos: [
      { id: '43-1', numero: 'Art. 1º', caput: 'As pessoas capazes de contratar poderão valer-se da arbitragem para dirimir litígios relativos a direitos patrimoniais disponíveis.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '44',
    nome: 'Lei de Crimes contra o Sistema Financeiro',
    sigla: 'LCSF',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 7.492, de 16 de junho de 1986',
    dataPublicacao: '1986-06-16',
    artigos: [
      { id: '44-1', numero: 'Art. 1º', caput: 'Considera-se instituição financeira, para efeito desta lei, a pessoa jurídica de direito público ou privado, que tenha como atividade principal ou acessória, cumulativamente ou não, a captação, intermediação ou aplicação de recursos financeiros de terceiros.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '45',
    nome: 'Lei do Processo Administrativo',
    sigla: 'LPA',
    categoria: 'Administrativo',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 9.784, de 29 de janeiro de 1999',
    dataPublicacao: '1999-01-29',
    artigos: [
      { id: '45-1', numero: 'Art. 1º', caput: 'Esta Lei estabelece normas básicas sobre o processo administrativo no âmbito da Administração Federal direta e indireta, visando, em especial, à proteção dos direitos dos administrados e ao melhor cumprimento dos fins da Administração.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '46',
    nome: 'Lei de Lavagem de Dinheiro',
    sigla: 'LLD',
    categoria: 'Penal',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 9.613, de 3 de março de 1998',
    dataPublicacao: '1998-03-03',
    artigos: [
      { id: '46-1', numero: 'Art. 1º', caput: 'Ocultar ou dissimular a natureza, origem, localização, disposição, movimentação ou propriedade de bens, direitos ou valores provenientes, direta ou indiretamente, de infração penal.', titulo: 'Dos Crimes de Lavagem' },
    ],
  },
  {
    id: '47',
    nome: 'Lei da Ação Civil Pública',
    sigla: 'LACP',
    categoria: 'Processual Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 7.347, de 24 de julho de 1985',
    dataPublicacao: '1985-07-24',
    artigos: [
      { id: '47-1', numero: 'Art. 1º', caput: 'Regem-se pelas disposições desta Lei, sem prejuízo da ação popular, as ações de responsabilidade por danos morais e patrimoniais causados ao meio-ambiente, ao consumidor, a bens e direitos de valor artístico, estético, histórico, turístico e paisagístico.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '48',
    nome: 'Lei de Registros Públicos',
    sigla: 'LRP',
    categoria: 'Civil',
    tipo: 'lei-ordinaria',
    descricao: 'Lei nº 6.015, de 31 de dezembro de 1973',
    dataPublicacao: '1973-12-31',
    artigos: [
      { id: '48-1', numero: 'Art. 1º', caput: 'Os serviços concernentes aos Registros Públicos, estabelecidos pela legislação civil para autenticidade, segurança e eficácia dos atos jurídicos, ficam sujeitos ao regime estabelecido nesta Lei.', titulo: 'Disposições Gerais' },
    ],
  },

  // ===== DECRETOS =====
  {
    id: '49',
    nome: 'Regulamento da Previdência Social',
    sigla: 'RPS',
    categoria: 'Previdenciário',
    tipo: 'decreto',
    descricao: 'Decreto nº 3.048, de 6 de maio de 1999',
    dataPublicacao: '1999-05-06',
    artigos: [
      { id: '49-1', numero: 'Art. 1º', caput: 'A seguridade social compreende um conjunto integrado de ações de iniciativa dos poderes públicos e da sociedade, destinado a assegurar o direito relativo à saúde, à previdência e à assistência social.', titulo: 'Da Seguridade Social' },
    ],
  },
  {
    id: '50',
    nome: 'Regulamento Disciplinar do Exército',
    sigla: 'RDE',
    categoria: 'Administrativo',
    tipo: 'decreto',
    descricao: 'Decreto nº 4.346, de 26 de agosto de 2002',
    dataPublicacao: '2002-08-26',
    artigos: [
      { id: '50-1', numero: 'Art. 1º', caput: 'O Regulamento Disciplinar do Exército (R-4) tem por finalidade especificar as transgressões disciplinares e estabelecer normas relativas a punições disciplinares, comportamento militar das praças, recursos e recompensas.', titulo: 'Disposições Gerais' },
    ],
  },
  {
    id: '51',
    nome: 'Decreto de Regulamentação da LGPD',
    sigla: 'DLGPD',
    categoria: 'Civil',
    tipo: 'decreto',
    descricao: 'Decreto nº 10.474, de 26 de agosto de 2020',
    dataPublicacao: '2020-08-26',
    artigos: [
      { id: '51-1', numero: 'Art. 1º', caput: 'Fica aprovada a Estrutura Regimental da Autoridade Nacional de Proteção de Dados – ANPD.', titulo: 'Disposições Gerais' },
    ],
  },

  // ===== SÚMULAS =====
  {
    id: '52',
    nome: 'Súmulas Vinculantes do STF',
    sigla: 'SV-STF',
    categoria: 'Constitucional',
    tipo: 'sumula',
    descricao: 'Enunciados de súmula vinculante do Supremo Tribunal Federal',
    dataPublicacao: '2007-06-01',
    artigos: [
      { id: '52-1', numero: 'SV 1', caput: 'Ofende a garantia constitucional do ato jurídico perfeito a decisão que, sem ponderar as circunstâncias do caso concreto, desconsidera a validez e a eficácia de acordo constante de termo de adesão instituído pela Lei Complementar 110/2001.', titulo: 'Súmulas Vinculantes' },
      { id: '52-2', numero: 'SV 11', caput: 'Só é lícito o uso de algemas em casos de resistência e de fundado receio de fuga ou de perigo à integridade física própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de nulidade da prisão ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado.', titulo: 'Súmulas Vinculantes' },
      { id: '52-3', numero: 'SV 14', caput: 'É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova que, já documentados em procedimento investigatório realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa.', titulo: 'Súmulas Vinculantes' },
      { id: '52-4', numero: 'SV 26', caput: 'Para efeito de progressão de regime no cumprimento de pena por crime hediondo, ou equiparado, o juízo da execução observará a inconstitucionalidade do art. 2º da Lei nº 8.072, de 25 de julho de 1990, sem prejuízo de avaliar se o condenado preenche, ou não, os requisitos objetivos e subjetivos do benefício, podendo determinar, para tal fim, de modo fundamentado, a realização de exame criminológico.', titulo: 'Súmulas Vinculantes' },
    ],
  },
  {
    id: '53',
    nome: 'Súmulas do STJ',
    sigla: 'S-STJ',
    categoria: 'Civil',
    tipo: 'sumula',
    descricao: 'Enunciados de súmula do Superior Tribunal de Justiça',
    dataPublicacao: '1990-01-01',
    artigos: [
      { id: '53-1', numero: 'Súmula 7', caput: 'A pretensão de simples reexame de prova não enseja recurso especial.', titulo: 'Súmulas do STJ' },
      { id: '53-2', numero: 'Súmula 83', caput: 'Não se conhece do recurso especial pela divergência, quando a orientação do tribunal se firmou no mesmo sentido da decisão recorrida.', titulo: 'Súmulas do STJ' },
      { id: '53-3', numero: 'Súmula 297', caput: 'O Código de Defesa do Consumidor é aplicável às instituições financeiras.', titulo: 'Súmulas do STJ' },
      { id: '53-4', numero: 'Súmula 385', caput: 'Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral, quando preexistente legítima inscrição, ressalvado o direito ao cancelamento.', titulo: 'Súmulas do STJ' },
    ],
  },
];

export const EXPLICACOES: Explicacao[] = [
  {
    id: '1',
    titulo: 'Princípio da Legalidade: Fundamento do Estado Democrático de Direito',
    resumo: 'Análise aprofundada do princípio da legalidade previsto no Art. 5º, II, da Constituição Federal e suas implicações no ordenamento jurídico brasileiro.',
    conteudo: 'O princípio da legalidade é um dos pilares fundamentais do Estado Democrático de Direito brasileiro. Previsto no artigo 5º, inciso II, da Constituição Federal de 1988, ele estabelece que \\"ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei\\".\n\nEste princípio possui dupla dimensão: para o particular, significa liberdade de ação em tudo que a lei não proíbe; para a Administração Pública, implica a necessidade de autorização legal prévia para qualquer atuação.\n\nA doutrina distingue entre legalidade formal (observância do procedimento legislativo) e legalidade material (conformidade com os valores constitucionais). O STF tem reforçado essa distinção em diversos julgados recentes.',
    autor: 'Prof. Dr. Carlos Mendes',
    dataPublicacao: '2026-03-15',
    categoria: 'Constitucional',
    leisRelacionadas: ['CF/88 - Art. 5º, II', 'CF/88 - Art. 37'],
    tags: ['legalidade', 'princípios constitucionais', 'direitos fundamentais'],
  },
  {
    id: '2',
    titulo: 'Responsabilidade Civil Objetiva no Código Civil de 2002',
    resumo: 'Estudo sobre as hipóteses de responsabilidade civil objetiva e a evolução doutrinária e jurisprudencial no direito brasileiro.',
    conteudo: 'A responsabilidade civil objetiva representa uma das mais significativas evoluções do direito civil contemporâneo. O Código Civil de 2002 adotou, em seu artigo 927, parágrafo único, a cláusula geral de responsabilidade objetiva.\n\nDiferentemente da responsabilidade subjetiva, que exige a comprovação de culpa, a responsabilidade objetiva fundamenta-se na teoria do risco, dispensando o elemento subjetivo para a configuração do dever de indenizar.',
    autor: 'Profa. Dra. Ana Beatriz Silva',
    dataPublicacao: '2026-03-10',
    categoria: 'Civil',
    leisRelacionadas: ['CC/2002 - Art. 927', 'CDC - Art. 12'],
    tags: ['responsabilidade civil', 'teoria do risco', 'dano'],
  },
  {
    id: '3',
    titulo: 'Prisão Preventiva: Requisitos e Limites Constitucionais',
    resumo: 'Análise dos requisitos legais para decretação da prisão preventiva à luz da jurisprudência do STF e STJ.',
    conteudo: 'A prisão preventiva, prevista nos artigos 311 a 316 do Código de Processo Penal, é medida cautelar de natureza excepcional que só pode ser decretada quando presentes os requisitos legais.\n\nO artigo 312 do CPP exige a demonstração de prova da existência do crime e indício suficiente de autoria, além de pelo menos um dos seguintes fundamentos: garantia da ordem pública, garantia da ordem econômica, conveniência da instrução criminal ou assegurar a aplicação da lei penal.',
    autor: 'Prof. Dr. Roberto Campos',
    dataPublicacao: '2026-03-05',
    categoria: 'Processual Penal',
    leisRelacionadas: ['CPP - Art. 311', 'CPP - Art. 312', 'CF/88 - Art. 5º, LVII'],
    tags: ['prisão preventiva', 'medidas cautelares', 'liberdade'],
  },
  {
    id: '4',
    titulo: 'Reforma Trabalhista e o Teletrabalho: O Que Mudou?',
    resumo: 'Panorama das alterações promovidas pela reforma trabalhista no regime de teletrabalho e suas implicações práticas.',
    conteudo: 'A Reforma Trabalhista de 2017 (Lei 13.467/2017) trouxe regulamentação específica para o teletrabalho nos artigos 75-A a 75-E da CLT. Posteriormente, a Lei 14.442/2022 atualizou diversos dispositivos.',
    autor: 'Profa. Dra. Marina Costa',
    dataPublicacao: '2026-02-28',
    categoria: 'Trabalho',
    leisRelacionadas: ['CLT - Art. 75-A', 'CLT - Art. 75-B'],
    tags: ['teletrabalho', 'reforma trabalhista', 'CLT'],
  },
  {
    id: '5',
    titulo: 'LGPD e o Direito à Proteção de Dados Pessoais',
    resumo: 'Como a Lei Geral de Proteção de Dados impacta as relações jurídicas e os direitos dos titulares de dados.',
    conteudo: 'A Lei Geral de Proteção de Dados (Lei 13.709/2018) representou um marco na proteção da privacidade no Brasil, estabelecendo princípios, direitos dos titulares e obrigações para agentes de tratamento.',
    autor: 'Prof. Dr. Thiago Oliveira',
    dataPublicacao: '2026-02-20',
    categoria: 'Civil',
    leisRelacionadas: ['LGPD - Art. 1º', 'CF/88 - Art. 5º, X'],
    tags: ['LGPD', 'proteção de dados', 'privacidade'],
  },
];

export const ATUALIZACOES: Atualizacao[] = [
  {
    id: '1',
    titulo: 'STF Decide Sobre Marco Temporal de Terras Indígenas',
    resumo: 'O Supremo Tribunal Federal concluiu o julgamento sobre a tese do marco temporal para demarcação de terras indígenas, com repercussão geral.',
    conteudo: 'Em sessão plenária realizada em março de 2026, o STF concluiu...',
    dataPublicacao: '2026-03-20',
    categoria: 'Constitucional',
    tipo: 'jurisprudencia',
    destaque: true,
  },
  {
    id: '2',
    titulo: 'Nova Lei de Licitações Entra em Vigor Integralmente',
    resumo: 'A Lei 14.133/2021 passa a ser a única norma de licitações e contratos administrativos em vigor, após período de transição.',
    conteudo: 'Após o período de transição, a Nova Lei de Licitações...',
    dataPublicacao: '2026-03-18',
    categoria: 'Administrativo',
    tipo: 'nova_lei',
    destaque: true,
  },
  {
    id: '3',
    titulo: 'Alterações no Código Penal: Novos Tipos Penais para Crimes Digitais',
    resumo: 'Publicada lei que tipifica novos crimes cibernéticos e aumenta penas para fraudes eletrônicas.',
    conteudo: 'O Presidente da República sancionou, em 15 de março de 2026...',
    dataPublicacao: '2026-03-15',
    categoria: 'Penal',
    tipo: 'alteracao',
    destaque: false,
  },
  {
    id: '4',
    titulo: 'TST Publica Nova Súmula Sobre Trabalho Intermitente',
    resumo: 'O Tribunal Superior do Trabalho editou nova súmula consolidando entendimento sobre contratos de trabalho intermitente.',
    conteudo: 'O TST, em sessão do Tribunal Pleno...',
    dataPublicacao: '2026-03-12',
    categoria: 'Trabalho',
    tipo: 'jurisprudencia',
    destaque: false,
  },
  {
    id: '5',
    titulo: 'Projeto de Lei Propõe Alterações no Código de Processo Civil',
    resumo: 'Novo PL apresentado na Câmara dos Deputados prevê mudanças significativas nos prazos processuais e no sistema recursal.',
    conteudo: 'O deputado relator apresentou projeto de lei...',
    dataPublicacao: '2026-03-10',
    categoria: 'Processual Civil',
    tipo: 'noticia',
    destaque: false,
  },
  {
    id: '6',
    titulo: 'STJ Firma Tese Sobre Danos Morais em Relações de Consumo',
    resumo: 'A Segunda Seção do STJ fixou tese vinculante sobre critérios para fixação de danos morais em relações consumeristas.',
    conteudo: 'Em recurso repetitivo, a Segunda Seção do STJ...',
    dataPublicacao: '2026-03-08',
    categoria: 'Consumidor',
    tipo: 'jurisprudencia',
    destaque: true,
  },
];
