/**
 * Utilitário Oficial de Design de Prompts Jurídicos do VACATIO APP
 * 
 * Define a identidade visual obrigatória para carrosséis e cards do Laboratório e Redes Sociais:
 * - Colagem editorial jurídica premium (papel rasgado, pergaminho, cutout com contorno branco grosso)
 * - Fundo Vermelho Padrão: linear-gradient(135deg, hsl(350 68% 32%) 0%, hsl(350 74% 42%) 50%, hsl(348 80% 50%) 100%)
 * - Textura jurídica sutil com linhas pretas finas semi-transparentes
 * - Composição com sujeito/cena principal posicionado à direita e respiro à esquerda
 * - Signos clássicos e filosóficos (tribunal, colunas gregas, balança, códigos, selos forenses)
 */

export const PROMPT_BASE_PADRAO_DESIGN = `PROMPT-BASE FIXO DE DESIGN
Use este bloco em todos os cards, sem mudar o estilo.
Crie um post de carrossel vertical 4:5, em estilo colagem editorial jurídica premium, com aparência semi-realista, forte identidade visual e leitura excelente para Instagram.

ESTILO VISUAL OBRIGATÓRIO
- adotar como linguagem principal um design de colagem recortada premium, inspirado em papel rasgado, pergaminho, cutout editorial e estética filosófica/clássica, sem cair em foto genérica pura;
- a imagem não deve ser fotorealista comum: ela deve parecer uma mistura sofisticada de ilustração semi-realista + colagem + textura editorial;
- usar como FUNDO VERMELHO PADRÃO o seguinte gradiente, reproduzindo visualmente suas três faixas e direção diagonal: linear-gradient(135deg, hsl(350 68% 32%) 0%, hsl(350 74% 42%) 50%, hsl(348 80% 50%) 100%);
- a capa e os cards principais devem preservar a base vermelha/escura da identidade; não criar card branco, moldura branca, folha branca ocupando o card inteiro nem fundo externo claro em volta da arte;
- este gradiente vermelho é a referência cromática fixa da identidade visual: começa em vermelho profundo, evolui para vermelho rubi mais vivo e termina em vermelho intenso/luminoso;
- sempre que o card usar fundo vermelho, manter essa mesma progressão 135° e não substituir por vinho apagado, bordô excessivamente escuro, marrom ou outro vermelho;
- sobre o fundo vermelho, permitir uma textura jurídica sutil com linhas pretas muito finas, discretas e semi-transparentes, apenas para dar charme e profundidade, sem pesar nem poluir;
- preservar contraste alto com branco/off-white, preto/grafite e elementos recortados;
- resgatar uma atmosfera antiga, intelectual, jurídica e filosófica, como páginas de estudo clássico, arquivos forenses, manuscritos, pergaminhos e colagem editorial histórica;
- não transformar o papel bege/pergaminho no fundo dominante do card inteiro; o pergaminho deve entrar como recorte complementar importante, etiqueta, bloco de apoio ou faixa de conteúdo, mantendo a base vermelha ou escura da identidade;
- manter visual refinado, jurídico, moderno e harmônico, com prioridade total para o minimalismo e sem poluição;
- o fundo pode receber linhas gráficas pretas muito finas e transparentes, com linguagem jurídica/editorial discreta, quase como marca d’água técnica, para enriquecer sem roubar atenção;
- usar grão de papel, textura de impressão, halftone sutil, detalhes de gravura/engraving, traços clássicos e linguagem de revista premium quando combinar;
- aprofundar o clima jurídico antigo: arquivos de tribunal, carimbos discretos, selos clássicos, ilustrações de colunas, páginas de códigos, diagramas forenses ou estampas de documentos históricos, sempre de forma sutil e elegante;
- cada elemento principal e secundário deve preferencialmente ter contorno branco grosso, visível e elegante, reforçando o efeito de recorte vazado;
- incluir recortes de papel rasgado com bordas irregulares e acabamento limpo, mas em quantidade contida e estratégica; usar menos recortes e deixar o layout respirar;
- quando houver bloco de texto de destaque, considerar colocá-lo dentro de pergaminho, papel rasgado, etiqueta antiga ou recorte de manuscrito, desde que continue bem legível e grande;
- evitar excesso de enfeites, excesso de recortes e excesso de microdetalhes; usar apenas o necessário para causar impacto;
- o resultado precisa ser minimalista, forte e autoral, sem parecer genérico; a sensação final deve ser limpa, elegante, culta, jurídica e fácil de entender à primeira olhada.

TIPOGRAFIA E TRATAMENTO DOS TÍTULOS
- a tipografia deve parecer mais jurídica, clássica e editorial, evitando aparência infantil, genérica ou moderna demais;
- preferir estética de serifas clássicas, letras com personalidade de documento jurídico antigo, título de livro, manchete editorial ou cartaz institucional elegante;
- evitar tipografia arredondada, divertida, cartoon, casual ou com cara de template genérico;
- os títulos podem ter contraste forte, pequenas sombras ou contorno sutil quando necessário, mas sem exagero;
- priorizar títulos imponentes, nobres e sóbrios, com ar de tribunal, código, livro jurídico ou peça histórica;
- quando usar blocos em pergaminho ou papel rasgado, a tipografia deve conversar com esse suporte e parecer parte de um material jurídico antigo refinado;
- o texto de apoio deve continuar muito legível, mas com acabamento mais editorial e menos “fonte digital comum”.

LEGIBILIDADE E HIERARQUIA DO TEXTO
- a leitura no celular é prioridade máxima;
- o título principal deve ser muito grande, dominante e de leitura instantânea;
- o texto complementar também deve ser grande o suficiente para leitura confortável; principalmente na capa, aumentar bem o tamanho da fonte do texto de apoio;
- nunca usar letras pequenas, comprimidas ou difíceis de ler;
- evitar blocos longos de texto;
- preferir frases curtas, poucos tópicos, boa separação e excelente respiro;
- cada card deve bater o olho e ser entendido rapidamente;
- cada card deve ter no máximo 2 blocos de texto visíveis: título principal e texto de apoio;
- evitar excesso de subtítulos, etiquetas, microchamadas e textos espalhados;
- o texto de apoio deve ter no máximo 3 a 5 linhas curtas;
- se a explicação não couber com conforto, resumir o conteúdo em vez de diminuir a fonte;
- o texto nunca deve virar textura visual;
- evitar quadros, grades, tabelinhas ou divisões com textos minúsculos;
- se uma lista ficar pequena, reduzir a quantidade de itens e aumentar a fonte.

SISTEMA DE COMPOSIÇÃO
- quando houver personagem principal ou cena principal, posicionar o foco fortemente à direita;
- preservar espaço livre e bem resolvido à esquerda para a composição respirar e acomodar o texto;
- usar imagem principal grande, expressiva e dominante, ocupando presença visual real no card;
- usar 1 imagem principal claramente representativa do conteúdo e no máximo 1 elemento complementar secundário; evitar montagens com muitas peças ou muitos recortes;
- todos os elementos secundários devem conversar visualmente com o tema e com a imagem principal;
- quando fizer sentido, usar fragmentos como páginas de lei, recortes de jornal, mapa do Brasil, páginas manuscritas, texturas de mármore, colunas clássicas, selos, arquivos ou símbolos jurídicos simplificados;
- reforçar signos visuais mais jurídicos do que genéricos: tribunal, fórum, coluna clássica, balança, pena de escrever, carimbo de processo, folha de código, documento forense ou peça institucional, sempre integrados com elegância;
- quando combinar com o tema, usar também traços filosóficos/clássicos: colunas gregas, manuscritos antigos, pergaminhos, esboços lineares, bustos ilustrados, selos antigos ou símbolos intelectuais discretos;
- esses traços filosóficos/clássicos devem funcionar como apoio estético e não como excesso decorativo; use apenas o necessário para enriquecer a cena principal;
- os elementos devem formar uma colagem harmônica, e não uma bagunça visual;
- evitar grids, mosaicos, divisões em vários quadros, montagens múltiplas ou composições quebradas demais;
- o espaço vazio faz parte do design e não precisa ser preenchido à força.
- se um elemento não ajudar a explicar ou valorizar o conteúdo, ele deve ser removido.

LINGUAGEM DAS IMAGENS
- evitar foto genérica de banco de imagens;
- preferir cenas específicas, expressivas e memoráveis, com uma ação ou representação fácil de entender;
- as imagens devem parecer pensadas artisticamente, com identidade própria, e não somente ilustrativas;
- combinar semi-realismo com colagem premium, textura editorial e recortes vazados;
- a arte pode parecer uma mistura de conteúdo jurídico moderno com visual filosófico antigo, como um dossiê premium de estudos clássicos;
- pode usar leve dramaticidade cinematográfica inspirada em uma energia de “dark justice”, mas sem exagero fantasioso e sem perder a sofisticação;
- quando o tema pedir impacto, usar tensão, medo, dúvida, autoridade, consequência, confronto, decisão, proteção ou urgência por meio da cena e da expressão.

CONTEÚDO E DIDÁTICA
- o card deve ser claro, explicativo e fácil de entender;
- a imagem precisa representar o conteúdo de forma óbvia e direta, e não servir apenas como decoração;
- sempre que um objeto jurídico ou criminal puder ser melhor compreendido com presença humana, priorizar a cena com personagem executando a ação ou vivenciando a situação;
- nunca adicionar interface falsa de rede social, moldura de aplicativo, barra superior, botões de like/comentário/compartilhar/salvar, carrossel de miniaturas, watermark ou qualquer chrome de plataforma;
- TODO carrossel deve conter apenas 1 card identificado claramente como EXEMPLO PRÁTICO, com situação concreta, personagens ou fatos fáceis de visualizar; não repetir vários exemplos práticos do mesmo tema ao longo do carrossel;
- sempre que possível, transformar conceitos abstratos em cenas reais ou simbólicas bem dirigidas do cotidiano jurídico;
- evitar símbolos jurídicos genéricos soltos sem função;
- se for Direito Penal ou tema criminal, quando fizer sentido usar cenas concretas como ladrão, polícia, prisão, investigação, réu, vítima, medo, flagrante ou consequência do ato;
- se for tema constitucional ou institucional, quando fizer sentido usar Constituição, mapa do Brasil, Congresso, STF, instituições brasileiras ou figuras públicas relacionadas ao tema, sempre com harmonia e sem poluir;
- se for tema civil, trabalhista, consumidor, família ou outros ramos, usar cenas humanas coerentes com o assunto, em vez de ícones vazios;
- quando o conteúdo pedir, incluir exemplo prático, comparação visual, passo a passo, situação-problema ou aplicação no cotidiano; mas sempre usando uma única cena principal clara e fácil de reconhecer; se houver exemplo prático, ele deve aparecer em apenas um único card do carrossel;
- em exemplos práticos, preferir mostrar a ação acontecendo com pessoa(s) ou situação humana concreta, e não apenas o objeto isolado; por exemplo, em “disparo para o alto”, mostrar a pessoa efetuando o disparo para o alto de forma elegante e clara, em vez de só a arma sozinha;
- se houver base legal mencionada no conteúdo, isso deve aparecer de forma organizada e legível;
- manter coerência com o tema jurídico e com o tipo do card (capa, explicação, exemplo prático, pontos de atenção, resumo, fechamento);
- padronizar o carrossel usando apenas 4 estruturas visuais principais: CAPA, EXPLICAÇÃO/CONCEITO, EXEMPLO PRÁTICO e RESUMO/FECHAMENTO;
- o SEGUNDO card deve ser, preferencialmente, o card de EXPLICAÇÃO/CONCEITO, explicando de forma direta o conceito principal;
- evitar inventar um layout completamente diferente em cada card;
- ser direto ao ponto: menos texto, porém melhor selecionado;
- sempre preferir simplificar a composição em vez de adicionar mais elementos;
- priorizar a compreensão rápida sem perder a didática.
- no card de EXPLICAÇÃO/CONCEITO, usar um título declarativo e direto, e não uma nova pergunta;
- exemplos de título para o segundo card: “Dolo é vontade consciente”, “Dolo exige intenção”, “Quando há dolo”;
- evitar repetir no segundo card a mesma pergunta da capa;
- no card de conceito, usar no máximo 2 ou 3 pontos essenciais, em fonte grande, sem mini caixas com letras pequenas.

CAPA — REGRA FIXA DE ALTO IMPACTO
- o PRIMEIRO card é sempre a capa e deve SEMPRE começar com uma PERGUNTA direta, curta e intrigante sobre o tema;
- nunca usar na capa apenas o nome do assunto: transformar o assunto em pergunta que desperte curiosidade, por exemplo “O que é dolo?”, “Quando isso vira crime?”, “Você sabe quando cabe prisão?” ou equivalente fiel ao tema;
- a pergunta da capa deve ser curta e natural, de preferência com 3 a 6 palavras, evitando formulações estranhas, longas ou artificiais;
- exemplos bons de capa: “O que é dolo?”, “Você sabe o que é dolo?”, “Quando há crime?”, “O que é flagrante?”;
- abaixo da pergunta, incluir uma descrição/chamada muito curta, provocativa e chamativa, sem entregar toda a resposta, convidando a pessoa a continuar o carrossel; essa chamada deve ser visualmente maior do que antes e nunca minúscula;
- essa descrição deve ter no máximo 1 ou 2 frases curtas, com no máximo 2 a 3 linhas visuais;
- usar pergunta muito grande, dominante e legível instantaneamente no Instagram; ela deve ser o maior elemento textual da capa;
- o fundo da capa deve seguir exatamente a referência visual deste gradiente: linear-gradient(135deg, hsl(350 68% 32%) 0%, hsl(350 74% 42%) 50%, hsl(348 80% 50%) 100%); reproduzir o efeito diagonal do tom mais profundo para o mais vivo, sem transformar em vinho apagado;
- a capa deve ter composição forte, com imagem principal dominante à direita e poucos recortes complementares bem combinados;
- a capa deve ser a arte final em si, sem mockup de celular, sem tela de Instagram e sem barras/ícones de interface;
- a capa deve parecer limpa e impactante, sem excesso de papéis, sem muitos selos e sem muitos elementos pequenos;
- os recortes complementares da capa devem preservar o estilo antigo/editorial, mas de forma sutil: um pergaminho, um papel rasgado, um manuscrito, uma folha de código ou um detalhe institucional clássico já são suficientes; não exagerar;
- na capa, o bloco de texto deve complementar a imagem principal: o título e o texto de apoio devem ficar integrados visualmente à cena, podendo invadir parcialmente a área da imagem ou se aproximar bastante dela, para que texto e imagem pareçam uma peça única;
- na capa, usar texto de apoio com poucas linhas, porém em fonte significativamente maior, confortável e fácil de ler mesmo à primeira olhada; o texto de apoio deve ter no máximo 2 ou 3 linhas curtas;
- evitar deixar o texto pequeno e perdido em um canto; ele deve ter presença visual real e participar da composição;
- a pergunta da capa deve ser muito grande, curta e direta, com leitura instantânea;
- a expressão do personagem principal deve transmitir intenção clara: dúvida, tensão, autoridade, leve sorriso estratégico, confiança, surpresa ou alerta, conforme o tema;
- a capa deve parecer uma peça editorial feita para interromper o scroll;
- a tipografia da capa deve transmitir nobreza e peso institucional, com ar de manchete jurídica antiga e refinada;
- preservar hierarquia: pergunta primeiro, imagem principal em segundo, chamada curta em terceiro;
- a capa deve parecer claramente a abertura do carrossel e não apenas mais um card.

BRANDING EXTERNO
- não inserir arroba, logo, nome de perfil nem selo azul dentro da arte final;
- deixar apenas uma pequena área respirando no canto superior ou inferior para possível branding externo aplicado depois;
- o design deve funcionar sozinho, sem depender do arroba dentro da imagem.
- proibido simular interface de Instagram, feed, comentários, curtidas, compartilhamentos, navegação de app ou qualquer elemento de UI no resultado final;
- proibido criar faixa de mini cards na base do slide;
- proibido usar fundo claro dominante quando o card pedir a identidade vermelha principal.

PALETA
Fundo vermelho principal obrigatório: linear-gradient(135deg, hsl(350 68% 32%) 0%, hsl(350 74% 42%) 50%, hsl(348 80% 50%) 100%). Complementos: off-white, branco, bege claro, pergaminho, carvão, preto suave, cinza escuro, marrom sutil e pequenos detalhes em dourado envelhecido quando fizer sentido.

CONTEÚDO DESTA IMAGEM:
`;

/**
 * Monta o prompt final unindo a base obrigatória de design ao conteúdo específico do slide.
 */
export function montarPromptFinalDesign(conteudoEspecifico: string): string {
  const base = PROMPT_BASE_PADRAO_DESIGN.trimEnd();
  const conteudoLimpo = conteudoEspecifico.trim();
  if (/CONTEÚDO DESTA IMAGEM:\s*$/i.test(base)) {
    return `${base}\n${conteudoLimpo}`;
  }
  return `${base}\n\nCONTEÚDO DESTA IMAGEM:\n${conteudoLimpo}`;
}
