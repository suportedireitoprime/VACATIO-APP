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
    imagePrompt: 'Modern clean 3D legal conceptual illustration, imposing glowing golden hourglass resting on dark marble timeline pedestal, glowing scales of justice emitting warm amber and teal luminescence, dark slate graphite background (#090d16), cinematic lighting, high contrast, elegant minimalism, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Ampulheta dourada brilhante sobre pedestal de mármore com balança da justiça emitindo luz âmbar e azul-petróleo, fundo grafite escuro minimalista, sem texto, proporção 16:9.',
    descricaoCena: 'Capa solene do Artigo 1º e a anterioridade penal.',
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
    imagePrompt: 'High-detail cinematic illustration, ancient medieval monarch throne room fading into deep shadows, contrasted with illuminated quill parchment manuscripts and open Enlightenment law books glowing with golden wisdom light, dark slate graphite background (#090d16), deep amber and teal neon highlights, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Trono medieval absolutista nas sombras contrastado com livros iluministas de leis abertos emanando luz dourada, simbolizando Cesare Beccaria e a vitória da lei escrita, proporção 16:9.',
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
    imagePrompt: 'A stylized 3D conceptual illustration of a glowing antique golden codex of Brazilian Penal Law resting on a dark marble pedestal, surrounded by four solid crystalline pillars representing fundamental constitutional clauses, dark slate background (#090d16), cinematic lighting, high contrast, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Livro do Código Penal dourado brilhante em um pedestal de mármore protegido por quatro pilares de cristal que representam cláusulas pétreas da Constituição, proporção 16:9.',
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
    imagePrompt: 'Futuristic legal design timeline metaphor, an illuminated horizontal neon timeline ruler on dark slate surface with a glowing marker showing Point of Action, left side locked in impenetrable bronze blocks, right side clear illuminated path, golden legal shield blocking retroactive reach, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Linha do tempo iluminada em neon mostrando o ponto exato da ação, com o passado bloqueado por bronze maciço e o futuro aberto com um escudo protetor, proporção 16:9.',
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
    imagePrompt: 'Minimalist 3D conceptual illustration of a municipal government desk with an unauthorized local mayoral decree stamped in red, countered by an authoritative glowing federal seal of the National Congress shining brightly, dark slate background, volumetric teal rim light, zero text, 16:9 widescreen.',
    imagePromptPt: 'Mesa com decreto municipal carimbado em vermelho barrado pelo selo luminoso federal do Congresso Nacional, mostrando que prefeitos não criam crimes, proporção 16:9.',
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
    imagePrompt: 'Conceptual 3D architectural render, balanced stone justice pedestal displaying measured brass calibrated weights and transparent crystal prison bars with precise millimeter markings, signifying strictly predetermined statutory penalties, deep teal and amber lighting, dark slate background, elegant minimalism, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Pedestal de justiça com pesos de latão calibrados e barras de cristal com marcações precisas, simbolizando a pena prévia fixada por lei e a proibição de penas inventadas, proporção 16:9.',
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
    imagePrompt: 'Futuristic holographic 3D card floating in mid-air and rotating in space, glowing with dual-color aura (cyan front, amber back), showcasing legal precision symbols with floating geometric light particles, dark studio background, cinematic lighting, zero text, 16:9 widescreen.',
    imagePromptPt: 'Cartão holográfico 3D flutuando no ar girando no espaço com aura ciano e âmbar, simbolizando memorização ativa da cominação legal, proporção 16:9.',
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
    imagePrompt: 'A warm, realistic illustration of a friendly elderly Brazilian woman (Dona Clara, 68) in a cozy traditional neighborhood herbal tea store, glass jars of medicinal chamomile herbs neatly displayed on rustic wooden shelves, warm cinematic lighting, highly detailed legal storytelling, 16:9 widescreen, zero text.',
    imagePromptPt: 'Dona Clara (68 anos) em sua quitanda tradicional de bairro acolhedora, com potes de vidro de chás de camomila em prateleiras de madeira rústica, iluminação quente e cinematográfica, sem texto, proporção 16:9.',
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
    imagePrompt: 'Cinematic 3D render of the Brazilian Federal Senate chamber and modern legislative halls in Brasilia, modern gavel striking a mahogany sound block under dramatic spotlights, illuminated digital official gazette tablet glowing, 16:9 widescreen, dark cinematic atmosphere, zero text.',
    imagePromptPt: 'Plenário legislativo em Brasília com martelo de juiz batendo sob holofotes e tablet iluminado exibindo publicação no Diário Oficial, proporção 16:9.',
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
    imagePrompt: 'Tense cinematic scene in a small storefront, a stern government inspector in formal uniform holding a clipboard and pen confronting the shop counter, dramatic shadows, warm indoor lighting clashing with cool inspector spotlight, highly detailed narrative tension, 16:9 widescreen, zero text.',
    imagePromptPt: 'Fiscal severo uniformizado com prancheta confrontando o balcão da loja em cena de tensão dramática, iluminação de contraste, sem texto, proporção 16:9.',
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
    imagePrompt: 'Heroic cinematic visual metaphor, a giant translucent golden shield of law materializing inside the cozy storefront, gently repelling the inspector summons, warm relief light illuminating the relieved elderly shopkeeper, dark background, cinematic volumetric teal and amber glow, 16:9 widescreen, zero text.',
    imagePromptPt: 'Escudo dourado translúcido da lei materializando-se e protegendo a idosa quitandeira contra a notificação injusta, transmitindo alívio e justiça, proporção 16:9.',
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
    imagePrompt: 'Modern digital communication concept, two elegant glowing smartphone screens floating in a dark studio, emitting soft green and cyan luminescence, subtle chat dialogue waveforms in the air, symbolizing rapid legal guidance and friendly modern mentoring, dark graphite background, 16:9 widescreen, zero text.',
    imagePromptPt: 'Dois smartphones elegantes flutuando no ar emitindo luz verde e ciano suave com ondas de diálogo no ar, simbolizando mentoria jurídica moderna por chat, proporção 16:9.',
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
    imagePrompt: 'Dynamic cinematic conceptual visual, a night football stadium under bright floodlights, a referee pointing a red card at an empty penalty box where glowing historical footprints fade away, symbolizing the absurdity of creating new retroactive rules mid-match, dark sports atmosphere, 16:9 widescreen, zero text.',
    imagePromptPt: 'Estádio de futebol à noite sob holofotes com árbitro apontando cartão vermelho para pegadas do passado, simbolizando o absurdo de inventar regras retroativas no meio do jogo, proporção 16:9.',
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
    imagePrompt: 'Clean modern 3D illustration, iconic Brazilian National Congress twin towers and dome architecture glowing in pure white and cyan, with lower bureaucratic documents (municipal decrees, state stamps) blocked by an impenetrable golden energy barrier, dark slate background, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Congresso Nacional de Brasília iluminado em ciano com documentos municipais barrados por barreira de energia dourada, ilustrando a reserva legal privativa, proporção 16:9.',
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
    imagePrompt: 'Sleek high-tech chronological timeline floating in space, illuminated calendar milestones with historical past in deep purple shadow and present legislative action in bright cyan laser line, an irreversible arrow pointing forward, dark cosmic graphite background, 16:9 widescreen, zero text.',
    imagePromptPt: 'Linha do tempo cronológica flutuando no espaço com marcos em roxo no passado e linha ciano no presente com seta apontando para a frente, proporção 16:9.',
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
    imagePrompt: 'Imposing fortress-like monolithic dark stone wall splitting time, on the left side peaceful citizens walk freely in daylight, on the right side a turbulent thunderstorm of new penal sanctions crashes against the impenetrable wall without crossing, 16:9 widescreen, dramatic cinematic contrast, zero text.',
    imagePromptPt: 'Muro monolítico impenetrável de pedra dividindo o tempo: de um lado cidadãos em paz e do outro a tempestade da nova lei que não consegue atravessar, proporção 16:9.',
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
    imagePrompt: 'Futuristic interactive holographic time control interface, luminous sliders and glowing temporal dials in vibrant teal and neon amber, floating transparent chronometer clock gears in a clean dark laboratory, 16:9 widescreen, sophisticated UI concept, zero text.',
    imagePromptPt: 'Interface holográfica interativa de controle do tempo com controles deslizantes e engrenagens de cronômetro transparentes brilhantes, proporção 16:9.',
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
    imagePrompt: 'Conceptual 3D legal scale, a heavy iron spiked weight representing a harsher 10-year penalty being restrained by a golden constitutional chain, allowing only the original lighter 1-year calibrated weight to apply, dark studio lighting, high contrast, 16:9 widescreen, zero text.',
    imagePromptPt: 'Balança conceitual com um peso pesado de espinhos contido por uma corrente dourada constitucional, mantendo apenas o peso original mais leve, proporção 16:9.',
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
    imagePrompt: 'Gamified puzzle design, luminous floating geometric circuit nodes connecting with bright laser links across dark space, glowing puzzle pieces snapping together in harmonious teal, gold, and magenta light, modern gaming aesthetics, 16:9 widescreen, zero text.',
    imagePromptPt: 'Nódulos geométricos brilhantes conectando-se por feixes de laser em espaço escuro com peças de quebra-cabeça encaixando-se em luz ciano e dourada, proporção 16:9.',
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
    imagePrompt: 'Cinematic urban scene, a young man riding a modern electric scooter on a wide city sidewalk at dusk, framed through the majestic perspective of a judge mahogany bench with a polished gavel and open law books in the foreground, 16:9 widescreen, moody twilight atmosphere, zero text.',
    imagePromptPt: 'Cena urbana com jovem andando de patinete elétrico na calçada da cidade ao entardecer, visto a partir da perspectiva da bancada do juiz com martelo no primeiro plano, proporção 16:9.',
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
    imagePrompt: 'A magnificent glowing 3D judicial verdict seal spinning slowly in deep space, emblazoned with a radiant laurel wreath of acquittal and scales of justice, emerald green aura radiating authority and justice, 16:9 widescreen, cinematic lighting, zero text.',
    imagePromptPt: 'Selo judicial 3D brilhante com coroa de louros de absolvição e balança da justiça girando no espaço com aura esmeralda de autoridade, proporção 16:9.',
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
    imagePrompt: 'Clean architectural mind map algorithm, illuminated branching glass pathways forming a precise logic decision tree, glowing decision nodes pulsing with cyan and emerald light against dark slate graphite, elegant flowchart aesthetic, 16:9 widescreen, zero text.',
    imagePromptPt: 'Árvore de decisão lógica com caminhos de vidro iluminados e nódulos pulsando em ciano e esmeralda em fundo grafite escuro, proporção 16:9.',
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
    imagePrompt: 'Dramatic quiz arena concept, a radiant crystal podium with a floating question mark jewel crowned by scales of justice, pulsing with amber and deep blue tournament lighting, clean gaming geometry, 16:9 widescreen, zero text.',
    imagePromptPt: 'Arena de desafio com pódio de cristal radiante e joia luminosa coroada pela balança da justiça em iluminação esportiva âmbar e azul profundo, proporção 16:9.',
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
    imagePrompt: 'A set of four glowing geometric crystal keystones resting on dark velvet slate, each crystal pulsing with distinct jewel tones (emerald, sapphire, amber, amethyst), representing the four mastered legal concepts, 16:9 widescreen, elegant minimalism, zero text.',
    imagePromptPt: 'Quatro pedras fundamentais de cristal brilhando em veludo grafite escuro, cada uma pulsando em um tom de joia diferente, representando os 4 termos dominados, proporção 16:9.',
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
    imagePrompt: 'A magnificent golden master trophy cup shaped like classical scales of justice, radiating brilliant golden light beams, floating above a dark marble victory pedestal surrounded by celebratory sparkling amber and teal light particles, 16:9 widescreen, cinematic victory lighting, zero text.',
    imagePromptPt: 'Troféu dourado esculpido como a balança da justiça flutuando sobre pedestal de mármore com feixes de luz dourada e partículas festivas em celebração, proporção 16:9.',
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
