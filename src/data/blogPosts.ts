import socratesImg from '@/assets/blog/socrates.webp';
import stfImg from '@/assets/blog/stf.webp';
import curiosidadesImg from '@/assets/blog/curiosidades.webp';
import beccariaImg from '@/assets/blog/dos-delitos-e-das-penas.webp';
import rousseauImg from '@/assets/blog/o-contrato-social.webp';
import leiOQueEImg from '@/assets/blog/leis/o-que-e-uma-lei.webp';
import leiEstruturaImg from '@/assets/blog/leis/artigo-paragrafo-inciso-alinea.webp';
import leiProcessoImg from '@/assets/blog/leis/processo-legislativo.webp';
import leiVacatioImg from '@/assets/blog/leis/vacatio-legis.webp';
import leiOrdComplImg from '@/assets/blog/leis/lei-ordinaria-complementar.webp';
import leiRevogacaoImg from '@/assets/blog/leis/revogacao-leis.webp';
import leiLegalidadeImg from '@/assets/blog/leis/principio-legalidade.webp';
import oQueEDireitoImg from '@/assets/blog/o-que-e-direito.webp';
import juris01Img from '@/assets/blog/jurisprudencia/juris-01.jpg';
import juris02Img from '@/assets/blog/jurisprudencia/juris-02.jpg';
import juris03Img from '@/assets/blog/jurisprudencia/juris-03.jpg';
import juris04Img from '@/assets/blog/jurisprudencia/juris-04.jpg';
import juris05Img from '@/assets/blog/jurisprudencia/juris-05.jpg';
import juris06Img from '@/assets/blog/jurisprudencia/juris-06.jpg';
import juris07Img from '@/assets/blog/jurisprudencia/juris-07.jpg';
import juris08Img from '@/assets/blog/jurisprudencia/juris-08.jpg';
import juris09Img from '@/assets/blog/jurisprudencia/juris-09.jpg';
import juris10Img from '@/assets/blog/jurisprudencia/juris-10.jpg';

export type BlogTema =
  | 'Filosofia'
  | 'STF'
  | 'Curiosidades'
  | 'Clássicos'
  | 'Leis'
  | 'Iniciantes'
  | 'Direito Penal'
  | 'Direito Civil'
  | 'Direito Constitucional'
  | 'Direito Administrativo'
  | 'Direito do Trabalho'
  | 'Direito Processual'
  | 'Direito Tributário'
  | 'Carreiras Jurídicas'
  | 'Atualidades Jurídicas'
  | 'Jurisprudência';

export interface BlogPost {
  id: string;
  titulo: string;
  resumo: string;
  conteudo_md: string;
  imagem_url: string;
  tema: BlogTema;
  autor: string;
  data_publicacao: string; // ISO
  tempo_leitura_min: number;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'socrates-o-pai-da-filosofia-juridica',
    titulo: 'Sócrates: o filósofo que morreu para provar que a lei existe',
    resumo:
      'Por que Sócrates aceitou beber cicuta em vez de fugir de Atenas? A resposta é uma das aulas mais poderosas sobre o Estado de Direito.',
    imagem_url: socratesImg,
    tema: 'Filosofia',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-12T09:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## O julgamento que mudou o Ocidente

Em **399 a.C.**, Sócrates foi condenado à morte pelo Tribunal de Atenas sob duas acusações: **corromper a juventude** e **desrespeitar os deuses da cidade**. Seus amigos, liderados por Críton, organizaram tudo para que ele fugisse. Ele recusou.

## Por que Sócrates não fugiu?

No diálogo *Críton*, Platão registra o argumento: se cada cidadão desobedecesse a sentença que considerasse injusta, **as Leis deixariam de existir**. E sem Leis, não há cidade — há apenas força.

> "Preferível é sofrer a injustiça a cometê-la."
> — Sócrates, no *Críton*

## O que isso ensina para o Direito hoje

- **Legalidade acima da conveniência pessoal**: base do art. 5º, II da CF/88 — "ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei".
- **Devido processo legal**: mesmo diante de sentença injusta, o caminho é o *recurso*, não a fuga.
- **Contrato social**: séculos antes de Rousseau, Sócrates já dizia que viver na *pólis* é aceitar suas regras.

## Curiosidade para provas

Bancas adoram cobrar Sócrates em questões de **Filosofia do Direito** e **Ética profissional (OAB)**. Guarde três palavras: *maiêutica* (fazer parir ideias por perguntas), *ironia socrática* (fingir ignorância para expor contradições) e *intelectualismo ético* (ninguém erra sabendo que erra).

## Para levar

Sócrates transformou sua morte no argumento definitivo de que **a lei só vale se valer para todos, inclusive para quem discorda dela**. É por isso que, dois mil e quatrocentos anos depois, ele ainda cai na sua prova.`,
  },
  {
    id: 'stf-11-ministros-e-a-corte-mais-poderosa-do-brasil',
    titulo: 'STF por dentro: como funciona a corte mais poderosa do país',
    resumo:
      'Onze ministros, mandato vitalício e a última palavra sobre a Constituição. Entenda em 5 minutos como o Supremo realmente decide.',
    imagem_url: stfImg,
    tema: 'STF',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-13T11:30:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## Quem são e como chegam lá

O **Supremo Tribunal Federal** é composto por **11 ministros**, indicados pelo **Presidente da República** e sabatinados pelo **Senado Federal** (art. 101, parágrafo único, CF).

Requisitos:

- Mais de **35** e menos de **70 anos**
- **Notável saber jurídico** e **reputação ilibada**
- Cidadão brasileiro nato (art. 12, § 3º, IV)

Uma vez empossado, o ministro fica no cargo até completar **75 anos** (aposentadoria compulsória) ou renunciar.

## As três funções que ninguém explica direito

1. **Guardião da Constituição** — julga a ADI, ADC, ADO e ADPF.
2. **Foro por prerrogativa de função** — julga presidente, ministros, parlamentares em crimes cometidos no exercício do cargo.
3. **Última instância** — o famoso *recurso extraordinário*, quando a decisão contraria a CF.

## Plenário x Turmas

O STF divide o trabalho:

- **Plenário** (11 ministros): controle de constitucionalidade e casos de grande repercussão.
- **1ª e 2ª Turmas** (5 ministros cada, sem o Presidente): recursos e casos criminais individuais.

## Repercussão geral: a filtragem

Desde 2004, o STF só analisa recurso extraordinário se a matéria tiver **repercussão geral** (art. 102, § 3º, CF). É um filtro constitucional que evita que o Supremo vire tribunal de terceira instância comum.

## Súmula Vinculante: a lei que o STF cria

Aprovada por **2/3 dos ministros**, a súmula vinculante obriga o Judiciário e a Administração Pública. Descumprir gera **reclamação constitucional** direta ao STF (art. 103-A, CF).

## Para levar

O STF **não é a última instância recursal comum** — para isso existe o STJ. Ele é a última palavra sobre **o que a Constituição significa**. E essa distinção é a resposta certa em 8 de cada 10 questões de Constitucional.`,
  },
  {
    id: 'curiosidades-juridicas-que-parecem-mentira',
    titulo: '5 curiosidades jurídicas que parecem mentira (mas são reais)',
    resumo:
      'De uma lei que proíbe morrer a um artigo do Código Civil sobre pombos-correios: o Direito brasileiro é mais estranho do que você imagina.',
    imagem_url: curiosidadesImg,
    tema: 'Curiosidades',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-14T15:00:00Z',
    tempo_leitura_min: 4,
    conteudo_md: `## 1. Existe uma lei que proíbe morrer

Na cidade francesa de **Sarpourenx**, o prefeito assinou em 2008 uma norma proibindo os moradores de morrer sem antes reservarem lugar no cemitério — que estava lotado. Curiosidade: no Brasil temos algo parecido em municípios pequenos, na forma de decretos de superlotação de cemitério público.

## 2. O Código Civil brasileiro fala de pombos

O **art. 1.302 do CC** ainda regula relações de vizinhança com "**pombas e outras aves domésticas**". Sobreviveu à revisão de 2002. Cai raro em prova, mas é a curiosidade preferida dos professores de Civil.

## 3. Você pode ser processado por dar "bom dia"

Se o bom-dia vier em tom irônico e reiterado no ambiente de trabalho, pode configurar **assédio moral** (dano moral trabalhista). O TST já reconheceu em pelo menos dois acórdãos de 2019 e 2022.

## 4. A Constituição brasileira já foi tatuada em uma pessoa

O artista plástico **Nuno Ramos** propôs em 2013 uma performance tatuando trechos da CF/88 em voluntários. A obra virou objeto de debate sobre **direitos autorais do texto legal** — que, aliás, é de **domínio público** (art. 8º, IV, Lei 9.610/98).

## 5. O menor município do Brasil tem mais leis do que habitantes

**Serra da Saudade (MG)**, com pouco mais de **800 habitantes**, tem mais de **1.200 leis municipais** em vigor. É o retrato perfeito da **inflação legislativa** brasileira — assunto que a doutrina de Bobbio já criticava em 1977.

## Para levar

O Direito é feito de gente, e gente é curiosa. Guarde essas cinco: rende ponto extra em conversa de estágio e, sim, uma delas já apareceu em prova da OAB.`,
  },
  {
    id: 'dos-delitos-e-das-penas-por-que-todo-estudante-de-direito-deveria-ler',
    titulo: 'Dos Delitos e Das Penas: por que todo estudante de Direito deveria ler Beccaria antes de se formar',
    resumo:
      'Publicado em 1764, o pequeno livro de Cesare Beccaria demoliu séculos de tortura judicial e fundou o Direito Penal moderno. Entenda por que ele ainda é a leitura mais atual — e mais subversiva — que você pode fazer na faculdade.',
    imagem_url: beccariaImg,
    tema: 'Clássicos',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-15T09:00:00Z',
    tempo_leitura_min: 12,
    conteudo_md: `## Um livro de 100 páginas que mudou o mundo

Em **1764**, um jovem aristocrata milanês de apenas **26 anos**, tímido, pouco brilhante nas conversas de salão e quase reprovado em Direito na Universidade de Pavia, publicou anonimamente um panfleto de menos de 100 páginas. Chamava-se ***Dei delitti e delle pene*** — *Dos Delitos e Das Penas*. Em três anos foi traduzido para o francês, inglês, alemão, holandês, espanhol e polonês. Voltaire escreveu um comentário elogioso. Catarina, a Grande, convidou o autor para a Rússia. Napoleão o citou nas reformas do Código Civil. A Inquisição o colocou no *Index Librorum Prohibitorum*.

O autor era **Cesare Bonesana, Marquês de Beccaria**. E aquele livrinho é, sem exagero, **o ato de nascimento do Direito Penal moderno**.

## O mundo antes de Beccaria: o horror como norma

Para entender por que o livro foi uma bomba, é preciso lembrar como funcionava a justiça criminal no *Antigo Regime*:

- **Tortura judicial** era método oficial de obtenção de prova (*quaestio per tormenta*).
- **Penas de morte** eram executadas em praça pública com esquartejamento, roda, forca e fogueira — como espetáculo pedagógico.
- **Processo secreto**: o réu não conhecia as acusações nem as testemunhas.
- **Provas legais tarifadas**: duas testemunhas contestes equivaliam à condenação automática, mesmo diante da inocência evidente.
- **Confissão** era a "rainha das provas" — e era arrancada sob tortura.
- **Penas desproporcionais**: furtar um pão e assassinar podiam levar ao mesmo cadafalso.
- **Juízo divino e ordálias** ainda sobreviviam em regiões da Europa.

O jurista era, na prática, um **carrasco letrado**. Beccaria olhou para tudo isso e escreveu, em italiano corrente (não em latim erudito), um manifesto que qualquer comerciante conseguia ler.

## As sete teses que fundaram o Direito Penal contemporâneo

O livro é curto porque cada capítulo é uma sentença cravada. Guarde as sete ideias centrais — elas são a espinha dorsal de tudo o que você vai estudar em **Penal I, II, III, Processo Penal e Execução Penal**.

### 1. Princípio da legalidade

> "Só as leis podem decretar as penas dos delitos, e esta autoridade não pode residir senão no legislador."

É o embrião do **art. 5º, XXXIX da CF/88** e do **art. 1º do Código Penal**: *nullum crimen, nulla poena sine praevia lege*. Antes de Beccaria, o juiz criava o crime pela interpretação. Depois dele, o juiz é boca da lei.

### 2. Reserva legal e proibição da analogia *in malam partem*

Se apenas a lei pode criar o crime, o juiz **não pode ampliar tipos penais por semelhança**. Todo o debate contemporâneo sobre tipicidade estrita nasce aqui.

### 3. Proporcionalidade entre delito e pena

> "Para que uma pena obtenha seu efeito, basta que o mal dela exceda o bem que nasce do delito."

Este é o embrião do **princípio da proporcionalidade** (hoje pilar do controle de constitucionalidade). Pena excessiva é tirania; pena insuficiente é convite ao crime.

### 4. Abolição da tortura

Beccaria dedica o capítulo XVI a uma demonstração lógica devastadora: a tortura é inútil porque **o inocente resistente é condenado e o culpado forte é absolvido**. Ela não busca a verdade, busca o cansaço. É a raiz do **art. 5º, III da CF/88** ("ninguém será submetido a tortura") e da **Lei 9.455/97**.

### 5. Presunção de inocência

> "Um homem não pode ser chamado de culpado antes da sentença do juiz, e a sociedade só pode retirar-lhe a proteção pública depois que se decidiu ter ele violado os pactos."

É a fonte direta do **art. 5º, LVII da CF/88**. Toda a discussão sobre execução provisória da pena que ocupou o STF nos últimos anos remonta, no fundo, a este parágrafo de 1764.

### 6. Publicidade e oralidade do processo

O processo secreto, escrito e inquisitorial é o inimigo. Beccaria defende **julgamentos públicos**, com **provas públicas**, para que "a opinião, que talvez seja o único cimento da sociedade, freie a força e as paixões". Está lá no **art. 5º, LX** e no **art. 93, IX** da CF.

### 7. Contra a pena de morte

O capítulo XXVIII é o mais famoso. Beccaria foi **o primeiro pensador ocidental a sustentar racionalmente a abolição da pena capital**, com três argumentos:

- **Ilegitimidade contratual**: ninguém, ao formar a sociedade, entrega ao Estado o direito sobre a própria vida.
- **Ineficácia preventiva**: o que intimida não é a intensidade momentânea do castigo, mas sua *duração*. A prisão perpétua assusta mais que o cadafalso.
- **Efeito perverso**: a execução pública brutaliza o povo em vez de educá-lo.

É por isso que a **CF/88, art. 5º, XLVII, a** proíbe a pena de morte (salvo guerra declarada). Beccaria venceu — 224 anos depois.

## Beccaria e o Brasil de 2026

Você pode estar pensando: "bonito, mas é história". Não é. Abra a jurisprudência recente do STF e veja quantas dessas discussões continuam vivas:

- **Audiência de custódia** (Res. 213/2015 CNJ) → concretiza a presunção de inocência de Beccaria.
- **Pacote Anticrime (Lei 13.964/19)** → reacende o debate sobre proporcionalidade e execução da pena.
- **Julgamento das ADCs 43, 44 e 54** (execução da pena após 2ª instância) → é literalmente uma disputa sobre o capítulo VII de Beccaria.
- **HC coletivo das gestantes (HC 143.641)** → aplica a lógica beccariana de humanização.
- **Discussão sobre monitoração eletrônica e penas alternativas** → segue o programa do capítulo XLVII: "É melhor prevenir os delitos do que puni-los".

## As frases que você precisa saber decorar

Bancas de concurso e a prova da OAB **adoram** citar Beccaria. Guarde estas quatro:

1. *"É melhor prevenir os delitos do que puni-los."* — capítulo XLVII, base da moderna política criminal preventiva.
2. *"Não é a intensidade da pena que faz o maior efeito sobre o espírito humano, mas sua duração."* — capítulo XXVIII, argumento clássico contra pena de morte.
3. *"Todo ato de autoridade de homem para homem que não derive da absoluta necessidade é tirânico."* — capítulo II, base do princípio da intervenção mínima.
4. *"A certeza de um castigo, embora moderado, causará sempre a impressão mais forte que o temor de outro mais terrível, unido à esperança da impunidade."* — capítulo XXVII, fundamento da eficácia da lei penal.

## Por que ler Beccaria antes de se formar

Porque **cada princípio que você decora hoje foi conquista de alguém**. Legalidade, proporcionalidade, presunção de inocência, vedação da tortura, humanidade das penas — nada disso caiu do céu. Foi arrancado de um sistema que queimava gente na fogueira, e foi arrancado com argumento, não com força.

Ler *Dos Delitos e Das Penas* é entender que **Direito Penal não é técnica de encarceramento**: é técnica de **contenção do poder punitivo do Estado**. E que o estudante que memoriza o Código sem conhecer Beccaria é como o médico que sabe operar mas nunca ouviu falar do juramento de Hipócrates — funciona, mas não sabe *por quê*.

## Como ler (e onde encontrar de graça)

- O livro tem **domínio público** em italiano e em várias traduções.
- A tradução clássica para o português é a de **Torrieri Guimarães** (Ed. Hemus) e a mais recente e comentada é a de **José Cretella Jr. e Agnes Cretella** (Ed. Revista dos Tribunais).
- **Leia em duas sessões**. São 47 capítulos curtíssimos, alguns de meia página. Dá para terminar num fim de semana.
- Marque com caneta os capítulos **II, VI, VII, XII, XVI, XXVII, XXVIII e XLVII** — são os que mais aparecem em prova.

## Para levar

Beccaria escreveu com 26 anos um livro que **derrubou a tortura na Europa, aboliu a pena de morte em dezenas de países e ainda hoje guia o STF**. Se um jovem quase reprovado em Pavia conseguiu isso com uma pena e três meses de trabalho, imagine o que um estudante de Direito informado — você — pode fazer com o Código Penal aberto na mesa.

**Leia Beccaria.** Não pela nota. Pelo lado da história em que você quer estar.`,
  },
  {
    id: 'o-contrato-social-por-que-rousseau-ainda-explica-a-republica',
    titulo: 'O Contrato Social: por que Rousseau ainda explica a República brasileira em 2026',
    resumo:
      'Em 1762, Rousseau escreveu o manual da soberania popular. Entenda por que a vontade geral, a igualdade e a cidadania ativa são ideias que a Constituição de 1988 ainda tenta cumprir.',
    imagem_url: rousseauImg,
    tema: 'Clássicos',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-16T09:00:00Z',
    tempo_leitura_min: 11,
    conteudo_md: `## O livro que fez a Revolução Francesa pensar

Em **1762**, enquanto a Europa ainda vivia sob reis absolutos, um gênio excêntrico e recluso publicou um tratado de pouco mais de 100 páginas que mudaria o mundo. Jean-Jacques Rousseau não era advogado. Era um autodidata, musicista, pedagogo e filósofo. E escreveu ***Du contrat social ou Principes du droit politique*** — **O Contrato Social**.

A pergunta do livro é simples e terrível: **como pode um grupo de seres livres viver sob autoridade sem deixar de ser livre?** A resposta de Rousseau é a base de toda a Constituição moderna, inclusive da nossa.

## O problema: a liberdade natural vs. a liberdade civil

Rousseau começa com uma distinção que todo estudante de Direito precisa gravar:

- **Liberdade natural**: o homem na natureza faz o que quer, mas vive sob o medo, a força e a necessidade.
- **Liberdade civil**: o homem na sociedade obedece às leis que ele mesmo ajudou a fazer.

> "O homem nasce livre, e por toda a parte está acorrentado."
> — Rousseau, *O Contrato Social*, livro I

A frase é famosa, mas o ponto não é o pessimismo. É a promessa: **as correntes só são legítimas se o próprio povo as forjou**. Toda autoridade que não vem de um pacto é tirania.

## A solução: o pacto de associação total

Rousseau propõe um contrato radical. Cada indivíduo **renuncia à sua liberdade natural** para receber, em troca, a **liberdade civil** e a **propriedade moral** de cidadão. A fórmula é:

> "Cada um de nós põe em comum a sua pessoa e toda a sua força sob a direção suprema da vontade geral; e recebemos cada membro como parte indivisível do todo."

Três palavras-chave para prova:

1. **Vontade geral** (*volonté générale*): não é a soma dos desejos individuais, nem o que a maioria quer hoje. É a vontade orientada para o bem comum, o interesse público.
2. **Soberania popular**: o poder supremo reside no povo. Não pode ser representado, apenas delegado — e sempre revogável.
3. **Igualdade**: o pacto só é legítimo se todos entregam tudo igualmente. Não pode haver privilégios no ato constituinte.

## O que é a vontade geral (e o que não é)

Aqui mora a confusão mais comum em prova. Rousseau distingue:

- **Vontade geral**: quer o bem de todos (o comum).
- **Vontade de todos**: quer o bem de cada um (a soma dos interesses particulares).

A vontade geral pode, sim, contrariar a vontade de todos. Um exemplo: impostos progressivos. A vontade de todos pode ser "ninguém paga imposto". A vontade geral é "quem tem mais contribui mais para manter o Estado". O segundo é legítimo; o primeiro destruiria a sociedade.

## Rousseau e a Constituição brasileira de 1988

A CF/88 é, em muitos artigos, uma tentativa de operacionalizar Rousseau:

- **Art. 1º**: Brasil é uma República. O poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente. É a soberania popular.
- **Art. 14**: cidadania. Todos podem votar, desde que reúnam as condições de lei. Rousseau exigiria mais: cidadão ativo, informado, participando.
- **Art. 1º, § 2º**: "Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos desta Constituição."
- **Art. 5º, caput**: igualdade perante a lei sem distinção. Ecoa o pacto igualitário.
- **Art. 1º, III**: dignidade da pessoa humana. Rousseau diria que só há Estado legítimo quando ele respeita a dignidade que o povo lhe confiou.

## O plebiscito, o referendo e a iniciativa popular

Rousseau era desconfiado da representação pura. Por isso, mecanismos de democracia direta são tão importantes no Brasil:

- **Plebiscito** (art. 14, § 3º): consulta prévia ao povo sobre matéria de relevância.
- **Referendo** (art. 14, § 1º): submissão ao povo de lei já editada pelo Congresso.
- **Iniciativa popular** (art. 14, § 3º): projeto de lei proposto pela sociedade.

Esses institutos são a tentativa de fazer a vontade geral falar além das eleições.

## As três frases que você precisa decorar

Bancas adoram Rousseau em **Filosofia do Direito**, **Direito Constitucional** e **Ética**. Guarde estas:

1. *"O homem nasce livre, e por toda a parte está acorrentado."* — abertura do livro I.
2. *"A vontade geral é sempre reta e tende sempre à utilidade pública."* — livro II, cap. III.
3. *"A soberania não pode ser representada; ela é essencialmente incommunicável."* — livro III, cap. XV.

## Por que Rousseau ainda explica o Brasil de 2026

Abra qualquer noticiário jurídico. Você vai encontrar Rousseau escondido nos debates:

- **Reforma tributária**: é justo que quem tem mais pague mais? A resposta depende de como você define vontade geral.
- **Mensalão, Lava Jato e julgamentos políticos**: quando representantes traem o mandato, violam o contrato social.
- **Participação social em políticas públicas**: conselhos, audiências públicas, orçamento participativo — tudo é tentativa de realizar a cidadania ativa.
- **Judicialização da política**: quando o STF decide questões sociais, o debate é exatamente sobre quem fala em nome da vontade geral.

## Como ler (e onde encontrar)

- O livro é curto: **quatro livros**, capítulos pequenos. Dá para ler em um fim de semana.
- A tradução clássica para o português é a de **Lourdes Santos Machado** (Ed. Nova Cultural) e a mais recente, comentada, é a de **José Cretella Jr.** (Ed. Revista dos Tribunais).
- Leia os capítulos **I, II e III do livro I** e **I a IV do livro II** — são os que mais caem.
- Compare com **Locke** (governo limitado) e **Hobbes** (autoridade absoluta para evitar a guerra). Rousseau está no meio: o Estado é forte, mas só porque é democrático.

## Para levar

Rousseau não escreveu um manual de Direito. Escreveu um **manual de legitimidade**. Ele pergunta, a cada página: por que alguém deveria obedecer ao Estado? E responde: só se o Estado for expressão da liberdade e da igualdade de quem nele vive.

Por isso, quando você estuda **Constitucional**, não está apenas decorando artigos. Está tentando responder, 236 anos depois, a mesma pergunta que Rousseau fez em 1762: **como construir uma sociedade onde ninguém seja obrigado a obedecer a quem não represente o bem comum?**

**Leia Rousseau.** Não para citar no TCC. Para entender o país em que você vive.`,
  },

  // ============================================================
  //  CATEGORIA: LEIS  — 3 posts manuais
  // ============================================================
  {
    id: 'leis-o-que-e-uma-lei',
    titulo: 'O que é uma lei? A regra que vale para todos (e por que ela vale)',
    resumo:
      'Você usa a palavra "lei" todo dia, mas sabe explicar em uma frase o que a torna diferente de uma ordem, de um contrato ou de um costume? Entenda em 6 minutos.',
    imagem_url: leiOQueEImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-17T09:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## Definição em uma frase

**Lei é a regra escrita, geral, abstrata e obrigatória, criada pelo poder competente segundo o processo previsto na Constituição.** Cada palavra dessa definição carrega peso — e é justamente essa combinação que separa a lei de um decreto do síndico, de uma ordem do chefe ou de um "sempre foi assim" da tradição.

## As quatro características que caem em prova

### 1. Generalidade
A lei não é feita para uma pessoa específica. Ela vale para **todos que se enquadrarem na hipótese descrita**. Se o art. 121 do Código Penal diz "matar alguém", vale para qualquer um que mate — não importa nome, cargo ou dinheiro.

### 2. Abstração
A lei descreve **situações hipotéticas**, não fatos concretos. Ela não diz "João matou Pedro em 12/03/2024"; ela diz "matar alguém, pena de 6 a 20 anos". É por isso que a mesma lei serve para casos que ainda vão acontecer.

### 3. Obrigatoriedade
Depois de publicada e em vigor, **ninguém pode alegar desconhecimento** (art. 3º da LINDB — Lei de Introdução às Normas do Direito Brasileiro). A obrigatoriedade não depende de você concordar; depende só de a lei existir validamente.

### 4. Origem no poder competente
Só é lei o que **o órgão certo criou pelo processo certo**. Uma norma que o Presidente edite invadindo matéria reservada ao Congresso não vira lei — vira ato inconstitucional.

## Lei em sentido formal x lei em sentido material

Dois conceitos que a doutrina adora e a banca cobra:

- **Sentido formal**: qualquer norma aprovada pelo processo legislativo (mesmo que trate de tema minúsculo, como criar um feriado municipal).
- **Sentido material**: qualquer regra geral e abstrata que rege condutas (mesmo que não seja formalmente "lei" — um decreto regulamentar, por exemplo).

Uma norma pode ser **lei em sentido formal E material** (o Código Civil), só em sentido formal (uma lei que dá nome a uma rua) ou só em sentido material (um regulamento executivo).

## De onde vem a força da lei?

Da **Constituição**. O art. 5º, II da CF/88 traz o princípio da legalidade:

> "Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei."

Essa frase muda tudo. Ela significa que:

- O Estado só pode te obrigar a algo se houver **lei** dizendo isso.
- Um decreto do prefeito, sozinho, **não pode criar uma nova obrigação** para o cidadão comum.
- Uma portaria do secretário **não pode inventar um novo tributo**.

## Lei x norma x regra x ato normativo — quem é quem

| Termo | O que é |
|---|---|
| **Constituição** | Norma suprema. Tudo o mais lhe deve obediência. |
| **Lei** (ordinária, complementar) | Norma geral aprovada pelo Legislativo. |
| **Medida provisória** | Ato do Presidente com força de lei, temporário. |
| **Decreto** | Ato do Executivo para regulamentar lei. |
| **Portaria / Resolução** | Ato administrativo interno. |

Nem toda norma é lei. Toda lei é norma. Guarde isso.

## Para levar

Lei é a maneira que uma sociedade democrática encontrou para trocar **força bruta** por **regra impessoal**. Quando você entende que a lei é geral, abstrata, obrigatória e nasce de um processo público, entende também por que a **legalidade** é o coração do Estado de Direito — e por que qualquer ataque a ela é, no fundo, um ataque à sua liberdade.`,
  },
  {
    id: 'leis-artigo-paragrafo-inciso-alinea',
    titulo: 'Artigo, parágrafo, inciso e alínea: como ler qualquer lei em 5 minutos',
    resumo:
      'A hierarquia interna de uma lei confunde muito estudante — e é a primeira coisa que a banca cobra. Domine a estrutura com exemplos do Código Civil e da Constituição.',
    imagem_url: leiEstruturaImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-17T10:00:00Z',
    tempo_leitura_min: 7,
    conteudo_md: `## A anatomia de uma lei

Toda lei brasileira segue a mesma arquitetura, prevista na **Lei Complementar nº 95/1998** — a "lei das leis". A ordem é sempre esta, do maior para o menor:

\`\`\`text
LIVRO   →   TÍTULO   →   CAPÍTULO   →   SEÇÃO   →   SUBSEÇÃO
                             ↓
                          ARTIGO (Art.)
                             ↓
              ┌──────────────┼──────────────┐
           CAPUT         PARÁGRAFO (§)   INCISO (I, II, III)
                             ↓                ↓
                       INCISO (I, II)     ALÍNEA (a, b, c)
                             ↓                ↓
                       ALÍNEA (a, b)      ITEM (1, 2, 3)
\`\`\`

## Peça por peça

### Artigo (Art.)
É a **unidade básica** da lei. Cada artigo trata de uma matéria específica. Numeração:
- **Do 1º ao 9º**: usa ordinal com "º" — Art. 1º, Art. 2º, Art. 9º.
- **A partir do 10**: usa cardinal — Art. 10, Art. 11, Art. 121.

### Caput
É o **texto principal** do artigo, aquele que vem logo depois do "Art. X". Vem do latim *caput* = cabeça. É a "cabeça" do artigo.

### Parágrafo (§)
Complementa, excepciona ou detalha o caput. Se houver **só um**, escreve-se "**Parágrafo único.**". Se houver mais de um, usa-se o símbolo "**§**": § 1º, § 2º, § 3º.

### Inciso
Vem depois do caput ou do parágrafo, quando é preciso **enumerar** situações. Usa **algarismos romanos**: I, II, III, IV, V.

### Alínea
Subdivide o inciso quando ele ainda precisa detalhar mais. Usa **letras minúsculas**: a), b), c).

### Item
A menor subdivisão. Usa **algarismos arábicos**: 1, 2, 3. Raro fora de leis muito técnicas.

## Exemplo real — Código Civil

Veja o **art. 1.723 do CC** desmontado:

- **Caput**: "É reconhecida como entidade familiar a união estável entre o homem e a mulher, configurada na convivência pública, contínua e duradoura e estabelecida com o objetivo de constituição de família."
- **§ 1º**: "A união estável não se constituirá se ocorrerem os impedimentos do art. 1.521; não se aplicando a incidência do inciso VI no caso de a pessoa casada se achar separada de fato ou judicialmente."
- **§ 2º**: "As causas suspensivas do art. 1.523 não impedirão a caracterização da união estável."

Note: o caput dá a regra, os parágrafos ajustam.

## Exemplo real — Constituição

O **art. 5º, XLVII da CF** mostra caput + inciso + alíneas:

- **Caput** (art. 5º): "Todos são iguais perante a lei…"
- **Inciso XLVII**: "não haverá penas:"
  - **Alínea a**: "de morte, salvo em caso de guerra declarada, nos termos do art. 84, XIX;"
  - **Alínea b**: "de caráter perpétuo;"
  - **Alínea c**: "de trabalhos forçados;"
  - **Alínea d**: "de banimento;"
  - **Alínea e**: "cruéis;"

## Como citar corretamente

- **Certo**: "art. 5º, XLVII, *a*, da CF/88"
- **Errado**: "artigo 5, item 47, letra A"

Ordem sempre: **artigo → parágrafo → inciso → alínea → item**, do maior para o menor, com a norma no fim.

## Dica de leitura rápida

Quando abrir um artigo denso, **leia primeiro o caput** para entender a regra geral. Só depois vá aos parágrafos (exceções e detalhes) e aos incisos (listas). Esse hábito sozinho reduz metade das confusões em prova.

## Para levar

Dominar a estrutura de uma lei é como aprender a ler música: depois que você entende as claves, qualquer partitura fica acessível. Artigo, parágrafo, inciso, alínea — três minutos de estudo hoje, e você lê o Código Civil, a CF e qualquer estatuto pelo resto da carreira sem tropeçar.`,
  },
  {
    id: 'leis-processo-legislativo-7-etapas',
    titulo: 'Quem cria as leis no Brasil? O processo legislativo em 7 etapas',
    resumo:
      'De um projeto no gabinete até a publicação no Diário Oficial: entenda cada passo do caminho que uma lei percorre — e onde ela pode morrer.',
    imagem_url: leiProcessoImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-17T11:00:00Z',
    tempo_leitura_min: 8,
    conteudo_md: `## O caminho de uma lei

No Brasil, uma **lei ordinária federal** percorre um trajeto que começa com uma folha em branco e termina no Diário Oficial da União. A Constituição de 1988 organiza esse caminho nos **arts. 59 a 69**. Vamos às 7 etapas essenciais.

## 1. Iniciativa — quem pode propor

A lei nasce de um **projeto de lei (PL)**. Só pode propô-lo quem a CF autoriza (art. 61):

- Qualquer **deputado federal** ou **senador**;
- **Comissões** da Câmara, do Senado ou do Congresso;
- O **Presidente da República**;
- O **STF**, tribunais superiores e o **PGR** (em matérias próprias);
- Os **cidadãos**, via **iniciativa popular** (art. 61, § 2º — mínimo de 1% do eleitorado nacional, distribuído por pelo menos 5 estados).

**Iniciativa privativa**: alguns temas só podem ser propostos por certas autoridades. Servidores públicos federais, por exemplo, só por iniciativa do Presidente da República (art. 61, § 1º).

## 2. Casa iniciadora — normalmente a Câmara

Regra geral: o projeto começa na **Câmara dos Deputados** (art. 64). Exceção: se o autor foi um senador, começa no **Senado**.

Na casa iniciadora, o PL passa por:
- **Comissões temáticas** (CCJ, Comissão de Educação, etc.) que dão parecer.
- **Comissão de Constituição e Justiça (CCJ)** que faz o controle de constitucionalidade.
- **Plenário**, se necessário.

Aprovado → segue para a outra casa.

## 3. Casa revisora — revisa e pode emendar

A casa revisora **discute e vota** o texto. Três desfechos possíveis:

- **Aprova como veio** → segue para sanção presidencial.
- **Emenda** (altera) → o projeto **volta** à casa iniciadora, que decide se aceita ou rejeita a alteração (art. 65, parágrafo único).
- **Rejeita** → o projeto é arquivado e só pode voltar na próxima sessão legislativa (art. 67).

## 4. Sanção ou veto — o Presidente decide

Aprovado nas duas casas, o projeto vai ao **Presidente da República**, que tem **15 dias úteis** para (art. 66):

- **Sancionar**: concordar. Silêncio nesses 15 dias = sanção tácita.
- **Vetar**: discordar, total ou parcialmente. O veto precisa ser **motivado** e por razões de **inconstitucionalidade** ou **contrariedade ao interesse público**.

## 5. Análise do veto pelo Congresso

Se houve veto, o Congresso reunido em **sessão conjunta** analisa em **30 dias** (art. 66, § 4º).

- **Rejeita o veto** (maioria absoluta dos deputados + senadores, votação secreta antes, hoje aberta) → o projeto vira lei mesmo assim.
- **Mantém o veto** → aquela parte não vira lei.

## 6. Promulgação

Aprovada e sancionada (ou com veto derrubado), a lei precisa ser **promulgada** — o ato que atesta sua existência e ordena seu cumprimento. Normalmente é feita pelo próprio Presidente da República. Se ele não promulgar em 48h, cabe ao **Presidente do Senado**; se este também não, ao **Vice-Presidente do Senado** (art. 66, § 7º).

## 7. Publicação e vigência

Promulgada, a lei é **publicada no Diário Oficial da União**. E entra em vigor:

- Na **data que ela mesma indicar**, se houver;
- Ou **45 dias após a publicação** (art. 1º da LINDB), no silêncio.

Esse período entre publicação e vigência chama-se **vacatio legis** — um "espaço de respiro" para que a sociedade conheça a nova regra antes de ter que cumpri-la.

## Tipos de lei — o que muda em cada uma

| Tipo | Aprovação | Para que serve |
|---|---|---|
| **Lei ordinária** | Maioria simples | Regra geral (a maioria das leis) |
| **Lei complementar** | Maioria absoluta | Temas que a CF exige (ex.: Código Tributário) |
| **Emenda constitucional** | 3/5 em 2 turnos, nas duas casas | Alterar a Constituição |
| **Medida provisória** | Presidente edita, Congresso confirma em 120 dias | Urgência e relevância |
| **Lei delegada** | Presidente, autorizado por resolução do Congresso | Rara |
| **Decreto legislativo** | Congresso, sem sanção | Matérias exclusivas do Legislativo |
| **Resolução** | Câmara, Senado ou Congresso | Assuntos internos |

## Para levar

Entender o processo legislativo é entender **onde a democracia acontece de verdade**: no debate, na comissão, no plenário, no veto, na derrubada do veto. Quando você acompanha uma pauta legislativa sabendo cada etapa, deixa de ser espectador do noticiário — e passa a ler o Brasil como quem lê a partitura de dentro.`,
  },
  {
    id: 'leis-vacatio-legis-quando-a-lei-comeca-a-valer',
    titulo: 'Vacatio legis: por que uma lei publicada hoje pode só valer daqui a meses',
    resumo:
      'Publicação não é vigência. Entenda o intervalo entre uma coisa e outra — e por que a LINDB criou esse "respiro" antes de qualquer nova regra pegar você.',
    imagem_url: leiVacatioImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-18T09:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## Publicada não é vigente

A confusão mais comum do estudante iniciante é achar que **lei publicada = lei em vigor**. Não é. Entre a publicação no Diário Oficial e o momento em que a lei realmente **obriga** você existe um intervalo — a **vacatio legis**.

## O que a LINDB diz

O art. 1º da **Lei de Introdução às Normas do Direito Brasileiro** (Decreto-Lei nº 4.657/1942) é claro:

> "Salvo disposição contrária, a lei começa a vigorar em todo o país 45 dias depois de oficialmente publicada."

Ou seja:

- Se a lei **não diz nada** sobre quando entra em vigor → **45 dias** após a publicação.
- Se a lei **fixa data** ("esta lei entra em vigor na data de sua publicação", "em 180 dias", "em 1º de janeiro do ano seguinte") → **vale a data da lei**.

## Para que serve esse "respiro"

A vacatio existe por três razões práticas:

1. **Conhecimento** — dar tempo à sociedade, aos advogados, aos juízes e à administração pública para ler e se organizar.
2. **Adaptação** — permitir que empresas, cartórios e órgãos ajustem sistemas, contratos e formulários.
3. **Segurança jurídica** — evitar surpresa: ninguém deve ser pego por uma regra que ainda nem circulou.

## Vacatio no estrangeiro

O art. 1º, § 1º da LINDB traz um caso especial: **para os brasileiros no exterior**, a lei brasileira entra em vigor **3 meses** após a publicação oficial, contados da data em que também são obrigados a cumpri-la no país.

## E se a lei for corrigida na vacatio?

Acontece com frequência: o Diário Oficial republica o texto com correções. Duas hipóteses (art. 1º, § 3º da LINDB):

- **Correção antes da vigência** → o prazo de vacatio **recomeça** a contar da nova publicação.
- **Correção depois da vigência** → a correção é considerada **lei nova**, com seu próprio prazo.

É por isso que republicações de texto "por incorreção" merecem atenção — elas podem reiniciar o cronômetro.

## Exemplos famosos de vacatio longa

| Lei | Vacatio |
|---|---|
| **Código Civil** (Lei 10.406/2002) | 1 ano |
| **Novo CPC** (Lei 13.105/2015) | 1 ano |
| **LGPD** (Lei 13.709/2018) | 24 meses (com prorrogações) |
| **Marco Civil da Internet** (Lei 12.965/2014) | 60 dias |

Códigos e leis complexas quase sempre ganham vacatio maior — a máquina precisa se preparar.

## Contagem: como fazer a conta certa

A vacatio é contada em **dias corridos**, incluindo o **dia da publicação** e o **dia da entrada em vigor**. Regra prática do art. 8º, § 1º da LC 95/98: a lei entra em vigor **no dia seguinte** ao término do prazo.

Exemplo: lei publicada em **1º de março** com vacatio de 45 dias entra em vigor em **15 de abril** (45 dias corridos contados a partir de 1º/3, incluindo o dia inicial).

## Detalhe para prova: "entra em vigor na data de sua publicação"

Essa cláusula é permitida — e comum em leis simples ou urgentes. Nesse caso, **não há vacatio**: a lei nasce vigente. Isso é constitucional? Sim. A LC 95/98 recomenda evitar vacatio zero em leis de grande impacto, mas não proíbe.

## Para levar

A vacatio é o momento em que a lei já **existe**, mas ainda não **manda**. Entender esse intervalo é entender por que a segurança jurídica não se reduz a "publicou, valeu": ela exige tempo, aviso e adaptação. Da próxima vez que uma lei importante for aprovada, olhe a última linha — é ali que mora a resposta sobre quando ela vai, de fato, mexer com a sua vida.`,
  },
  {
    id: 'leis-ordinaria-vs-complementar',
    titulo: 'Lei ordinária x lei complementar: a diferença que a maioria confunde',
    resumo:
      'As duas se chamam "lei", saem do mesmo Congresso e obrigam do mesmo jeito. Mas exigem votação diferente, tratam de temas diferentes — e uma não substitui a outra.',
    imagem_url: leiOrdComplImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-18T10:00:00Z',
    tempo_leitura_min: 7,
    conteudo_md: `## A dúvida clássica

Se as duas são "lei", vêm do Legislativo e obrigam a todos, **qual a diferença**? A resposta está em três eixos: **matéria**, **quórum** e **hierarquia** (essa última, mais delicada do que parece).

## 1. Matéria — só a Constituição decide

A **lei complementar** só pode ser usada quando a **própria Constituição** exige expressamente. Exemplos:

- **Código Tributário Nacional** (recepcionado como LC — art. 146, CF).
- **Estatuto da Magistratura** (art. 93, CF).
- **Criação de novos estados e municípios** (art. 18, § 2º, CF).
- **Regras sobre finanças públicas** (art. 163, CF — LC 101/2000, a "Lei de Responsabilidade Fiscal").

Já a **lei ordinária** é a regra geral: cuida de tudo aquilo que a CF **não reservou** para outra espécie normativa. É a lei do dia a dia — Código Penal, Código Civil, Lei Maria da Penha, Estatuto do Idoso, ECA.

**Regra de ouro**: se a CF disser "lei complementar disporá…", é LC. Se disser só "a lei disporá…", é lei ordinária.

## 2. Quórum de aprovação — o número que muda tudo

Aqui está a diferença mais cobrada em prova (art. 47 e 69 da CF):

| Tipo | Quórum |
|---|---|
| **Lei ordinária** | **Maioria simples** — mais da metade dos presentes, desde que haja quórum de deliberação (maioria absoluta dos membros). |
| **Lei complementar** | **Maioria absoluta** — mais da metade **do total** de membros da casa. |

Na Câmara (513 deputados): LC precisa de **no mínimo 257 votos**. LO precisa da maioria dos presentes na sessão.

## 3. Hierarquia — o mito da superioridade

Muita gente pensa que **LC é "mais forte" que LO**. **Não é bem assim**. O STF firmou entendimento (ADI 4.071 e outros) de que **não há hierarquia formal** entre lei ordinária e lei complementar. O que existe é **campo material reservado**:

- LO **não pode** invadir tema reservado à LC → se invadir, é inconstitucional.
- LC **pode** tratar de tema de LO, mas quando o faz, **é tratada materialmente como lei ordinária** e pode ser revogada por outra LO posterior.

Exemplo real: a **LC 70/91** (COFINS) tratou de matéria que a CF não reservava a LC. O STF entendeu que aquela parte era formalmente LC, mas materialmente LO — e podia ser alterada por lei ordinária.

## 4. Iniciativa — quem pode propor

Praticamente as mesmas pessoas (art. 61 da CF): deputados, senadores, comissões, Presidente, STF, tribunais superiores, PGR e o povo (iniciativa popular). A diferença está no **quórum de aprovação**, não em quem propõe.

## 5. Sanção, veto e promulgação

**Iguais**. Ambas seguem o mesmo trâmite após a aprovação: vão à sanção presidencial (15 dias úteis), podem ser vetadas total ou parcialmente, o veto pode ser derrubado pelo Congresso e depois vêm promulgação e publicação.

## Tabela-resumo

| Item | Lei ordinária | Lei complementar |
|---|---|---|
| Matéria | Residual (o que a CF não reservou) | Só quando a CF exige |
| Quórum | Maioria simples | Maioria absoluta |
| Numeração | Lei nº XXX | Lei Complementar nº XXX |
| Hierarquia | Igual | Igual (só reserva material) |
| Revogação | Por lei ordinária ou complementar posterior | Só por LC posterior (nas matérias reservadas) |

## Um erro comum

Chamar a **CLT** (Decreto-Lei 5.452/43) ou o **Código Penal** (Decreto-Lei 2.848/40) de "lei ordinária" é impreciso — são **decretos-lei** recepcionados pela CF/88 com força de lei ordinária. Já a **LRF** (LC 101/2000) é LC porque o art. 163 da CF exige.

## Para levar

Lei ordinária e lei complementar são **duas ferramentas diferentes na mesma caixa**. Uma serve para o cotidiano; a outra, para os temas que a Constituinte considerou tão delicados que quis exigir consenso maior. Entender **quando cada uma cabe** é entender por que algumas discussões no Congresso precisam de 257 votos e outras se resolvem com muito menos — e por que essa diferença, no fim, protege a estabilidade do sistema.`,
  },
  {
    id: 'leis-revogacao-expressa-tacita',
    titulo: 'Revogação de leis: quando uma lei mata a outra (e quando só a fere)',
    resumo:
      '"Revogam-se as disposições em contrário" é a frase mais mal compreendida do Direito. Entenda revogação expressa, tácita, ab-rogação e derrogação em 5 minutos.',
    imagem_url: leiRevogacaoImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-18T11:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## A vida útil de uma lei

Toda lei nasce para durar — mas não para sempre. Ela pode **perder vigência** de dois jeitos: por **prazo determinado nela mesma** (raro) ou, muito mais comumente, por **revogação**. A LINDB (art. 2º) e a LC 95/98 (art. 9º) traçam as regras.

## Duas maneiras de revogar

### Revogação expressa
A lei nova **diz claramente** quais leis (ou artigos) revoga. Exemplo real, do art. 2.045 do **Código Civil de 2002**:

> "Revogam-se a Lei nº 3.071, de 1º de janeiro de 1916 — Código Civil — e a Parte Primeira do Código Comercial…"

Não sobra dúvida: o CC/1916 morreu naquele instante.

### Revogação tácita
A lei nova **não menciona** a antiga, mas é **incompatível** com ela — ou regula **inteiramente** a mesma matéria. O art. 2º, § 1º da LINDB traz três hipóteses:

1. Lei posterior **declara expressamente** revogada a anterior.
2. Lei posterior **é incompatível** com a anterior.
3. Lei posterior **regula inteiramente** a matéria da anterior.

Nas duas últimas, a revogação é **tácita** — silenciosa.

## Ab-rogação x derrogação

Termos que assustam, mas são simples:

- **Ab-rogação** = revogação **total** da lei. A norma antiga inteira vai embora.
- **Derrogação** = revogação **parcial**. Só alguns artigos ou parágrafos caem; o resto continua vigente.

Exemplo de derrogação: se uma lei nova altera só o art. 5º de um estatuto, os outros continuam de pé.

## A frase "revogam-se as disposições em contrário"

Você já viu isso mil vezes no fim de leis. Desde a **LC 95/98** (art. 9º), essa fórmula é **desaconselhada**. A lei nova **deve especificar** o que revoga. Por quê?

- Porque "disposições em contrário" gera insegurança: quem decide o que é contrário? O juiz, caso a caso.
- Porque força o intérprete a fazer o trabalho que o legislador deveria ter feito.

Ainda assim, a fórmula continua aparecendo — e vale juridicamente. É apenas **má técnica legislativa**.

## Repristinação — a lei que ressuscita?

**Cenário**: a Lei A é revogada pela Lei B. Depois, a Lei B é revogada pela Lei C. **A Lei A volta a valer automaticamente?**

**Resposta**: **não** (art. 2º, § 3º da LINDB). No Brasil, **a repristinação só ocorre se a lei nova disser expressamente**. Sem menção → a lei antiga permanece morta.

## Efeito repristinatório no controle de constitucionalidade

Cuidado com o pega: se o STF declara **inconstitucional** uma lei que havia revogado outra, a lei antiga **volta a valer** (efeito repristinatório da decisão), salvo modulação. Isso é diferente da repristinação da LINDB — é consequência do vício de origem da lei revogadora.

## Lei geral x lei especial — coexistência

Uma lei **especial posterior** não revoga a lei **geral anterior** só por tratar do mesmo assunto. As duas convivem: a geral vale para o resto; a especial, para os casos específicos. Vice-versa: lei **geral posterior** também não revoga automaticamente lei **especial anterior** (princípio da especialidade — art. 2º, § 2º da LINDB).

Exemplo clássico: o **Código de Defesa do Consumidor** (Lei 8.078/90) é especial em relação ao Código Civil. As duas convivem, e o CDC prevalece nas relações de consumo.

## Tabela-resumo

| Situação | O que acontece |
|---|---|
| Lei B revoga expressamente Lei A | Lei A morre |
| Lei B regula tudo que Lei A regulava | Lei A morre (tácita) |
| Lei B contraria Lei A em ponto específico | Lei A morre **nesse ponto** (derrogação) |
| Lei C revoga Lei B (que revogara Lei A) | Lei A **NÃO volta** sozinha |
| Lei especial posterior + lei geral anterior | Convivem, cada uma no seu campo |

## Para levar

Revogar é o modo civilizado de o Direito se atualizar. Uma lei nova não "briga" com a antiga — ela ocupa o espaço. Mas para o operador do Direito, saber **quando** uma norma foi revogada, **como** e **até onde** é a diferença entre citar um artigo vivo e citar um cadáver jurídico. E, em petição, citar um cadáver custa caro.`,
  },
  {
    id: 'leis-principio-legalidade-reserva-legal',
    titulo: 'Legalidade x reserva legal: o princípio que segura o Estado — e a diferença que cai em prova',
    resumo:
      'Todo mundo cita o art. 5º, II da CF. Mas a legalidade tem duas faces — uma larga e uma estreita — e confundir as duas é errar a questão inteira.',
    imagem_url: leiLegalidadeImg,
    tema: 'Leis',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-18T12:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## A frase que sustenta a democracia

O art. 5º, II da Constituição é curto e devastador:

> "Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei."

Essa frase é o **princípio da legalidade**. Sem ela, o Estado poderia te obrigar a qualquer coisa por decreto, portaria ou humor. Com ela, **só a lei** — aprovada pelo Congresso, sancionada, publicada — pode criar obrigação nova.

## Legalidade em sentido amplo (para o particular)

Para o **cidadão comum**, o princípio funciona assim:

- **Pode tudo** que a lei **não proíbe**.
- **Só é obrigado** ao que a lei **exige**.

É a **autonomia da vontade**. Se a lei não me proíbe de vender pão a R\$ 100, posso vender (mesmo que ninguém compre).

## Legalidade em sentido estrito (para o Estado)

Para a **Administração Pública**, o princípio inverte:

- Só pode fazer **o que a lei autoriza**.
- Não pode agir por "achismo", por "conveniência" desamparada, por preferência pessoal do gestor.

É o **princípio da legalidade administrativa** (art. 37, caput, CF). O agente público é servo da lei, não senhor dela. Se a lei não previu, ele não pode inventar.

## Reserva legal — a versão "reforçada"

Aqui está a diferença que a banca ama cobrar. Alguns temas são tão sensíveis que a CF exige **lei** — em sentido formal, aprovada pelo Legislativo — para tratar deles. **Nem medida provisória serve** em muitos casos.

Exemplos de matérias sob **reserva legal**:

- **Crimes e penas** (art. 5º, XXXIX — "não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal"). O famoso *nullum crimen, nulla poena sine praevia lege*.
- **Tributos** (art. 150, I — só lei cria ou aumenta tributo).
- **Restrição a direitos fundamentais** (só por lei formal, e ainda assim com limites).

**Legalidade genérica**: pode ser satisfeita por qualquer norma jurídica válida (lei, MP, decreto autorizado).

**Reserva legal**: só se satisfaz com **lei em sentido estrito** (LO, LC ou, em alguns casos, MP — quando cabível).

## Reserva legal absoluta x relativa

Mais uma camada:

- **Reserva legal absoluta**: a lei tem que **regular tudo**. Não pode delegar detalhes ao Executivo. Exemplo: definição de crime.
- **Reserva legal relativa**: a lei traça os **contornos essenciais** e permite que **regulamento** (decreto do Executivo) preencha detalhes técnicos. Exemplo: definição de infrações administrativas de trânsito, cujo detalhamento fica em resolução do CONTRAN.

## O art. 84, VI da CF — decreto autônomo?

A EC 32/2001 permitiu ao Presidente **editar decretos** sobre:

- Organização da administração federal (**sem aumentar despesa**).
- Extinção de cargos vagos.

São os chamados **decretos autônomos** — hipótese excepcional em que o Executivo cria norma sem lei prévia. Fora dessas duas hipóteses, decreto sempre é **regulamentar** (só regulamenta lei existente).

## Legalidade estrita no Direito Tributário

O princípio ganha nome próprio no tributário: **legalidade estrita** ou **tipicidade fechada**. A lei precisa definir com precisão:

- **Fato gerador**
- **Base de cálculo**
- **Alíquota**
- **Sujeito passivo**

Se a lei deixar qualquer desses pontos em aberto, o tributo é inconstitucional. É por isso que o **art. 150, I da CF** (proibição de tributo sem lei) é praticamente um mantra da OAB.

## Tabela-resumo

| Conceito | Onde se aplica | Basta o quê? |
|---|---|---|
| Legalidade (art. 5º, II) | Cidadão comum | Qualquer norma jurídica |
| Legalidade administrativa (art. 37) | Administração Pública | Autorização em lei |
| Reserva legal | Crime, tributo, direitos fundamentais | Lei em sentido formal |
| Reserva legal absoluta | Matéria penal | Só lei, sem delegação |
| Reserva legal relativa | Infrações administrativas | Lei + regulamento |

## Para levar

Legalidade não é detalhe técnico — é o **muro** que separa o Estado democrático do arbítrio. Quando você entende que o princípio muda de "pode tudo que a lei não proíbe" (para o cidadão) para "só pode o que a lei autoriza" (para o Estado), entende também por que a Constituição de 1988 gasta tanto tempo repetindo, em vários artigos, a mesma exigência: **lei, lei, lei**. Não é redundância — é blindagem.`,
  },
  {
    id: 'o-que-e-direito-guia-honesto-para-iniciantes',
    titulo: 'O que é Direito? O guia honesto para quem está começando a estudar',
    resumo:
      'Antes de decorar artigo, entenda o que é Direito de verdade: a diferença entre lei, moral e ética, os ramos que você vai estudar e como não se perder no primeiro semestre.',
    imagem_url: oQueEDireitoImg,
    tema: 'Iniciantes',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-24T10:00:00Z',
    tempo_leitura_min: 8,
    conteudo_md: `## Antes de decorar artigo, entenda o jogo

Todo semestre chegam à faculdade milhares de alunos convencidos de que estudar Direito é **decorar leis**. Não é. Decorar lei é o que o Google faz. **Estudar Direito é aprender a pensar dentro de um sistema de regras que regula a convivência humana** — e esse sistema tem lógica, história e vocabulário próprios.

Este guia é para você que está no **primeiro semestre**, ou pensando em entrar, e quer começar sem se perder.

## 1. Afinal, o que é Direito?

Existem centenas de definições. Guarde uma simples e correta:

> **Direito é o conjunto de normas que a sociedade cria para organizar a convivência e resolver conflitos, com o poder de ser cobrado à força pelo Estado.**

Três palavras importam nessa frase:

- **Normas**: regras de conduta (você deve, você pode, você não pode).
- **Sociedade**: o Direito só existe onde há mais de uma pessoa. Robinson Crusoé sozinho na ilha não precisa de Direito.
- **Força**: essa é a diferença crucial. Moral cobra com culpa. Religião cobra com pecado. **Direito cobra com o Estado batendo na sua porta.**

## 2. Direito, moral e ética: a confusão que derruba aluno na prova

Bancas adoram misturar esses três conceitos. Fixe agora:

| Conceito | O que regula | Como é cobrado |
|---|---|---|
| **Moral** | O que é bom/ruim para o indivíduo e o grupo | Consciência, culpa, reprovação social |
| **Ética** | Reflexão filosófica sobre a moral | Argumento racional |
| **Direito** | Convivência mínima obrigatória | Sanção estatal (multa, prisão, execução) |

Trair a namorada é imoral, mas não é crime. Não pagar imposto é ilegal, mesmo que você ache moralmente justo. **Direito e moral se tocam, mas não se confundem.**

## 3. Os grandes ramos do Direito (o mapa que ninguém te dá)

O Direito se divide em dois grandes hemisférios:

### Direito Público
Quando o Estado é parte da relação.

- **Constitucional** — a lei que organiza o Estado e garante direitos fundamentais.
- **Administrativo** — como o Estado age (licitação, servidor, ato administrativo).
- **Penal** — quais condutas são crime e qual pena aplicar.
- **Processual (Penal e Civil)** — como o Estado julga.
- **Tributário** — quanto e como o Estado cobra imposto.

### Direito Privado
Quando particulares tratam entre si.

- **Civil** — contratos, família, sucessões, obrigações, propriedade. É o *coração* da faculdade.
- **Empresarial** — sociedades, títulos de crédito, falência.
- **Do Trabalho** — relação entre empregado e empregador (fica no meio-termo, mas é normalmente estudado no privado).

Nos primeiros semestres você vai encarar **Introdução ao Direito, Constitucional, Civil I e Penal I**. Encare como o alicerce: se você travar aqui, trava o curso inteiro.

## 4. As três palavras que você vai ouvir todo dia

- **Norma**: qualquer regra jurídica (uma lei, um artigo, uma cláusula de contrato).
- **Instituto**: um conjunto organizado de normas sobre um mesmo assunto (o "instituto do casamento", o "instituto da posse").
- **Princípio**: a ideia-mãe que orienta várias normas (dignidade da pessoa humana, legalidade, boa-fé).

Se você entender essa hierarquia — **princípios > normas específicas > casos concretos** —, você já entendeu 30% da faculdade.

## 5. Cinco erros clássicos do primeiro semestre

1. **Achar que estudar é grifar o Vade Mecum.** Ler artigo sem entender o contexto é decorar telefonema. Estude o *conceito*, depois volte à letra da lei.
2. **Ignorar Filosofia e Sociologia do Direito.** Bancas de OAB e concurso adoram cobrar. E, mais importante: sem elas você vira técnico, não jurista.
3. **Confundir aula com estudo.** Assistir aula é 20% do trabalho. O outro 80% é resumir, revisar e fazer questão.
4. **Não fazer questão desde o primeiro semestre.** Você não aprende Direito lendo — aprende **resolvendo**. Comece cedo, mesmo que erre tudo.
5. **Deixar Português de lado.** A prova da OAB e do concurso é escrita. Quem não redige bem, não passa.

## 6. Como estudar de verdade (método de 4 passos)

1. **Leia o conceito** em um manual leve (Marcus Vinicius Rios Gonçalves, Cleber Masson, Pedro Lenza — os "amigáveis").
2. **Abra o Vade Mecum** e leia o artigo correspondente. Sublinhe *depois* de entender.
3. **Faça 5 questões** sobre o tema (Cebraspe, FGV, banca da sua faculdade).
4. **Ensine em voz alta** para uma parede, um colega ou o gato. Se você consegue explicar, você sabe.

Repita esse ciclo por tema. Em um semestre você tem uma base que 80% da sua turma não tem.

## 7. Frases para levar

- "O Direito não é o que a lei diz. É o que os tribunais e a sociedade fazem com o que a lei diz."
- "Advogado que só sabe lei é como médico que só sabe bula."
- "Decorar sem entender é ganhar tempo hoje para perder tempo o resto da vida."

## Para levar

Estudar Direito é entrar num sistema que **existe há mais de 2.500 anos** e que ainda hoje sustenta a convivência entre bilhões de pessoas. Você não precisa saber tudo no primeiro semestre — precisa apenas entender o **mapa**. Este texto é o seu mapa. A partir daqui, o curso é caminhar.

Bem-vindo ao Direito. Ele é mais interessante do que parece, e mais difícil do que você imagina — e é exatamente essa a graça.`,
  },
  {
    id: 'o-que-e-jurisprudencia',
    titulo: "O que é jurisprudência? O direito que nasce das decisões",
    resumo: "A lei diz o que é proibido — mas quem diz o que a lei quer dizer? A jurisprudência é a resposta dos tribunais, repetida vezes o suficiente para virar regra.",
    imagem_url: juris01Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T09:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## Um exemplo antes da definição

Imagine que a lei diz apenas: **"É proibido dirigir em alta velocidade."** Quanto é "alta"? 80? 100? 140? Sem um número, cada juiz decidiria de um jeito — e o cidadão nunca saberia o que esperar. Quando **vários tribunais**, ao longo de anos, decidem que "alta velocidade" começa em 20% acima do limite da via, essa **decisão repetida** vira o padrão. Isso é jurisprudência.

## Definição

**Jurisprudência** é o conjunto de decisões reiteradas dos tribunais sobre um mesmo tema. Não é *uma* sentença isolada — é o **padrão** que emerge quando o Judiciário repete a mesma resposta várias vezes.

> Lei = texto abstrato.
> Jurisprudência = como esse texto foi entendido, aplicado e refinado pelos juízes ao longo do tempo.

## Por que ela existe

- **A lei é geral, a vida é específica.** Nenhum legislador consegue prever cada caso.
- **O idioma é ambíguo.** Palavras como "razoável", "boa-fé", "urgente" precisam de interpretação.
- **A sociedade muda.** A CF/88 é a mesma desde 1988; a internet, o Pix e o casamento homoafetivo não existiam. Coube à jurisprudência preencher esses vazios.

## Onde ela mora

- **Acórdãos** — decisões colegiadas de tribunais (TJ, TRF, STJ, STF).
- **Súmulas** — enunciados curtos que resumem o entendimento consolidado.
- **Repositórios oficiais** — sites do STF, STJ, TST, TSE e informativos periódicos.

## Para que serve na prática

- **Advogado**: sustenta a petição ("a jurisprudência do STJ é firme no sentido de que...").
- **Juiz**: decide com previsibilidade e reduz o risco de reforma pelo tribunal.
- **Concurseiro e estudante**: cai em prova. Muito. Especialmente súmulas.
- **Cidadão**: sabe o que esperar quando um caso parecido com o dele chegar ao tribunal.

## Para levar

Jurisprudência é o **direito vivo**. A lei nasce no Congresso; a jurisprudência nasce todos os dias, nas mesas dos tribunais. Ler acórdãos e súmulas é acompanhar o direito acontecendo — e é assim que quem estuda a sério ganha profundidade.`,
  },
  {
    id: 'sumula-vinculante-precedente-diferenca',
    titulo: "Súmula, súmula vinculante e precedente: qual a diferença?",
    resumo: "Três palavras que parecem sinônimas — e não são. Entender a diferença entre elas separa o estudante médio do avançado.",
    imagem_url: juris02Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T10:00:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## O problema

Todo mundo já ouviu "súmula", "súmula vinculante" e "precedente" — e usa como se fossem a mesma coisa. Não são. Vamos separar.

## 1. Súmula (comum)

Enunciado curto que **resume o entendimento reiterado** de um tribunal.

- Aprovada pelos Ministros.
- **Persuasiva**, não obrigatória. Um juiz *pode* decidir contra — mas dificilmente vai, porque será reformado.
- Ex.: *Súmula 7 do STJ* — "A pretensão de simples reexame de prova não enseja recurso especial."

## 2. Súmula Vinculante

Uma criação da **EC 45/2004** (art. 103-A da CF). Só o **STF** pode editar.

- **Obrigatória** para todo o Judiciário **e** para a Administração Pública direta e indireta.
- Descumprir cabe **reclamação** direto ao STF.
- Ex.: *SV 11* — restringe o uso de algemas.

## 3. Precedente (à luz do CPC/2015)

Uma **única decisão qualificada** que serve de modelo obrigatório para casos futuros. Está no **art. 927 do CPC**.

São precedentes obrigatórios:
- Decisões do STF em controle concentrado de constitucionalidade;
- Súmulas vinculantes;
- Julgamentos em **repercussão geral** e **recursos repetitivos**;
- Súmulas do STF em matéria constitucional e do STJ em matéria infraconstitucional;
- Orientações do plenário/órgão especial dos tribunais.

## Tabela-resumo

| Instituto | Quem cria | Obriga? | Base |
| --- | --- | --- | --- |
| Súmula | Qualquer tribunal | Persuasiva | Regimento interno |
| Súmula Vinculante | STF | Judiciário + Adm. Pública | Art. 103-A CF |
| Precedente | Casos qualificados (art. 927) | Sim, com filtros | CPC/2015 |

## Para levar

- **Súmula comum** = "conselho forte."
- **Súmula vinculante** = "ordem de cima."
- **Precedente qualificado** = "modelo que trava o sistema."

Guarde essa hierarquia — cai em OAB, concurso e no dia a dia da prática.`,
  },
  {
    id: 'quem-cria-jurisprudencia-tribunais',
    titulo: "Quem cria a jurisprudência? STF, STJ, TST, TSE e os tribunais estaduais",
    resumo: "Nem todo tribunal fala sobre tudo. Entender quem decide o quê é o mapa que evita ler acórdão errado.",
    imagem_url: juris03Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T11:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## O sistema é dividido por matéria

O Judiciário brasileiro é uma **pirâmide especializada**. Cada tribunal tem sua matéria e sua palavra final.

## STF — Supremo Tribunal Federal

- Guardião da **Constituição**.
- Julga ADI, ADC, ADPF, RE com repercussão geral, HC contra tribunais superiores.
- Última palavra em **matéria constitucional**.

## STJ — Superior Tribunal de Justiça

- Guardião da **legislação federal infraconstitucional** (Código Civil, Penal, Processo, etc.).
- Julga REsp, uniformiza divergência entre tribunais.
- Última palavra em **lei federal**, exceto se houver questão constitucional.

## TST — Tribunal Superior do Trabalho

- Uniformiza a jurisprudência **trabalhista** (CLT, direito coletivo, competência da Justiça do Trabalho).
- Súmulas + Orientações Jurisprudenciais (OJs) = fonte diária do trabalhista.

## TSE — Tribunal Superior Eleitoral

- Uniformiza jurisprudência **eleitoral** (Código Eleitoral, Lei 9.504/97, propaganda, inelegibilidades).

## STM — Superior Tribunal Militar

- Última palavra em **crimes militares** (federais e, em alguns casos, estaduais).

## TRFs e TJs

- **TRFs** (5 regiões): recursos da Justiça Federal comum.
- **TJs** (26 estados + DF): recursos da Justiça Estadual. Cada TJ tem sua própria jurisprudência sobre direito local.

## Como saber onde procurar?

| Se a dúvida é sobre... | Consulte primeiro... |
| --- | --- |
| Constituição | STF |
| Lei federal (Civil, Penal, Processo) | STJ |
| CLT / trabalhista | TST |
| Eleição, propaganda, inelegibilidade | TSE |
| Lei estadual, taxa municipal | TJ do seu Estado |
| Recurso da Justiça Federal | TRF da sua região |

## Para levar

Buscar jurisprudência sem saber **de onde ela vem** é como pedir orientação médica ao dentista errado — ele pode até palpitar, mas não decide. Aprenda o mapa e você vai ao tribunal certo de primeira.`,
  },
  {
    id: 'sumulas-vinculantes-stf-obrigam-administracao',
    titulo: "Súmulas Vinculantes do STF: por que obrigam até a Administração Pública",
    resumo: "Poucas ferramentas jurídicas têm o alcance de uma SV. Descumprimento gera reclamação direta ao Supremo — e responsabilidade.",
    imagem_url: juris04Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T12:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## O nascimento

A Súmula Vinculante foi criada pela **EC 45/2004** e regulamentada pela **Lei 11.417/2006**. O objetivo: acabar com decisões contraditórias sobre a mesma questão constitucional que travavam o Judiciário.

## Base constitucional — art. 103-A da CF

> "O Supremo Tribunal Federal poderá, de ofício ou por provocação, mediante decisão de dois terços dos seus membros, após reiteradas decisões sobre matéria constitucional, aprovar súmula que, a partir de sua publicação (...), terá efeito vinculante em relação aos demais órgãos do Poder Judiciário e à administração pública direta e indireta, nas esferas federal, estadual e municipal."

## Requisitos

1. **2/3 dos Ministros** (mínimo 8 dos 11).
2. Baseada em **reiteradas decisões** sobre matéria constitucional.
3. **Publicação oficial** — só a partir daí vincula.

## Efeitos

- **Judiciário**: nenhum juiz pode decidir contra.
- **Administração Pública**: prefeituras, autarquias, INSS, Receita Federal — todos obrigados.
- **Descumprimento**: cabe **reclamação constitucional** direto ao STF (art. 103-A, §3º).

## Exemplos importantes

- **SV 11** — algemas só em situações justificadas.
- **SV 13** — proibição do nepotismo em qualquer Poder.
- **SV 14** — direito do defensor de acesso aos autos de investigação já documentados.
- **SV 25** — ilícita a prisão civil do depositário infiel.
- **SV 47** — jurisdição prevalente da lei federal em conflito com lei local.

## Revisão e cancelamento

A própria SV pode ser **revista ou cancelada** pelo mesmo quórum de 2/3 (art. 103-A, §2º). Não é imutável — muda com a Constituição, com a sociedade e com o próprio STF.

## Para levar

Súmula Vinculante é o **atalho definitivo**: quando existir uma, você não precisa provar tudo de novo. Basta citar, pedir aplicação e, se descumprida, reclamar ao STF. É o instrumento mais rápido de um advogado bem preparado.`,
  },
  {
    id: 'sumulas-stj-uniformizando-lei-federal',
    titulo: "Súmulas do STJ: uniformizando a lei federal em todo o país",
    resumo: "Sem o STJ, cada Estado interpretaria o Código Civil de um jeito. Com ele, o Brasil tem uma única resposta — a súmula.",
    imagem_url: juris05Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T13:00:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## A missão do STJ

O STJ nasceu com a **CF/88** (art. 105) para uniformizar a interpretação da **lei federal infraconstitucional**. Sem essa uniformização, o mesmo artigo do Código Civil valeria de um jeito em SP e de outro no PA.

## O que é uma súmula do STJ

Um enunciado aprovado pela **Corte Especial** ou pelas **Seções** (Primeira, Segunda ou Terceira). Cada Seção cuida de matérias específicas:

- **1ª Seção** — Direito Público (tributário, administrativo, previdenciário).
- **2ª Seção** — Direito Privado (civil, empresarial, consumidor).
- **3ª Seção** — Direito Penal.

## Diferença para a Súmula Vinculante

| Aspecto | Súmula STJ | Súmula Vinculante STF |
| --- | --- | --- |
| Matéria | Lei federal | Constituição |
| Vinculante? | Persuasiva* | Sim, obrigatória |
| Órgão | STJ | STF |
| Descumprimento | Recurso ordinário | Reclamação ao STF |

\* Muitas súmulas do STJ têm efeito **prático quase vinculante**, porque cair no STJ, se o tribunal inferior contrariá-la, o resultado é reforma.

## Exemplos que aparecem toda hora

- **Súmula 7 do STJ** — "A pretensão de simples reexame de prova não enseja recurso especial."
- **Súmula 297** — "O CDC é aplicável às instituições financeiras."
- **Súmula 385** — "Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral, quando preexistente legítima inscrição, ressalvado o direito ao cancelamento."
- **Súmula 568** — "O relator, monocraticamente e no STJ, poderá dar ou negar provimento ao recurso quando houver entendimento dominante..."

## Como consultar

- Site oficial do STJ → "Jurisprudência" → "Súmulas".
- Ferramentas como o **Vade Mecum digital OAB na Risca** trazem todas as 700+ súmulas integradas.

## Para levar

Se o caso envolve **lei federal**, sua primeira parada é a súmula do STJ. Ela costuma dar a resposta em uma linha — e economiza páginas de argumentação.`,
  },
  {
    id: 'informativos-jurisprudencia-como-ler',
    titulo: "Informativos de jurisprudência: como ler e por que caem em prova",
    resumo: "Os informativos são o \"resumão\" oficial dos tribunais. Quem lê semanalmente sai na frente em concursos e OAB.",
    imagem_url: juris06Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T14:00:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## O que é um informativo

É um **boletim periódico** publicado pelos tribunais superiores com os **julgados mais relevantes** da semana ou quinzena. Não é vinculante — é **informativo** (o nome diz). Mas anuncia o que **vai virar súmula** ou tendência.

## Quem publica

- **STF** — Informativo do STF (semanal, numerado).
- **STJ** — Informativo do STJ (quinzenal).
- **TST**, **TSE**, **TRFs** — cada um com seu próprio.

## Estrutura típica de um verbete

Todo verbete de informativo tem mais ou menos essa estrutura:

- **Tema** — matéria e ramo do direito.
- **Destaque** — a tese em uma frase.
- **Informações do inteiro teor** — resumo dos fatos e da fundamentação.
- **Referência legislativa** — artigos aplicados.
- **Processo** — número e órgão julgador.

## Por que cair em prova

- Bancas (Cebraspe, FGV, FCC, VUNESP) **adoram** cobrar informativos recentes — sinaliza que o candidato acompanha o dia a dia dos tribunais.
- Os últimos **12 meses** são os mais cobrados.
- Em concursos de magistratura, MP e AGU, os informativos são leitura **obrigatória**.

## Como estudar sem enlouquecer

1. **Leia semanalmente** — 15 min por informativo é suficiente.
2. **Marque temas frequentes** — direito penal, previdenciário e tributário são campeões de cobrança.
3. **Cruze com súmulas** — muitos verbetes viram súmula depois.
4. **Faça flashcards** — tese em uma frase, na frente do card; base legal, atrás.

## Para levar

Informativo é o **radar da jurisprudência**. Quem lê acompanha os tribunais em tempo real; quem não lê descobre o novo entendimento tarde — normalmente, no gabarito da prova.`,
  },
  {
    id: 'jurisprudencia-em-teses-stj-guia',
    titulo: "Jurisprudência em Teses (STJ): o guia rápido para petições e provas",
    resumo: "Um produto pouco conhecido — e absurdamente útil. Cada edição sintetiza dezenas de teses do STJ sobre um único tema.",
    imagem_url: juris07Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T15:00:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## O que é

**"Jurisprudência em Teses"** é uma publicação do STJ que reúne, em cada edição, **10 a 15 teses** consolidadas sobre um único tema, com o **precedente representativo** de cada uma. É produzido pela Secretaria de Jurisprudência do STJ.

## Por que é tão útil

- **Pesquisa em segundos**: em vez de ler 30 acórdãos, você lê 15 teses prontas.
- **Cada tese vem citada** com REsp, AgRg, EDcl representativos → base sólida para petição.
- **Atualizado**: já são mais de **280 edições**, cobrindo desde alimentos até tributário.

## Como ler uma edição

Toda edição segue o mesmo formato:

- **Título** — o tema (ex.: "Direito do Consumidor — Bancos de Dados").
- **Teses numeradas** — cada uma em uma frase autoexplicativa.
- **Precedentes** — REsp/AgRg que consolidaram a tese.

## Exemplo prático (edição fictícia)

> **Tese 1** — Aplica-se o CDC às relações entre correntista e instituição financeira.
> *Precedentes: REsp 1.155.125/MG; Súmula 297/STJ.*

Você copia essa tese + o precedente e já tem argumento pronto.

## Como usar na petição

1. Identifique o tema.
2. Abra a edição de "Jurisprudência em Teses" correspondente.
3. Escolha 2–3 teses que sustentam seu pedido.
4. Cite: **"Nesse sentido, o STJ consolidou que 'aplica-se o CDC...' (Jurisprudência em Teses, edição X, tese 1)."**

## Como usar em concurso

- Bancas usam as teses **quase literalmente** em enunciados de múltipla escolha.
- Estudar as **últimas 30 edições** dá cobertura enorme.

## Para levar

Se o STJ escreveu, você usa. "Jurisprudência em Teses" é o **atalho oficial** — economiza tempo na pesquisa, blinda a peça e ainda cai em prova. Um dos melhores presentes do tribunal ao estudante e ao advogado.`,
  },
  {
    id: 'repercussao-geral-recursos-repetitivos',
    titulo: "Repercussão geral e recursos repetitivos: os \"temas\" que travam o Brasil inteiro",
    resumo: "Quando um único caso decide o destino de milhões de processos, ele vira um tema. Entenda como funciona esse gatilho.",
    imagem_url: juris08Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T16:00:00Z',
    tempo_leitura_min: 6,
    conteudo_md: `## O problema que a técnica resolve

Antes de 2004, o STF recebia **cem mil recursos por ano** sobre a mesma questão. Cada um era julgado individualmente. O sistema afundava.

A solução: escolher **um** caso, julgar, e **impor o resultado** a todos os outros. Nasceu a **repercussão geral** (STF) e depois os **recursos repetitivos** (STJ).

## Repercussão Geral — STF

- Base: **art. 102, §3º da CF** + arts. 1.035 e ss. do CPC.
- Requisito para o STF conhecer um Recurso Extraordinário.
- O relator, ao reconhecer a repercussão geral, **afeta o tema** e **suspende** todos os processos idênticos no Brasil.
- Julgado o mérito, o resultado é aplicado a todos os casos suspensos.
- Cada tema recebe um **número** (Tema 1.100, Tema 1.234...).

## Recursos Repetitivos — STJ

- Base: **arts. 1.036 a 1.041 do CPC**.
- Mesma lógica, aplicada a Recurso Especial.
- STJ **afeta** um ou mais casos representativos, suspende os demais, julga e propaga.

## Efeito prático

- O tema julgado vira **precedente obrigatório** (art. 927, III, CPC).
- Juízes e tribunais **devem** seguir. Se não seguirem, cabe **reclamação**.
- Advogados devem sempre **checar a lista de temas** antes de recorrer — se seu caso está afetado, o recurso pode ser **sobrestado** (parado) até o julgamento.

## Onde consultar

- STF: portal → "Repercussão Geral" → busca por tema.
- STJ: portal → "Recursos Repetitivos" → busca por tema.

## Curiosidade

Um único julgamento de tema pode **desafogar milhões de processos** ao mesmo tempo. Foi assim com o Tema 810 (correção monetária de precatórios) e o Tema 962 (Imposto de Renda sobre juros de mora).

## Para levar

Se aparecer a expressão **"Tema X do STF"** ou **"Tema Y do STJ"**, saiba: é um precedente **obrigatório**, com força de lei prática. Estudar os temas relevantes da sua área é obrigação — não opção.`,
  },
  {
    id: 'overruling-distinguishing-mudanca-jurisprudencia',
    titulo: "Overruling e distinguishing: quando a jurisprudência muda ou não se aplica",
    resumo: "A jurisprudência é estável — mas não é eterna. Duas técnicas explicam como e por que ela pode virar do avesso.",
    imagem_url: juris09Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T17:00:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## Por que precisamos dessas técnicas

O CPC/2015 quis estabilidade. Mas estabilidade não é petrificação. Precisamos de dois freios: um para **mudar** o precedente quando ele estiver errado (overruling), outro para **não aplicá-lo** quando o caso for diferente (distinguishing).

## Distinguishing — "meu caso é diferente"

O advogado mostra que o **precedente não se aplica** porque as **circunstâncias fáticas** do caso são distintas.

- Precedente: "O banco responde por saque indevido em ATM."
- Caso concreto: cliente entregou a senha ao filho, que fez o saque.
- Distinguishing: circunstância fática diferente → precedente não incide.

Base: **art. 489, §1º, V e VI, do CPC** — o juiz deve **demonstrar** a distinção.

## Overruling — "o precedente está superado"

O próprio tribunal **muda** o precedente por perceber que ele:

- foi construído em contexto normativo/social superado; ou
- é incompatível com a Constituição atual; ou
- gera resultados injustos generalizados.

Base: **art. 927, §§ 2º–4º, CPC** — mudança exige **fundamentação reforçada** e pode ter **modulação de efeitos** (o novo entendimento só vale daqui pra frente).

## Modulação de efeitos

Quando a mudança pega muita gente de surpresa, o tribunal pode dizer: "essa decisão só vale para os casos futuros". Protege a **segurança jurídica** — quem confiou no entendimento antigo não é punido.

## Exemplo real

O STF já mudou entendimento sobre execução provisória da pena após condenação em segunda instância **duas vezes**. Cada mudança envolveu **overruling** e discussão sobre modulação.

## Para levar

- **Distinguishing** = "meu caso é diferente."
- **Overruling** = "o precedente mudou."
- Dominar essas duas técnicas é **argumentação de elite**: separa o advogado que copia o texto pronto do que sabe quando fugir dele.`,
  },
  {
    id: 'como-citar-jurisprudencia-corretamente',
    titulo: "Como citar jurisprudência corretamente em petições e trabalhos",
    resumo: "Uma citação bem feita convence. Uma mal feita denuncia amadorismo. Este é o padrão que funciona no fórum e na banca.",
    imagem_url: juris10Img,
    tema: 'Jurisprudência',
    autor: 'Redação OAB na Risca',
    data_publicacao: '2026-07-20T18:00:00Z',
    tempo_leitura_min: 5,
    conteudo_md: `## Por que a forma importa

O juiz lê **milhares** de peças. Uma citação bem formatada mostra rigor, ajuda a localizar o precedente e blinda o argumento. Uma mal feita joga contra você.

## Elementos obrigatórios

Toda citação deve conter:

1. **Órgão julgador** (STF, STJ, TJ-SP, etc.).
2. **Classe processual + número** (REsp, RE, HC, ADI...).
3. **Relator** (Min./Des.).
4. **Órgão fracionário** (Primeira Turma, Corte Especial, Pleno).
5. **Data do julgamento** e da **publicação (DJe)**.

## Modelo (padrão STJ)

> STJ, REsp 1.737.428/RS, Rel. Min. Nancy Andrighi, Terceira Turma, j. 12/06/2018, DJe 15/06/2018.

## Modelo (padrão STF)

> STF, RE 574.706/PR, Rel. Min. Cármen Lúcia, Tribunal Pleno, j. 15/03/2017, DJe 02/10/2017.

## Modelo (súmula)

> Súmula 297 do STJ: "O Código de Defesa do Consumidor é aplicável às instituições financeiras."

## Citação em texto corrido

- **Direto**: transcreva entre aspas e dê a referência completa em nota ou entre parênteses.
- **Indireto**: parafraseie e cite o precedente ao final.

## Erros comuns (evite)

- Escrever "STJ decidiu que..." sem indicar **qual** processo.
- Copiar apenas a ementa sem conferir se ainda está **atual**.
- Ignorar **overruling** — o precedente pode já ter sido superado.
- Usar jurisprudência de tribunal **incompetente** para a matéria (ex.: TJ para uniformizar lei federal).

## Ferramentas que ajudam

- Pesquisas prontas oficiais do STF e STJ.
- Boletins de "Jurisprudência em Teses" (STJ).
- Vade Mecum digital com súmulas integradas.

## Para levar

Boa citação é **rigor + gentileza com o leitor**. O juiz consegue conferir em segundos, o revisor gosta, a banca respeita. Não é enfeite — é técnica.`,
  },
];

export const TEMAS: BlogTema[] = [
  'Iniciantes',
  'Filosofia',
  'Clássicos',
  'STF',
  'Curiosidades',
  'Leis',
  'Direito Constitucional',
  'Direito Penal',
  'Direito Civil',
  'Direito Administrativo',
  'Direito do Trabalho',
  'Direito Processual',
  'Direito Tributário',
  'Carreiras Jurídicas',
  'Atualidades Jurídicas',
  'Jurisprudência',
];

// Cada tema tem sua própria paleta — usada no card do blog e no carrossel da home
export const TEMA_COLORS: Record<BlogTema, { bg: string; chip: string; chipText: string; accent: string }> = {
  Filosofia:                { bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4c1d95 100%)', chip: '#a78bfa', chipText: '#1e1b4b', accent: '#c4b5fd' },
  STF:                      { bg: 'linear-gradient(135deg, #0c1e3d 0%, #14315e 60%, #1e40af 100%)', chip: '#60a5fa', chipText: '#0c1e3d', accent: '#93c5fd' },
  Curiosidades:             { bg: 'linear-gradient(135deg, #0f2e2a 0%, #134e48 60%, #0d9488 100%)', chip: '#5eead4', chipText: '#0f2e2a', accent: '#99f6e4' },
  'Clássicos':              { bg: 'linear-gradient(135deg, #2b0a0e 0%, #5c1a20 60%, #7f1d1d 100%)', chip: '#fca5a5', chipText: '#2b0a0e', accent: '#fecaca' },
  Leis:                     { bg: 'linear-gradient(135deg, #1c2e14 0%, #2f4a1f 60%, #4a6741 100%)', chip: '#a3b18a', chipText: '#1c2e14', accent: '#c9d5b8' },
  Iniciantes:               { bg: 'linear-gradient(135deg, #1a1408 0%, #3b2a12 60%, #6b3f1d 100%)', chip: '#f5c76a', chipText: '#1a1408', accent: '#efe0c4' },
  'Direito Constitucional': { bg: 'linear-gradient(135deg, #0a1a3d 0%, #12295c 60%, #1e3a8a 100%)', chip: '#93c5fd', chipText: '#0a1a3d', accent: '#bfdbfe' },
  'Direito Penal':          { bg: 'linear-gradient(135deg, #2b0a0a 0%, #5c1616 60%, #991b1b 100%)', chip: '#f87171', chipText: '#2b0a0a', accent: '#fecaca' },
  'Direito Civil':          { bg: 'linear-gradient(135deg, #0f1e3a 0%, #1e3a5f 60%, #1d4ed8 100%)', chip: '#93c5fd', chipText: '#0f1e3a', accent: '#c7d2fe' },
  'Direito Administrativo': { bg: 'linear-gradient(135deg, #1a1a1a 0%, #2f2f2f 60%, #52525b 100%)', chip: '#d4d4d8', chipText: '#1a1a1a', accent: '#e4e4e7' },
  'Direito do Trabalho':    { bg: 'linear-gradient(135deg, #2a1a05 0%, #57370e 60%, #b45309 100%)', chip: '#fbbf24', chipText: '#2a1a05', accent: '#fde68a' },
  'Direito Processual':     { bg: 'linear-gradient(135deg, #1a0e2e 0%, #3b1e5c 60%, #6d28d9 100%)', chip: '#c4b5fd', chipText: '#1a0e2e', accent: '#ddd6fe' },
  'Direito Tributário':     { bg: 'linear-gradient(135deg, #0e2a1f 0%, #1c5c42 60%, #059669 100%)', chip: '#6ee7b7', chipText: '#0e2a1f', accent: '#a7f3d0' },
  'Carreiras Jurídicas':    { bg: 'linear-gradient(135deg, #2a1a0a 0%, #5c3a1a 60%, #92400e 100%)', chip: '#fcd34d', chipText: '#2a1a0a', accent: '#fde68a' },
  'Atualidades Jurídicas':  { bg: 'linear-gradient(135deg, #0e1e2a 0%, #1e3a52 60%, #0369a1 100%)', chip: '#7dd3fc', chipText: '#0e1e2a', accent: '#bae6fd' },
  'Jurisprudência':         { bg: 'linear-gradient(135deg, #052e2b 0%, #064e3b 55%, #047857 100%)', chip: '#6ee7b7', chipText: '#052e2b', accent: '#a7f3d0' },
};

