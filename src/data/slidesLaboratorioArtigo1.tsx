import React from 'react';
import { 
  ShieldCheck, 
  Scale, 
  BookOpen, 
  Clock, 
  Gavel, 
  Landmark, 
  Laptop, 
  Cpu, 
  FileSearch, 
  AlertTriangle, 
  HelpCircle, 
  Award,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export interface SlideLaboratorioRico {
  id: string;
  ordem: number;
  fase: string;
  dispositivoId: string;
  dispositivoLabel: string;
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
  // ----------------------------------------------------
  // SLIDE 1: INTRODUÇÃO - O PODER MAIS PESADO DO ESTADO
  // ----------------------------------------------------
  {
    id: 'art1_slide_1',
    ordem: 1,
    fase: '1. Introdução Geral',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 1: Introdução · Etapa 1 de 12',
    titulo: 'O Poder Mais Drástico do Estado',
    subtitulo: 'Por que o Direito Penal precisa de uma muralha protetora antes de qualquer punição?',
    nomeArquivo: 'slide_01.jpg',
    imagePrompt: 'Modern clean digital illustration, conceptual legal design metaphor, imposing glowing iron fortress gate of justice at twilight, a solitary citizen safely shielded behind an illuminated crystal barrier, glowing scales of justice emitting warm amber and teal luminescence, dark slate graphite background (#090d16), cinematic lighting, high contrast, elegant minimalism, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Portão imponente de ferro da justiça com uma barreira protetora de cristal protegendo um cidadão, balança iluminada em âmbar e azul-petróleo, fundo grafite escuro minimalista, sem texto, proporção 16:9.',
    descricaoCena: 'A muralha de proteção do cidadão contra o poder punitivo do Estado.',
    textoAudio: 'Bem-vindo ao estudo do Artigo primeiro do Código Penal. O Direito Penal tem o poder mais severo do Estado: ele pode tirar a sua liberdade e trancá-lo em uma cela. Por isso, a sociedade criou uma muralha rígida para impedir abusos de poder.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>O Peso da Sanção Penal</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            Apenas o Direito Penal Pode Retirar a Liberdade Humana
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            No Direito Civil, discutem-se dívidas, contratos e indenizações financeiras. No Direito de Família, divórcios e pensões. Mas apenas o <strong>Direito Penal</strong> possui a prerrogativa de prender e isolar um cidadão do convívio social.
          </p>
          <div className="p-3 rounded-xl bg-background/60 border border-border/60 text-xs text-foreground/90 space-y-1">
            <strong>O perigo do arbítrio:</strong>
            <p className="text-muted-foreground">
              Se governantes ou juízes pudessem criar punições sem regras prévias, qualquer pessoa poderia ser encarcerada por perseguição política, desafeto pessoal ou capricho do governante da vez.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-secondary/30 flex items-center gap-3 text-xs text-foreground">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            É por isso que o Código Penal começa com um <strong>escudo de proteção</strong> e garantia da liberdade: o <strong>Artigo 1º</strong>.
          </span>
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 2: RAÍZES HISTÓRICAS - O FIM DO ABSOLUTISMO
  // ----------------------------------------------------
  {
    id: 'art1_slide_2',
    ordem: 2,
    fase: '1. Introdução Geral',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 1: Introdução · Etapa 2 de 12',
    titulo: 'De Onde Veio Essa Regra? O Fim da Tirania Real',
    subtitulo: 'Como Cesare Beccaria e os filósofos do Iluminismo revolucionaram a justiça em 1764',
    nomeArquivo: 'slide_02.jpg',
    imagePrompt: 'High-detail cinematic illustration, an ancient medieval monarch throne room fading into deep shadows, contrasted with illuminated quill parchment manuscripts and open Enlightenment law books glowing with golden wisdom light, symbolizing the historic triumph of codified statutory law over royal caprice, dark slate graphite background (#090d16), deep amber and teal neon highlights, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Trono medieval absolutista nas sombras contrastado com livros iluministas de leis abertos emanando luz dourada, simbolizando o fim da tirania dos reis e a vitória da lei escrita, proporção 16:9.',
    descricaoCena: 'A transição histórica da vontade arbitrária dos reis para a lei democrática escrita.',
    textoAudio: 'Na Idade Média e nas monarquias absolutistas, o rei inventava crimes na hora da refeição para punir quem não gostava. Filósofos como Cesare Beccaria mudaram isso para sempre ao exigir que todo crime e pena estivessem previamente escritos em livros de leis.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <BookOpen className="w-4 h-4" />
            <span>A Revolução Iluminista</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            O Fim do Arbítrio dos Reis Absolutistas
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Durante séculos, não havia um Código Penal. Se um nobre não gostasse de uma piada ou se um cidadão usasse roupas inadequadas, o monarca podia mandar enforcar na mesma hora, inventando que aquilo era crime de lesa-majestade.
          </p>
          <div className="p-3.5 rounded-xl bg-background/70 border border-amber-500/20 text-xs space-y-1.5">
            <p className="font-serif italic text-foreground text-sm">
              “Só as leis podem decretar as penas sobre os delitos; e esta autoridade só pode residir no legislador, que representa toda a sociedade.”
            </p>
            <span className="text-[11px] text-amber-400 font-bold block text-right">
              — Cesare Beccaria (Dos Delitos e das Penas, 1764)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground space-y-1">
          <strong className="text-foreground">A máxima latina de Feuerbach:</strong>
          <p className="font-mono text-teal-300 font-semibold">
            Nullum crimen, nulla poena sine praevia lege
          </p>
          <p className="text-[11px]">
            Não há crime, nem castigo de pena, sem prévia existência de uma lei formal.
          </p>
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 3: O TEXTO OFICIAL E CLÁUSULA PÉTREA
  // ----------------------------------------------------
  {
    id: 'art1_slide_3',
    ordem: 3,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 2: Anatomia da Lei · Etapa 3 de 12',
    titulo: 'As Duas Frases que Sustentam a Justiça Brasileira',
    subtitulo: 'Decreto-Lei nº 2.848/1940 — Artigo 1º Oficial e Cláusula Pétrea da CF/88',
    nomeArquivo: 'slide_03.jpg',
    imagePrompt: 'A stylized 3D conceptual illustration of a glowing antique golden codex of Brazilian Penal Law resting on a dark marble pedestal, surrounded by four solid crystalline pillars representing fundamental constitutional clauses, ethereal cyan and amber light beams, minimalist dark slate background (#090d16), cinematic lighting, high contrast, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Livro do Código Penal dourado brilhante em um pedestal de mármore protegido por quatro pilares de cristal que representam cláusulas pétreas da Constituição, proporção 16:9.',
    descricaoCena: 'O texto sagrado do Artigo 1º como cláusula pétrea intocável da República.',
    textoAudio: 'Artigo primeiro: Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal. Apenas duas frases curtas, mas que sustentam toda a justiça penal brasileira e nunca podem ser revogadas por serem cláusula pétrea.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-6 sm:p-7 rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-card to-background text-center space-y-3.5 shadow-lg">
          <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 inline-block">
            Texto Oficial da Lei (Art. 1º)
          </span>
          <p className="font-serif text-lg sm:text-xl md:text-2xl text-foreground italic leading-relaxed px-2">
            “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
          </p>
          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground font-semibold">
              Código Penal (DL 2.848/1940)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-secondary text-teal-400 font-semibold">
              CF/88 Art. 5º, XXXIX
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-secondary/30 text-xs space-y-1.5">
          <strong className="text-foreground flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-teal-400" />
            Por que é uma Cláusula Pétrea?
          </strong>
          <p className="text-muted-foreground leading-relaxed">
            Nem mesmo todos os deputados e senadores juntos poderiam aprovar uma emenda constitucional para apagar essa regra. Ela é uma garantia individual irrevogável da pessoa humana.
          </p>
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 4: ANATOMIA DA 1ª PARTE - ANTERIORIDADE
  // ----------------------------------------------------
  {
    id: 'art1_slide_4',
    ordem: 4,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 2: Anatomia da Lei · Etapa 4 de 12',
    titulo: '1ª Metade: “...sem lei anterior que o defina”',
    subtitulo: 'A conduta precisa estar proibida no exato instante em que é cometida',
    nomeArquivo: 'slide_04.jpg',
    imagePrompt: 'Futuristic legal design timeline metaphor, an illuminated horizontal neon timeline ruler on dark slate surface with a glowing marker showing Point of Action, left side locked in impenetrable bronze blocks (past is safe), right side clear illuminated path, golden legal shield blocking retroactive reach, cinematic teal and cyan highlights, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Linha do tempo iluminada em neon mostrando o ponto exato da ação, com o passado bloqueado por bronze maciço e o futuro aberto com um escudo protegendo contra leis retroativas, proporção 16:9.',
    descricaoCena: 'A linha do tempo do princípio da anterioridade da lei penal.',
    textoAudio: 'A primeira metade do artigo é clara: Não há crime sem lei anterior. Isso significa que você só pode cometer um crime se a conduta já estava proibida em lei no exato segundo em que agiu. Ninguém pode ser pego de surpresa no futuro.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Princípio da Anterioridade Estrita</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            A Lei Nunca Pode “Pegar de Surpresa” Quem Agiu Ontem
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Se você fez algo hoje que é imoral ou visto como feio por algumas pessoas, mas <strong>não existe lei federal proibindo</strong>, você praticou uma conduta lícita perante a esfera penal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <div className="p-3 rounded-xl bg-background/60 border border-emerald-500/20 text-xs space-y-1">
              <span className="text-emerald-400 font-bold">No Dia da Ação (T0):</span>
              <p className="text-muted-foreground">
                Ato praticado sem proibição legal = <strong>Ato 100% inocente e impunível</strong>.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-red-500/20 text-xs space-y-1">
              <span className="text-red-400 font-bold">Semana Seguinte (T1):</span>
              <p className="text-muted-foreground">
                Publicada nova lei criminalizando = <strong>Só vale para ações futuras dali em diante!</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          💡 <strong>Regra de ouro:</strong> A lei penal incriminadora (que cria crimes ou agrava penas) <strong>jamais retroage</strong> para atingir fatos passados.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 5: ANATOMIA DA 2ª PARTE - COMINAÇÃO DA PENA
  // ----------------------------------------------------
  {
    id: 'art1_slide_5',
    ordem: 5,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 2: Anatomia da Lei · Etapa 5 de 12',
    titulo: '2ª Metade: “...sem prévia cominação legal”',
    subtitulo: 'O que significa cominação e por que o juiz não pode inventar punições da própria cabeça?',
    nomeArquivo: 'slide_05.jpg',
    imagePrompt: 'Conceptual 3D architectural render, balanced stone justice pedestal displaying measured brass calibrated weights and transparent crystal prison bars with precise millimeter markings, signifying strictly predetermined statutory penalties, deep teal and amber lighting, dark slate background, elegant minimalism, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Pedestal de justiça com pesos de latão milimetricamente calibrados e barras de cristal com marcações precisas, simbolizando a pena prévia fixada por lei e a proibição de penas inventadas, proporção 16:9.',
    descricaoCena: 'A precisão matemática das penas tabeladas por lei antes do julgamento.',
    textoAudio: 'Segunda metade do artigo: Não há pena sem prévia cominação legal. Cominação significa previsão de castigo. O juiz não pode inventar castigos da cabeça dele no dia do julgamento. A pena mínima e máxima já tem que estar escrita na lei.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Gavel className="w-4 h-4" />
            <span>O Castigo Tabelado em Lei</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            O Juiz Está Amarrado aos Limites da Lei
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            A palavra <strong>cominação</strong> significa a fixação prévia da sanção punitiva. Não basta a lei dizer que algo é crime; ela é <strong>obrigada</strong> a dizer qual é o tipo de pena e os limites exatos (ex: 1 a 4 anos de reclusão e multa).
          </p>

          <div className="p-3.5 rounded-xl bg-background/60 border border-teal-500/20 text-xs space-y-2">
            <strong className="text-teal-300">O que o magistrado NÃO pode fazer:</strong>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Inventar uma pena que não existe (ex: mandar carpir lote ou proibir celular sem previsão legal).</li>
              <li>Ultrapassar a pena máxima prevista pela lei para o crime.</li>
              <li>Aplicar pena sem fundamentar dentro dos critérios estritos do Código Penal.</li>
            </ul>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          ⚖️ Todo cidadão tem o direito de saber <strong>exatamente o custo penal</strong> da infração antes de cometer qualquer ato.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 6: EXCLUSIVIDADE FEDERAL - QUEM CRIA CRIMES?
  // ----------------------------------------------------
  {
    id: 'art1_slide_6',
    ordem: 6,
    fase: '2. Anatomia da Lei',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 2: Anatomia da Lei · Etapa 6 de 12',
    titulo: 'Quem Tem o Poder de Criar um Crime no Brasil?',
    subtitulo: 'Prefeitos, governadores e delegados não possuem esse poder (CF/88, Art. 22, I)',
    nomeArquivo: 'slide_06.jpg',
    imagePrompt: 'Clean modern 3D illustration, iconic Brazilian National Congress twin towers and dome architecture glowing in pure white and cyan, with lower bureaucratic documents (municipal decrees, state stamps) blocked by an impenetrable golden energy barrier, illustrating exclusive federal legislative authority for penal law, dark slate background (#090d16), 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Arquitetura do Congresso Nacional de Brasília iluminada em ciano e branco com carimbos e decretos municipais bloqueados por uma barreira dourada de energia, mostrando a exclusividade federal penal, proporção 16:9.',
    descricaoCena: 'A exclusividade do Congresso Nacional para editar leis penais.',
    textoAudio: 'Quem tem o poder de criar crimes no Brasil? Apenas o Congresso Nacional, com deputados e senadores. Prefeitos e governadores não podem criar crimes por decreto. E nem o Presidente pode criar crimes por Medida Provisória.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Landmark className="w-4 h-4" />
            <span>Competência Constitucional Privativa</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            Apenas Lei Federal Aprovada no Congresso Nacional
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            De acordo com o Art. 22, inciso I, da Constituição Federal, compete <strong>privativamente à União</strong> legislar sobre Direito Penal.
          </p>

          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-xs flex items-center justify-between">
              <span className="font-semibold text-foreground">Decreto de Prefeito Municipal:</span>
              <span className="text-red-400 font-bold">NÃO pode criar crime</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-xs flex items-center justify-between">
              <span className="font-semibold text-foreground">Portaria de Secretário / Delegado:</span>
              <span className="text-red-400 font-bold">NÃO pode criar crime</span>
            </div>
            <div className="p-2.5 rounded-lg bg-background/60 border border-border/60 text-xs flex items-center justify-between">
              <span className="font-semibold text-foreground">Medida Provisória (Presidente da República):</span>
              <span className="text-red-400 font-bold">VEDADA pela CF/88 (Art. 62)</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          🛡️ Se um prefeito publicar um decreto dizendo que jogar lixo no chão dá 2 anos de cadeia, esse decreto é <strong>nulo e inconstitucional</strong>.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 7: CASO REAL 1 - PRIMEIROS HACKERS E LEI CAROLINA DIECKMANN
  // ----------------------------------------------------
  {
    id: 'art1_slide_7',
    ordem: 7,
    fase: '3. Casos Reais',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 3: Casos Reais · Etapa 7 de 12',
    titulo: 'O Caso Real dos Primeiros Hackers no Brasil',
    subtitulo: 'Como o surgimento da internet colocou o Artigo 1º à prova',
    nomeArquivo: 'slide_07.jpg',
    imagePrompt: 'Cinematic modern digital illustration, a glowing transparent laptop screen displaying digital biometric code streams and unauthorized server breach alerts, intertwined with traditional classic legal gavel and open penal statutes book, cyber forensics aesthetic, dark navy and cyan neon tones, high contrast, minimalist background, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Tela de notebook transparente brilhante mostrando códigos e alertas de invasão digital entrelaçada com um martelo da justiça clássico de madeira e livros penais, estética de perícia cibernética, proporção 16:9.',
    descricaoCena: 'A colisão entre os novos crimes cibernéticos e o Código Penal antigo de 1940.',
    textoAudio: 'Nos anos dois mil, hackers começaram a invadir computadores alheios. Mas o Código Penal de 1940 não previa o crime de invadir computador. A polícia e os juízes não puderam prender ninguém por invasão até que o Congresso aprovasse a Lei Carolina Dieckmann em 2012.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Laptop className="w-4 h-4" />
            <span>Tecnologia vs. Código de 1940</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            Por Que os Primeiros Invasores de PC Não Foram Presos por Invasão?
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Quando a internet popularizou-se no Brasil, pessoas invadiam computadores alheios e copiavam dados confidenciais. As vítimas iam à delegacia, mas o Código Penal de 1940 só falava em <em>arrombamento de residência física</em> e <em>violação de cartas de papel</em>.
          </p>

          <div className="p-3.5 rounded-xl bg-background/60 border border-cyan-500/20 text-xs space-y-2">
            <strong className="text-cyan-300">O dilema dos delegados e promotores:</strong>
            <p className="text-muted-foreground leading-relaxed">
              Eles não podiam esticar a lei dizendo que computador é como uma "casa virtual". O Artigo 1º proíbe criar crimes por semelhança!
            </p>
            <div className="p-2.5 rounded-lg bg-secondary/80 border border-border/60 text-[11px] text-foreground font-semibold">
              Foi preciso criar a Lei nº 12.737/2012 (Art. 154-A do CP). Quem invadiu antes dessa lei em 2012 não pôde ser punido por invasão cibernética.
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          ⚖️ O Artigo 1º protege até quem comete atos imorais novos, para garantir que o Estado não crie crimes sem lei.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 8: CASO REAL 2 - INTELIGÊNCIA ARTIFICIAL E DEEPFAKES
  // ----------------------------------------------------
  {
    id: 'art1_slide_8',
    ordem: 8,
    fase: '3. Casos Reais',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 3: Casos Reais · Etapa 8 de 12',
    titulo: 'O Desafio da Inteligência Artificial e Deepfakes',
    subtitulo: 'Por que a sociedade prefere a impunidade momentânea ao risco da tirania dos juízes?',
    nomeArquivo: 'slide_08.jpg',
    imagePrompt: 'Futuristic conceptual digital artwork, a holographic neural network face shifting identities (deepfake concept) confronted by a transparent luminous boundary of codified legal statutes, representing ethical dilemmas meeting strict legality principles, deep dark aesthetic (#090d16), vibrant cyan and magenta neon glowing outlines, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Rosto holográfico de inteligência artificial mudando de identidade representando deepfakes diante de uma barreira luminosa de artigos de lei, simbolizando os novos desafios da tecnologia, proporção 16:9.',
    descricaoCena: 'A velocidade exponencial da IA contra a necessária cautela da lei penal escrita.',
    textoAudio: 'Hoje surgem crimes com inteligência artificial, como clonagem de voz e deepfakes. A sociedade prefere deixar uma conduta reprovável impune temporariamente do que dar aos juízes o poder de criar crimes fora da lei escrita.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Fronteira Tecnológica</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            O Preço que Pagamos Pela Nossa Liberdade
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Se amanhã surgir uma nova tecnologia capaz de teletransportar objetos e alguém subtrair um bem sem contato físico, a Justiça terá que analisar se enquadra perfeitamente no furto ou se exige uma nova lei específica do Congresso.
          </p>

          <div className="p-3.5 rounded-xl bg-background/60 border border-purple-500/20 text-xs space-y-2">
            <strong className="text-purple-300">A pergunta que todo cidadão deve fazer:</strong>
            <p className="text-muted-foreground italic">
              “Você preferiria que um juiz pudesse decidir sozinho o que é crime amanhã para punir um golpista de IA, ou prefere a certeza de que ninguém pode inventar um crime contra você?”
            </p>
            <p className="text-foreground/90 font-medium text-[11px]">
              O Direito Penal escolheu a <strong>segurança jurídica de todos nós</strong>.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          🛡️ Sem lei prévia, não há processo penal. A liberdade do cidadão é a regra prioritária.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 9: O PRINCÍPIO DA TAXATIVIDADE - LEIS CLARAS
  // ----------------------------------------------------
  {
    id: 'art1_slide_9',
    ordem: 9,
    fase: '4. Garantias Críticas',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 4: Garantias Críticas · Etapa 9 de 12',
    titulo: 'A Lei Deve Ser Clara como Cristal (Taxatividade)',
    subtitulo: 'Por que leis penais vagas ou genéricas são inconstitucionais?',
    nomeArquivo: 'slide_09.jpg',
    imagePrompt: 'Conceptual legal art, razor-sharp laser etched text on crystal prism tablet compared against a blurry chaotic fog mist, demonstrating crystalline legal precision versus dangerous ambiguity, glowing amber focus lens, dark minimalist environment, high contrast, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Prisma de cristal com inscrições a laser afiadas e cristalinas ao lado de uma névoa turva e confusa, demonstrando a precisão cirúrgica da lei penal contra a ambiguidade perigosa, proporção 16:9.',
    descricaoCena: 'A precisão cirúrgica do princípio da taxatividade da lei penal.',
    textoAudio: 'Não basta que a lei seja anterior. Ela também precisa ser clara e precisa. Esse é o Princípio da Taxatividade. Uma lei que dissesse que é crime agir de forma inadequada seria nula, porque ninguém saberia o que é inadequado.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <FileSearch className="w-4 h-4" />
            <span>Princípio da Taxatividade (Lex Certa)</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            Proibição de Tipos Penais Abertos ou Ambíguos
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Imagine se existisse a seguinte lei: <em>“Artigo X. É crime comportar-se de maneira inadequada em repartição pública. Pena: 2 a 5 anos.”</em>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-xs space-y-1">
              <span className="text-red-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Lei Vaga (Ilegal):
              </span>
              <p className="text-muted-foreground text-[11px]">
                “Agir de forma inadequada” — abre brecha para o policial prender quem ele não gosta.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Lei Taxativa (Correta):
              </span>
              <p className="text-muted-foreground text-[11px]">
                “Desacatar funcionário público no exercício da função” — verbo claro e conduta delimitada.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          🔍 A lei penal precisa descrever o ato com a precisão de um cirurgião: quem, como e onde.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 10: PROIBIÇÃO DE ANALOGIA PREJUDICIAL
  // ----------------------------------------------------
  {
    id: 'art1_slide_10',
    ordem: 10,
    fase: '4. Garantias Críticas',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 4: Garantias Críticas · Etapa 10 de 12',
    titulo: 'Proibição de Analogia Prejudicial (In Malam Partem)',
    subtitulo: 'O juiz é expressamente proibido de comparar condutas parecidas para punir',
    nomeArquivo: 'slide_10.jpg',
    imagePrompt: 'Conceptual 3D legal metaphor, two divergent pathways made of polished dark obsidian stone, one illuminated in green with benevolent open gates, the other blocked by heavy crossbars with danger signs preventing judicial expansion, signifying strict ban on in malam partem analogy, dark slate background (#090d16), cinematic lighting, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Dois caminhos divergentes de pedra escura, um verde aberto com portões benevolentes e o outro bloqueado por barras cruzadas impedindo que juízes inventem punições por analogia, proporção 16:9.',
    descricaoCena: 'A proibição terminante da analogia que prejudica o réu no Direito Penal.',
    textoAudio: 'No Direito Civil, se faltar uma regra, o juiz pode usar uma parecida por analogia. No Direito Penal, a analogia para punir é terminantemente proibida. Se a lei não previu expressamente a conduta, o juiz não pode esticar a corda.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Vedação da Analogia Incriminadora</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            O Juiz Não Pode “Esticar” o Texto da Lei
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Se a lei penal proíbe a pesca com redes de arrasto durante o período reprodutivo dos peixes, o juiz não pode condenar um pescador que usou um arpão novo de alta frequência argumentando que *"o arpão mata peixes tanto quanto a rede"*.
          </p>

          <div className="p-3.5 rounded-xl bg-background/60 border border-rose-500/20 text-xs space-y-2">
            <strong className="text-rose-300">A única analogia permitida:</strong>
            <p className="text-muted-foreground">
              A analogia só é admitida se for <strong>a favor do réu</strong> (<em>in bonam partem</em>), como para estender um benefício ou causa de diminuição de pena. Para prejudicar ou criar crimes, ela é <strong>100% proibida</strong>.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          🚫 Se não está na letra da lei, não pode virar cadeia na caneta do juiz.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 11: DESAFIO PRÁTICO - VOCÊ É O JUIZ
  // ----------------------------------------------------
  {
    id: 'art1_slide_11',
    ordem: 11,
    fase: '5. Desafio Prático',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 5: Desafio Prático · Etapa 11 de 12',
    titulo: 'Desafio Prático: Você é o Juiz!',
    subtitulo: 'Aplique o Artigo 1º do Código Penal a uma situação da vida real',
    nomeArquivo: 'slide_11.jpg',
    imagePrompt: '3D render of a futuristic compact surveillance drone hovering silently above a modern residential courtyard fence at sunset, illuminated by a dramatic courtroom judicial spotlight from above, dramatic lighting, rich teal and gold reflections on carbon fiber surface, dark slate graphite background (#090d16), 16:9 aspect ratio, clean vectors, strictly no text.',
    imagePromptPt: 'Drone moderno compacto com câmera sobrevoando uma cerca residencial ao pôr do sol, iluminado pelo holofote judicial de um tribunal, proporção 16:9.',
    descricaoCena: 'O caso prático do drone e a aplicação do princípio da anterioridade penal.',
    textoAudio: 'Agora é com você. Imagine que em 2010 um jovem pilotou um drone com câmera sobre o quintal vizinho. O vizinho exigiu a prisão do jovem por invasão aérea. Como juiz, o que você decide sabendo que na época não havia lei sobre drones?',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-card to-background space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Caso Hipotético para Julgamento</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            O Caso do Drone Sobre a Fazenda Vizinha
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Em 2011, antes de qualquer lei sobre aeronaves não tripuladas no Brasil, Lucas comprou um drone recreativo e sobrevoou o pomar do vizinho Mauro para tirar fotos. Mauro foi à delegacia exigir a prisão em flagrante de Lucas por "crime de invasão aérea de propriedade".
          </p>

          <div className="p-3.5 rounded-xl bg-background/70 border border-amber-500/20 text-xs space-y-2">
            <strong className="text-foreground">Qual é a sua decisão como juiz?</strong>
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-foreground space-y-1">
                <span className="font-bold text-emerald-400">✅ Decisão Correta: Conduta Atípica</span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Pelo <strong>Artigo 1º do Código Penal</strong>, como não existia lei anterior definindo o sobrevoo de drone como crime, Lucas <strong>não pode responder a processo criminal</strong>. O vizinho Mauro pode buscar indenização cível, mas prisão criminal é impossível.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/30 text-xs text-muted-foreground">
          👏 Parabéns! Você aplicou o princípio da anterioridade com precisão constitucional.
        </div>
      </div>
    ),
  },

  // ----------------------------------------------------
  // SLIDE 12: SÍNTESE FINAL - AS 4 MURALHAS DE PROTEÇÃO
  // ----------------------------------------------------
  {
    id: 'art1_slide_12',
    ordem: 12,
    fase: '6. Síntese e Conclusão',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Fase 6: Síntese e Conclusão · Etapa 12 de 12',
    titulo: 'As 4 Muralhas de Proteção do Artigo 1º',
    subtitulo: 'O mapa mental consolidado para você dominar o princípio da legalidade para sempre',
    nomeArquivo: 'slide_12.jpg',
    imagePrompt: 'Epic visual mind map metaphor, four shining golden guardian shields forming an impenetrable square bastion of justice, illuminated by celestial teal ambient backlight, floating holographic symbols of statutory law, hourglass time, razor precision, and freedom, dark graphite slate floor (#090d16), 16:9 cinematic widescreen, elegant minimalist vectors, zero text.',
    imagePromptPt: 'Quatro escudos dourados de guardiões formando um bastião impenetrável de justiça com símbolos holográficos de lei, ampulheta do tempo, precisão e liberdade, proporção 16:9.',
    descricaoCena: 'O mapa mental completo consolidando as 4 garantias fundamentais do Artigo 1º.',
    textoAudio: 'Parabéns por completar esta aula completa! Guarde estas 4 muralhas: Lei Escrita, Lei Anterior, Lei Estrita e Lei Certa. O Artigo 1º não protege criminosos; ele protege a liberdade de toda a sociedade brasileira contra o arbítrio estatal.',
    conteudoPrincipal: (
      <div className="space-y-4">
        <div className="p-5 sm:p-6 rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-950/40 via-card to-background space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Síntese Definitiva</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-foreground">
            As 4 Dimensões da Legalidade Penal Estrita
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-background/60 border border-teal-500/20 space-y-1">
              <strong className="text-teal-400 block font-bold">1. Lex Scripta (Lei Escrita)</strong>
              <p className="text-muted-foreground text-[11px]">
                Exige lei formal votada no Congresso Nacional. Costumes não criam crimes.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-teal-500/20 space-y-1">
              <strong className="text-teal-400 block font-bold">2. Lex Praevia (Lei Anterior)</strong>
              <p className="text-muted-foreground text-[11px]">
                A lei deve existir antes do ato. Proibida a retroatividade prejudicial.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-teal-500/20 space-y-1">
              <strong className="text-teal-400 block font-bold">3. Lex Stricta (Lei Estrita)</strong>
              <p className="text-muted-foreground text-[11px]">
                Proibida a analogia para criar crimes ou agravar castigos (in malam partem).
              </p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-teal-500/20 space-y-1">
              <strong className="text-teal-400 block font-bold">4. Lex Certa (Lei Certa/Taxativa)</strong>
              <p className="text-muted-foreground text-[11px]">
                A lei deve ser clara e detalhada, banindo tipos penais vagos ou ambíguos.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-500/10 text-xs text-center font-medium text-foreground">
          ✨ <strong>Mensagem Final:</strong> O Artigo 1º do Código Penal é o maior monumento de proteção da liberdade humana no ordenamento jurídico brasileiro.
        </div>
      </div>
    ),
  },
];
