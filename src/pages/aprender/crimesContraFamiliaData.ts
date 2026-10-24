// Dados completos dos 32 passos da Aula 01 de Crimes Contra a Família
// Extraídos do modelo original e conectados ao Cloudflare R2

export const R2_APRENDER_BASE_URL = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/aprender/direito-penal/crimes-contra-a-familia/aula-01/';

export interface AulaSlide {
  tipo: string;
  img?: string;
  img2?: string;
  alt?: string;
  kicker?: string;
  titulo?: string;
  corpo?: string;
  narr?: string;
  pontos?: any[];
  questao?: string;
  opcoes?: string[];
  certa?: number;
  feedback?: string;
  frente?: string;
  verso?: string;
  frases?: string[];
  rotuloL?: string;
  rotuloR?: string;
  instrucao?: string;
  pares?: [string, string][];
  ordemDefs?: number[];
  intro?: string;
  cartas?: { p: string; r: string }[];
  partes?: string[];
  respostas?: string[];
  banco?: string[];
  feedbackFinal?: string;
  colunas?: string[];
  linhas?: string[][];
  perguntas?: { q: string; ops: string[]; certa: number; exp: string }[];
  ramos?: { nome: string; texto: string; chips: string[] }[];
  centro?: string;
  marcos?: { ano: string; titulo: string; texto: string }[];
}

export const CRIMES_CONTRA_FAMILIA_SLIDES: AulaSlide[] = [
  {
    "tipo": "Capa",
    "img": "capa",
    "alt": "Casal trocando alianças douradas em salão de cartório com cortinas vermelhas",
    "kicker": "Direito Penal · Crimes Contra a Família",
    "titulo": "Crimes Contra a Família",
    "corpo": "<p class=\"lead\">A família é o primeiro núcleo de proteção de uma pessoa: é onde ela nasce, cresce, aprende a falar, é alimentada, educada e amparada nos momentos difíceis. Mas o que acontece quando o ataque vem de dentro, quando quem fere esse núcleo é justamente alguém que deveria protegê-lo?</p><p>É para situações assim que o Código Penal reserva um título inteiro: os <b>crimes contra a família</b>, previstos nos artigos 235 a 249. São condutas que atingem o <b>casamento</b>, o <b>estado de filiação</b>, a <b>assistência</b> devida entre familiares e o <b>poder familiar</b> sobre crianças e incapazes.</p><p>Nesta aula, eu te apresento o <b>mapa completo</b> desse título e mergulho no primeiro crime dele: a <b>bigamia</b>, o ato de contrair um novo casamento já sendo casado. Você vai conhecer o artigo 235 por dentro: a pena, quem responde, quem a lei protege e em que situações o crime simplesmente <b>deixa de existir</b>.</p><div class=\"chips\"><span class=\"chip\">Artigos 235 a 249</span><span class=\"chip\">Quatro capítulos</span><span class=\"chip\">Bigamia</span><span class=\"chip\">Artigo 235</span></div>",
    "narr": "A família é o primeiro núcleo de proteção de uma pessoa: é onde ela nasce, cresce, aprende a falar, é alimentada, educada e amparada nos momentos difíceis. Mas o que acontece quando o ataque vem de dentro, quando quem fere esse núcleo é justamente alguém que deveria protegê-lo? É para situações assim que o Código Penal reserva um título inteiro: os crimes contra a família, previstos nos artigos duzentos e trinta e cinco a duzentos e quarenta e nove. São condutas que atingem o casamento, o estado de filiação, a assistência devida entre familiares e o poder familiar sobre crianças e incapazes. Nesta aula, eu te apresento o mapa completo desse título e mergulho no primeiro crime dele: a bigamia, o ato de contrair um novo casamento já sendo casado. Você vai conhecer o artigo duzentos e trinta e cinco por dentro: a pena, quem responde, quem a lei protege e em que situações o crime simplesmente deixa de existir."
  },
  {
    "tipo": "Conteúdo",
    "img": "mapa",
    "alt": "Mapa antigo em pergaminho com quatro selos dourados e uma bússola de latão",
    "kicker": "Roteiro da aula",
    "titulo": "O caminho desta aula",
    "corpo": "<p>Antes de mergulhar no conteúdo, deixa eu te mostrar o <b>caminho que vamos percorrer juntas</b>. A aula está organizada em <b>três blocos</b> e um fechamento:</p><div class=\"viarow\"><div class=\"vianum\">1</div><div><h3>Primeiro, o terreno</h3><p>O mapa dos artigos 235 a 249 e os quatro capítulos que protegem a vida familiar.</p></div></div><div class=\"viarow\"><div class=\"vianum\">2</div><div><h3>Bigamia em detalhes</h3><p>O artigo 235 por dentro: o segundo casamento, quem responde por ele e quando o crime desaparece.</p></div></div><div class=\"viarow\"><div class=\"vianum\">3</div><div><h3>Prática e fixação</h3><p>Comparador, imagem para explorar, ligar termos, verdadeiro ou falso, linha do tempo e mapa mental.</p></div></div><div class=\"viarow\"><div class=\"vianum\">4</div><div><h3>Fechamento</h3><p>Desafio final com placar e a pergunta de ouro, a mais valiosa da aula.</p></div></div><div class=\"vazada\" aria-hidden=\"true\"><img src=\"assets/img/mapa.webp\" alt=\"\"></div><p>O conteúdo vem em <b>texto corrido</b>, como uma conversa, e a prática fica concentrada no <b>fim de cada bloco</b>: questões, flashcards e atividades para fixar cada parte antes de seguir. Vamos ao primeiro bloco!</p>",
    "narr": "O caminho desta aula. Antes de mergulhar no conteúdo, deixa eu te mostrar o caminho que vamos percorrer juntas. A aula está organizada em três blocos e um fechamento. Bloco um: primeiro, o terreno. O mapa dos artigos duzentos e trinta e cinco a duzentos e quarenta e nove e os quatro capítulos que protegem a vida familiar. Bloco dois: bigamia em detalhes. O artigo duzentos e trinta e cinco por dentro: o segundo casamento, quem responde por ele e quando o crime desaparece. Bloco três: prática e fixação. Comparador, imagem para explorar, ligar termos, verdadeiro ou falso, linha do tempo e mapa mental. Fechamento: desafio final com placar e a pergunta de ouro, a mais valiosa da aula. O conteúdo vem em texto corrido, como uma conversa, e a prática fica concentrada no fim de cada bloco: questões, flashcards e atividades para fixar cada parte antes de seguir. Vamos ao primeiro bloco!"
  },
  {
    "tipo": "Conteúdo",
    "img": "familia",
    "alt": "Família aconchegada na janela de uma casa protegida por um escudo dourado de luz",
    "kicker": "O bem jurídico",
    "titulo": "A família sob a proteção da lei penal",
    "corpo": "<p>Eu começo com a pergunta que organiza tudo: <b>o que exatamente a lei quer proteger</b> quando pune os crimes contra a família? A resposta é a própria <b>família como instituição</b>: a confiança que sustenta o casamento, a certeza sobre a origem de cada criança, o dever de sustento entre parentes e o cuidado com quem não consegue se defender sozinho.</p><p>Repare que não estamos falando de desentendimentos comuns do dia a dia. O Direito Penal entra em cena quando a conduta é tão grave que <b>abala a estrutura jurídica da família</b>: um segundo casamento sobre um casamento verdadeiro, um registro de nascimento que nunca existiu, um filho deixado sem sustento. São ataques à base sobre a qual a vida familiar se organiza.</p><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/familia.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">EXEMPLO PRÁTICO</p><p>Pense na família como uma <b>casa</b>. O casamento é a porta de entrada, a filiação são as paredes que dizem quem mora ali, a assistência é o telhado que protege da chuva e o poder familiar é o cuidado com quem ainda não alcança a maçaneta. Os crimes deste título são ataques a essas partes da casa.</p></div></div><div class=\"frasechave\"><p class=\"flabel\">FRASE-CHAVE</p><p class=\"fq2\">O Direito Penal protege a família por dentro: casamento, filiação, sustento e cuidado.</p></div><p>Todo esse sistema está concentrado num bloco enxuto do Código Penal: os <b>artigos 235 a 249</b>, divididos em <b>quatro capítulos</b>. Na próxima etapa, eu te mostro o mapa completo, capítulo por capítulo.</p>",
    "narr": "A família sob a proteção da lei penal. Eu começo com a pergunta que organiza tudo: o que exatamente a lei quer proteger quando pune os crimes contra a família? A resposta é a própria família como instituição: a confiança que sustenta o casamento, a certeza sobre a origem de cada criança, o dever de sustento entre parentes e o cuidado com quem não consegue se defender sozinho. Repare que não estamos falando de desentendimentos comuns do dia a dia. O Direito Penal entra em cena quando a conduta é tão grave que abala a estrutura jurídica da família: um segundo casamento sobre um casamento verdadeiro, um registro de nascimento que nunca existiu, um filho deixado sem sustento. São ataques à base sobre a qual a vida familiar se organiza. Exemplo prático: pense na família como uma casa. O casamento é a porta de entrada, a filiação são as paredes que dizem quem mora ali, a assistência é o telhado que protege da chuva e o poder familiar é o cuidado com quem ainda não alcança a maçaneta. Os crimes deste título são ataques a essas partes da casa. O Direito Penal protege a família por dentro: casamento, filiação, sustento e cuidado. Todo esse sistema está concentrado num bloco enxuto do Código Penal: os artigos duzentos e trinta e cinco a duzentos e quarenta e nove, divididos em quatro capítulos. Na próxima etapa, eu te mostro o mapa completo, capítulo por capítulo."
  },
  {
    "tipo": "Conteúdo",
    "img": "capitulos",
    "alt": "Quatro portas ornamentadas lado a lado em um salão escuro, com luz dourada sob cada uma",
    "kicker": "O mapa do título",
    "titulo": "Os quatro capítulos do mapa",
    "corpo": "<p>Aqui está o mapa que eu prometi. Os crimes contra a família se dividem em <b>quatro capítulos</b>, e cada um protege uma face da vida familiar:</p><div class=\"viarow\"><div class=\"vianum\">1</div><div><h3>Crimes contra o casamento</h3><p>Protegem a relação conjugal: a monogamia e a fidelidade entre os cônjuges. É neste capítulo que mora a bigamia.</p></div></div><div class=\"viarow\"><div class=\"vianum\">2</div><div><h3>Crimes contra o estado de filiação</h3><p>Protegem a verdade sobre a origem da criança: o registro de nascimento, o parto suposto e a sonegação da filiação.</p></div></div><div class=\"viarow\"><div class=\"vianum\">3</div><div><h3>Crimes contra a assistência familiar</h3><p>Protegem o sustento e o cuidado dentro de casa: abandono material, abandono intelectual e abandono moral.</p></div></div><div class=\"viarow\"><div class=\"vianum\">4</div><div><h3>Crimes contra o pátrio poder, tutela e curatela</h3><p>Protegem a guarda de menores e interditos: induzimento a fuga, entrega arbitrária e subtração de incapazes.</p></div></div><div class=\"vazada\" aria-hidden=\"true\"><img src=\"assets/img/capitulos.webp\" alt=\"\"></div><p>O nosso mergulho de hoje é no <b>primeiro capítulo</b>, o do casamento, e no crime que abre o título inteiro: a <b>bigamia</b>. Os outros três capítulos estão no mapa para você se localizar, e cada um deles ganha aulas próprias na sequência dos nossos estudos.</p>",
    "narr": "Os quatro capítulos do mapa. Aqui está o mapa que eu prometi. Os crimes contra a família se dividem em quatro capítulos, e cada um protege uma face da vida familiar. Capítulo um: crimes contra o casamento. Protegem a relação conjugal: a monogamia e a fidelidade entre os cônjuges; é neste capítulo que mora a bigamia. Capítulo dois: crimes contra o estado de filiação. Protegem a verdade sobre a origem da criança: o registro de nascimento, o parto suposto e a sonegação da filiação. Capítulo três: crimes contra a assistência familiar. Protegem o sustento e o cuidado dentro de casa: abandono material, abandono intelectual e abandono moral. Capítulo quatro: crimes contra o pátrio poder, tutela e curatela. Protegem a guarda de menores e interditos: induzimento a fuga, entrega arbitrária e subtração de incapazes. O nosso mergulho de hoje é no primeiro capítulo, o do casamento, e no crime que abre o título inteiro: a bigamia. Os outros três capítulos estão no mapa para você se localizar, e cada um deles ganha aulas próprias na sequência dos nossos estudos."
  },
  {
    "tipo": "Conteúdo",
    "img": "balanca",
    "alt": "Balança dourada perfeitamente equilibrada com uma aliança de casamento em cada prato",
    "kicker": "Crimes contra o casamento",
    "titulo": "O casamento no centro do primeiro capítulo",
    "corpo": "<p>Os crimes contra o casamento visam proteger a <b>relação conjugal</b> nos moldes da cultura ocidental atual. Traduzindo: o modelo de casamento que o nosso ordenamento protege é o da <b class=\"term\">monogamia</b>, um só parceiro no casamento, com <b>fidelidade</b> entre os contraentes.</p><p>Isso não é só uma escolha cultural escrita num papel. Dela nascem efeitos jurídicos enormes: regime de bens, direitos de herança, filiação dos filhos, pensão, nome. Quando alguém finge que esse casamento não existe e contrai outro, a confusão se espalha por <b>todas</b> essas áreas, e atinge gente que não tem culpa de nada: o cônjuge enganado, os filhos, a família inteira.</p><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/balanca.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">PENSE ASSIM</p><p>O casamento no civil é como um <b>registro público com uma vaga só</b>. Enquanto o seu nome ocupa aquela vaga, não existe como registrar outra pessoa no mesmo lugar. Para casar de novo, primeiro é preciso liberar a vaga do jeito certo: com o divórcio ou com a anulação.</p></div></div><p>É exatamente para guardar essa vaga única que existe o primeiro crime do título. Se a pessoa casada ignora a regra e contrai um novo casamento, ela não comete só uma infração civil: ela comete <b>crime</b>, e é esse crime que nós vamos destrinchar no próximo bloco.</p><div class=\"fimbloco\"><p class=\"flabel\">NESTE BLOCO VOCÊ VIU</p><ul><li><b>Mapa decorado:</b> os crimes contra a família vão dos artigos 235 a 249 do Código Penal.</li><li>São quatro capítulos: casamento, estado de filiação, assistência familiar e pátrio poder, tutela e curatela.</li><li>O casamento protegido é o monogâmico: um só parceiro, com fidelidade entre os cônjuges.</li></ul></div>",
    "narr": "O casamento no centro do primeiro capítulo. Os crimes contra o casamento visam proteger a relação conjugal nos moldes da cultura ocidental atual. Traduzindo: o modelo de casamento que o nosso ordenamento protege é o da monogamia, um só parceiro no casamento, com fidelidade entre os contraentes. Isso não é só uma escolha cultural escrita num papel. Dela nascem efeitos jurídicos enormes: regime de bens, direitos de herança, filiação dos filhos, pensão, nome. Quando alguém finge que esse casamento não existe e contrai outro, a confusão se espalha por todas essas áreas, e atinge gente que não tem culpa de nada: o cônjuge enganado, os filhos, a família inteira. Pense assim: o casamento no civil é como um registro público com uma vaga só. Enquanto o seu nome ocupa aquela vaga, não existe como registrar outra pessoa no mesmo lugar. Para casar de novo, primeiro é preciso liberar a vaga do jeito certo: com o divórcio ou com a anulação. É exatamente para guardar essa vaga única que existe o primeiro crime do título. Se a pessoa casada ignora a regra e contrai um novo casamento, ela não comete só uma infração civil: ela comete crime, e é esse crime que nós vamos destrinchar no próximo bloco."
  },
  {
    "tipo": "Conteúdo",
    "img": "bigamia",
    "alt": "Duas alianças douradas sobrepostas sobre duas certidões de casamento, uma delas na sombra",
    "kicker": "Bigamia · Artigo 235",
    "titulo": "Bigamia: um segundo casamento sobre o primeiro",
    "corpo": "<p><b class=\"term\">Bigamia</b> é o ato de contrair casamento já sendo casado com outra pessoa. A palavra entrega o raciocínio: a pessoa tenta manter <b>dois casamentos ao mesmo tempo</b>, quando o ordenamento só admite um.</p><div class=\"box\"><p class=\"blabel\">O TEXTO DA LEI</p><p>Art. 235. Contrair alguém, sendo casado, novo casamento. Pena: reclusão, de dois a seis anos.</p></div><p>Repare na pena: <b>reclusão de dois a seis anos</b>. Não é uma pena leve, e isso mostra o peso que a lei dá para a confiança no casamento. O crime se consuma no momento em que o segundo casamento é celebrado, ainda que a vida em comum nem tenha começado.</p><p>E a bigamia conversa diretamente com o Código Civil, que fecha a porta antes: no artigo 1.521, inciso VI, ele diz que <b>as pessoas casadas não podem casar</b>. Ou seja, quem já é casado está impedido de contrair novo casamento. Se, mesmo impedida, a pessoa casa de novo, o segundo casamento é <b>nulo</b> e, além da nulidade, ela comete o crime de bigamia.</p><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/bigamia.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">EXEMPLO PRÁTICO</p><p>O Carlos casou com a Ana em São Paulo. Anos depois, mudou de cidade, conheceu a Beatriz e, <b>sem se divorciar</b>, casou com ela no civil, como se fosse solteiro. No instante em que o segundo casamento foi celebrado, o crime de bigamia se consumou, ainda que o Carlos nunca tenha morado com a Beatriz.</p></div></div>",
    "narr": "Bigamia: um segundo casamento sobre o primeiro. Bigamia é o ato de contrair casamento já sendo casado com outra pessoa. A palavra entrega o raciocínio: a pessoa tenta manter dois casamentos ao mesmo tempo, quando o ordenamento só admite um. O texto da lei: artigo duzentos e trinta e cinco: contrair alguém, sendo casado, novo casamento. Pena: reclusão, de dois a seis anos. Repare na pena: reclusão de dois a seis anos. Não é uma pena leve, e isso mostra o peso que a lei dá para a confiança no casamento. O crime se consuma no momento em que o segundo casamento é celebrado, ainda que a vida em comum nem tenha começado. E a bigamia conversa diretamente com o Código Civil, que fecha a porta antes: no artigo mil quinhentos e vinte e um, inciso seis, ele diz que as pessoas casadas não podem casar. Ou seja, quem já é casado está impedido de contrair novo casamento. Se, mesmo impedida, a pessoa casa de novo, o segundo casamento é nulo e, além da nulidade, ela comete o crime de bigamia. Exemplo prático: o Carlos casou com a Ana em São Paulo. Anos depois, mudou de cidade, conheceu a Beatriz e, sem se divorciar, casou com ela no civil, como se fosse solteiro. No instante em que o segundo casamento foi celebrado, o crime de bigamia se consumou, ainda que o Carlos nunca tenha morado com a Beatriz."
  },
  {
    "tipo": "Conteúdo",
    "img": "sujeitos",
    "alt": "Casal assinando documentos no cartório, com o homem escondendo uma segunda aliança atrás das costas",
    "kicker": "Bigamia · Quem responde",
    "titulo": "Quem responde pelo crime?",
    "corpo": "<p>Vamos organizar as pessoas desse crime. O <b>sujeito ativo</b>, quem pratica a bigamia, é o indivíduo <b>já casado</b> que contrai o novo casamento. E repare num detalhe que a banca adora: a bigamia é um crime de <b>concurso necessário</b>, ou seja, ela <b>não se comete sozinha</b>: para existir um casamento, são precisas duas pessoas diante do celebrante.</p><p>Mas atenção: precisar de duas pessoas para o ato não significa que as duas respondam pelo crime. A outra pessoa <b>não precisa saber</b> de nada. Se ela foi enganada e acreditou que estava casando com alguém livre, ela não é autora: ela é <b>vítima</b>.</p><div class=\"box\"><p class=\"blabel\">O TEXTO DA LEI</p><p>Art. 235, § 1º. Aquele que, não sendo casado, contrai casamento com pessoa casada, conhecendo essa circunstância, é punido com reclusão ou detenção, de um a três anos.</p></div><p>O parágrafo primeiro desenha a outra hipótese: a pessoa solteira que casa com alguém casado <b>sabendo</b> disso também comete o crime, com pena menor, de <b>um a três anos</b> de reclusão ou detenção. A palavra decisiva do dispositivo é <b>conhecendo</b>: sem conhecimento, não há crime para ela.</p><div class=\"frasechave\"><p class=\"flabel\">FRASE-CHAVE</p><p class=\"fq2\">Quem sabia, responde junto; quem não sabia, é vítima.</p></div><p>E quem a lei protege? O <b>sujeito passivo</b> é duplo: o <b>Estado</b>, guardião da ordem familiar, e o <b>consorte que não conhecia a situação</b>, a pessoa de boa-fé que foi enganada no ato mais solene da vida civil.</p>",
    "narr": "Quem responde pelo crime? Vamos organizar as pessoas desse crime. O sujeito ativo, quem pratica a bigamia, é o indivíduo já casado que contrai o novo casamento. E repare num detalhe que a banca adora: a bigamia é um crime de concurso necessário, ou seja, ela não se comete sozinha: para existir um casamento, são precisas duas pessoas diante do celebrante. Mas atenção: precisar de duas pessoas para o ato não significa que as duas respondam pelo crime. A outra pessoa não precisa saber de nada. Se ela foi enganada e acreditou que estava casando com alguém livre, ela não é autora: ela é vítima. O texto da lei: artigo duzentos e trinta e cinco, parágrafo primeiro: aquele que, não sendo casado, contrai casamento com pessoa casada, conhecendo essa circunstância, é punido com reclusão ou detenção, de um a três anos. O parágrafo primeiro desenha a outra hipótese: a pessoa solteira que casa com alguém casado sabendo disso também comete o crime, com pena menor, de um a três anos de reclusão ou detenção. A palavra decisiva do dispositivo é conhecendo: sem conhecimento, não há crime para ela. Quem sabia, responde junto; quem não sabia, é vítima. E quem a lei protege? O sujeito passivo é duplo: o Estado, guardião da ordem familiar, e o consorte que não conhecia a situação, a pessoa de boa-fé que foi enganada no ato mais solene da vida civil."
  },
  {
    "tipo": "Conteúdo",
    "img": "anulacao",
    "alt": "Martelo de juiz ao lado de uma certidão de casamento que se dissolve em luz dourada",
    "kicker": "Bigamia · Parágrafo 2º",
    "titulo": "Quando o crime deixa de existir",
    "corpo": "<p>Agora vem a parte mais surpreendente do artigo 235: existe uma situação em que o crime, depois de cometido, passa a ser tratado como se <b>nunca tivesse existido</b>. Quem diz isso é o parágrafo segundo:</p><div class=\"box\"><p class=\"blabel\">O TEXTO DA LEI</p><p>Art. 235, § 2º. Anulado por qualquer motivo o primeiro casamento, ou o outro por motivo que não a bigamia, considera-se inexistente o crime.</p></div><p>Vamos destrinchar as duas portas de saída. <b>Primeira porta:</b> o <b>primeiro casamento é anulado</b>, por qualquer motivo. Se o alicerce cai, o crime perde a base. <b>Segunda porta:</b> o <b>segundo casamento é anulado por um motivo diferente</b> da bigamia, como um erro essencial sobre a pessoa. Nas duas hipóteses, a lei manda considerar o crime inexistente.</p><p>E o detalhe fino: o casamento <b>nulo ou anulável</b>, enquanto estiver <b>vigente</b>, também gera bigamia. Ou seja, não basta a pessoa achar que o primeiro casamento não vale mais: enquanto não houver a <b>sentença</b> que declara a nulidade ou anula o casamento, o vínculo continua produzindo efeitos, e o segundo casamento continua sendo crime. Só depois da sentença é que o crime se torna inexistente, efeito que parte da doutrina descreve como uma forma de extinção.</p><div class=\"frasechave\"><p class=\"flabel\">FRASE-CHAVE</p><p class=\"fq2\">Anulou o primeiro casamento, apagou o crime.</p></div><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/anulacao.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">EXEMPLO PRÁTICO</p><p>A Fernanda casou pela segunda vez porque o primeiro casamento, celebrado anos antes, tinha um vício grave. Enquanto ela não conseguiu a sentença de anulação daquele primeiro casamento, o segundo foi tratado como bigamia. Quando a sentença finalmente anulou o primeiro casamento, o crime passou a ser considerado <b>inexistente</b>.</p></div></div>",
    "narr": "Quando o crime deixa de existir. Agora vem a parte mais surpreendente do artigo duzentos e trinta e cinco: existe uma situação em que o crime, depois de cometido, passa a ser tratado como se nunca tivesse existido. Quem diz isso é o parágrafo segundo. O texto da lei: artigo duzentos e trinta e cinco, parágrafo segundo: anulado por qualquer motivo o primeiro casamento, ou o outro por motivo que não a bigamia, considera-se inexistente o crime. Vamos destrinchar as duas portas de saída. Primeira porta: o primeiro casamento é anulado, por qualquer motivo. Se o alicerce cai, o crime perde a base. Segunda porta: o segundo casamento é anulado por um motivo diferente da bigamia, como um erro essencial sobre a pessoa. Nas duas hipóteses, a lei manda considerar o crime inexistente. E o detalhe fino: o casamento nulo ou anulável, enquanto estiver vigente, também gera bigamia. Ou seja, não basta a pessoa achar que o primeiro casamento não vale mais: enquanto não houver a sentença que declara a nulidade ou anula o casamento, o vínculo continua produzindo efeitos, e o segundo casamento continua sendo crime. Só depois da sentença é que o crime se torna inexistente, efeito que parte da doutrina descreve como uma forma de extinção. Anulou o primeiro casamento, apagou o crime. Exemplo prático: a Fernanda casou pela segunda vez porque o primeiro casamento, celebrado anos antes, tinha um vício grave. Enquanto ela não conseguiu a sentença de anulação daquele primeiro casamento, o segundo foi tratado como bigamia. Quando a sentença finalmente anulou o primeiro casamento, o crime passou a ser considerado inexistente."
  },
  {
    "tipo": "Conteúdo",
    "img": "condicoes",
    "alt": "Passaporte, aliança de casamento e uma miniatura de avião sobre uma mesa escura",
    "kicker": "Bigamia · Condições",
    "titulo": "As condições, uma a uma",
    "corpo": "<p>Para você nunca mais confundir, eu organizei as <b>condições</b> da bigamia numa lista só. Leia cada uma como uma regra de decisão rápida:</p><ul class=\"tight\"><li><b>O primeiro casamento precisa existir no momento do segundo.</b> É essa fotografia, tirada no instante da celebração, que define o crime.</li><li><b>Morte ou divórcio posteriores não extinguem o crime.</b> Se o casamento existia quando o segundo foi celebrado, o crime já se consumou, e o que vem depois não apaga o passado.</li><li><b>Casamento no estrangeiro configura bigamia.</b> Mudar de país não muda a regra: o segundo casamento civil, ainda que celebrado lá fora, é crime.</li><li><b>Casamento apenas religioso não configura.</b> Sem o casamento civil, não há o ato que o artigo 235 pune.</li><li><b>União estável seguida de casamento não configura.</b> A união estável, por mais séria que seja, não é casamento; quem vive em união estável e depois casa com outra pessoa não comete bigamia.</li></ul><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/condicoes.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">EXEMPLO PRÁTICO</p><p>O Roberto vivia em união estável com a Paula havia dez anos. Um dia, casou no civil com a Simone. Por mais difícil que a situação seja para a Paula, <b>não há bigamia</b>: a união estável não é casamento, e o crime exige um primeiro <b>casamento</b> de pé.</p></div></div>",
    "narr": "As condições, uma a uma. Para você nunca mais confundir, eu organizei as condições da bigamia numa lista só. Leia cada uma como uma regra de decisão rápida. O primeiro casamento precisa existir no momento do segundo: é essa fotografia, tirada no instante da celebração, que define o crime. Morte ou divórcio posteriores não extinguem o crime: se o casamento existia quando o segundo foi celebrado, o crime já se consumou, e o que vem depois não apaga o passado. Casamento no estrangeiro configura bigamia: mudar de país não muda a regra; o segundo casamento civil, ainda que celebrado lá fora, é crime. Casamento apenas religioso não configura: sem o casamento civil, não há o ato que o artigo duzentos e trinta e cinco pune. União estável seguida de casamento não configura: a união estável, por mais séria que seja, não é casamento; quem vive em união estável e depois casa com outra pessoa não comete bigamia. Exemplo prático: o Roberto vivia em união estável com a Paula havia dez anos. Um dia, casou no civil com a Simone. Por mais difícil que a situação seja para a Paula, não há bigamia: a união estável não é casamento, e o crime exige um primeiro casamento de pé."
  },
  {
    "tipo": "Conteúdo",
    "img": "dolo",
    "alt": "Pessoa diante de um grande espelho embaçado, com o reflexo incerto",
    "kicker": "Bigamia · Dolo e erro",
    "titulo": "Sem dolo, sem crime: o erro de tipo",
    "corpo": "<p>O elemento subjetivo da bigamia é o <b>dolo</b>: o agente precisa ter <b>consciência do impedimento</b>, saber que é casado e, mesmo assim, contrair o novo casamento. Sem essa consciência, a história muda de figura.</p><p>Quem casa de novo sem saber do impedimento incorre em <b class=\"term\">erro de tipo</b>: uma falsa percepção em relação à realidade. A pessoa enxerga o mundo de um jeito, mas o mundo é de outro. E o erro de tipo <b>exclui o dolo</b>; sem dolo, <b>não há crime de bigamia</b>.</p><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/dolo.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">PENSE ASSIM</p><p>É como assinar um documento novo confiando que o anterior foi cancelado, quando, na verdade, o cancelamento nunca aconteceu. A sua <b>intenção</b> era agir certo; o que falhou foi a sua leitura da realidade. O Direito Penal não pune quem foi enganado pela própria percepção.</p></div></div><div class=\"box exemplo\"><img class=\"wm\" src=\"assets/img/dolo.webp\" alt=\"\" aria-hidden=\"true\"><div class=\"excontent\"><p class=\"blabel\">CASO REAL · NOVO HAMBURGO</p><p>A 2ª Vara de Família e Sucessões da Comarca de Novo Hamburgo, no Rio Grande do Sul, reconheceu, em 28 de agosto de 2023, uma <b>união estável entre um homem e duas mulheres</b>, três pessoas, revestida de publicidade, continuidade e afetividade, com o objetivo de constituir uma família e de buscar a felicidade. Os dois autores que eram casados pediram o divórcio, para o imediato reconhecimento, por sentença, da relação poliamorosa entre os três envolvidos. Repare na conversa com a nossa aula: o caso trata de <b>união estável</b>, e não de casamento, e união estável não gera bigamia.</p></div></div><p>Guarde o tripé completo: a bigamia mora no <b>casamento civil</b>, exige <b>dolo</b> e desaparece quando a <b>anulação</b> derruba o primeiro vínculo. É com esse tripé que você resolve qualquer caso sobre o tema.</p><div class=\"fimbloco\"><p class=\"flabel\">NESTE BLOCO VOCÊ VIU</p><ul><li><b>Bigamia:</b> novo casamento de quem já é casado, com reclusão de dois a seis anos (art. 235).</li><li><b>Parágrafo 1º:</b> quem casa com pessoa casada, sabendo disso, também responde, de um a três anos.</li><li><b>Parágrafo 2º e erro de tipo:</b> anulado o primeiro casamento, o crime é inexistente; sem consciência do impedimento, não há dolo nem crime.</li></ul></div>",
    "narr": "Sem dolo, sem crime: o erro de tipo. O elemento subjetivo da bigamia é o dolo: o agente precisa ter consciência do impedimento, saber que é casado e, mesmo assim, contrair o novo casamento. Sem essa consciência, a história muda de figura. Quem casa de novo sem saber do impedimento incorre em erro de tipo: uma falsa percepção em relação à realidade. A pessoa enxerga o mundo de um jeito, mas o mundo é de outro. E o erro de tipo exclui o dolo; sem dolo, não há crime de bigamia. Pense assim: é como assinar um documento novo confiando que o anterior foi cancelado, quando, na verdade, o cancelamento nunca aconteceu. A sua intenção era agir certo; o que falhou foi a sua leitura da realidade. O Direito Penal não pune quem foi enganado pela própria percepção. Caso real, Novo Hamburgo: a Segunda Vara de Família e Sucessões da Comarca de Novo Hamburgo, no Rio Grande do Sul, reconheceu, em vinte e oito de agosto de dois mil e vinte e três, uma união estável entre um homem e duas mulheres, três pessoas, revestida de publicidade, continuidade e afetividade, com o objetivo de constituir uma família e de buscar a felicidade. Os dois autores que eram casados pediram o divórcio, para o imediato reconhecimento, por sentença, da relação poliamorosa entre os três envolvidos. Repare na conversa com a nossa aula: o caso trata de união estável, e não de casamento, e união estável não gera bigamia. Guarde o tripé completo: a bigamia mora no casamento civil, exige dolo e desaparece quando a anulação derruba o primeiro vínculo. É com esse tripé que você resolve qualquer caso sobre o tema."
  },
  {
    "tipo": "Questão",
    "img": "questao",
    "alt": "Pergaminho de prova com pena dourada, selo e ampulheta",
    "kicker": "Questão 1 · Bigamia",
    "titulo": "Questão 1",
    "intro": "Hora de treinar! Pense no que eu te expliquei sobre <b>quem responde</b> pela bigamia e responda:",
    "questao": "Sobre o crime de bigamia (art. 235 do Código Penal), é correto afirmar que:",
    "opcoes": [
      "O solteiro que contrai casamento com pessoa casada, sem saber dessa circunstância, comete o crime do parágrafo 1º.",
      "Quem, não sendo casado, contrai casamento com pessoa casada, conhecendo essa circunstância, é punido com reclusão ou detenção, de um a três anos.",
      "O divórcio obtido depois do segundo casamento extingue o crime de bigamia já consumado.",
      "O casamento celebrado no estrangeiro não pode configurar bigamia."
    ],
    "certa": 1,
    "feedback": "Isso mesmo! É o parágrafo 1º do artigo 235: o conhecimento da circunstância é o que faz o solteiro responder, com pena de um a três anos. Sem saber, ele é vítima, não autor. O divórcio posterior não extingue o crime, e o casamento no estrangeiro configura bigamia, sim.",
    "narr": "Questão um: bigamia. Hora de treinar! Pense no que eu te expliquei sobre quem responde pela bigamia e responda: sobre o crime de bigamia, artigo duzentos e trinta e cinco do Código Penal, é correto afirmar o quê? Leia as alternativas e escolha a correta."
  },
  {
    "tipo": "Flashcard",
    "img": "flashcards",
    "alt": "Cartões de estudo elegantes amarrados com fita vermelha sobre uma mesa escura",
    "kicker": "Flashcard 1 · Bigamia",
    "titulo": "Flashcard 1",
    "frente": "Anulado o primeiro casamento, o que acontece com o crime de bigamia?",
    "verso": "<p>Ele passa a ser considerado <b>inexistente</b>: é o que manda o <b>parágrafo 2º</b> do artigo 235.</p><p style='margin-top:10px'>O mesmo efeito ocorre quando o <b>segundo casamento</b> é anulado por motivo <b>diverso da bigamia</b>.</p>",
    "narr": "Flashcard um: bigamia. Anulado o primeiro casamento, o que acontece com o crime de bigamia? Toque no cartão para ver a resposta."
  },
  {
    "tipo": "Karaokê",
    "img": "bigamia",
    "alt": "Duas alianças douradas sobrepostas sobre duas certidões de casamento",
    "kicker": "Karaokê · Siga a narração",
    "titulo": "Recapitule a bigamia com a narração",
    "frases": [
      "Vamos recapitular a bigamia, acompanhando a narração pela tela.",
      "Bigamia é contrair um novo casamento já sendo casado, e o artigo duzentos e trinta e cinco pune com reclusão de dois a seis anos.",
      "O crime precisa de duas pessoas para acontecer, mas a outra só responde se souber de tudo: é o parágrafo primeiro, com pena de um a três anos.",
      "Quem não sabia de nada é vítima, ao lado do Estado, e nunca autor do crime.",
      "Se o primeiro casamento for anulado, o crime passa a ser considerado inexistente, pelo parágrafo segundo.",
      "E sem consciência do impedimento, há erro de tipo, que exclui o dolo e apaga o crime.",
      "Casamento no estrangeiro configura; só religioso ou união estável, não."
    ],
    "narr": "Vamos recapitular a bigamia, acompanhando a narração pela tela. Bigamia é contrair um novo casamento já sendo casado, e o artigo duzentos e trinta e cinco pune com reclusão de dois a seis anos. O crime precisa de duas pessoas para acontecer, mas a outra só responde se souber de tudo: é o parágrafo primeiro, com pena de um a três anos. Quem não sabia de nada é vítima, ao lado do Estado, e nunca autor do crime. Se o primeiro casamento for anulado, o crime passa a ser considerado inexistente, pelo parágrafo segundo. E sem consciência do impedimento, há erro de tipo, que exclui o dolo e apaga o crime. Casamento no estrangeiro configura; só religioso ou união estável, não."
  },
  {
    "tipo": "Comparador",
    "img": "compcivil",
    "img2": "compreligioso",
    "alt": "Comparador de duas cenas: o casamento civil no cartório e a cerimônia apenas religiosa na igreja",
    "rotuloL": "CIVIL · CONFIGURA",
    "rotuloR": "SÓ RELIGIOSO · NÃO",
    "kicker": "Comparador · Arraste a barra",
    "titulo": "Dois casamentos, dois destinos",
    "intro": "Arraste a barra dourada para um lado e para o outro e compare as duas cenas. De um lado, o casamento civil, celebrado no cartório, ainda que em outro país: é ele que o artigo 235 enxerga, e um segundo casamento civil configura a bigamia. Do outro, a cerimônia apenas religiosa, bonita e solene, mas sem o ato civil: sozinha, ela não configura o crime. A diferença entre as duas cenas é a diferença entre crime e fato atípico.",
    "narr": "Dois casamentos, dois destinos. Arraste a barra dourada para um lado e para o outro e compare as duas cenas. De um lado, o casamento civil, celebrado no cartório, ainda que em outro país: é ele que o artigo duzentos e trinta e cinco enxerga, e um segundo casamento civil configura a bigamia. Do outro, a cerimônia apenas religiosa, bonita e solene, mas sem o ato civil: sozinha, ela não configura o crime. A diferença entre as duas cenas é a diferença entre crime e fato atípico."
  },
  {
    "tipo": "Explorar",
    "img": "explorar",
    "alt": "Imagem vertical em cinco cenas empilhadas: assinatura no cartório, certidão escondida em gaveta, noiva sorrindo sem suspeitar, juiz com martelo e passaportes com avião",
    "kicker": "Exploração · Toque nos pontos",
    "titulo": "Explore a imagem: um caso em cinco cenas",
    "intro": "Esta imagem grande conta, de cima para baixo, a história de um caso de bigamia. Toque nas bolinhas douradas que ficam piscando sobre a imagem e leia a explicação de cada cena. São cinco pontos para descobrir: tente encontrar todos antes de seguir.",
    "pontos": [
      {
        "x": 50,
        "y": 11,
        "titulo": "O segundo casamento no cartório",
        "texto": "Na primeira cena, o casal assina o casamento no civil. Se um deles já é casado, é neste instante, o da celebração, que o crime de bigamia se consuma, ainda que os dois nunca venham a morar juntos."
      },
      {
        "x": 50,
        "y": 29,
        "titulo": "A certidão escondida na gaveta",
        "texto": "A certidão antiga, guardada na gaveta, é o primeiro casamento, que continua de pé. A regra de ouro da bigamia é esta: o primeiro casamento precisa existir no momento do segundo. Sem ele, não há crime."
      },
      {
        "x": 40,
        "y": 48,
        "titulo": "A noiva que não sabia de nada",
        "texto": "Ela sorri porque acredita estar casando com uma pessoa livre. Quem não conhecia a situação é sujeito passivo do crime, vítima ao lado do Estado. Só responderia pelo parágrafo primeiro quem casasse sabendo de tudo."
      },
      {
        "x": 48,
        "y": 69,
        "titulo": "A sentença que apaga o crime",
        "texto": "O juiz e o martelo representam a anulação. Se o primeiro casamento for anulado, o parágrafo segundo manda considerar o crime inexistente. Mas atenção: enquanto a sentença não sai, o vínculo continua valendo, e o crime continua existindo."
      },
      {
        "x": 50,
        "y": 90,
        "titulo": "O casamento do outro lado do oceano",
        "texto": "O avião e os passaportes lembram a última regra: casamento civil celebrado no estrangeiro também configura bigamia. Já a cerimônia apenas religiosa e a união estável ficam fora do crime."
      }
    ],
    "narr": "Explore a imagem: um caso em cinco cenas. Esta imagem grande conta, de cima para baixo, a história de um caso de bigamia. Toque nas bolinhas douradas que ficam piscando sobre a imagem e leia a explicação de cada cena. São cinco pontos para descobrir: tente encontrar todos antes de seguir."
  },
  {
    "tipo": "Toque e revele",
    "img": "revelar",
    "alt": "Quatro cartas douradas viradas para baixo sobre veludo vermelho, uma se levantando sob a luz",
    "kicker": "Toque e revele",
    "titulo": "Toque, pense e revele",
    "intro": "Quatro cartas escondem quatro perguntas rápidas sobre a bigamia. Toque em uma carta para ver a pergunta, pense na resposta com calma e toque de novo para revelar a resposta. Tente acertar as quatro antes de revelar.",
    "cartas": [
      {
        "p": "A cerimônia apenas religiosa, sem casamento civil, configura bigamia?",
        "r": "Não. O crime do artigo 235 exige um <b>casamento</b>: sem o ato civil, não há bigamia."
      },
      {
        "p": "Quem são os sujeitos passivos da bigamia?",
        "r": "O <b>Estado</b> e o <b>consorte que não conhecia a situação</b>, a pessoa de boa-fé que foi enganada."
      },
      {
        "p": "O que é o erro de tipo na bigamia?",
        "r": "A <b>falsa percepção da realidade</b>: quem não tinha consciência do impedimento não age com dolo, e sem dolo não há crime."
      },
      {
        "p": "O divórcio, depois do segundo casamento, extingue a bigamia?",
        "r": "Não. Morte ou divórcio <b>posteriores</b> não extinguem o crime: ele já se consumou na celebração do segundo casamento."
      }
    ],
    "narr": "Toque, pense e revele. Quatro cartas escondem quatro perguntas rápidas sobre a bigamia. Toque em uma carta para ver a pergunta, pense na resposta com calma e toque de novo para revelar a resposta. Tente acertar as quatro antes de revelar."
  },
  {
    "tipo": "Ligar termos",
    "img": "ligar",
    "alt": "Chaves douradas antigas e cadeados ornamentados sobre veludo vermelho",
    "kicker": "Ligar termos 1 · Bigamia",
    "titulo": "Ligar termos 1",
    "instrucao": "Ligue cada termo da bigamia à sua explicação. Toque em um termo e, depois, na explicação correspondente.",
    "pares": [
      [
        "Bigamia",
        "Contrair novo casamento sendo casado"
      ],
      [
        "Monogamia",
        "Um só parceiro no casamento"
      ],
      [
        "Art. 235, § 1º",
        "Pune quem casa com pessoa casada, sabendo disso"
      ],
      [
        "Art. 235, § 2º",
        "Anulação que torna o crime inexistente"
      ],
      [
        "Erro de tipo",
        "Falsa percepção que exclui o dolo"
      ]
    ],
    "ordemDefs": [
      2,
      4,
      0,
      3,
      1
    ],
    "narr": "Ligar termos um: bigamia. Ligue cada termo da bigamia à sua explicação. Toque em um termo e, depois, na explicação correspondente."
  },
  {
    "tipo": "Completar",
    "img": "lacuna",
    "alt": "Pergaminho antigo com espaços dourados vazios e peças douradas ao lado esperando para serem colocadas",
    "kicker": "Completar · Toque nas palavras",
    "titulo": "Complete a frase",
    "intro": "O caput do artigo 235 apareceu com quatro palavras faltando. Abaixo dele estão as palavras embaralhadas: toque nelas na ordem certa para preencher cada lacuna. Se tocar na palavra errada, nada acontece: respire e tente a próxima.",
    "partes": [
      "Contrair alguém, sendo ",
      " , novo ",
      ": pena de ",
      " , de dois a seis ",
      "."
    ],
    "respostas": [
      "casado",
      "casamento",
      "reclusão",
      "anos"
    ],
    "banco": [
      "detenção",
      "anos",
      "casado",
      "reclusão",
      "casamento",
      "multa"
    ],
    "feedbackFinal": "É o caput do artigo 235 do Código Penal: quem já é casado e contrai novo casamento responde com reclusão de dois a seis anos.",
    "narr": "Complete a frase. O caput do artigo duzentos e trinta e cinco apareceu com quatro palavras faltando. Abaixo dele estão as palavras embaralhadas: toque nelas na ordem certa para preencher cada lacuna. Se tocar na palavra errada, nada acontece: respire e tente a próxima."
  },
  {
    "tipo": "Conteúdo",
    "img": "tabela",
    "alt": "Balança de dois pratos com um sinal de certo dourado de um lado e um sinal de errado do outro",
    "kicker": "Comparativo",
    "titulo": "Configura ou não configura?",
    "corpo": "<p>Hora de transformar as condições da bigamia em <b>decisões rápidas</b>. Para cada situação, a pergunta é uma só: configura o crime ou não?</p><table class=\"cmp\"><tr><th>Situação</th><th>Bigamia?</th></tr><tr><td class=\"t\">Segundo casamento civil, com o primeiro vigente</td><td>Sim</td></tr><tr><td class=\"t\">Casamento civil celebrado no estrangeiro</td><td>Sim</td></tr><tr><td class=\"t\">Cerimônia apenas religiosa</td><td>Não</td></tr><tr><td class=\"t\">União estável e, depois, casamento com outra pessoa</td><td>Não</td></tr><tr><td class=\"t\">Segundo casamento, e divórcio logo em seguida</td><td>Sim: o divórcio não apaga</td></tr><tr><td class=\"t\">Primeiro casamento anulado por sentença</td><td>Crime inexistente (§ 2º)</td></tr></table><div class=\"vazada\" aria-hidden=\"true\"><img src=\"assets/img/tabela.webp\" alt=\"\"></div><p>Repare no padrão: o crime mora no <b>casamento civil vigente</b>. Onde não há um primeiro casamento de pé, ou onde a anulação derruba esse casamento, a bigamia não se sustenta.</p>",
    "narr": "Configura ou não configura? Hora de transformar as condições da bigamia em decisões rápidas. Para cada situação, a pergunta é uma só: configura o crime ou não? Segundo casamento civil, com o primeiro vigente: sim. Casamento civil celebrado no estrangeiro: sim. Cerimônia apenas religiosa: não. União estável e, depois, casamento com outra pessoa: não. Segundo casamento, e divórcio logo em seguida: sim, o divórcio não apaga. Primeiro casamento anulado por sentença: crime inexistente, pelo parágrafo segundo. Repare no padrão: o crime mora no casamento civil vigente. Onde não há um primeiro casamento de pé, ou onde a anulação derruba esse casamento, a bigamia não se sustenta."
  },
  {
    "tipo": "Verdadeiro ou falso",
    "img": "cartasvf",
    "alt": "Duas pilhas de cartas antigas sobre veludo vermelho, uma com símbolo de certo e outra com símbolo de errado em dourado",
    "kicker": "Verdadeiro ou falso · Arraste a carta",
    "titulo": "Verdadeiro ou falso: arraste e decida",
    "intro": "Agora é reflexo rápido! Cinco afirmações vão aparecer, uma de cada vez. Se a afirmação for verdadeira, arraste a carta para a direita; se for falsa, arraste para a esquerda. Quem preferir pode tocar nos botões de verdadeiro ou falso. No fim, você vê quantas acertou.",
    "afirmacoes": [
      {
        "t": "A pessoa solteira que casa com alguém casado, sem saber dessa situação, comete bigamia pelo parágrafo 1º.",
        "v": false,
        "exp": "O parágrafo 1º exige conhecimento da circunstância. Quem não sabia é vítima do crime, não autor."
      },
      {
        "t": "O casamento civil celebrado no estrangeiro pode configurar bigamia.",
        "v": true,
        "exp": "Isso mesmo: mudar de país não muda a regra. O segundo casamento civil configura o crime ainda que celebrado lá fora."
      },
      {
        "t": "Se o agente obtiver o divórcio depois do segundo casamento, o crime de bigamia se extingue.",
        "v": false,
        "exp": "Não se extingue. Morte ou divórcio posteriores não apagam o crime, que já se consumou na celebração do segundo casamento."
      },
      {
        "t": "Quem vive em união estável e depois se casa com outra pessoa comete bigamia.",
        "v": false,
        "exp": "União estável não é casamento. Sem um primeiro casamento vigente, não há bigamia."
      },
      {
        "t": "Anulado o primeiro casamento, o crime de bigamia é considerado inexistente.",
        "v": true,
        "exp": "Perfeito: é a regra do parágrafo 2º do artigo 235."
      }
    ],
    "narr": "Verdadeiro ou falso: arraste e decida. Agora é reflexo rápido! Cinco afirmações vão aparecer, uma de cada vez. Se a afirmação for verdadeira, arraste a carta para a direita; se for falsa, arraste para a esquerda. Quem preferir pode tocar nos botões de verdadeiro ou falso. No fim, você vê quantas acertou."
  },
  {
    "tipo": "Linha do tempo",
    "img": "timeline",
    "alt": "Linha do tempo dourada com cinco marcos brilhantes sobre pergaminho escuro",
    "kicker": "Linha do tempo · Toque nos marcos",
    "titulo": "A linha do tempo de um caso",
    "intro": "Vamos amarrar as regras da bigamia numa história só, a do Paulo. Toque em cada marco dourado para abrir a explicação dele: são cinco momentos que mostram, em ordem, como o crime nasce, se consuma e pode deixar de existir.",
    "marcos": [
      {
        "ano": "2015",
        "titulo": "O primeiro casamento",
        "texto": "Paulo e Marina se casam no civil. A partir desse dia, nenhum dos dois pode contrair novo casamento enquanto esse vínculo existir: a vaga do registro está ocupada."
      },
      {
        "ano": "2019",
        "titulo": "O segundo casamento",
        "texto": "Sem se divorciar, Paulo casa no civil com a Júlia, em outro país. Nesse instante, o crime de bigamia se consuma, e o fato de a celebração ser no estrangeiro não muda nada."
      },
      {
        "ano": "2020",
        "titulo": "A Júlia descobre tudo",
        "texto": "Júlia fica sabendo que Paulo já era casado. Como ela não conhecia a situação, ela não responde pelo parágrafo primeiro: ela é sujeito passivo, vítima do crime, ao lado do Estado."
      },
      {
        "ano": "2021",
        "titulo": "O divórcio de Marina",
        "texto": "Paulo finalmente se divorcia de Marina e imagina que o problema acabou. Não acabou: o divórcio posterior não extingue o crime, que já se consumou no segundo casamento."
      },
      {
        "ano": "2023",
        "titulo": "A anulação do primeiro casamento",
        "texto": "Uma sentença anula o primeiro casamento de Paulo, por um vício que existia desde a celebração. Com a anulação, aplica-se o parágrafo segundo: o crime de bigamia passa a ser considerado inexistente."
      }
    ],
    "narr": "A linha do tempo de um caso. Vamos amarrar as regras da bigamia numa história só, a do Paulo. Toque em cada marco dourado para abrir a explicação dele: são cinco momentos que mostram, em ordem, como o crime nasce, se consuma e pode deixar de existir."
  },
  {
    "tipo": "Mapa mental",
    "img": "mapamental",
    "alt": "Mapa mental de luz dourada com uma aliança no centro e cinco ramos ao redor",
    "centro": "CRIMES CONTRA A FAMÍLIA",
    "kicker": "Mapa mental · Toque nos ramos",
    "titulo": "Mapa mental da aula",
    "intro": "Para organizar tudo, um mapa da aula inteira. No centro estão os crimes contra a família; em volta, os cinco ramos que estudamos. Toque em cada ramo para abrir o resumo dele: em poucos minutos, você revisita a aula toda.",
    "ramos": [
      {
        "nome": "O mapa",
        "texto": "Os crimes contra a família estão nos artigos 235 a 249 do Código Penal, em quatro capítulos: casamento, estado de filiação, assistência familiar e pátrio poder, tutela e curatela.",
        "chips": [
          "Arts. 235 a 249",
          "Quatro capítulos"
        ]
      },
      {
        "nome": "Bigamia",
        "texto": "Contrair novo casamento já sendo casado. É o crime que abre o título, no artigo 235, com pena de reclusão de dois a seis anos.",
        "chips": [
          "Art. 235",
          "Reclusão de 2 a 6 anos"
        ]
      },
      {
        "nome": "Quem responde",
        "texto": "O sujeito ativo é quem já é casado. O solteiro que casa com pessoa casada, conhecendo a situação, responde pelo parágrafo primeiro, de um a três anos.",
        "chips": [
          "Concurso necessário",
          "§ 1º: quem sabia"
        ]
      },
      {
        "nome": "Quando o crime some",
        "texto": "Anulado o primeiro casamento, ou o segundo por motivo diverso da bigamia, o crime é considerado inexistente, pelo parágrafo segundo.",
        "chips": [
          "§ 2º",
          "Anulação"
        ]
      },
      {
        "nome": "Dolo e erro de tipo",
        "texto": "A bigamia exige dolo, a consciência do impedimento. Sem ela, há erro de tipo, falsa percepção da realidade, que exclui o dolo e o crime.",
        "chips": [
          "Consciência do impedimento",
          "Erro de tipo exclui"
        ]
      }
    ],
    "narr": "Mapa mental da aula. Para organizar tudo, um mapa da aula inteira. No centro estão os crimes contra a família; em volta, os cinco ramos que estudamos. Toque em cada ramo para abrir o resumo dele: em poucos minutos, você revisita a aula toda."
  },
  {
    "tipo": "Conteúdo",
    "img": "pegadinhas",
    "alt": "Alvo dourado com flechas e uma lupa revelando armadilhas sobre um pergaminho",
    "kicker": "Pegadinhas de prova",
    "titulo": "Não caia nessas!",
    "corpo": "<p>Antes de fechar o conteúdo, eu separei as <b>cinco confusões</b> que mais derrubam candidatos neste tema. Grave cada uma:</p><div class=\"box\"><p class=\"blabel\">PEGADINHA 1 · UNIÃO ESTÁVEL NÃO É CASAMENTO</p><p>União estável seguida de casamento com outra pessoa <b>não</b> configura bigamia. O crime exige um primeiro <b>casamento</b> vigente, e união estável, por mais duradoura que seja, não é casamento.</p></div><div class=\"box\"><p class=\"blabel\">PEGADINHA 2 · RELIGIOSO SOZINHO NÃO BASTA</p><p>A cerimônia religiosa, sem o casamento civil, <b>não</b> configura bigamia. Quem casa só na igreja não pratica o ato que o artigo 235 descreve.</p></div><div class=\"box\"><p class=\"blabel\">PEGADINHA 3 · DIVÓRCIO NÃO APAGA O PASSADO</p><p>Morte ou divórcio <b>depois</b> do segundo casamento não extinguem o crime. A fotografia que importa é a do momento da celebração: se o primeiro casamento existia ali, o crime se consumou.</p></div><div class=\"vazada\" aria-hidden=\"true\"><img src=\"assets/img/pegadinhas.webp\" alt=\"\"></div><div class=\"box\"><p class=\"blabel\">PEGADINHA 4 · QUEM NÃO SABIA NÃO É AUTOR</p><p>O parágrafo 1º só pune quem casa com pessoa casada <b>conhecendo</b> essa circunstância. Quem foi enganado é sujeito passivo, vítima, e não criminoso.</p></div><div class=\"box\"><p class=\"blabel\">PEGADINHA 5 · ANULAÇÃO NÃO É DIVÓRCIO</p><p>Anulado o primeiro casamento, o crime é <b>inexistente</b>, pelo parágrafo 2º. Já o divórcio apenas dissolve o casamento dali para frente e <b>não</b> apaga o crime já cometido. Trocar um pelo outro é o erro clássico.</p></div>",
    "narr": "Não caia nessas! Antes de fechar o conteúdo, eu separei as cinco confusões que mais derrubam candidatos neste tema. Grave cada uma. Pegadinha um, união estável não é casamento: união estável seguida de casamento com outra pessoa não configura bigamia. O crime exige um primeiro casamento vigente, e união estável, por mais duradoura que seja, não é casamento. Pegadinha dois, religioso sozinho não basta: a cerimônia religiosa, sem o casamento civil, não configura bigamia. Quem casa só na igreja não pratica o ato que o artigo duzentos e trinta e cinco descreve. Pegadinha três, divórcio não apaga o passado: morte ou divórcio depois do segundo casamento não extinguem o crime. A fotografia que importa é a do momento da celebração: se o primeiro casamento existia ali, o crime se consumou. Pegadinha quatro, quem não sabia não é autor: o parágrafo primeiro só pune quem casa com pessoa casada conhecendo essa circunstância. Quem foi enganado é sujeito passivo, vítima, e não criminoso. Pegadinha cinco, anulação não é divórcio: anulado o primeiro casamento, o crime é inexistente, pelo parágrafo segundo. Já o divórcio apenas dissolve o casamento dali para frente e não apaga o crime já cometido. Trocar um pelo outro é o erro clássico."
  },
  {
    "tipo": "Questão de banca",
    "img": "martelo",
    "alt": "Martelo de juiz sobre um livro de leis aberto com marcador dourado",
    "kicker": "Questão 2 · Estilo de banca",
    "titulo": "Questão 2",
    "intro": "Questão em <b>estilo de banca</b>, juntando duas condições da bigamia. Leia o caso com atenção:",
    "questao": "Carlos, casado no Brasil, viajou ao exterior e lá contraiu novo casamento civil, sem dissolver o primeiro. Meses depois, obteve o divórcio do primeiro casamento. Sobre a conduta de Carlos, é correto afirmar que:",
    "opcoes": [
      "Não há crime, porque o segundo casamento foi celebrado no estrangeiro.",
      "Não há crime, porque o divórcio posterior extinguiu a bigamia.",
      "Há crime de bigamia: o casamento no estrangeiro configura o delito, e o divórcio posterior não o extingue.",
      "Há crime apenas se a segunda esposa soubesse que Carlos era casado."
    ],
    "certa": 2,
    "feedback": "Exatamente. O casamento civil celebrado no estrangeiro configura bigamia, e o divórcio posterior não apaga o crime já consumado. E repare na alternativa D: o conhecimento da segunda esposa só importaria para a responsabilidade dela, pelo parágrafo 1º, nunca para a existência do crime de Carlos.",
    "narr": "Questão dois, em estilo de banca, juntando duas condições da bigamia. Leia o caso com atenção: Carlos, casado no Brasil, viajou ao exterior e lá contraiu novo casamento civil, sem dissolver o primeiro. Meses depois, obteve o divórcio do primeiro casamento. Sobre a conduta de Carlos, é correto afirmar o quê? Leia as alternativas e escolha a correta."
  },
  {
    "tipo": "Flashcard",
    "img": "flashcards2",
    "alt": "Dois cartões de estudo em pé, frente e verso, ligados por uma fita vermelha",
    "kicker": "Flashcard 2 · O mapa",
    "titulo": "Flashcard 2",
    "frente": "Quais são os quatro capítulos dos crimes contra a família?",
    "verso": "<p><b>1.</b> Crimes contra o <b>casamento</b>.</p><p style='margin-top:8px'><b>2.</b> Crimes contra o <b>estado de filiação</b>.</p><p style='margin-top:8px'><b>3.</b> Crimes contra a <b>assistência familiar</b>.</p><p style='margin-top:8px'><b>4.</b> Crimes contra o <b>pátrio poder, tutela e curatela</b>.</p><p style='margin-top:10px'>Tudo isso nos artigos <b>235 a 249</b> do Código Penal.</p>",
    "narr": "Flashcard dois: o mapa. Quais são os quatro capítulos dos crimes contra a família? Toque no cartão para ver a resposta."
  },
  {
    "tipo": "Conteúdo",
    "img": "panorama",
    "alt": "Vista panorâmica de uma casa de família, um cartório e um tribunal ligados por caminhos de luz dourada",
    "kicker": "Panorama geral",
    "titulo": "A aula em um relance",
    "corpo": "<p>Respira fundo e olha o <b>mapa completo</b> da nossa aula. Cada capítulo do título protege uma face da família, e cada um tem um crime de abertura que você já sabe localizar:</p><table class=\"cmp\"><tr><th>Capítulo</th><th>Protege</th><th>Crime de abertura</th></tr><tr><td class=\"t\">Casamento</td><td>A monogamia e a fidelidade</td><td>Bigamia (art. 235)</td></tr><tr><td class=\"t\">Estado de filiação</td><td>A verdade sobre a origem da criança</td><td>Registro de nascimento inexistente (art. 241)</td></tr><tr><td class=\"t\">Assistência familiar</td><td>O sustento, a instrução e o amparo</td><td>Abandono material (art. 244)</td></tr><tr><td class=\"t\">Pátrio poder, tutela e curatela</td><td>A guarda de menores e interditos</td><td>Subtração de incapazes (art. 249)</td></tr></table><div class=\"vazada\" aria-hidden=\"true\"><img src=\"assets/img/panorama.webp\" alt=\"\"></div><p>Nesta aula, o nosso estudo foi o <b>primeiro degrau</b> desse mapa: a bigamia. Nas próximas aulas, destrinchamos cada um dos outros crimes, capítulo por capítulo, sempre com o mesmo cuidado: o texto da lei, quem responde, quem é protegido e as situações em que o crime não se configura.</p><div class=\"fimbloco\"><p class=\"flabel\">NESTE BLOCO VOCÊ VIU</p><ul><li><b>Decisão rápida:</b> o crime mora no casamento civil vigente; religioso sozinho e união estável ficam fora.</li><li>As pegadinhas clássicas trocam anulação por divórcio e autor por vítima: você já sabe separá-las.</li><li>O mapa dos quatro capítulos está pronto para acompanhar as próximas aulas.</li></ul></div>",
    "narr": "A aula em um relance. Respira fundo e olha o mapa completo da nossa aula. Cada capítulo do título protege uma face da família, e cada um tem um crime de abertura que você já sabe localizar. Casamento: protege a monogamia e a fidelidade; crime de abertura: bigamia, artigo duzentos e trinta e cinco. Estado de filiação: protege a verdade sobre a origem da criança; crime de abertura: registro de nascimento inexistente, artigo duzentos e quarenta e um. Assistência familiar: protege o sustento, a instrução e o amparo; crime de abertura: abandono material, artigo duzentos e quarenta e quatro. Pátrio poder, tutela e curatela: protege a guarda de menores e interditos; crime de abertura: subtração de incapazes, artigo duzentos e quarenta e nove. Nesta aula, o nosso estudo foi o primeiro degrau desse mapa: a bigamia. Nas próximas aulas, destrinchamos cada um dos outros crimes, capítulo por capítulo, sempre com o mesmo cuidado: o texto da lei, quem responde, quem é protegido e as situações em que o crime não se configura."
  },
  {
    "tipo": "Karaokê",
    "img": "mapa",
    "alt": "Mapa antigo em pergaminho com quatro selos dourados",
    "kicker": "Karaokê final · Siga a narração",
    "titulo": "A aula inteira em um minuto",
    "frases": [
      "Vamos fechar o conteúdo recapitulando a aula inteira com a narração.",
      "Os crimes contra a família ocupam os artigos duzentos e trinta e cinco a duzentos e quarenta e nove do Código Penal.",
      "São quatro capítulos: casamento, estado de filiação, assistência familiar e pátrio poder, tutela e curatela.",
      "O primeiro crime é a bigamia: contrair novo casamento já sendo casado, com reclusão de dois a seis anos.",
      "Quem casa com pessoa casada, sabendo disso, responde pelo parágrafo primeiro; quem não sabia é vítima.",
      "Anulado o primeiro casamento, o crime é inexistente; e sem dolo, por erro de tipo, crime nenhum se sustenta.",
      "Se você gravou mapa, bigamia, parágrafos primeiro e segundo e erro de tipo, você gravou esta aula."
    ],
    "narr": "Vamos fechar o conteúdo recapitulando a aula inteira com a narração. Os crimes contra a família ocupam os artigos duzentos e trinta e cinco a duzentos e quarenta e nove do Código Penal. São quatro capítulos: casamento, estado de filiação, assistência familiar e pátrio poder, tutela e curatela. O primeiro crime é a bigamia: contrair novo casamento já sendo casado, com reclusão de dois a seis anos. Quem casa com pessoa casada, sabendo disso, responde pelo parágrafo primeiro; quem não sabia é vítima. Anulado o primeiro casamento, o crime é inexistente; e sem dolo, por erro de tipo, crime nenhum se sustenta. Se você gravou mapa, bigamia, parágrafos primeiro e segundo e erro de tipo, você gravou esta aula."
  },
  {
    "tipo": "Ligar termos",
    "img": "ligar2",
    "alt": "Elos de corrente dourados frente a frente sobre veludo vermelho, aguardando a ligação",
    "kicker": "Ligar termos 2 · Os capítulos",
    "titulo": "Ligar termos 2",
    "instrucao": "Agora ligue cada capítulo dos crimes contra a família àquilo que ele protege. Toque em um capítulo e, depois, na proteção correspondente.",
    "pares": [
      [
        "Crimes contra o casamento",
        "Monogamia e fidelidade entre cônjuges"
      ],
      [
        "Crimes contra o estado de filiação",
        "Verdade sobre a origem da criança"
      ],
      [
        "Crimes contra a assistência familiar",
        "Sustento, instrução e amparo moral"
      ],
      [
        "Crimes contra o pátrio poder",
        "Guarda de menores e interditos"
      ],
      [
        "Bigamia",
        "Segundo casamento de quem já é casado"
      ]
    ],
    "ordemDefs": [
      3,
      1,
      4,
      0,
      2
    ],
    "narr": "Ligar termos dois: os capítulos. Agora ligue cada capítulo dos crimes contra a família àquilo que ele protege. Toque em um capítulo e, depois, na proteção correspondente."
  },
  {
    "tipo": "Questão",
    "img": "questao2",
    "alt": "Lupa dourada sobre alternativas em pergaminho escuro, com pena e tinteiro ao lado",
    "kicker": "Questão 3 · Dolo e erro de tipo",
    "titulo": "Questão 3",
    "intro": "Última questão de treino, sobre o <b>elemento subjetivo</b> da bigamia. Vá com calma:",
    "questao": "A respeito do elemento subjetivo do crime de bigamia, é correto afirmar que:",
    "opcoes": [
      "Basta a culpa: quem casa sem conferir o estado civil do outro responde pelo crime.",
      "É indispensável o dolo, a consciência do impedimento; sem ela, há erro de tipo, que exclui o dolo e o crime.",
      "O dolo é irrelevante, porque a bigamia se consuma com qualquer segundo casamento.",
      "Quem desconhecia o impedimento responde, ainda assim, pelo parágrafo 1º do artigo 235."
    ],
    "certa": 1,
    "feedback": "Perfeito. A bigamia é crime doloso: o agente precisa ter consciência do impedimento. Quem não tem essa consciência incorre em erro de tipo, uma falsa percepção da realidade, que exclui o dolo. E o parágrafo 1º também exige conhecimento: a palavra conhecendo está no texto da lei.",
    "narr": "Questão três: dolo e erro de tipo. Última questão de treino, sobre o elemento subjetivo da bigamia. Vá com calma: a respeito do elemento subjetivo do crime de bigamia, é correto afirmar o quê? Leia as alternativas e escolha a correta."
  },
  {
    "tipo": "Desafio",
    "img": "martelo",
    "alt": "Martelo de juiz e placar dourado sobre um livro de leis aberto",
    "kicker": "Desafio final · Vale pontos",
    "titulo": "Desafio final: o placar da professora",
    "intro": "Chegou a hora do desafio que fecha a aula! São cinco perguntas rápidas sobre tudo o que vimos. Cada resposta certa vale cem pontos. Responda com calma, acompanhe o seu placar e veja, no fim, como você se saiu. Boa sorte!",
    "perguntas": [
      {
        "q": "A bigamia está prevista em qual artigo do Código Penal?",
        "ops": [
          "Artigo 233",
          "Artigo 235",
          "Artigo 241",
          "Artigo 244"
        ],
        "certa": 1,
        "exp": "Artigo 235, o primeiro do título dos crimes contra a família."
      },
      {
        "q": "A pena do caput do artigo 235 é:",
        "ops": [
          "Detenção, de um a três anos",
          "Reclusão, de dois a seis anos",
          "Reclusão, de um a cinco anos",
          "Detenção, de seis meses a dois anos"
        ],
        "certa": 1,
        "exp": "Reclusão, de dois a seis anos. A pena de um a três anos é a do parágrafo primeiro, para quem casa sabendo."
      },
      {
        "q": "O solteiro que casa com pessoa casada, conhecendo a situação, responde com base em qual dispositivo?",
        "ops": [
          "Artigo 235, caput",
          "Artigo 235, parágrafo 1º",
          "Artigo 235, parágrafo 2º",
          "Artigo 236"
        ],
        "certa": 1,
        "exp": "Parágrafo primeiro do artigo 235: a palavra decisiva do dispositivo é conhecendo."
      },
      {
        "q": "Qual situação NÃO configura bigamia?",
        "ops": [
          "Casamento civil celebrado no estrangeiro",
          "Segundo casamento com o primeiro ainda vigente",
          "Cerimônia apenas religiosa",
          "Segundo casamento com o primeiro casamento anulável ainda vigente"
        ],
        "certa": 2,
        "exp": "A cerimônia apenas religiosa, sem casamento civil, não configura. E atenção: o casamento nulo ou anulável, enquanto vigente, gera bigamia, sim."
      },
      {
        "q": "Anulado o primeiro casamento, o crime de bigamia:",
        "ops": [
          "Tem a pena reduzida pela metade",
          "Passa a ser considerado inexistente",
          "Prescreve no mesmo dia",
          "Transforma-se em contravenção penal"
        ],
        "certa": 1,
        "exp": "Considera-se inexistente o crime: é a regra do parágrafo segundo do artigo 235."
      }
    ],
    "narr": "Desafio final: o placar da professora. Chegou a hora do desafio que fecha a aula! São cinco perguntas rápidas sobre tudo o que vimos. Cada resposta certa vale cem pontos. Responda com calma, acompanhe o seu placar e veja, no fim, como você se saiu. Boa sorte!"
  },
  {
    "tipo": "Questão",
    "img": "ouro",
    "alt": "Medalha dourada com louros sobre um livro de leis aberto, sob luz radiante",
    "kicker": "Pergunta de Ouro · A mais valiosa da aula",
    "titulo": "Pergunta de ouro",
    "intro": "Para fechar, a <b>pergunta de ouro</b>: um caso completo, que junta tudo o que você estudou. Leia devagar, monte o quebra-cabeça e responda:",
    "questao": "Roberto era casado com Clara. Sem se divorciar, casou-se no civil, em outro país, com Júlia, que desconhecia por completo o primeiro casamento. Dois anos depois, o primeiro casamento de Roberto foi anulado por sentença. Diante do caso, a conclusão correta é:",
    "opcoes": [
      "Roberto comete bigamia, e Júlia também, como coautora do crime.",
      "Júlia responde pelo parágrafo 1º, porque deveria ter investigado o estado civil de Roberto.",
      "O crime chegou a se consumar no segundo casamento, mas, anulado o primeiro, passa a ser considerado inexistente; e Júlia, que nada sabia, nunca responderia pelo parágrafo 1º.",
      "Nada pode ser punido, porque o segundo casamento foi celebrado no exterior."
    ],
    "certa": 2,
    "feedback": "Brilhante! Você montou o caso inteiro: o casamento no exterior consumou a bigamia de Roberto; Júlia, sem conhecimento, é vítima e não autora, porque o parágrafo 1º exige que ela conhecesse a circunstância; e a anulação do primeiro casamento, pelo parágrafo 2º, faz o crime ser considerado inexistente. É exatamente assim que uma banca espera que você raciocine.",
    "narr": "Pergunta de ouro. Para fechar, a pergunta de ouro: um caso completo, que junta tudo o que você estudou. Leia devagar, monte o quebra-cabeça e responda: Roberto era casado com Clara. Sem se divorciar, casou-se no civil, em outro país, com Júlia, que desconhecia por completo o primeiro casamento. Dois anos depois, o primeiro casamento de Roberto foi anulado por sentença. Diante do caso, a conclusão correta é qual? Leia as alternativas e escolha a correta."
  },
  {
    "tipo": "Encerramento",
    "img": "fim",
    "alt": "Estrada dourada saindo de um tribunal neoclássico em direção ao nascer do sol, com duas alianças como portal",
    "kicker": "Encerramento",
    "titulo": "O que você leva desta aula",
    "corpo": "<p>Chegamos ao fim, e eu quero que você perceba o caminho que percorreu. Começamos olhando a família como uma casa que a lei protege por dentro, e terminamos dominando o primeiro crime do título que a defende.</p><p>Você conheceu o <b>mapa dos artigos 235 a 249</b>, com os quatro capítulos, e destrinchou a <b>bigamia</b> em todas as suas camadas: o ato, a pena de dois a seis anos, o parceiro que sabia e responde pelo parágrafo primeiro, o parceiro enganado que é vítima, a anulação que apaga o crime pelo parágrafo segundo e o erro de tipo que exclui o dolo.</p><div class=\"vazada\" aria-hidden=\"true\"><img src=\"assets/img/capa.webp\" alt=\"\"></div><p>A lição maior é um método: diante de qualquer caso, pergunte <b>existia um primeiro casamento de pé?</b>, <b>quem sabia do impedimento?</b> e <b>houve anulação?</b>. Com essas três perguntas, você resolve a bigamia em qualquer prova.</p><p>Parabéns por chegar até aqui! Na próxima aula, o mergulho continua no capítulo do casamento, com o induzimento a erro essencial e a ocultação de impedimento. Revisite os flashcards quando quiser e confie: crime contra a família se aprende pelo <b>raciocínio</b>, não pela decoreba. Eu fico por aqui, e te espero na próxima aula. <b>Bons estudos!</b></p>",
    "pontos": [
      "<b>O mapa:</b> os artigos 235 a 249 protegem casamento, filiação, assistência familiar e pátrio poder.",
      "<b>Bigamia:</b> novo casamento de quem já é casado, com reclusão de dois a seis anos.",
      "<b>Parágrafo 1º:</b> quem casa com pessoa casada, sabendo disso, também responde.",
      "<b>Parágrafo 2º:</b> anulado o primeiro casamento, o crime é considerado inexistente.",
      "<b>Dolo:</b> sem consciência do impedimento, há erro de tipo, e nenhum crime se sustenta."
    ],
    "narr": "O que você leva desta aula. Chegamos ao fim, e eu quero que você perceba o caminho que percorreu. Começamos olhando a família como uma casa que a lei protege por dentro, e terminamos dominando o primeiro crime do título que a defende. Você conheceu o mapa dos artigos duzentos e trinta e cinco a duzentos e quarenta e nove, com os quatro capítulos, e destrinchou a bigamia em todas as suas camadas: o ato, a pena de dois a seis anos, o parceiro que sabia e responde pelo parágrafo primeiro, o parceiro enganado que é vítima, a anulação que apaga o crime pelo parágrafo segundo e o erro de tipo que exclui o dolo. A lição maior é um método: diante de qualquer caso, pergunte: existia um primeiro casamento de pé? Quem sabia do impedimento? E houve anulação? Com essas três perguntas, você resolve a bigamia em qualquer prova. Parabéns por chegar até aqui! Na próxima aula, o mergulho continua no capítulo do casamento, com o induzimento a erro essencial e a ocultação de impedimento. Revisite os flashcards quando quiser e confie: crime contra a família se aprende pelo raciocínio, não pela decoreba. Eu fico por aqui, e te espero na próxima aula. Bons estudos!"
  }
];
