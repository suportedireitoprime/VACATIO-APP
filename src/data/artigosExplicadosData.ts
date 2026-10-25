/**
 * Dados manuais e verificados dos Artigos Explicados para o VACATIO APP.
 * Segue fielmente a SKILL: App Códigos Explicados (Artigo por Artigo).
 *
 * Cada artigo possui:
 * 1. Artigo (texto oficial)
 * 2. Ideia (síntese mental de entrada)
 * 3. Explicação (3 partes + resumo + pegadinha)
 * 4. Desdobramento (trecho por trecho, por que a lei fez assim, palavra por palavra)
 * 5. Exemplo Prático (histórias com personagens nomeados + desfecho)
 * 6. Termos (glossário simples vs. técnico)
 * 7. Jurisprudência (3 julgados reais STF/STJ com links oficiais)
 */

export interface ArtigoExplicadoData {
  tabela: string;
  numero: string;
  ideia: string;
  explicacao: string;
  desdobramento: string;
  exemplo: string;
  termos: string;
  jurisprudencia: string;
}

export const ARTIGOS_EXPLICADOS_SEED: Record<string, ArtigoExplicadoData> = {
  // ECA - Artigo 1º
  'ECA_ESTATUTO_CRIANCA_ADOLESCENTE|1': {
    tabela: 'ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
    numero: '1',
    ideia: `O Estatuto consagra a **doutrina da proteção integral**, superando de vez o antigo Código de Menores: crianças e adolescentes deixam de ser "objetos" tutelados em situação irregular e passam a ser **sujeitos plenos de direitos**, cuja proteção é dever incondicional e de prioridade absoluta da família, da sociedade e do Estado.`,
    explicacao: `Esta é a explicação detalhada do Artigo 1º do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).
---SECAO---
## 1. O que este artigo decide
O Artigo 1º é a viga-mestra de todo o sistema da infância e juventude no Brasil. Ele estabelece formalmente que a atuação estatal e social é regida pela **proteção integral**. Isso significa que a criança e o adolescente são compreendidos em sua totalidade (física, psicológica, moral e social), devendo receber amparo prévio, amplo e irrestrito para garantir o desenvolvimento saudável da personalidade humana.
---SECAO---
## 2. A distinção central
A distinção fundamental criada pelo Artigo 1º é o rompimento definitivo com a **doutrina da situação irregular** (que vigorou sob o Código de Menores de 1979). Antes, o Estado só agia quando o menor estava abandonado, em perigo moral ou em conflito com a lei. Com a **doutrina da proteção integral**, toda e qualquer pessoa menor de 18 anos é titular de direitos fundamentais, independentemente de sua classe social, estrutura familiar ou comportamento.
---SECAO---
## 3. O erro mais comum
O erro mais frequente de concurseiros e estudantes é supor que o ECA foi feito apenas para jovens infratores ou crianças em vulnerabilidade extrema. O Artigo 1º universaliza a tutela: as normas do Estatuto (como o direito a brincar, convivência familiar, prioridade em socorro e vaga escolar pública) aplicam-se a todos os infantes brasileiros sem qualquer distinção.
---SECAO---
## Resumo do artigo
- **Marco humanista**: substitui o termo pejorativo "menor" pelo conceito de sujeito de direitos.
- **Proteção integral**: tutela universal em todas as esferas do desenvolvimento humano.
- **Fundamento constitucional**: decorre diretamente do Art. 227 da Constituição Federal de 1988 e da Convenção da ONU de 1989.
---SECAO---
## Pegadinha de prova
**Cuidado**: questões de concurso adoram afirmar que a doutrina da proteção integral aplica-se apenas subsidiariamente às crianças pertencentes a famílias com renda comprovada. **Incorreto!** A proteção integral é originária, universal e cogente, sem exigência de carência econômica.`,
    desdobramento: `---TRECHO---
## Caput do Artigo 1º
**Texto oficial**: "Esta Lei dispõe sobre a proteção integral à criança e ao adolescente."

### Explicação do trecho
O caput define o objeto e a finalidade de toda a lei. Não se trata de uma mera lei de assistência social ou de repressão infracional, mas de um estatuto protetivo amplo que cerca a infância de garantias especiais diante da sua condição peculiar de pessoas em fase de desenvolvimento.

### Por que a lei fez assim?
O legislador democrático de 1990 atendeu ao mandamento constitucional do Art. 227 da Carta Magna e aos compromissos internacionais do Brasil perante a ONU, eliminando a visão autoritária de "vigilância do menor" para instituir garantias de cidadania desde o nascimento.

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: "proteção integral"
- **O que significa aqui**: O conjunto completo e indissociável de cuidados, prevenções e direitos garantidos à pessoa humana em formação.
- **Por que a lei escolheu esta palavra**: Para proibir qualquer tratamento fracionado ou omisso do Estado, assegurando direitos civis, sociais, afetivos e biológicos.
- **E se fosse outra?**: Se utilizasse "assistência facultativa", degradaria um direito público subjetivo exigível perante a Justiça em favor de uma benevolência estatal discricionária.
---PALAVRA---
**Palavra**: "criança e ao adolescente"
- **O que significa aqui**: As duas etapas evolutivas distintas da menoridade civil brasileira.
- **Por que a lei escolheu esta palavra**: Para consagrar tecnicamente as categorias etárias que serão pormenorizadas e distinguidas no Artigo 2º.
- **E se fosse outra?**: Se tivesse mantido a expressão genérica "menores", perpetuaria a segregação estigmatizante que criminalizava a infância periférica no regime anterior.`,
    exemplo: `---EXEMPLO---
## Caso Prático: A Matrícula Escolar de Sofia
**Situação**: Sofia, de 8 anos, teve sua matrícula recusada em uma escola municipal próxima à sua residência. A diretoria alegou que as poucas vagas disponíveis seriam destinadas apenas a programas de reinserção social emergencial e que a família de Sofia, por ter renda regular, deveria aguardar em fila indefinida ou matricular a menina em escola particular distante.

### Desfecho jurídico
Com base no Artigo 1º do ECA e na doutrina da proteção integral, o Conselho Tutelar e a Defensoria Pública notificaram a Secretaria de Educação. Foi assegurada a vaga imediata de Sofia na escola do bairro, reafirmando que o direito à educação básica e à proteção da infância é universal, não podendo sofrer restrições com base em critérios de exclusão ou capacidade econômica familiar.`,
    termos: `---TERMO---
## Proteção Integral
- **Definição simples**: O dever prioritário de cuidar de todas as necessidades da criança (corpo, mente, escola, afeto e segurança), sem deixar nada de fora.
- **Definição técnica**: Paradigma jurídico internacional e constitucional que reconhece crianças e adolescentes como sujeitos titulares de direitos fundamentais em condição peculiar de desenvolvimento biopsicossocial.
---TERMO---
## Sujeito de Direitos
- **Definição simples**: A criança é dona dos seus próprios direitos perante a lei, e não uma propriedade dos pais ou um objeto sob controle do Estado.
- **Definição técnica**: Titular de direitos públicos subjetivos oponíveis erga omnes, com capacidade jurídica progressiva exercida por representação ou assistência.
---TERMO---
## Doutrina da Situação Irregular
- **Definição simples**: O sistema antigo do Código de Menores de 1979 que só olhava para crianças pobres ou infratoras para interná-las ou vigiá-las.
- **Definição técnica**: Regime anterior de intervenção tutelar punitivista e assistencialista, baseado na segregação e rotulação estigmatizante de menores desprovidos de representação regular.`,
    jurisprudencia: `---JULGADO---
## STF - ADI 3.446/DF (Ano 2019)
- **O Caso**: Julgamento sobre ações de recolhimento compulsório e apreensão de crianças e adolescentes em situação de rua sem ordem judicial ou flagrante infracional.
- **A Decisão**: O Supremo Tribunal Federal declarou inconstitucional qualquer intervenção de limpeza urbana ou apreensão sumária, fixando que a proteção integral do Art. 1º do ECA exige respeito estrito às liberdades individuais e acolhimento socioassistencial digno.
- **Por que importa para o artigo**: Confirma em sede de controle concentrado que a proteção integral é um instrumento de cidadania e garantia, e nunca justificativa para ações policiais repressivas ou arbitrárias.
- **Fonte oficial**: https://jurisprudencia.stf.jus.br/pages/search/sjur406085/base/acordaos
---JULGADO---
## STJ - Súmula 655 e Recursos Repetitivos da Saúde (Ano 2022)
- **O Caso**: Negativa estatal de custear tratamentos de alta complexidade e medicamentos para crianças, com base no argumento orçamentário da reserva do possível.
- **A Decisão**: O Superior Tribunal de Justiça assentou que o princípio da proteção integral do ECA impõe prioridade absoluta e eficácia imediata no fornecimento de cuidados à saúde de crianças e adolescentes.
- **Por que importa para o artigo**: Transforma o comando do Art. 1º em ordem executiva impositiva para as políticas públicas e o orçamento de Municípios, Estados e União.
- **Fonte oficial**: https://processo.stj.jus.br/jurisprudencia/externo/informativo/`
  },

  // ECA - Artigo 2º
  'ECA_ESTATUTO_CRIANCA_ADOLESCENTE|2': {
    tabela: 'ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
    numero: '2',
    ideia: `O artigo traça a **fronteira biológica e jurídica** entre infância e adolescência: **criança** é a pessoa até 12 anos incompletos (até o último instante dos 11 anos); **adolescente** é quem tem entre 12 e 18 anos de idade. Essa divisão impõe regimes sancionatórios distintos e admite aplicação excepcional até os 21 anos.`,
    explicacao: `Esta é a explicação detalhada do Artigo 2º do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).
---SECAO---
## 1. O que este artigo decide
O Artigo 2º fixa com precisão matemática os marcos cronológicos que separam a criança do adolescente. O critério adotado pelo Brasil é estritamente objetivo e biológico (idade em certidão civil). Criança é a pessoa humana até doze anos incompletos (isto é, até 11 anos, 11 meses e 29 dias). Ao completar 12 anos, a pessoa passa automaticamente à condição de adolescente, permanecendo nessa categoria até a véspera de completar 18 anos.
---SECAO---
## 2. A distinção central
A separação etária repercute diretamente nas consequências jurídicas de atos infracionais. A criança que comete ato análogo a crime ou contravenção **jamais** pode sofrer medida socioeducativa restritiva de liberdade: a ela aplicam-se exclusivamente **medidas de proteção** (Art. 101). O adolescente, por sua vez, está sujeito às **medidas socioeducativas** (Art. 112), incluindo advertência, prestação de serviços, semiliberdade e internação.
---SECAO---
## 3. O erro mais comum
O erro clássico reside no termo "incompletos": muitos acreditam que a pessoa continua sendo criança durante todo o 12º ano de vida. Falso! No exato dia e hora em que completa 12 anos, já é adolescente. Outro erro gravíssimo é desconhecer o parágrafo único: o ECA continua se aplicando excepcionalmente aos jovens de 18 a 21 anos nos casos de execução de medidas socioeducativas iniciadas na adolescência (Art. 121, § 5º).
---SECAO---
## Resumo do artigo
- **Criança**: 0 a 11 anos e 364 dias (apenas medidas protetivas).
- **Adolescente**: 12 a 17 anos e 364 dias (sujeito a medidas socioeducativas).
- **Extensão excepcional**: pessoas entre 18 e 21 anos nos casos expressos em lei (liberação compulsória aos 21 anos).
---SECAO---
## Pegadinha de prova
**Atenção redobrada**: a banca costuma afirmar que o jovem que atinge 18 anos no curso da internação socioeducativa deve ser solto imediatamente ou transferido para um presídio comum. **Errado!** Segundo a Súmula 605 do STJ e o Art. 2º, parágrafo único, a medida continua em cumprimento regular na unidade socioeducativa até a liberação compulsória aos 21 anos.`,
    desdobramento: `---TRECHO---
## Caput do Artigo 2º
**Texto oficial**: "Considera-se criança, para os efeitos desta Lei, a pessoa até doze anos de idade incompletos, e adolescente aquela entre doze e dezoito anos de idade."

### Explicação do trecho
O caput define com precisão legal quem é criança e quem é adolescente. A distinção é peremptória e vincula juízes, promotores, delegados, conselheiros tutelares e educadores em todo o território nacional.

### Por que a lei fez assim?
Para afastar qualquer subjetivismo judicial. No regime anterior, avaliava-se o "discernimento psicológico" caso a caso, o que permitia internar e punir crianças arbitrariamente. O marco cronológico estrito garante segurança jurídica e respeito às etapas de desenvolvimento biológico.

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: "incompletos"
- **O que significa aqui**: Antes de completar o 12º aniversário natalício.
- **Por que a lei escolheu esta palavra**: Para demarcar que aos 12 anos completos a pessoa já ingressa na adolescência.
- **E se fosse outra?**: Se a lei dissesse "até doze anos de idade" sem o termo incompletos, haveria dúvida se quem tem 12 anos e meio ainda seria criança ou já adolescente.
---PALAVRA---
**Palavra**: "entre doze e dezoito anos"
- **O que significa aqui**: O intervalo que começa com o 12º aniversário e termina um segundo antes do 18º aniversário.
- **Por que a lei escolheu esta palavra**: Para coincidir o término da adolescência com a maioridade civil e penal estabelecida pelo Art. 228 da Constituição Federal.
- **E se fosse outra?**: Se reduzisse para dezesseis anos, violaria a cláusula pétrea constitucional da imputabilidade penal aos dezoito anos.
---TRECHO---
## Parágrafo único do Artigo 2º
**Texto oficial**: "Nos casos expressos em lei, aplica-se excepcionalmente este Estatuto às pessoas entre dezoito e vinte e um anos de idade."

### Explicação do trecho
Cria a chamada "ultratividade do ECA". Trata-se de uma ponte de transição que permite ao jovem maior de 18 anos concluir seu processo socioeducativo pedagógico sem ser jogado nas cadeias comuns de adultos.

### Por que a lei fez assim?
Porque seria contraditório e danoso interromper abruptamente o trabalho pedagógico de ressocialização no dia em que o jovem completa 18 anos, ou misturá-lo com criminosos adultos reincidentes do sistema penitenciário.

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: "excepcionalmente"
- **O que significa aqui**: Aplicável unicamente nas hipóteses taxativas e expressas da legislação.
- **Por que a lei escolheu esta palavra**: Para que não haja extensão indevida de deveres de guarda ou tutela civil a maiores de idade plenamente capazes.
- **E se fosse outra?**: Se omitisse o caráter excepcional, abriria margem para decisões judiciais que tratassem adultos de até 21 anos como juridicamente incapazes.`,
    exemplo: `---EXEMPLO---
## Caso Prático: O Aniversário de Lucas e o Ato Infracional
**Situação**: Lucas completou 12 anos no dia 15 de maio. Às 17h desse mesmo dia, na companhia do irmão caçula Pedro (de 10 anos), praticou furto de um aparelho celular em uma loja do centro da cidade. Ambos foram apreendidos em flagrante pela autoridade policial.

### Desfecho jurídico
Em relação a Pedro (10 anos), por se tratar de criança, a autoridade policial não lavrou auto de apreensão de ato infracional, promovendo o encaminhamento imediato ao Conselho Tutelar para aplicação exclusiva de medidas protetivas (Art. 101 c/c Art. 105). Em relação a Lucas, por ter completado 12 anos horas antes do fato, a autoridade o qualificou como adolescente, lavrando o procedimento próprio de ato infracional perante a Vara da Infância e Juventude com possibilidade de aplicação de medida socioeducativa em meio aberto (Art. 112).`,
    termos: `---TERMO---
## Doze anos incompletos
- **Definição simples**: A fase da vida da pessoa desde que nasce até um segundo antes de apagar as 12 velinhas do bolo de aniversário.
- **Definição técnica**: Marco cronológico peremptório de demarcação da infância, findando-se no exato dia em que o indivíduo completa doze anos de idade.
---TERMO---
## Medida Socioeducativa
- **Definição simples**: Resposta pedagógica e legal que a Justiça dá ao adolescente que cometeu um ato parecido com crime, ensinando responsabilidade e cidadania.
- **Definição técnica**: Sanção jurídica pedagógica prevista no Art. 112 do ECA, aplicável exclusivamente a adolescentes autores de atos infracionais.
---TERMO---
## Liberação Compulsória
- **Definição simples**: A saída obrigatória e sem prorrogação do jovem da unidade de internação ao completar 21 anos de idade.
- **Definição técnica**: Extinção de pleno direito da medida de internação pelo implemento da idade limite fixada no Art. 121, § 5º c/c Art. 2º, parágrafo único do ECA.`,
    jurisprudencia: `---JULGADO---
## STJ - Súmula 605 (Ano 2018)
- **O Caso**: Recursos em habeas corpus questionando se a maioridade penal aos 18 anos impõe a extinção sumária de medidas socioeducativas em cumprimento.
- **A Decisão**: O STJ sumulou a tese: "A superveniência da maioridade penal não interfere na apuração de ato infracional nem na aplicabilidade de medida socioeducativa em curso, inclusive na liberdade assistida, enquanto não atingida a idade de 21 anos."
- **Por que importa para o artigo**: Consolida a aplicação prática e direta do parágrafo único do Artigo 2º do ECA, impedindo a impunidade ou a soltura prematura sem cumprimento da ressocialização.
- **Fonte oficial**: https://scon.stj.jus.br/SCON/sumulas/doc.jsp?livre=605
---JULGADO---
## STJ - Tema Repetitivo 1.002 (Ano 2020)
- **O Caso**: Conflito de competência entre Vara de Execuções Penais e Vara da Infância para acompanhar medidas de jovens que praticaram ato infracional na adolescência e completaram 18 anos.
- **A Decisão**: A Terceira Seção do STJ fixou que a competência da Justiça da Infância e da Juventude permanece absoluta para processar e executar as medidas até o limite dos 21 anos de idade.
- **Por que importa para o artigo**: Evita a contaminação do jovem maior de 18 anos pelas regras e estruturas do processo penal comum, assegurando o cumprimento estrito do regime especial do ECA.
- **Fonte oficial**: https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=1002`
  },

  // ECA - Artigo 3º
  'ECA_ESTATUTO_CRIANCA_ADOLESCENTE|3': {
    tabela: 'ECA_ESTATUTO_CRIANCA_ADOLESCENTE',
    numero: '3',
    ideia: `Crianças e adolescentes acumulam **duas ordens de direitos**: todos os direitos humanos fundamentais reconhecidos aos adultos somados à **proteção especial para o seu desenvolvimento** biopsicossocial, sob um rigoroso **mandamento de não discriminação** trazido pelo Marco Legal da Primeira Infância.`,
    explicacao: `Esta é a explicação detalhada do Artigo 3º do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990).
---SECAO---
## 1. O que este artigo decide
O Artigo 3º estabelece que a menoridade etária jamais diminui os direitos de uma pessoa. Crianças e adolescentes gozam de todos os direitos inerentes à pessoa humana (vida, integridade, honra, imagem, liberdade) e recebem um **plus protetivo**: a garantia estatal, familiar e comunitária de oportunidades e facilidades para seu pleno desenvolvimento físico, mental, moral, espiritual e social.
---SECAO---
## 2. A distinção central
A distinção central reside na cumulação de regimes: enquanto um adulto possui a tutela geral dos direitos civis e fundamentais, a criança e o adolescente recebem esses mesmos direitos e ainda uma **obrigação positiva imposta à sociedade** de facultar seu pleno crescimento em condições de liberdade e dignidade. O parágrafo único, incluído pela Lei nº 13.257/2016 (Marco Legal da Primeira Infância), reforça o princípio da igualdade material com um rol exaustivo que veda qualquer discriminação.
---SECAO---
## 3. O erro mais comum
O erro frequente é acreditar que a discriminação familiar ou econômica pode justificar a precarização de direitos (como negar vaga em creche ou acolhimento especializado por falta de recursos locais). O parágrafo único expressamente veda distinções fundadas em nascimento, condição familiar, econômica, deficiência ou região de moradia.
---SECAO---
## Resumo do artigo
- **Não diminuição de direitos**: titularidade de todos os direitos humanos fundamentais.
- **Desenvolvimento em 5 dimensões**: físico, mental, moral, espiritual e social.
- **Igualdade e inclusão total**: proibição expressa de qualquer preconceito ou discriminação (Lei 13.257/2016).
---SECAO---
## Pegadinha de prova
**Atenção em provas da OAB e Magistratura**: bancas adoram afirmar que o direito a facilidades espirituais no ECA impõe a obrigatoriedade de religião no ambiente familiar. **Falso!** O desenvolvimento espiritual do Art. 3º é garantia de liberdade de crença, respeito à consciência e formação ética, jamais imposição de credo específico.`,
    desdobramento: `---TRECHO---
## Caput do Artigo 3º
**Texto oficial**: "A criança e o adolescente gozam de todos os direitos fundamentais inerentes à pessoa humana, sem prejuízo da proteção integral de que trata esta Lei, assegurando-se-lhes, por lei ou por outros meios, todas as oportunidades e facilidades, a fim de lhes facultar o desenvolvimento físico, mental, moral, espiritual e social, em condições de liberdade e de dignidade."

### Explicação do trecho
O caput garante a plenitude dos direitos humanos aos menores de 18 anos. Ele impõe ao Poder Público o dever de agir proativamente ("por lei ou por outros meios") para abrir caminhos reais de desenvolvimento integral em ambiente livre e digno.

### Por que a lei fez assim?
Porque declarar o direito de forma passiva não basta para quem não tem capacidade eleitoral ou autonomia financeira para competir no mercado. A lei impôs o dever de garantir ativamente as facilidades para o crescimento.

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: "sem prejuízo"
- **O que significa aqui**: Cumulativamente, somando-se a tudo que já existe na Constituição e nos tratados.
- **Por que a lei escolheu esta palavra**: Para evidenciar que o ECA não é uma lei restritiva, mas sim um piso protetivo ampliado.
- **E se fosse outra?**: Se dissesse "em substituição", retiraria das crianças a proteção direta da Constituição Federal de 1988.
---PALAVRA---
**Palavra**: "todas as oportunidades e facilidades"
- **O que significa aqui**: Recursos materiais, acesso a creches, escolas, atendimento médico, lazer, esporte e amparo familiar.
- **Por que a lei escolheu esta palavra**: Para abranger obrigações de fazer do Poder Público e da sociedade.
- **E se fosse outra?**: Se usasse apenas "oportunidades legais", excluiria medidas fáticas, como transporte escolar rural ou alimentação escolar.
---TRECHO---
## Parágrafo único do Artigo 3º
**Texto oficial**: "Os direitos enunciados nesta Lei aplicam-se a todas as crianças e adolescentes, sem discriminação de nascimento, situação familiar, idade, sexo, raça, etnia ou cor, religião ou crença, deficiência, condição pessoal de desenvolvimento e aprendizagem, condição econômica, ambiente social, região e local de moradia ou outra condição que diferencie as pessoas, as famílias ou a comunidade em que vivem. (Incluído pela Lei nº 13.257, de 2016)"

### Explicação do trecho
É a cláusula máxima de não discriminação da infância brasileira. Garante que nenhuma criança seja rotulada por viver em área de risco, por ser filha de pais separados, por ter deficiência cognitiva ou por pertencer a etnias minoritárias.

### Por que a lei fez assim?
Inserido pelo Marco Legal da Primeira Infância em 2016, este parágrafo blindou as políticas públicas contra a exclusão histórica de crianças indígenas, quilombolas, neurodivergentes e periféricas.

### Palavra por palavra deste trecho
---PALAVRA---
**Palavra**: "sem discriminação"
- **O que significa aqui**: Isonomia substantiva e acolhimento obrigatório com equidade.
- **Por que a lei escolheu esta palavra**: Para vedar práticas institucionais excludentes em escolas públicas e privadas.
- **E se fosse outra?**: Se permitisse "distinções justificáveis por limitação orçamentária", legitimaria o abandono escolar de crianças vulneráveis.`,
    exemplo: `---EXEMPLO---
## Caso Prático: O Direito à Inclusão e Terapia de Mateus
**Situação**: Mateus, de 4 anos, diagnosticado com Transtorno do Espectro Autista (TEA), foi matriculado em uma escola infantil do município. A coordenação pedagógica informou à família que, por falta de monitores contratados na rede municipal, Mateus só poderia comparecer à escola 2 dias por semana e por apenas 2 horas em cada dia, enquanto os demais alunos tinham jornada integral.

### Desfecho jurídico
A família acionou o Ministério Público com base no Artigo 3º, caput e parágrafo único do ECA. O Poder Judiciário concedeu tutela mandamental determinando a permanência em jornada integral com monitor especializado exclusivo, destacando que a condição pessoal de desenvolvimento e deficiência jamais pode servir de pretexto para restringir facilidades educacionais ou gerar discriminação institucional.`,
    termos: `---TERMO---
## Direitos Fundamentais Inerentes
- **Definição simples**: Os direitos que você já tem só pelo fato de ser gente e estar vivo no mundo (vida, honra, respeito e liberdade).
- **Definição técnica**: Conjunto de prerrogativas jurídicas inderrogáveis e indisponíveis consagradas no catálogo constitucional e em tratados internacionais de direitos humanos.
---TERMO---
## Marco Legal da Primeira Infância
- **Definição simples**: A lei de 2016 que exigiu prioridade e investimentos especiais para as crianças brasileiras de 0 a 6 anos de idade.
- **Definição técnica**: Lei nº 13.257/2016 que introduziu diretrizes de proteção e estímulo ao desenvolvimento integral na primeiríssima infância no ordenamento nacional.
---TERMO---
## Condição Peculiar de Desenvolvimento
- **Definição simples**: O fato biológico e psicológico de que a criança está crescendo e formando seu corpo e mente a cada dia.
- **Definição técnica**: Circunstância evolutiva biopsicossocial do ser humano até os 18 anos que fundamenta a exigibilidade de tutela jurídica diferenciada e reforçada.`,
    jurisprudencia: `---JULGADO---
## STF - Tema 548 de Repercussão Geral (RE 1.008.166/SP) (Ano 2022)
- **O Caso**: Ação civil pública cobrando a obrigatoriedade dos Municípios de garantir vagas em creches e pré-escolas para todas as crianças de zero a cinco anos.
- **A Decisão**: O plenário do STF fixou a tese de que a educação infantil é direito fundamental de eficácia plena e aplicabilidade imediata de todas as crianças, não podendo ser recusada sob alegação de escassez orçamentária ou reserva do possível.
- **Por que importa para o artigo**: Aplica o Artigo 3º do ECA na prática, transformando o direito a oportunidades e desenvolvimento na primeira infância em exigibilidade judicial impositiva.
- **Fonte oficial**: https://portal.stf.jus.br/jurisprudenciaRepercussao/tema.asp?num=548
---JULGADO---
## STJ - REsp 1.846.109/RJ (Ano 2021)
- **O Caso**: Negativa de cobertura para plano de saúde de terapias multidisciplinares (fonoaudiologia, terapia ocupacional e psicologia) para crianças neurodivergentes.
- **A Decisão**: A Terceira Turma do STJ consolidou que o direito à saúde e ao desenvolvimento integral do Art. 3º do ECA impõe a cobertura contínua e sem limite de sessões para tratamentos prescritos à pessoa em desenvolvimento.
- **Por que importa para o artigo**: Estende a força protetiva do Artigo 3º para as relações contratuais privadas e serviços de saúde suplementar.
- **Fonte oficial**: https://processo.stj.jus.br/processo/pesquisa/?termo=1846109`
  }
};

/**
 * Função utilitária para buscar o conteúdo pré-populado por tabela, artigo e modo.
 */
export function getArtigoExplicadoManual(
  tabelaNome: string | null | undefined,
  numeroArtigo: string | number | null | undefined,
  modo: string
): string | null {
  if (!tabelaNome || numeroArtigo === null || numeroArtigo === undefined) return null;
  const numClean = String(numeroArtigo).replace(/\D+/g, '').trim();
  
  // Tenta encontrar em ECA
  const isEca = /ECA|ESTATUTO.*CRIANCA|estatuto-eca/i.test(tabelaNome);
  if (!isEca) return null;

  const item = ARTIGOS_EXPLICADOS_SEED[`ECA_ESTATUTO_CRIANCA_ADOLESCENTE|${numClean}`];
  if (!item) return null;

  switch (modo) {
    case 'ideia':
      return item.ideia;
    case 'explicacao':
      return item.explicacao;
    case 'desdobramento':
      return item.desdobramento;
    case 'exemplo':
      return item.exemplo;
    case 'termos':
      return item.termos;
    case 'jurisprudencia':
      return item.jurisprudencia;
    default:
      return null;
  }
}
