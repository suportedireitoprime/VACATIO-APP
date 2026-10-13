import React from 'react';
import { 
  ShieldCheck, 
  Scale, 
  BookOpen, 
  Clock, 
  Award,
  Sparkles,
  Check,
  X,
  Landmark,
  Layers,
  BrainCircuit
} from 'lucide-react';
import { 
  CapaDispositivoSlide, 
  FlipCardItem, 
  QuizInterativoItem, 
  LigarTermosGame, 
  SimuladorArtigo1Tempo 
} from '@/components/admin/laboratorio/LaboratorioInterativos';
import { montarPromptFinalDesign } from '@/utils/promptDesignJuridico';

export interface SlideLaboratorioRico {
  id: string;
  ordem: number;
  fase: string;
  dispositivoId: string;
  dispositivoLabel: string;
  isCapaDispositivo?: boolean;
  badge: string;
  titulo: string;
  subtitulo: string;
  textoAudio: string;
  imagePrompt: string;
  imagePromptPt: string;
  descricaoCena: string;
  nomeArquivo: string;
  conteudoPrincipal: React.ReactNode;
}

export const SLIDES_ART1_RICOS: SlideLaboratorioRico[] = [
  // ====================================================
  // ETAPA 1: CAPA SOLENE DO DISPOSITIVO
  // ====================================================
  {
    id: 'combo-art1-1',
    ordem: 1,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    isCapaDispositivo: true,
    badge: 'Etapa 1 de 25 · Capa do Dispositivo',
    titulo: 'Caput — Anterioridade da Lei Penal',
    subtitulo: 'O escudo supremo que protege a liberdade de todo cidadão',
    nomeArquivo: 'slide_01.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CAPA (Card 01/25)
TÍTULO DOMINANTE (PERGUNTA DA CAPA): O Estado pode punir o passado?
TEXTO DE APOIO: Descubra como o Artigo 1º do Código Penal protege você contra acusações injustas e abusos de poder.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco fortemente posicionado à direita da imagem: homem cidadão brasileiro de postura nobre e serena, olhar firme e reflexivo, em estilo semi-realista com contorno branco grosso visível, reforçando o efeito de recorte vazado em colagem editorial;
- Ao lado do personagem à direita, uma clássica balança da justiça em latão dourado envelhecido repousando sobre um pedestal de mármore e capitel de coluna grega, também com contorno branco recortado;
- Elemento de apoio: pequeno recorte de pergaminho antigo com selo clássico da República e texto de apoio com acabamento editorial de alta legibilidade;
- Fundo obrigatório em gradiente vermelho diagonal 135° (linear-gradient(135deg, hsl(350 68% 32%) 0%, hsl(350 74% 42%) 50%, hsl(348 80% 50%) 100%)) com linhas pretas finas discretas de textura jurídica;
- Amplo respiro e espaço livre à esquerda para o título monumental e hierarquia limpa. Sem interface de rede social.`),
    imagePromptPt: 'Capa do Artigo 1º em colagem editorial premium com fundo gradiente vermelho 135°, cidadão e balança clássica de metal à direita com contorno branco recortado, pergaminho e pergunta intrigante: O Estado pode punir o passado?',
    descricaoCena: 'Capa solene do Artigo 1º e a anterioridade penal no padrão de colagem editorial jurídica com fundo vermelho.',
    textoAudio: 'Bem-vindo ao estudo do Caput do Artigo primeiro do Código Penal. Você vai dominar a anterioridade penal: não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.',
    conteudoPrincipal: (
      <CapaDispositivoSlide
        diploma="Código Penal"
        artigoNumero="Artigo 1º"
        dispositivoLabel="Caput"
        titulo="Princípio da Anterioridade Penal"
        textoLei="Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal."
        explicacaoCurta="Você vai dominar um dos maiores escudos de liberdade da sociedade: o Estado não pode inventar uma proibição nova hoje para punir o que você fez ontem."
        icone={ShieldCheck}
        corAcento="text-teal-400"
        gradienteFundo="from-teal-950/50 via-card to-background"
        bordaCor="border-teal-500/40"
      />
    ),
  },

  // ====================================================
  // ETAPA 2: A ORIGEM HISTÓRICA & CESARE BECCARIA
  // ====================================================
  {
    id: 'combo-art1-2',
    ordem: 2,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 2 de 25 · História & Iluminismo',
    titulo: 'De Onde Veio Essa Regra? O Fim da Tirania Real',
    subtitulo: 'Como Cesare Beccaria revolucionou a justiça humana em 1764',
    nomeArquivo: 'slide_02.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXPLICAÇÃO/CONCEITO HISTÓRICO (Card 02/25)
TÍTULO DECLARATIVO: A lei escrita venceu a tirania dos reis
TEXTO DE APOIO: Em 1764, Cesare Beccaria pôs fim aos castigos arbitrários dos monarcas ao exigir que todo crime e pena estivessem previamente escritos.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: ilustração semi-realista do jurista iluminista Cesare Beccaria em colagem editorial com contorno branco grosso, escrevendo com pena clássica sobre pergaminho envelhecido;
- Livros históricos de encadernação em couro do tratado "Dos Delitos e das Penas" (1764) sobre escrivaninha de madeira nobre, com etiqueta de manuscrito recortado;
- Ao fundo, a silhueta sombria de uma coroa e trono absolutista esvanecendo-se sob linhas geométricas finas;
- Fundo vermelho obrigatório 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura de arquivo forense antigo;
- Espaço livre à esquerda reservado para respiro visual e tipografia editorial imponente com serifas clássicas.`),
    imagePromptPt: 'Cesare Beccaria escrevendo com pena em pergaminho iluminista e livros de 1764 em colagem editorial com contorno branco grosso, fundo vermelho gradiente 135° com linhas jurídicas finas.',
    descricaoCena: 'A transição histórica da tirania absolutista para a garantia da lei escrita iluminista.',
    textoAudio: 'Na Idade Média e nas monarquias absolutistas, os reis inventavam crimes da própria cabeça para punir quem quisessem. Em 1764, Cesare Beccaria revolucionou o mundo ao exigir que todo crime e pena estivessem previamente escritos.',
    conteudoPrincipal: (
      <div className="space-y-4 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-amber-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm tracking-wide">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span>A Conquista Iluminista da Liberdade</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            O Fim do Capricho dos Monarcas Absolutistas
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Durante os séculos da Idade Média e das monarquias absolutistas europeias, não existiam livros de leis acessíveis à população. A vontade pessoal do monarca era a própria lei viva.
          </p>

          <div className="p-4 sm:p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <p className="font-serif italic text-base sm:text-lg text-foreground/95 leading-relaxed">
              “Só as leis podem decretar as penas sobre os delitos; e esta autoridade só pode residir no legislador, que representa toda a sociedade reunida por um contrato social.”
            </p>
            <span className="text-xs sm:text-sm text-amber-400 font-semibold block text-right">
              — Cesare Beccaria (Dos Delitos e das Penas, 1764)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-secondary/60 border border-border/80 text-center font-mono text-teal-300 font-bold text-sm sm:text-base">
            Nullum crimen, nulla poena sine praevia lege
            <span className="block text-xs text-muted-foreground font-sans font-normal mt-1">
              (Não há crime, nem pena, sem prévia existência de lei escrita).
            </span>
          </div>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 3: O TEXTO OFICIAL E CLÁUSULA PÉTREA
  // ====================================================
  {
    id: 'combo-art1-3',
    ordem: 3,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 3 de 25 · O Texto Oficial',
    titulo: 'O que está escrito no Código Penal?',
    subtitulo: 'Decreto-Lei nº 2.848/1940 — Artigo 1º e Cláusula Pétrea da CF/88',
    nomeArquivo: 'slide_03.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CONCEITO & LEGISLAÇÃO OFICIAL (Card 03/25)
TÍTULO DECLARATIVO: O Código Penal é cláusula pétrea intocável
TEXTO DE APOIO: “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.” (Art. 1º do CP e Art. 5º, XXXIX da CF/88).

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco dominante posicionado à direita: livro solene encadernado em couro nobre do Código Penal Brasileiro com brasão republicano em relevo dourado, em recorte editorial com contorno branco grosso e elegante;
- Quatro colunas clássicas gregas em mármore recortadas com contorno branco, representando a solidez inabalável das cláusulas pétreas constitucionais;
- Recorte de pergaminho rasgado na base contendo fragmentos do texto de lei com tipografia serifada nobre;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de diagramas forenses discretos;
- Área livre à esquerda para respiro e leitura do texto em destaque.`),
    imagePromptPt: 'Livro do Código Penal com brasão dourado e quatro colunas gregas em colagem editorial com contorno branco recortado, fundo vermelho gradiente 135° com linhas jurídicas finas.',
    descricaoCena: 'O texto sagrado do Artigo 1º como cláusula pétrea intocável da República.',
    textoAudio: 'Artigo primeiro: Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal. Este princípio é cláusula pétrea intocável na nossa Constituição.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background text-center space-y-4 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-block">
          Texto Oficial da Legislação
        </span>
        <p className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground italic leading-relaxed px-2">
          “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
        </p>
        <p className="text-sm sm:text-base text-muted-foreground font-medium pt-1">
          Decreto-Lei nº 2.848/1940 e Art. 5º, XXXIX da CF/1988 (Cláusula Pétrea Intocável).
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 4: ANATOMIA 1 - SEM LEI ANTERIOR
  // ====================================================
  {
    id: 'combo-art1-4',
    ordem: 4,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 4 de 25 · Anatomia 1',
    titulo: 'Primeira Metade: A Regra do Jogo',
    subtitulo: '“...sem lei anterior que o defina”',
    nomeArquivo: 'slide_04.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXPLICAÇÃO/CONCEITO DIDÁTICO (Card 04/25)
TÍTULO DECLARATIVO: A lei tem que nascer antes da sua conduta
TEXTO DE APOIO: Você só pode ser punido por um ato se já existia uma lei formal em vigor no momento exato da sua ação.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: elegante régua do tempo vintage de bronze e pergaminho recortado com contorno branco grosso, marcando com precisão o "Ponto da Ação";
- À esquerda da linha do tempo, um escudo dourado da lei bloqueando o acesso de qualquer proibição ao passado com recorte vazado;
- Elemento complementar: carimbo de arquivo forense vintage "ATO VÁLIDO E INOCENTE" em tinta preta e textura de impressão com halftone sutil;
- Fundo em gradiente vermelho padrão 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de marca d’água jurídica;
- Amplo respiro à esquerda para texto editorial claro e direto.`),
    imagePromptPt: 'Régua cronológica do tempo em bronze e pergaminho com escudo de lei bloqueando o passado, colagem editorial recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'A regra do jogo: a lei penal só vale para atos futuros.',
    textoAudio: 'Primeira parte: A lei tem que existir antes da ação. Ninguém pode inventar um crime depois que você agiu.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 block">
          Tradução em Português Claro:
        </span>
        <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
          Você só pode ser punido por um ato se já existia uma lei formal em vigor no exato milissegundo da sua ação. Se a proibição for criada amanhã, o que você fez hoje é <strong>100% inocente e livre de culpa</strong>.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 5: QUIZ INTERATIVO 1 - DECRETO DO PREFEITO
  // ====================================================
  {
    id: 'combo-art1-5',
    ordem: 5,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 5 de 25 · Exercício Rápido',
    titulo: 'Teste Relâmpago 1',
    subtitulo: 'Fixando a primeira metade do Artigo 1º',
    nomeArquivo: 'slide_05.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: TESTE & PONTOS DE ATENÇÃO (Card 05/25)
TÍTULO DECLARATIVO: Prefeitos não podem criar crimes por decreto
TEXTO DE APOIO: Apenas o Congresso Nacional pode legislar sobre Direito Penal. Decretos municipais retroativos são nulos e ilegais.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: mesa solene de gabinete com documento de decreto municipal carimbado em vermelho com contorno branco grosso, sendo barrado e cancelado por um majestoso selo da República do Congresso Nacional em ouro envelhecido;
- Fragmento de papel rasgado de código de leis sobreposto com elegância e contorno branco recortado;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas e sutis de diagrama jurídico;
- Espaço aberto e limpo à esquerda para acomodar a pergunta e opções do teste com conforto de leitura.`),
    imagePromptPt: 'Decreto municipal com carimbo vermelho barrado pelo brasão federal do Congresso Nacional em colagem recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Quiz sobre a impossibilidade de prefeitos criarem crimes por decreto.',
    textoAudio: 'O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?',
    conteudoPrincipal: (
      <QuizInterativoItem 
        pergunta="O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?"
        opcoes={[
          { texto: "Não! Fere a anterioridade do Artigo 1º e só o Congresso Nacional cria crimes.", correta: true, feedback: "Exatamente! O Artigo 1º exige lei anterior e competência federal exclusiva do Congresso." },
          { texto: "Sim! O prefeito tem poder absoluto sobre os atos ocorridos na sua cidade.", correta: false, feedback: "Errado! Prefeitos não podem criar crimes, e mesmo que pudessem, jamais poderiam punir atos passados." },
        ]}
      />
    ),
  },

  // ====================================================
  // ETAPA 6: ANATOMIA 2 - COMINAÇÃO DA PENA
  // ====================================================
  {
    id: 'combo-art1-6',
    ordem: 6,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 6 de 25 · Anatomia 2',
    titulo: 'Segunda Metade: O Castigo Tabelado',
    subtitulo: '“...sem prévia cominação legal”',
    nomeArquivo: 'slide_06.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXPLICAÇÃO/CONCEITO TÉCNICO (Card 06/25)
TÍTULO DECLARATIVO: Cominação é o castigo prévio e tabelado
TEXTO DE APOIO: O juiz é estritamente proibido de inventar uma pena da sua própria cabeça. O castigo tem limites mínimos e máximos fixados antes do julgamento.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: balança clássica de justiça em latão dourado com pesos calibrados de metal no prato, ao lado de um pergaminho antigo desenrolado exibindo tabelas de penas com selo de cera forense, tudo em colagem editorial com contorno branco grosso recortado;
- Grade sutil de barras de prisão estilizadas em cristal transparente na composição secundária, simbolizando a estrita cominação legal;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura de gravura clássica;
- Área livre à esquerda para respiro e leitura do texto explicativo.`),
    imagePromptPt: 'Balança de latão com pesos calibrados e pergaminho de tabela de penas com selo de cera em colagem editorial recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'A precisão das penas tabeladas por lei antes do julgamento.',
    textoAudio: 'Segunda metade: Não há pena sem prévia cominação legal. Cominação significa previsão de castigo. O juiz não pode inventar pena da cabeça dele.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-400 block">
          O que é Cominação?
        </span>
        <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
          A palavra <strong>cominação</strong> significa a fixação prévia da pena. A lei já tem que estabelecer o castigo exato e os limites (ex: 1 a 3 anos de reclusão e multa). O juiz é estritamente obrigado a respeitar essa tabela.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 7: FLASHCARD 3D - COMINAÇÃO LEGAL
  // ====================================================
  {
    id: 'combo-art1-7',
    ordem: 7,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 7 de 25 · Flashcard 3D',
    titulo: 'Toque para testar sua memória!',
    subtitulo: 'Fixação interativa da palavra-chave do artigo',
    nomeArquivo: 'slide_07.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: MEMORIZAÇÃO & INTERAÇÃO (Card 07/25)
TÍTULO DECLARATIVO: Guarde a palavra-chave: Cominação Legal
TEXTO DE APOIO: Cominação significa cominar uma sanção: estabelecer o castigo por escrito antes da prática do ato.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: cartão recortado em pergaminho clássico premium com contorno branco grosso, exibindo o selo dourado solene de "Cominação Legal", com pena de escrever vintage e carimbo forense;
- Pedaço de papel rasgado editorial com detalhes de gravura antiga de colunas gregas na lateral de apoio;
- Fundo vermelho obrigatório em gradiente diagonal 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura técnica jurídica;
- Amplo respiro e espaço limpo à esquerda para visualização e leitura imediata.`),
    imagePromptPt: 'Cartão de pergaminho antigo com selo dourado de cominação legal e pena de escrever em colagem editorial recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Flashcard 3D interativo sobre a fixação da pena em lei.',
    textoAudio: 'Toque para virar o cartão e revisar o significado de prévia cominação legal.',
    conteudoPrincipal: (
      <FlipCardItem 
        frente="O que significa a expressão 'Prévia Cominação Legal' no Artigo 1º?"
        verso="Significa que o CASTIGO (a pena) também precisa estar escrito e tabelado na lei antes do fato acontecer. O juiz não pode inventar um castigo novo da própria cabeça!"
      />
    ),
  },

  // ====================================================
  // ETAPA 8: CASO DONA CLARA 1 - A QUITANDA
  // ====================================================
  {
    id: 'combo-art1-8',
    ordem: 8,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 8 de 25 · História Real 1',
    titulo: 'Caso Dona Clara: A Quitanda de Bairro',
    subtitulo: 'Uma atividade honesta e 100% legalizada',
    nomeArquivo: 'slide_08.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXEMPLO PRÁTICO (Card 08/25)
TÍTULO DECLARATIVO: O comércio honesto de Dona Clara
TEXTO DE APOIO: Dona Clara (68 anos) produz chás de camomila e capim-cidreira há mais de dez anos, com alvará e notas fiscais 100% regulares.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco fortemente à direita: Dona Clara, simpática senhora brasileira idosa de 68 anos com expressão acolhedora e avental de tecido rústico em colagem semi-realista com contorno branco grosso visível;
- Atrás dela, prateleiras de madeira acolhedoras com potes de vidro de ervas medicinais secas de camomila e fita de nota fiscal recortada em papel antigo;
- Elemento de apoio: carimbo clássico editorial "ATIVIDADE LÍCITA E REGULAR" em recorte com contorno branco;
- Fundo vermelho padrão 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura jurídica sutil;
- Lado esquerdo livre com respiro amplo para o texto editorial de storytelling.`),
    imagePromptPt: 'Dona Clara (68 anos) em sua quitanda de chás medicinais com potes de vidro e notas fiscais em colagem editorial com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Dona Clara trabalhando honestamente em sua quitanda de chás artesanais.',
    textoAudio: 'Conheça Dona Clara. Há mais de dez anos ela produz e vende um chá de ervas artesanal em sua quitanda com total transparência e notas fiscais.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-card to-background flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-xl">
        <span className="text-5xl sm:text-6xl shrink-0">👵</span>
        <div className="space-y-2">
          <h5 className="text-base sm:text-lg font-black text-amber-300">Dona Clara, 68 anos</h5>
          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Vende chás artesanais de camomila e capim-cidreira há mais de 10 anos em sua quitanda familiar. Sempre emitiu nota fiscal e possui alvará regular.
          </p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 9: CASO DONA CLARA 2 - NOVA LEI
  // ====================================================
  {
    id: 'combo-art1-9',
    ordem: 9,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 9 de 25 · História Real 2',
    titulo: 'A Nova Lei em Brasília',
    subtitulo: 'A proibição inesperada surge no Diário Oficial',
    nomeArquivo: 'slide_09.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXPLICAÇÃO DO CONFLITO (Card 09/25)
TÍTULO DECLARATIVO: Surge uma nova lei no Diário Oficial
TEXTO DE APOIO: Em 1º de junho, o Congresso aprova uma nova lei criminalizando a venda daquele extrato de erva concentrada.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: plenário do Congresso Nacional e tribuna legislativa em colagem editorial com contorno branco grosso, martelo clássico de madeira batendo sobre o sound block;
- Página recortada de jornal/Diário Oficial em pergaminho rasgado com carimbo "LEI FEDERAL Nº 14.890 - VIGÊNCIA 1º DE JUNHO", com contorno branco recortado;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de diagramas institucionais;
- Espaço aberto à esquerda para acomodar o texto com hierarquia clara e leitura confortável.`),
    imagePromptPt: 'Martelo judicial batendo na bancada do Congresso Nacional e página do Diário Oficial em colagem recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'A aprovação de uma nova lei penal no Congresso Nacional em Brasília.',
    textoAudio: 'No dia primeiro de junho, o Congresso aprova uma nova lei dizendo que o extrato concentrado dessa erva agora é proibido sob pena de até três anos de cadeia.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 block">
          📅 1º de Junho — Publicação Oficial:
        </span>
        <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-semibold italic border-l-4 border-amber-500 pl-4 py-1">
          “É crime inafiançável vender extrato concentrado dessa erva sem autorização médica expressa. Pena: 1 a 3 anos de reclusão.”
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 10: CASO DONA CLARA 3 - FISCAL BATE À PORTA
  // ====================================================
  {
    id: 'combo-art1-10',
    ordem: 10,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 10 de 25 · História Real 3',
    titulo: 'O Fiscal Bate à Porta',
    subtitulo: 'A acusação indevida pelas vendas do mês passado',
    nomeArquivo: 'slide_10.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CONFRONTO NARRATIVO (Card 10/25)
TÍTULO DECLARATIVO: O fiscal exige prisão por fatos passados
TEXTO DE APOIO: O fiscal confronta Dona Clara e ameaça prendê-la pelas vendas legítimas ocorridas em maio, antes da nova lei existir.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita em composição de forte tensão humana: fiscal da vigilância formal de uniforme escuro e prancheta com caneta apontada em riste em colagem com contorno branco grosso;
- Dona Clara ao lado do balcão de madeira rústica com expressão de espanto e dignidade serena, também com contorno branco recortado;
- Folha de notificação de infração com carimbo vermelho "AUTO DE FLAGRANTE ILEGAL" em recorte editorial de papel rasgado;
- Fundo vermelho padrão 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura forense dramática;
- Espaço amplo à esquerda garantindo que o texto e a acusação sejam lidos com impacto imediato.`),
    imagePromptPt: 'Fiscal severo com prancheta confrontando o balcão da quitanda de Dona Clara em tensão narrativa, colagem editorial recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'O fiscal acusando Dona Clara indevidamente pelas vendas do mês anterior.',
    textoAudio: 'No dia 2 de junho, a fiscalização aparece com policiais na quitanda de Dona Clara e exige notas fiscais do mês de maio.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card to-background space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <span className="text-xl">👮</span> O Fiscal Acusa:
        </span>
        <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal italic">
          “A senhora vendeu 50 frascos semana passada durante o mês de maio! Vamos lavrar o flagrante e te levar presa por crime!”
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 11: CASO DONA CLARA 4 - O VEREDITO PROTETOR
  // ====================================================
  {
    id: 'combo-art1-11',
    ordem: 11,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 11 de 25 · História Real 4',
    titulo: 'A Intervenção do Artigo 1º',
    subtitulo: 'A lei não pode olhar para trás',
    nomeArquivo: 'slide_11.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: RESOLUÇÃO E TRIUNFO DO DIREITO (Card 11/25)
TÍTULO DECLARATIVO: O Artigo 1º salva Dona Clara: fato atípico
TEXTO DE APOIO: Como as vendas de maio ocorreram antes da publicação da lei, a conduta é 100% inocente e protegida pela anterioridade penal.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: Dona Clara com expressão de alívio e sorriso sereno, amparada por um grande escudo dourado da legalidade penal recortado com contorno branco grosso e elegante;
- O escudo repulsa de forma decisiva a notificação do fiscal;
- Recorte de pergaminho antigo na base exibindo o carimbo judicial em relevo: "ABSOLVIÇÃO SUMÁRIA - ART. 1º DO CP";
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura clássica;
- Espaço respirando à esquerda para o veredito editorial de vitória do cidadão.`),
    imagePromptPt: 'Escudo dourado da legalidade penal protegendo Dona Clara contra o fiscal com alívio no rosto, colagem editorial com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'O Artigo 1º atuando como escudo protetor para absolver Dona Clara.',
    textoAudio: 'O artigo primeiro entra em ação e salva Dona Clara. Como as vendas de maio ocorreram antes da lei existir, não há crime.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Veredito: Livre de Qualquer Crime!
        </span>
        <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
          O Artigo 1º proíbe punir atos praticados antes da vigência da lei. Dona Clara só tem o dever de interromper as vendas a partir de 1º de junho. As vendas do mês passado foram <strong>100% lícitas e protegidas</strong>.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 12: BATE-PAPO COM O TUTOR (WHATSAPP CHAT)
  // ====================================================
  {
    id: 'combo-art1-12',
    ordem: 12,
    fase: '4. Diálogo & Princípios',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 12 de 25 · Bate-Papo Tutor',
    titulo: 'Conversa no WhatsApp com o Tutor',
    subtitulo: 'Tirando as dúvidas de quem não é do Direito',
    nomeArquivo: 'slide_12.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: DIÁLOGO & ESCLARECIMENTO DIDÁTICO (Card 12/25)
TÍTULO DECLARATIVO: Moralidade não é crime sem lei escrita
TEXTO DE APOIO: Mesmo que uma atitude pareça feia ou reprovável, o juiz jamais pode condenar ninguém sem texto de lei penal prévio e formal.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: composição editorial com balança clássica de metal e balão de fala recortado em pergaminho clássico com contorno branco grosso;
- Livro jurídico do Código Penal aberto ao lado de uma coluna clássica grega em estilo de gravura antiga recortada;
- Fundo vermelho obrigatório em gradiente diagonal 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas discretas;
- Lado esquerdo livre com respiro limpo para acomodar a dinâmica da dúvida e da resposta do tutor.`),
    imagePromptPt: 'Balança clássica de metal e livro de leis sobre capitel grego com balão de diálogo recortado em pergaminho com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Bate-papo rápido e descontraído com o tutor esclarecendo dúvidas.',
    textoAudio: 'Aluno pergunta: Professor, mas e se o juiz achar que a atitude foi feia e imoral? O tutor responde: Não importa! Imoralidade não é crime se não estiver escrito na lei penal.',
    conteudoPrincipal: (
      <div className="space-y-3.5">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1f2c34] border border-[#2a3942] shadow-md">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-base shadow-sm shrink-0">
            👨‍🏫
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-bold text-sm text-[#e9edef] block truncate">Tutor Jurídico Vacatio</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Online no chat
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl rounded-tl-sm bg-[#202c33] border border-[#2a3942] text-[#e9edef] max-w-[90%] shadow-lg space-y-1">
          <span className="text-xs font-bold text-[#8696a0] block">Dúvida do Aluno:</span>
          <p className="text-sm sm:text-base md:text-lg leading-relaxed font-medium">
            “Professor, e se todo mundo achar a atitude feia ou imoral? O juiz pode condenar mesmo sem ter lei federal escrita?”
          </p>
          <span className="text-[11px] text-[#8696a0] block text-right">14:32</span>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl rounded-tr-sm bg-[#005c4b] border border-[#005c4b] text-white max-w-[90%] ml-auto text-left shadow-lg space-y-1">
          <span className="text-xs font-bold text-emerald-300 block">Resposta do Tutor:</span>
          <p className="text-sm sm:text-base md:text-lg leading-relaxed font-semibold text-white">
            “Não! No Brasil vigora a <strong className="text-[#25d366] bg-[#004739] px-1.5 py-0.5 rounded">Legalidade Estrita</strong>: só o que está expressamente escrito na lei pode ser crime. Juiz não inventa crime por sentimento moral!”
          </p>
          <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-200">
            <span>14:33</span>
            <span className="text-[#53bdeb] font-bold">✓✓</span>
          </div>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 13: A METÁFORA DO FUTEBOL
  // ====================================================
  {
    id: 'combo-art1-13',
    ordem: 13,
    fase: '4. Diálogo & Princípios',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 13 de 25 · A Metáfora da Pelada',
    titulo: 'A Analogia do Jogo de Futebol',
    subtitulo: 'Regra inventada no meio da partida não vale',
    nomeArquivo: 'slide_13.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: ANALOGIA DIDÁTICA (Card 13/25)
TÍTULO DECLARATIVO: Não se muda a regra no meio do jogo
TEXTO DE APOIO: Expulsar um jogador por um toque de calcanhar após inventar a regra aos 40 minutos do 2º tempo seria absurdo. No Direito Penal é igual.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: árbitro de futebol sério e formal com apito e cartão vermelho em riste, em estilo semi-realista com contorno branco grosso recortado;
- No chão à direita, pegadas que desvanecem com marcação de tempo retroativo, acompanhadas de recorte de apito de bronze e cronômetro antigo de bolso;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de diagrama de campo e vetores limpos;
- Lado esquerdo livre com respiro para a analogia e texto didático.`),
    imagePromptPt: 'Árbitro de futebol com cartão vermelho e cronômetro antigo em colagem editorial com contorno branco grosso recortado, fundo vermelho gradiente 135° com linhas sutis.',
    descricaoCena: 'A metáfora do futebol: regras inventadas no meio da partida não valem.',
    textoAudio: 'Imagina você jogando futebol no domingo e no final do segundo tempo o árbitro expulsa você por um toque de calcanhar dado no começo do jogo. Seria absurdo, e na lei é igual.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400 block">
          ⚽ A Pelada de Domingo:
        </span>
        <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
          Se o árbitro inventasse uma falta nova aos 40 minutos do segundo tempo e expulsasse um jogador por um toque de calcanhar dado no primeiro tempo, haveria revolta no campo! No Direito Penal é idêntico: a regra do jogo tem que ser conhecida com antecedência absoluta.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 14: RESERVA LEGAL - QUEM CRIA LEIS?
  // ====================================================
  {
    id: 'combo-art1-14',
    ordem: 14,
    fase: '4. Diálogo & Princípios',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 14 de 25 · Quem Cria Leis?',
    titulo: 'O Princípio da Reserva Legal',
    subtitulo: 'Apenas representantes eleitos pelo povo',
    nomeArquivo: 'slide_14.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: ESTRUTURA INSTITUCIONAL (Card 14/25)
TÍTULO DECLARATIVO: Só o Congresso Nacional cria crimes
TEXTO DE APOIO: Apenas deputados federais e senadores aprovam leis penais federais. Prefeitos e governadores não têm poder de inventar crimes.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: fachada monumental das duas torres e cúpulas do Congresso Nacional de Brasília em gravura arquitetônica clássica, com contorno branco grosso recortado;
- Selo solene dourado da República em relevo ao lado de pergaminho de Lei Ordinária Federal com carimbo de aprovação;
- Abaixo, papéis de decretos municipais riscados em vermelho com aviso "SEM VALIDADE PENAL";
- Fundo vermelho padrão em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de mapa e traços institucionais;
- Espaço aberto à esquerda para a divisão clara entre quem pode e quem não pode.`),
    imagePromptPt: 'Congresso Nacional de Brasília em estilo gravura clássica com selo dourado da República e decretos barrados com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Exclusividade do Congresso Nacional para editar leis penais.',
    textoAudio: 'Apenas deputados federais e senadores aprovados no Congresso Nacional podem criar crimes no Brasil.',
    conteudoPrincipal: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-500/40 bg-emerald-950/25 space-y-2 shadow-md">
          <span className="text-sm sm:text-base font-black text-emerald-400 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" /> QUEM PODE:
          </span>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
            Apenas <strong>Lei Federal</strong> votada e aprovada pelo Congresso Nacional (Deputados Federais e Senadores).
          </p>
        </div>
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-500/40 bg-rose-950/25 space-y-2 shadow-md">
          <span className="text-sm sm:text-base font-black text-rose-400 flex items-center gap-2">
            <X className="w-5 h-5 text-rose-400" /> QUEM NÃO PODE:
          </span>
          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
            Decreto de prefeito, ordem de governador, portaria de delegado ou decisão solitária de juiz.
          </p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 15: A RÉGUA CRONOLÓGICA DO TEMPO
  // ====================================================
  {
    id: 'combo-art1-15',
    ordem: 15,
    fase: '5. Linha do Tempo & Simulador',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 15 de 25 · Linha do Tempo',
    titulo: 'A Régua Cronológica do Tempo',
    subtitulo: 'Como o relógio do Direito Penal funciona',
    nomeArquivo: 'slide_15.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: LINHA DO TEMPO CRONOLÓGICA (Card 15/25)
TÍTULO DECLARATIVO: O tempo da conduta é irreversível
TEXTO DE APOIO: A conduta ocorre no passado. A nova lei nasce no presente e caminha para o futuro, sem direito de olhar para trás.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco posicionado à direita: régua cronológica estilizada em bronze polido e pergaminho recortado com contorno branco grosso, com marcadores de marcos de calendário e seta indicativa apontando para a frente;
- Ponto da conduta à esquerda protegido por um selo de segurança forense;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de eixos temporais discretos;
- Respiro amplo à esquerda para a régua didática e leitura confortável.`),
    imagePromptPt: 'Régua cronológica em bronze e pergaminho com seta irreversível do tempo em colagem editorial com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'A régua do tempo no Direito Penal: o passado intocável pela lei nova.',
    textoAudio: 'Veja a linha do tempo: No passado aconteceu a ação. No presente surgiu a nova lei. A lei tenta viajar para trás, mas é bloqueada.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/30 space-y-5 shadow-xl">
        <div className="relative py-4 px-2">
          <div className="h-2.5 bg-secondary rounded-full w-full relative">
            <div className="absolute left-1/4 -top-2.5 w-7 h-7 rounded-full bg-purple-500 border-4 border-background shadow-md" />
            <div className="absolute left-3/4 -top-2.5 w-7 h-7 rounded-full bg-teal-400 border-4 border-background shadow-md" />
          </div>
          <div className="flex justify-between text-xs sm:text-sm font-bold text-foreground mt-4">
            <span className="text-purple-300">Passado: Conduta Praticada</span>
            <span className="text-teal-300">Presente: Nova Lei Criada</span>
          </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground text-center font-medium leading-relaxed">
          O tempo anda sempre para frente. A lei nova criada à direita não tem passe livre para alcançar a conduta praticada à esquerda.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 16: O MURO DO TEMPO
  // ====================================================
  {
    id: 'combo-art1-16',
    ordem: 16,
    fase: '5. Linha do Tempo & Simulador',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 16 de 25 · O Muro do Tempo',
    titulo: 'A Barreira de Proteção Penal',
    subtitulo: 'Irretroatividade da lei que prejudica',
    nomeArquivo: 'slide_16.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: METÁFORA VISUAL FORTE (Card 16/25)
TÍTULO DECLARATIVO: O muro intransponível da irretroatividade
TEXTO DE APOIO: A lei penal severa é alérgica ao passado. Diante do Artigo 1º, ela bate em um muro impenetrável e não passa.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: muro monolítico de pedra clássica com colunas gregas dividindo dois tempos com contorno branco grosso recortado;
- Do lado protegido, cidadãos em paz com luz calorosa; do lado exterior, tempestade de novas punições barradas pelo paredão de proteção constitucional;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de marcas d'água forenses;
- Espaço amplo à esquerda para a proclamação do princípio fundamental.`),
    imagePromptPt: 'Muro clássico monolítico de pedra com colunas gregas dividindo o tempo e barrando leis novas severas com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'O muro temporal que impede a retroatividade de leis que prejudicam.',
    textoAudio: 'O artigo primeiro funciona como um muro impenetrável. A lei que cria crime bate nessa barreira e não tem permissão para olhar para trás.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card to-background text-center space-y-3 shadow-xl">
        <ShieldCheck className="w-12 h-12 text-rose-400 mx-auto" />
        <h5 className="text-lg sm:text-xl font-black text-rose-300">O Muro Temporal Intransponível</h5>
        <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
          A lei penal que prejudica o cidadão é <strong>alérgica ao passado</strong>. Ela nunca pode retroagir para punir quem agiu antes de sua vigência.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 17: SIMULADOR INTERATIVO CRONOLÓGICO
  // ====================================================
  {
    id: 'combo-art1-17',
    ordem: 17,
    fase: '5. Linha do Tempo & Simulador',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 17 de 25 · Simulador Interativo',
    titulo: 'Simulador Cronológico',
    subtitulo: 'Alterne os momentos no tempo e veja a consequência jurídica imediata',
    nomeArquivo: 'slide_17.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: INTERATIVIDADE & CONTROLE TEMPORAL (Card 17/25)
TÍTULO DECLARATIVO: Experimente a linha do tempo em tempo real
TEXTO DE APOIO: Alterne entre conduta antes e conduta depois da lei para constatar a absolvição ou apuração legal.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: relógio astronômico de bronze com engrenagens clássicas e marcadores cronológicos vintage recortados com contorno branco grosso e elegante;
- Pedaço de pergaminho antigo de instrução com selo de laboratório de leis na composição de apoio;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de diagramas de precisão;
- Amplo respiro visual à esquerda para acomodar os controles e botões do simulador.`),
    imagePromptPt: 'Relógio astronômico clássico com engrenagens de bronze e marcadores cronológicos em colagem editorial com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'O simulador interativo de linha do tempo do Artigo 1º.',
    textoAudio: 'Teste no simulador o que acontece quando a conduta ocorre antes ou depois da vigência da lei.',
    conteudoPrincipal: <SimuladorArtigo1Tempo />,
  },

  // ====================================================
  // ETAPA 18: E SE A PENA AUMENTAR?
  // ====================================================
  {
    id: 'combo-art1-18',
    ordem: 18,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 18 de 25 · E se a Pena Aumentar?',
    titulo: 'A Pena Também Não Pode Piorar',
    subtitulo: 'Anterioridade estrita da punição legal',
    nomeArquivo: 'slide_18.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: PONTOS DE ATENÇÃO / REGRA AVANÇADA (Card 18/25)
TÍTULO DECLARATIVO: A pena mais dura não atinge fatos antigos
TEXTO DE APOIO: Se o ato já era crime com pena de 1 ano e uma lei nova aumenta para 10 anos, quem agiu antes responde apenas pela pena antiga.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: balança da justiça de latão envelhecido com um peso clássico calibrado gravado "1 ANO" firme no prato;
- Ao lado, um peso ameaçador com espinhos gravado "10 ANOS" acorrentado e bloqueado por uma fita constitucional com contorno branco grosso;
- Fragmento de pergaminho de código penal com carimbo "VEDADA A LEX GRAVIOR";
- Fundo vermelho padrão 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de balística legal;
- Espaço aberto à esquerda para a explicação da proteção contra aumento de pena.`),
    imagePromptPt: 'Balança de latão com peso de 1 ano calibrado e peso mais pesado de 10 anos contido por correntes com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'A vedação de aumento de pena para fatos anteriores (Lex Gravior).',
    textoAudio: 'Se uma conduta já era crime com pena de um ano e a nova lei aumentou para dez anos, quem agiu antes responde pela pena antiga de um ano.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-teal-400 block">
          Proteção Absoluta da Pena:
        </span>
        <p className="text-base sm:text-lg md:text-xl text-foreground/95 leading-relaxed font-normal">
          O princípio da anterioridade protege tanto contra a criação de novos crimes quanto contra o <strong>aumento da pena</strong>. Se a punição era de 1 ano e subiu para 8 anos, quem cometeu o ato antes responde pela pena original de 1 ano.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 19: MINI-GAME DE LIGAR OS TERMOS
  // ====================================================
  {
    id: 'combo-art1-19',
    ordem: 19,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 19 de 25 · Mini-Game',
    titulo: 'Ligar os Termos do Artigo 1º',
    subtitulo: 'Conecte os conceitos em segundos para fixar na memória',
    nomeArquivo: 'slide_19.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: GAMIFICAÇÃO & DESAFIO VISUAL (Card 19/25)
TÍTULO DECLARATIVO: Conecte os termos e fixe o significado
TEXTO DE APOIO: Associe cada conceito jurídico à sua tradução prática e consolide seu aprendizado.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: peças recortadas de quebra-cabeça clássico em pergaminho antigo com contorno branco grosso, encaixando-se com selos forenses de Anterioridade, Cominação e Reserva Legal;
- Detalhes de gravura vintage de balança e colunas gregas nas peças de conexão;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de nós lógicos geométricos;
- Área livre à esquerda para os botões e pares do mini-game interativo.`),
    imagePromptPt: 'Peças de quebra-cabeça em pergaminho antigo com selos jurídicos de termos se conectando com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Mini-game de conexão interativa entre termos jurídicos e significados.',
    textoAudio: 'Mini game: Conecte os termos jurídicos da esquerda com os seus significados do dia a dia na direita.',
    conteudoPrincipal: (
      <LigarTermosGame 
        pares={[
          { id: '1', termo: 'Anterioridade', significado: 'A lei tem que existir antes do ato acontecer' },
          { id: '2', termo: 'Cominação Legal', significado: 'O castigo tabelado na lei com limites prévios' },
          { id: '3', termo: 'Reserva Legal', significado: 'Só lei federal do Congresso Nacional cria crimes' },
          { id: '4', termo: 'Fato Atípico', significado: 'Conduta que não é proibida como crime na lei' },
        ]}
      />
    ),
  },

  // ====================================================
  // ETAPA 20: VOCÊ É O JUIZ - CASO DOS PATINETES
  // ====================================================
  {
    id: 'combo-art1-20',
    ordem: 20,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 20 de 25 · Caso Prático Real',
    titulo: 'Você é o Juiz: O Caso dos Patinetes',
    subtitulo: 'Um dilema real das grandes cidades brasileiras',
    nomeArquivo: 'slide_20.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CASO PRÁTICO MODERNO (Card 20/25)
TÍTULO DECLARATIVO: Você é o Juiz: o caso do patinete na calçada
TEXTO DE APOIO: Marcos andou de patinete na calçada em janeiro. Em março, criaram a proibição criminal. O promotor pede condenação. O que você decide?

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: jovem Marcos conduzindo patinete elétrico urbano moderno na calçada ampla, em composição vista da solene perspectiva de uma bancada judicial com martelo de madeira e código penal aberto;
- Elementos em colagem editorial semi-realista com contorno branco grosso visível reforçando o recorte limpo;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura jurídica;
- Amplo respiro à esquerda para o dilema e fatos do caso.`),
    imagePromptPt: 'Jovem Marcos no patinete elétrico na calçada em perspectiva de bancada judicial com martelo de juiz com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'O dilema de julgamento: o caso prático do patinete elétrico.',
    textoAudio: 'Você é o juiz. Em janeiro, Marcos andou de patinete elétrico na calçada. Em março, saiu uma lei criando crime de patinete na calçada. O promotor pede a prisão de Marcos pelo fato de janeiro.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-pink-500/40 bg-gradient-to-br from-pink-950/30 via-card to-background space-y-3 shadow-xl">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-pink-400 flex items-center gap-2">
          <span className="text-xl">🛴</span> O Caso de Marcos:
        </span>
        <p className="text-base sm:text-lg text-foreground/95 leading-relaxed font-normal">
          Marcos andou a 40 km/h de patinete elétrico na calçada em janeiro. Em março, foi sancionada uma nova lei federal punindo patinetes em calçadas com pena de prisão. O promotor denunciou Marcos pelo fato de janeiro. O que você decide como juiz?
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 21: FLASHCARD 3D - SENTENÇA DOS PATINETES
  // ====================================================
  {
    id: 'combo-art1-21',
    ordem: 21,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 21 de 25 · Flashcard de Sentença',
    titulo: 'Toque para revelar o seu veredito!',
    subtitulo: 'Decisão judicial fundamentada no Artigo 1º',
    nomeArquivo: 'slide_21.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: SENTENÇA JUDICIAL & RESOLUÇÃO (Card 21/25)
TÍTULO DECLARATIVO: Veredito: denúncia rejeitada e arquivada
TEXTO DE APOIO: Em janeiro a conduta era fato atípico. A lei nova não retroage. O cidadão está livre de qualquer culpa.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: solene pergaminho de sentença judicial com carimbo de cera vermelha da Justiça e coroa de louros dourada em colagem recortada com contorno branco grosso;
- Balança clássica de latão equilibrada ao lado do documento oficial;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de textura clássica forense;
- Espaço amplo à esquerda para a revelação da decisão fundamentada.`),
    imagePromptPt: 'Sentença judicial solene em pergaminho com selo de cera vermelha e coroa de louros com contorno branco grosso, fundo vermelho gradiente 135° com linhas sutis.',
    descricaoCena: 'O flashcard de sentença 3D com a decisão fundamentada do juiz.',
    textoAudio: 'Toque para girar o cartão e conferir a sentença com base no artigo primeiro.',
    conteudoPrincipal: (
      <FlipCardItem 
        frente="Marcos pode ser punido criminalmente pelo fato praticado em janeiro?"
        verso="NÃO! Em janeiro, andar de patinete na calçada era um fato atípico (não era crime). Pelo Artigo 1º, a lei nova de março não pode retroagir. Denúncia rejeitada e arquivada!"
      />
    ),
  },

  // ====================================================
  // ETAPA 22: ÁRVORE DE DECISÃO EM 3 PASSOS
  // ====================================================
  {
    id: 'combo-art1-22',
    ordem: 22,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 22 de 25 · Árvore de Decisão',
    titulo: 'O Algoritmo Mental em 3 Passos',
    subtitulo: 'Como raciocinar com segurança diante de qualquer caso',
    nomeArquivo: 'slide_22.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: SÍNTESE METODOLÓGICA (Card 22/25)
TÍTULO DECLARATIVO: O algoritmo mental do Artigo 1º em 3 passos
TEXTO DE APOIO: 1. Houve conduta? 2. Existia lei antes da ação? Se não existia, a conduta é fato atípico e inocente.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: elegante fluxograma ilustrado desenhado à mão sobre pergaminho clássico com nós lógicos e carimbos de validação com contorno branco grosso recortado;
- Pena clássica de escrever sobre tinteiro de cristal e selo forense de aprovação;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de eixos e caixas técnicas;
- Espaço amplo à esquerda reservado para a visualização dos três passos claros.`),
    imagePromptPt: 'Fluxograma lógico em pergaminho clássico com pena de escrever e carimbos forenses em colagem recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'O algoritmo mental em 3 passos para raciocinar qualquer caso penal.',
    textoAudio: 'Siga a árvore de decisão: Alguém agiu? A lei existia antes da ação? Se sim, analisa o crime. Se não, inocente e fato atípico.',
    conteudoPrincipal: (
      <div className="space-y-3">
        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card text-center font-bold text-sm sm:text-base text-foreground shadow-sm">
          1. Aconteceu uma conduta humana?
        </div>
        <div className="text-center text-muted-foreground text-sm font-black">↓</div>
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/40 bg-teal-950/25 text-center font-bold text-sm sm:text-base text-teal-200 shadow-sm">
          2. Existia lei escrita proibindo no exato momento da ação?
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-center">
          <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 text-rose-200 font-bold text-sm sm:text-base shadow-sm">
            NÃO ➔ Inocente! (Fato Atípico)
          </div>
          <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-bold text-sm sm:text-base shadow-sm">
            SIM ➔ Prossegue apuração legal
          </div>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 23: DESAFIO FINAL DE FIXAÇÃO
  // ====================================================
  {
    id: 'combo-art1-23',
    ordem: 23,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 23 de 25 · Exercício de Desafio',
    titulo: 'Desafio de Fixação Final',
    subtitulo: 'Provando seu domínio completo sobre a matéria',
    nomeArquivo: 'slide_23.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: DESAFIO FINAL DE PROVA (Card 23/25)
TÍTULO DECLARATIVO: Teste de domínio: qual situação viola o Artigo 1º?
TEXTO DE APOIO: Identifique a conduta inconstitucional e comprove que você domina a anterioridade da lei e da pena.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: pódio de mármore clássico com capitel de coluna grega sustentando uma balança dourada reluzente e pergaminho de teste selado, com contorno branco grosso recortado;
- Iluminação dramática editorial sobre os símbolos jurídicos, com recortes de papel rasgado de apoio;
- Fundo vermelho padrão 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de marcas d’água;
- Espaço aberto à esquerda para a pergunta e opções do teste.`),
    imagePromptPt: 'Pódio de mármore com capitel grego e balança dourada em colagem editorial com contorno branco grosso recortado, fundo vermelho gradiente 135° com linhas finas.',
    descricaoCena: 'Desafio final de maestria sobre o Artigo 1º.',
    textoAudio: 'Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?',
    conteudoPrincipal: (
      <QuizInterativoItem 
        pergunta="Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?"
        opcoes={[
          { texto: "O Congresso criar um crime hoje com vigência para condutas futuras.", correta: false, feedback: "Incorreto! Isso é perfeitamente válido e respeita a anterioridade." },
          { texto: "O juiz aplicar uma pena mais dura criada por lei após o crime ter sido cometido.", correta: true, feedback: "Correto! Aumentar a punição de fatos passados fere a anterioridade da cominação legal." },
          { texto: "A polícia investigar uma conduta proibida por lei vigente na data do fato.", correta: false, feedback: "Incorreto! Isso é a aplicação normal e regular da lei." },
        ]}
      />
    ),
  },

  // ====================================================
  // ETAPA 24: GLOSSÁRIO DO CIDADÃO
  // ====================================================
  {
    id: 'combo-art1-24',
    ordem: 24,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 24 de 25 · Glossário do Cidadão',
    titulo: 'Os 4 Termos que Você Agora Domina',
    subtitulo: 'Dicionário definitivo do Artigo 1º',
    nomeArquivo: 'slide_24.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: RESUMO / GLOSSÁRIO DEFINITIVO (Card 24/25)
TÍTULO DECLARATIVO: Os 4 conceitos fundamentais dominados
TEXTO DE APOIO: Anterioridade (lei prévia), Cominação (pena tabelada), Reserva Legal (só Congresso) e Fato Atípico (não é crime).

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: quatro etiquetas de arquivo forense clássico em pergaminho recortado com contorno branco grosso e elegante, contendo os 4 pilares do Artigo 1º com carimbos e selos históricos;
- Balança de metal no topo como símbolo unificador da legalidade estrita;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de arquivo institucional;
- Área aberta à esquerda garantindo leitura imediata e confortável de cada definição.`),
    imagePromptPt: 'Quatro etiquetas de arquivo forense clássico em pergaminho com balança de metal e carimbos em colagem com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Glossário com os 4 pilares fundamentais do Artigo 1º.',
    textoAudio: 'Revise os quatro termos que você aprendeu: anterioridade, prévia cominação legal, reserva legal e fato atípico.',
    conteudoPrincipal: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-sm sm:text-base font-black">Anterioridade:</strong>
          <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">A lei penal nasce antes da ação acontecer.</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-sm sm:text-base font-black">Cominação:</strong>
          <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Tabela de punição previamente fixada em lei.</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-sm sm:text-base font-black">Reserva Legal:</strong>
          <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Apenas o Congresso Nacional legisla em matéria penal.</p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-sm sm:text-base font-black">Fato Atípico:</strong>
          <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">Ato que não se encaixa em nenhum crime escrito.</p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 25: TROFÉU DE MAESTRIA
  // ====================================================
  {
    id: 'combo-art1-25',
    ordem: 25,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Etapa 25 de 25 · Troféu de Maestria',
    titulo: 'Parabéns! Trilha Concluída com Sucesso',
    subtitulo: 'Você dominou o Artigo 1º do Código Penal',
    nomeArquivo: 'slide_25.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: FECHAMENTO & TROFÉU DE MAESTRIA (Card 25/25)
TÍTULO DECLARATIVO: Conquista de maestria: Artigo 1º dominado
TEXTO DE APOIO: Você concluiu as 25 etapas com anatomia da lei, história, casos reais, simulador e exercícios práticos.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: monumento solene de troféu dourado esculpido em formato de balança da justiça clássica sobre pedestal de mármore e capitel de coluna grega, com contorno branco grosso recortado e acabamento de colagem editorial premium;
- Folhas de louro douradas da vitória e carimbo oficial "CERTIFICADO DE MAESTRIA PENAL" em recorte com contorno branco;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de celebração clássica e textura forense;
- Espaço nobre à esquerda para os parabéns e encerramento da jornada com alto impacto.`),
    imagePromptPt: 'Troféu monumental dourado de balança da justiça e colunas gregas com folhas de louro e carimbo de maestria em colagem recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Troféu de maestria comemorativo da conclusão das 25 etapas do Artigo 1º.',
    textoAudio: 'Parabéns! Você concluiu com sucesso a trilha master do artigo primeiro do Código Penal. Você agora compreende esse pilar da justiça com total clareza.',
    conteudoPrincipal: (
      <div className="p-7 sm:p-8 rounded-3xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-4 shadow-xl">
        <Award className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400 mx-auto animate-pulse" />
        <h4 className="text-xl sm:text-2xl font-black text-foreground">Mestre do Artigo 1º</h4>
        <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
          Você completou todas as 25 etapas com anatomia da lei, histórias da vida real, diálogos descontraídos, simulador temporal, ligar de termos e exercícios de fixação!
        </p>
      </div>
    ),
  },
];
