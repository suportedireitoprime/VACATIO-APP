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
  Zap, 
  BrainCircuit, 
  ArrowRight,
  Gavel
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
  temImagemRepresentativa?: boolean;
  badge: string;
  titulo: string;
  subtitulo: string;
  textoAudio: string;
  imagePrompt?: string;
  imagePromptPt?: string;
  descricaoCena?: string;
  nomeArquivo?: string;
  conteudoPrincipal: React.ReactNode;
}

export const SLIDES_ART1_RICOS: SlideLaboratorioRico[] = [
  // ====================================================
  // ETAPA 1: CAPA SOLENE DO DISPOSITIVO (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-1',
    ordem: 1,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    isCapaDispositivo: true,
    temImagemRepresentativa: true,
    badge: 'Etapa 1 · Capa da Aula',
    titulo: 'Caput — Anterioridade da Lei Penal',
    subtitulo: 'O escudo supremo que protege a liberdade de todo cidadão',
    nomeArquivo: 'slide_01.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CAPA
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
  // ETAPA 2: INTRODUÇÃO RÁPIDA (FOCO DIDÁTICO)
  // ====================================================
  {
    id: 'combo-art1-intro',
    ordem: 2,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 2 · Introdução Rápida',
    titulo: 'A Regra de Ouro da Sua Liberdade',
    subtitulo: 'Entenda em menos de 1 minuto por que este artigo é o mais importante do Direito Penal',
    textoAudio: 'Introdução rápida: O Artigo 1º é a regra de ouro que impede o Estado de agir de surpresa contra você. Veja os três pilares essenciais.',
    conteudoPrincipal: (
      <div className="space-y-3.5 text-left">
        <div className="p-4 sm:p-5 rounded-2xl border border-teal-500/30 bg-teal-950/20 shadow-sm flex items-start gap-3">
          <Zap className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-sm sm:text-base text-teal-200">Por que o Artigo 1º existe?</h5>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
              Imagine se o governo pudesse acordar hoje, declarar que a cor da sua camisa é crime e mandar a polícia te prender pelo que você vestiu ontem. Seria o caos absoluto. O Artigo 1º proíbe exatamente isso!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">1. Sem Surpresas</span>
            <p className="text-xs text-foreground/90 leading-relaxed">A lei tem que ser publicada <strong>antes</strong> da sua conduta.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">2. Pena Tabelada</span>
            <p className="text-xs text-foreground/90 leading-relaxed">O castigo tem limite prévio. Juiz não inventa pena da própria cabeça.</p>
          </div>
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 block">3. Só o Congresso</span>
            <p className="text-xs text-foreground/90 leading-relaxed">Apenas leis federais criam crimes. Decretos e portarias não podem.</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-center text-xs text-muted-foreground font-medium">
          💡 A seguir, veja a história real, exemplos práticos do cotidiano e teste seus conhecimentos nos simuladores!
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 3: A ORIGEM HISTÓRICA & CESARE BECCARIA (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-2',
    ordem: 3,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 3 · História & Iluminismo',
    titulo: 'O Fim da Tirania dos Reis Absolutistas',
    subtitulo: 'Como Cesare Beccaria revolucionou o Direito Penal em 1764',
    nomeArquivo: 'slide_02.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXPLICAÇÃO/CONCEITO HISTÓRICO
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
        <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-card shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs sm:text-sm tracking-wide">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>A Conquista Iluminista da Liberdade</span>
          </div>

          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">
            Durante séculos, a vontade pessoal do monarca era a própria lei viva. Se o rei não gostasse de você, ele criava uma punição na hora e mandava prender.
          </p>

          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
            <p className="font-serif italic text-sm sm:text-base text-foreground/95 leading-relaxed">
              “Só as leis podem decretar as penas sobre os delitos; e esta autoridade só pode residir no legislador, que representa toda a sociedade reunida por um contrato social.”
            </p>
            <span className="text-xs text-amber-400 font-semibold block text-right">
              — Cesare Beccaria (Dos Delitos e das Penas, 1764)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-secondary/60 border border-border/80 text-center font-mono text-teal-300 font-bold text-xs sm:text-sm">
            Nullum crimen, nulla poena sine praevia lege
            <span className="block text-[11px] text-muted-foreground font-sans font-normal mt-0.5">
              (Não há crime, nem pena, sem prévia existência de lei escrita).
            </span>
          </div>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 4: O TEXTO OFICIAL E CLÁUSULA PÉTREA (DIDÁTICO)
  // ====================================================
  {
    id: 'combo-art1-3',
    ordem: 4,
    fase: '1. Introdução & Fundamentos',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 4 · O Texto Oficial',
    titulo: 'O que Diz o Código Penal?',
    subtitulo: 'Decreto-Lei nº 2.848/1940 e Art. 5º, XXXIX da Constituição Federal',
    textoAudio: 'Artigo primeiro: Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal. Este princípio é cláusula pétrea intocável na nossa Constituição.',
    conteudoPrincipal: (
      <div className="space-y-3.5">
        <div className="p-6 sm:p-7 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/30 via-card to-background text-center space-y-3.5 shadow-xl">
          <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-block">
            Letra da Lei
          </span>
          <p className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground italic leading-relaxed px-2">
            “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-1">
            Código Penal (Art. 1º) e CF/1988 (Art. 5º, XXXIX)
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card text-left space-y-1.5">
          <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Cláusula Pétrea Intocável
          </span>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
            Nem mesmo uma Emenda Constitucional pode revogar essa garantia. É um direito fundamental absoluto do cidadão brasileiro contra a arbitrariedade estatal.
          </p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 5: ANATOMIA 1 - SEM LEI ANTERIOR
  // ====================================================
  {
    id: 'combo-art1-4',
    ordem: 5,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 5 · Anatomia 1',
    titulo: 'Primeira Metade: A Regra da Conduta',
    subtitulo: '“...sem lei anterior que o defina” (Lex Praevia)',
    textoAudio: 'Primeira parte: A lei tem que existir antes da ação. Ninguém pode inventar um crime depois que você agiu.',
    conteudoPrincipal: (
      <div className="p-5 sm:p-6 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/25 via-card to-background space-y-3 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
          Tradução em Português Claro:
        </span>
        <p className="text-sm sm:text-base md:text-lg text-foreground/95 leading-relaxed font-normal">
          Você só pode ser punido criminalmente se já existia uma lei formal em vigor no <strong>exato milissegundo da sua conduta</strong>.
        </p>
        <div className="p-3 rounded-xl bg-secondary/60 border border-border/60 text-xs text-foreground/90 font-medium">
          👉 Se a conduta era permitida na segunda-feira e o Congresso cria o crime na quarta-feira, o que você fez na segunda é <strong>100% inocente e fato atípico</strong>.
        </div>
      </div>
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
    temImagemRepresentativa: false,
    badge: 'Etapa 6 · Anatomia 2',
    titulo: 'Segunda Metade: O Castigo Tabelado',
    subtitulo: '“...nem pena sem prévia cominação legal”',
    textoAudio: 'Segunda metade: Não há pena sem prévia cominação legal. Cominação significa previsão de castigo. O juiz não pode inventar pena da cabeça dele.',
    conteudoPrincipal: (
      <div className="p-5 sm:p-6 rounded-3xl border border-teal-500/40 bg-gradient-to-br from-teal-950/25 via-card to-background space-y-3 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-teal-400 block">
          O que é Cominação?
        </span>
        <p className="text-sm sm:text-base md:text-lg text-foreground/95 leading-relaxed font-normal">
          A palavra <strong>cominação</strong> significa a fixação prévia e por escrito do castigo. A lei já tem que estabelecer a pena exata e os limites mínimos e máximos (ex: 1 a 4 anos de reclusão e multa).
        </p>
        <div className="p-3 rounded-xl bg-secondary/60 border border-border/60 text-xs text-foreground/90 font-medium">
          ⚖️ O juiz é estritamente obrigado a respeitar essa tabela. Ele jamais pode aplicar um castigo inventado ou aplicar uma pena que não existia na data do fato.
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 7: QUIZ INTERATIVO 1 - DECRETO DO PREFEITO
  // ====================================================
  {
    id: 'combo-art1-5',
    ordem: 7,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 7 · Exercício Rápido',
    titulo: 'Teste Relâmpago: Decreto Municipal',
    subtitulo: 'Fixando a regra da competência e anterioridade',
    textoAudio: 'O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?',
    conteudoPrincipal: (
      <QuizInterativoItem 
        pergunta="O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?"
        opcoes={[
          { texto: "Não! Fere a anterioridade do Artigo 1º e só o Congresso Nacional cria crimes.", correta: true, feedback: "Exatamente! O Artigo 1º exige lei anterior e a Constituição reserva a criação de crimes exclusivamente ao Congresso Nacional (Art. 22, I da CF)." },
          { texto: "Sim! O prefeito tem poder absoluto sobre os atos ocorridos na sua cidade.", correta: false, feedback: "Errado! Prefeitos não podem criar crimes por decreto, e mesmo que pudessem, jamais poderiam punir atos passados." },
        ]}
      />
    ),
  },

  // ====================================================
  // ETAPA 8: CASO DONA CLARA 1 - A QUITANDA (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-8',
    ordem: 8,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 8 · História Real 1',
    titulo: 'Caso Dona Clara: A Quitanda de Bairro',
    subtitulo: 'Uma atividade honesta e 100% legalizada',
    nomeArquivo: 'slide_03.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXEMPLO PRÁTICO (Caso Dona Clara 1)
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
      <div className="p-5 sm:p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-card to-background flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-md">
        <span className="text-4xl sm:text-5xl shrink-0">👵</span>
        <div className="space-y-1.5">
          <h5 className="text-sm sm:text-base font-black text-amber-300">Dona Clara, 68 anos</h5>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
            Vende chás artesanais de camomila e capim-cidreira há mais de 10 anos em sua quitanda familiar. Sempre emitiu nota fiscal e possui alvará regular.
          </p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 9: CASO DONA CLARA 2 - A NOVA LEI (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-9',
    ordem: 9,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 9 · História Real 2',
    titulo: 'A Nova Lei em Brasília',
    subtitulo: 'A proibição inesperada surge no Diário Oficial',
    nomeArquivo: 'slide_04.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: EXPLICAÇÃO DO CONFLITO (Caso Dona Clara 2)
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
      <div className="p-5 sm:p-6 rounded-3xl border border-amber-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
          📅 1º de Junho — Publicação Oficial:
        </span>
        <p className="text-sm sm:text-base text-foreground/95 leading-relaxed font-semibold italic border-l-4 border-amber-500 pl-4 py-1">
          “É crime vender extrato concentrado dessa erva sem autorização médica expressa. Pena: 1 a 3 anos de reclusão.”
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 10: CASO DONA CLARA 3 - O FISCAL (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-10',
    ordem: 10,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 10 · História Real 3',
    titulo: 'O Fiscal Bate à Porta',
    subtitulo: 'A acusação indevida pelas vendas do mês passado',
    nomeArquivo: 'slide_05.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CONFRONTO NARRATIVO (Caso Dona Clara 3)
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
    textoAudio: 'No dia 2 de junho, a fiscalização aparece na quitanda de Dona Clara e exige notas fiscais do mês de maio.',
    conteudoPrincipal: (
      <div className="p-5 sm:p-6 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card to-background space-y-3 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
          <span className="text-lg">👮</span> O Fiscal Acusa:
        </span>
        <p className="text-sm sm:text-base text-foreground/95 leading-relaxed font-normal italic">
          “A senhora vendeu 50 frascos semana passada durante o mês de maio! Vamos lavrar o flagrante e te levar presa por crime!”
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 11: CASO DONA CLARA 4 - O VEREDITO (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-11',
    ordem: 11,
    fase: '3. Storytelling — Caso Dona Clara',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 11 · História Real 4',
    titulo: 'A Intervenção do Artigo 1º',
    subtitulo: 'A lei não pode olhar para trás',
    nomeArquivo: 'slide_06.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: RESOLUÇÃO E TRIUNFO DO DIREITO (Caso Dona Clara 4)
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
      <div className="p-5 sm:p-6 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Veredito: Livre de Qualquer Crime!
        </span>
        <p className="text-sm sm:text-base text-foreground/95 leading-relaxed font-normal">
          O Artigo 1º proíbe punir atos praticados antes da vigência da lei. Dona Clara só tem o dever de interromper as vendas a partir de 1º de junho. As vendas do mês passado foram <strong>100% lícitas e protegidas</strong>.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 12: A ANALOGIA DO FUTEBOL (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-13',
    ordem: 12,
    fase: '4. Princípios & Analogias',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 12 · Analogia Didática',
    titulo: 'A Analogia do Jogo de Futebol',
    subtitulo: 'Regra inventada no meio da partida não vale',
    nomeArquivo: 'slide_07.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: ANALOGIA DIDÁTICA (Pelada de Futebol)
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
      <div className="p-5 sm:p-6 rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-card via-card to-secondary/30 space-y-3 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-cyan-400 block">
          ⚽ A Pelada de Domingo:
        </span>
        <p className="text-sm sm:text-base text-foreground/95 leading-relaxed font-normal">
          Se o árbitro inventasse uma falta nova aos 40 minutos do segundo tempo e expulsasse um jogador por um toque de calcanhar dado no primeiro tempo, haveria revolta no campo! No Direito Penal é idêntico: a regra do jogo tem que ser conhecida com antecedência absoluta.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 13: RESERVA LEGAL - QUEM CRIA LEIS?
  // ====================================================
  {
    id: 'combo-art1-14',
    ordem: 13,
    fase: '4. Princípios & Analogias',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 13 · Técnica Jurídica',
    titulo: 'O Princípio da Reserva Legal',
    subtitulo: 'Competência privativa da União (Art. 22, I da Constituição Federal)',
    textoAudio: 'Apenas deputados federais e senadores aprovados no Congresso Nacional podem criar crimes no Brasil.',
    conteudoPrincipal: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 space-y-1.5 shadow-sm">
          <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" /> QUEM PODE:
          </span>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
            Apenas <strong>Lei Ordinária Federal</strong> votada e aprovada pelo Congresso Nacional (Deputados e Senadores).
          </p>
        </div>
        <div className="p-4 sm:p-5 rounded-2xl border border-rose-500/40 bg-rose-950/25 space-y-1.5 shadow-sm">
          <span className="text-xs sm:text-sm font-black text-rose-400 flex items-center gap-1.5">
            <X className="w-4 h-4 text-rose-400" /> QUEM NÃO PODE:
          </span>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">
            Decreto de prefeito, ordem de governador, portaria de delegado ou decisão solitária de juiz.
          </p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 14: A RÉGUA CRONOLÓGICA DO TEMPO
  // ====================================================
  {
    id: 'combo-art1-15',
    ordem: 14,
    fase: '5. Linha do Tempo & Simulador',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 14 · Linha do Tempo',
    titulo: 'A Régua Cronológica do Tempo',
    subtitulo: 'Teoria da Atividade (Artigo 4º do Código Penal)',
    textoAudio: 'Veja a linha do tempo: No passado aconteceu a ação. No presente surgiu a nova lei. A lei tenta viajar para trás, mas é bloqueada.',
    conteudoPrincipal: (
      <div className="p-5 sm:p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-card via-card to-secondary/30 space-y-4 text-left shadow-md">
        <div className="relative py-3 px-2">
          <div className="h-2 bg-secondary rounded-full w-full relative">
            <div className="absolute left-1/4 -top-2 w-6 h-6 rounded-full bg-purple-500 border-2 border-background shadow-md" />
            <div className="absolute left-3/4 -top-2 w-6 h-6 rounded-full bg-teal-400 border-2 border-background shadow-md" />
          </div>
          <div className="flex justify-between text-xs font-bold text-foreground mt-3">
            <span className="text-purple-300">Passado: Conduta</span>
            <span className="text-teal-300">Presente: Lei Nova</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center font-medium leading-relaxed">
          Considera-se praticado o crime no momento da conduta (ação ou omissão). A lei nova surgida à direita não tem passe livre para punir o ato à esquerda.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 15: O MURO DA IRRETROATIVIDADE
  // ====================================================
  {
    id: 'combo-art1-16',
    ordem: 15,
    fase: '5. Linha do Tempo & Simulador',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 15 · O Muro do Tempo',
    titulo: 'A Barreira de Proteção Penal',
    subtitulo: 'Irretroatividade da lei que prejudica (Lex Gravior)',
    textoAudio: 'O artigo primeiro funciona como um muro impenetrável. A lei que cria crime bate nessa barreira e não tem permissão para olhar para trás.',
    conteudoPrincipal: (
      <div className="p-5 sm:p-6 rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-card to-background text-center space-y-2.5 shadow-md">
        <ShieldCheck className="w-10 h-10 text-rose-400 mx-auto" />
        <h5 className="text-base sm:text-lg font-black text-rose-300">O Muro Temporal Intransponível</h5>
        <p className="text-xs sm:text-sm text-foreground/95 leading-relaxed font-normal">
          A lei penal que prejudica o cidadão é <strong>alérgica ao passado</strong>. Ela nunca pode retroagir para punir quem agiu antes de sua vigência.
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 16: SIMULADOR INTERATIVO CRONOLÓGICO
  // ====================================================
  {
    id: 'combo-art1-17',
    ordem: 16,
    fase: '5. Linha do Tempo & Simulador',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 16 · Simulador Interativo',
    titulo: 'Simulador Cronológico do Artigo 1º',
    subtitulo: 'Alterne os momentos no tempo e veja o resultado jurídico imediato',
    textoAudio: 'Teste no simulador o que acontece quando a conduta ocorre antes ou depois da vigência da lei.',
    conteudoPrincipal: <SimuladorArtigo1Tempo />,
  },

  // ====================================================
  // ETAPA 17: CASO DOS PATINETES (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-20',
    ordem: 17,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 17 · Você é o Juiz',
    titulo: 'Você é o Juiz: O Caso dos Patinetes',
    subtitulo: 'Dilema prático e contemporâneo das grandes cidades',
    nomeArquivo: 'slide_08.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: CASO PRÁTICO MODERNO (Caso dos Patinetes)
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
      <div className="p-5 sm:p-6 rounded-3xl border border-pink-500/40 bg-gradient-to-br from-pink-950/30 via-card to-background space-y-2.5 text-left shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
          <span className="text-base">🛴</span> O Caso de Marcos:
        </span>
        <p className="text-xs sm:text-sm text-foreground/95 leading-relaxed font-normal">
          Marcos andou a 40 km/h de patinete elétrico na calçada em janeiro. Em março, foi sancionada uma nova lei federal punindo patinetes em calçadas com pena de prisão. O promotor denunciou Marcos pelo fato de janeiro. O que você decide como juiz?
        </p>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 18: FLASHCARD 3D - SENTENÇA DOS PATINETES
  // ====================================================
  {
    id: 'combo-art1-21',
    ordem: 18,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 18 · Flashcard de Sentença',
    titulo: 'Toque para revelar a sentença!',
    subtitulo: 'Decisão judicial fundamentada no Artigo 1º do Código Penal',
    textoAudio: 'Toque para girar o cartão e conferir a sentença com base no artigo primeiro.',
    conteudoPrincipal: (
      <FlipCardItem 
        frente="Marcos pode ser punido criminalmente pelo fato praticado em janeiro?"
        verso="NÃO! Em janeiro, andar de patinete na calçada era um fato atípico (não era crime). Pelo Artigo 1º, a lei nova de março não pode retroagir. Denúncia rejeitada e arquivada!"
      />
    ),
  },

  // ====================================================
  // ETAPA 19: MINI-GAME DE LIGAR OS TERMOS (LADO A LADO!)
  // ====================================================
  {
    id: 'combo-art1-19',
    ordem: 19,
    fase: '6. Gamificação & Aplicação Prática',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 19 · Mini-Game de Conexão',
    titulo: 'Ligar os Termos (Lado a Lado)',
    subtitulo: 'Toque no termo da esquerda e conecte com o significado da direita',
    textoAudio: 'Mini game: Conecte os termos jurídicos da esquerda com os seus significados do dia a dia na direita.',
    conteudoPrincipal: (
      <LigarTermosGame 
        pares={[
          { id: '1', termo: 'Anterioridade', significado: 'Lei existindo antes da ação' },
          { id: '2', termo: 'Cominação Legal', significado: 'Pena tabelada previamente' },
          { id: '3', termo: 'Reserva Legal', significado: 'Só Congresso Nacional legisla' },
          { id: '4', termo: 'Fato Atípico', significado: 'Conduta que não é crime' },
        ]}
      />
    ),
  },

  // ====================================================
  // ETAPA 20: ÁRVORE DE DECISÃO EM 3 PASSOS
  // ====================================================
  {
    id: 'combo-art1-22',
    ordem: 20,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 20 · Algoritmo Mental',
    titulo: 'O Algoritmo Mental em 3 Passos',
    subtitulo: 'Como raciocinar com segurança diante de qualquer caso penal',
    textoAudio: 'Siga a árvore de decisão: Alguém agiu? A lei existia antes da ação? Se sim, analisa o crime. Se não, inocente e fato atípico.',
    conteudoPrincipal: (
      <div className="space-y-2.5">
        <div className="p-3.5 rounded-2xl border border-border/80 bg-card text-center font-bold text-xs sm:text-sm text-foreground shadow-sm">
          1. Aconteceu uma conduta humana?
        </div>
        <div className="text-center text-muted-foreground text-xs font-black">↓</div>
        <div className="p-3.5 rounded-2xl border border-teal-500/40 bg-teal-950/25 text-center font-bold text-xs sm:text-sm text-teal-200 shadow-sm">
          2. Existia lei escrita proibindo no exato momento da ação?
        </div>
        <div className="grid grid-cols-2 gap-2.5 pt-1 text-center">
          <div className="p-3 rounded-2xl border border-rose-500/40 bg-rose-950/30 text-rose-200 font-bold text-xs sm:text-sm shadow-sm">
            NÃO ➔ Inocente! (Fato Atípico)
          </div>
          <div className="p-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-bold text-xs sm:text-sm shadow-sm">
            SIM ➔ Prossegue apuração legal
          </div>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 21: DESAFIO FINAL DE FIXAÇÃO
  // ====================================================
  {
    id: 'combo-art1-23',
    ordem: 21,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 21 · Exercício de Desafio',
    titulo: 'Desafio de Fixação Final',
    subtitulo: 'Provando seu domínio completo sobre a matéria',
    textoAudio: 'Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?',
    conteudoPrincipal: (
      <QuizInterativoItem 
        pergunta="Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?"
        opcoes={[
          { texto: "O Congresso criar um crime hoje com vigência para condutas futuras.", correta: false, feedback: "Incorreto! Isso é perfeitamente válido e respeita a anterioridade." },
          { texto: "O juiz aplicar uma pena mais dura criada por lei após o crime ter sido cometido.", correta: true, feedback: "Correto! Aumentar a punição de fatos passados fere a anterioridade da cominação legal (vedação da Lex Gravior)." },
          { texto: "A polícia investigar uma conduta proibida por lei vigente na data do fato.", correta: false, feedback: "Incorreto! Isso é a aplicação regular e normal da lei penal." },
        ]}
      />
    ),
  },

  // ====================================================
  // ETAPA 22: GLOSSÁRIO TÉCNICO DOS 4 PILARES
  // ====================================================
  {
    id: 'combo-art1-24',
    ordem: 22,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: false,
    badge: 'Etapa 22 · Dicionário do Artigo 1º',
    titulo: 'Os 4 Pilares da Legalidade Estrita',
    subtitulo: 'Doutrina clássica: Lex Praevia, Lex Scripta, Lex Stricta e Lex Certa',
    textoAudio: 'Revise os quatro termos que você aprendeu: anterioridade, prévia cominação legal, reserva legal e fato atípico.',
    conteudoPrincipal: (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
        <div className="p-3.5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-xs sm:text-sm font-black">1. Lex Praevia (Anterioridade):</strong>
          <p className="text-xs text-foreground/90 font-medium leading-relaxed">A lei tem que nascer antes da prática da ação.</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-xs sm:text-sm font-black">2. Lex Scripta (Reserva Legal):</strong>
          <p className="text-xs text-foreground/90 font-medium leading-relaxed">Só lei escrita aprovada no Congresso Nacional cria crimes.</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-xs sm:text-sm font-black">3. Lex Stricta (Taxatividade):</strong>
          <p className="text-xs text-foreground/90 font-medium leading-relaxed">Proibido inventar crimes por analogia ou semelhança.</p>
        </div>
        <div className="p-3.5 rounded-2xl border border-teal-500/30 bg-card space-y-1 shadow-sm">
          <strong className="text-teal-400 block text-xs sm:text-sm font-black">4. Lex Certa (Clareza do Tipo):</strong>
          <p className="text-xs text-foreground/90 font-medium leading-relaxed">A lei tem que ser clara e precisa, sem termos vagos.</p>
        </div>
      </div>
    ),
  },

  // ====================================================
  // ETAPA 23: TROFÉU DE MAESTRIA (COM IMAGEM)
  // ====================================================
  {
    id: 'combo-art1-25',
    ordem: 23,
    fase: '7. Síntese & Maestria',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    temImagemRepresentativa: true,
    badge: 'Etapa 23 · Troféu de Maestria',
    titulo: 'Parabéns! Trilha Concluída com Sucesso',
    subtitulo: 'Você dominou o Artigo 1º do Código Penal',
    nomeArquivo: 'slide_09.jpg',
    imagePrompt: montarPromptFinalDesign(`TIPO DE CARD: FECHAMENTO & TROFÉU DE MAESTRIA
TÍTULO DECLARATIVO: Conquista de maestria: Artigo 1º dominado
TEXTO DE APOIO: Você concluiu as etapas com anatomia da lei, história, casos reais, simulador e exercícios práticos.

CENA PRINCIPAL E COMPOSIÇÃO:
- Foco à direita: monumento solene de troféu dourado esculpido em formato de balança da justiça clássica sobre pedestal de mármore e capitel de coluna grega, com contorno branco grosso recortado e acabamento de colagem editorial premium;
- Folhas de louro douradas da vitória e carimbo oficial "CERTIFICADO DE MAESTRIA PENAL" em recorte com contorno branco;
- Fundo vermelho obrigatório em gradiente 135° (hsl(350 68% 32%) a hsl(348 80% 50%)) com linhas pretas finas de celebração clássica e textura forense;
- Espaço nobre à esquerda para os parabéns e encerramento da jornada com alto impacto.`),
    imagePromptPt: 'Troféu monumental dourado de balança da justiça e colunas gregas com folhas de louro e carimbo de maestria em colagem recortada com contorno branco grosso, fundo vermelho gradiente 135°.',
    descricaoCena: 'Troféu de maestria comemorativo da conclusão das etapas do Artigo 1º.',
    textoAudio: 'Parabéns! Você concluiu com sucesso a trilha master do artigo primeiro do Código Penal. Você agora compreende esse pilar da justiça com total clareza.',
    conteudoPrincipal: (
      <div className="p-6 sm:p-7 rounded-3xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-3.5 shadow-xl">
        <Award className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400 mx-auto animate-pulse" />
        <h4 className="text-xl sm:text-2xl font-black text-foreground">Mestre do Artigo 1º</h4>
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
          Você completou a trilha com introdução rápida, história, casos reais (Dona Clara e os Patinetes), analogia do futebol, simulador temporal, ligar de termos e exercícios de fixação!
        </p>
      </div>
    ),
  },
];
