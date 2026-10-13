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
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight
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
  // SLIDE 1: INTRODUÇÃO - O PODER MAIS DRÁSTICO DO ESTADO
  // ----------------------------------------------------
  {
    id: 'art1_slide_1',
    ordem: 1,
    fase: '1. Introdução Geral',
    dispositivoId: 'caput',
    dispositivoLabel: 'Caput',
    badge: 'Introdução • Etapa 1 de 12',
    titulo: 'O Poder Mais Drástico do Estado',
    subtitulo: 'Por que o Direito Penal precisa de uma muralha protetora antes de qualquer punição?',
    nomeArquivo: 'slide_01.jpg',
    imagePrompt: 'Modern clean digital illustration, conceptual legal design metaphor, imposing glowing iron fortress gate of justice at twilight, a solitary citizen safely shielded behind an illuminated crystal barrier, glowing scales of justice emitting warm amber and teal luminescence, dark slate graphite background (#090d16), cinematic lighting, high contrast, elegant minimalism, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Portão imponente de ferro da justiça com uma barreira protetora de cristal protegendo um cidadão, balança iluminada em âmbar e azul-petróleo, fundo grafite escuro minimalista, sem texto, proporção 16:9.',
    descricaoCena: 'A muralha de proteção do cidadão contra o poder punitivo do Estado.',
    textoAudio: 'O Direito Penal é a arma mais pesada do Estado. Ele pode tirar a sua liberdade física e colocá-lo atrás das grades. Para evitar tiranias, o Código Penal começa protegendo o cidadão com o Artigo Primeiro.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-teal-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-teal-400 font-semibold text-sm tracking-wide">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>O Peso da Sanção Penal</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            Apenas o Direito Penal Pode Retirar a Liberdade Humana
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            No Direito Civil, os tribunais resolvem disputas financeiras, contratos e indenizações por prejuízos. No Direito de Família, discutem-se divórcios, partilhas de bens e pensões alimentícias. No Direito do Trabalho, verbas rescisórias e horas extras.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Porém, apenas um ramo do Direito tem o poder supremo e irreversível de <strong>privar uma pessoa de sua liberdade física</strong> e encarcerá-la em uma cela: o <strong>Direito Penal</strong>.
          </p>

          <div className="p-5 rounded-xl bg-secondary/50 border border-border/80 text-sm sm:text-base text-foreground/90 space-y-2">
            <strong className="text-teal-400 block font-semibold">O Perigo do Poder Sem Limites:</strong>
            <p className="text-muted-foreground leading-relaxed">
              A história da civilização humana demonstrou que, quando governantes ou juízes têm autoridade para punir sem critérios rígidos pré-estabelecidos, o cárcere rapidamente se transforma em ferramenta de perseguição política, vingança pessoal e opressão de minorias.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-teal-500/25 bg-teal-950/20 flex items-start gap-3.5 text-sm sm:text-base text-foreground/90">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            É por este motivo que o Código Penal brasileiro não se inicia com uma lista de crimes e castigos, mas sim com um <strong>escudo de proteção para toda a sociedade</strong>: o <strong>Artigo 1º</strong>.
          </p>
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
    badge: 'História & Iluminismo • Etapa 2 de 12',
    titulo: 'De Onde Veio Essa Regra? O Fim da Tirania Real',
    subtitulo: 'Como Cesare Beccaria e os filósofos do Iluminismo revolucionaram a justiça em 1764',
    nomeArquivo: 'slide_02.jpg',
    imagePrompt: 'High-detail cinematic illustration, an ancient medieval monarch throne room fading into deep shadows, contrasted with illuminated quill parchment manuscripts and open Enlightenment law books glowing with golden wisdom light, dark slate graphite background (#090d16), deep amber and teal neon highlights, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Trono medieval absolutista nas sombras contrastado com livros iluministas de leis abertos emanando luz dourada, simbolizando o fim da tirania dos reis e a vitória da lei escrita, proporção 16:9.',
    descricaoCena: 'A transição histórica da vontade arbitrária dos reis para a lei democrática escrita.',
    textoAudio: 'Na Idade Média e nas monarquias absolutistas, os reis inventavam crimes da própria cabeça para punir quem quisessem. Em 1764, Cesare Beccaria revolucionou o mundo ao exigir que todo crime e pena estivessem previamente escritos.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
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

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Se um nobre se ofendesse com uma sátira ou se um camponês usasse vestimentas consideradas impróprias, o soberano podia ordenar a prisão ou execução imediata, inventando na hora que aquela atitude constituía crime de traição. O cidadão comum vivia sob o pânico permanente do imprevisível.
          </p>

          <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
            <p className="font-serif italic text-base sm:text-lg text-foreground/95 leading-relaxed">
              “Só as leis podem decretar as penas sobre os delitos; e esta autoridade só pode residir no legislador, que representa toda a sociedade reunida por um contrato social.”
            </p>
            <span className="text-xs sm:text-sm text-amber-400 font-semibold block text-right">
              — Cesare Beccaria (Dos Delitos e das Penas, 1764)
            </span>
          </div>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Mais tarde, o jurista alemão <strong>Paul Johann Anselm von Feuerbach</strong> imortalizou o princípio na máxima latina que rege todos os países livres do planeta:
          </p>

          <div className="p-4 rounded-xl bg-secondary/60 border border-border/80 text-center font-mono text-teal-300 font-bold text-sm sm:text-base">
            Nullum crimen, nulla poena sine praevia lege
            <span className="block text-xs sm:text-sm text-muted-foreground font-sans font-normal mt-1">
              (Não há crime, nem pena, sem prévia existência de lei escrita).
            </span>
          </div>
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
    badge: 'Anatomia da Lei • Etapa 3 de 12',
    titulo: 'As Duas Frases que Sustentam a Justiça Brasileira',
    subtitulo: 'Decreto-Lei nº 2.848/1940 — Artigo 1º Oficial e Cláusula Pétrea da CF/88',
    nomeArquivo: 'slide_03.jpg',
    imagePrompt: 'A stylized 3D conceptual illustration of a glowing antique golden codex of Brazilian Penal Law resting on a dark marble pedestal, surrounded by four solid crystalline pillars representing fundamental constitutional clauses, dark slate background (#090d16), cinematic lighting, high contrast, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Livro do Código Penal dourado brilhante em um pedestal de mármore protegido por quatro pilares de cristal que representam cláusulas pétreas da Constituição, proporção 16:9.',
    descricaoCena: 'O texto sagrado do Artigo 1º como cláusula pétrea intocável da República.',
    textoAudio: 'Artigo primeiro do Código Penal: Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal. Estas duas frases são cláusula pétrea da nossa Constituição e nunca podem ser revogadas.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-teal-500/40 bg-card shadow-sm space-y-4">
          <div className="text-center py-2 space-y-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 inline-block uppercase tracking-wider">
              Texto Oficial da Legislação
            </span>
            <p className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground italic leading-relaxed px-2">
              “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
            </p>
            <span className="text-xs sm:text-sm text-muted-foreground block">
              Decreto-Lei nº 2.848, de 7 de dezembro de 1940 (Artigo 1º)
            </span>
          </div>

          <div className="pt-3 border-t border-border/60 space-y-3">
            <h5 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Landmark className="w-5 h-5 text-teal-400 shrink-0" />
              Por Que Este Artigo é uma Cláusula Pétrea Intocável?
            </h5>

            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
              A Constituição Federal de 1988 reproduziu exatamente esse princípio no seu <strong>Artigo 5º, inciso XXXIX</strong>, elevando-o ao patamar mais sagrado do ordenamento jurídico: o de <strong>Cláusula Pétrea</strong> (Art. 60, § 4º, IV da CF/88).
            </p>

            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
              Isso significa que <strong>nem mesmo o Congresso Nacional inteiro</strong>, por meio de emenda constitucional aprovada por unanimidade, tem o poder de revogar, diminuir ou relativizar essa garantia. Enquanto existir a República Federativa do Brasil, ninguém poderá ser punido sem lei prévia.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-secondary/40 text-sm sm:text-base text-muted-foreground leading-relaxed">
          📌 <strong>A estrutura lógica do artigo:</strong> Repare que o artigo divide-se em duas partes complementares. A primeira cuida da <strong>conduta (crime)</strong>; a segunda cuida do <strong>castigo (pena)</strong>. Vamos analisar cada uma a seguir.
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
    badge: 'Anatomia da Lei • Etapa 4 de 12',
    titulo: '1ª Metade: “...sem lei anterior que o defina”',
    subtitulo: 'A conduta precisa estar proibida no exato instante em que é cometida',
    nomeArquivo: 'slide_04.jpg',
    imagePrompt: 'Futuristic legal design timeline metaphor, an illuminated horizontal neon timeline ruler on dark slate surface with a glowing marker showing Point of Action, left side locked in impenetrable bronze blocks, right side clear illuminated path, golden legal shield blocking retroactive reach, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Linha do tempo iluminada em neon mostrando o ponto exato da ação, com o passado bloqueado por bronze maciço e o futuro aberto com um escudo protegendo contra leis retroativas, proporção 16:9.',
    descricaoCena: 'A linha do tempo do princípio da anterioridade da lei penal.',
    textoAudio: 'Primeira parte: Não há crime sem lei anterior. Isso significa que você só pode cometer um crime se a conduta já estava proibida em lei no exato segundo em que agiu. Ninguém pode ser pego de surpresa no futuro.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-emerald-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm tracking-wide">
            <Clock className="w-5 h-5 shrink-0" />
            <span>Princípio da Anterioridade Estrita</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            A Lei Jamais Pode Punir Quem Praticou o Ato Ontem
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Considere uma linha do tempo cronológica. No instante <strong>T0</strong> (hoje), um cidadão realiza uma conduta qualquer — como vender um novo tipo de aplicativo ou importar um produto inovador.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Se hoje não existe nenhuma lei formal criminalizando essa atividade, o ato é <strong>100% lícito e inocente</strong> perante a esfera penal, ainda que algumas pessoas considerem a atitude imoral ou desagradável.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-sm sm:text-base space-y-1.5">
              <span className="text-emerald-400 font-bold block">Momento da Ação (T0):</span>
              <p className="text-foreground/90 text-sm leading-relaxed">
                Sem lei vigente = Conduta perfeitamente livre de culpa penal. O cidadão não deve nada à Justiça.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-sm sm:text-base space-y-1.5">
              <span className="text-red-400 font-bold block">Publicação da Lei (T1):</span>
              <p className="text-foreground/90 text-sm leading-relaxed">
                Se o Congresso aprovar uma lei nova criminalizando o ato, ela <strong>só produz efeitos para o futuro</strong>. Quem praticou ontem continua plenamente a salvo!
              </p>
            </div>
          </div>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal pt-2">
            Este é o pilar da <strong>Irretroatividade da Lei Penal Maléfica</strong>: a lei que cria crimes ou aumenta penas tem efeito estritamente para a frente (*ex nunc*), nunca alcançando fatos consumados no passado.
          </p>
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
    badge: 'Anatomia da Lei • Etapa 5 de 12',
    titulo: '2ª Metade: “...sem prévia cominação legal”',
    subtitulo: 'O que significa cominação e por que o juiz não pode inventar castigos da própria cabeça?',
    nomeArquivo: 'slide_05.jpg',
    imagePrompt: 'Conceptual 3D architectural render, balanced stone justice pedestal displaying measured brass calibrated weights and transparent crystal prison bars with precise millimeter markings, signifying strictly predetermined statutory penalties, deep teal and amber lighting, dark slate background, elegant minimalism, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Pedestal de justiça com pesos de latão milimetricamente calibrados e barras de cristal com marcações precisas, simbolizando a pena prévia fixada por lei e a proibição de penas inventadas, proporção 16:9.',
    descricaoCena: 'A precisão matemática das penas tabeladas por lei antes do julgamento.',
    textoAudio: 'Segunda metade do artigo: Não há pena sem prévia cominação legal. Cominação significa previsão de castigo. O juiz não pode inventar castigos da cabeça dele no dia do julgamento. A pena mínima e máxima já tem que estar escrita na lei.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-teal-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-teal-400 font-semibold text-sm tracking-wide">
            <Gavel className="w-5 h-5 shrink-0" />
            <span>O Castigo Tabelado em Lei</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            O Juiz Não Tem Autoridade para Inventar Punições
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            O vocábulo <strong>cominação</strong> é um termo jurídico que significa a *ameaça legal prévia de castigo*. Não basta o Código Penal afirmar: <em>“É proibido buzinar em frente a hospitais”</em>. A lei é rigorosamente obrigada a dizer: <em>“Pena: detenção, de 15 dias a 3 meses, ou multa”</em>.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Se uma lei descrevesse uma atitude repreensível mas se esquecesse de estabelecer a pena exata, <strong>nenhuma punição penal poderia ser aplicada</strong> ao infrator.
          </p>

          <div className="p-5 rounded-xl bg-secondary/50 border border-border/80 space-y-2.5 text-sm sm:text-base">
            <strong className="text-teal-400 block font-semibold">Os Limites Estritos do Juiz na Sentença:</strong>
            <ul className="space-y-2 text-foreground/90 list-disc list-inside leading-relaxed">
              <li><strong>Proibição de penas inéditas:</strong> O juiz não pode criar sanções alternativas não previstas em lei (como proibir o réu de acessar a internet ou mandar limpar praças públicas sem amparo legal).</li>
              <li><strong>Respeito à tabela legal:</strong> Se a lei prevê pena de 1 a 4 anos para um furto, o juiz não pode fixar 5 anos, por mais irritado que esteja com o crime.</li>
              <li><strong>Vedação de penas cruéis:</strong> A Constituição Federal veta terminantemente penas de morte (salvo guerra declarada), perpétuas, de trabalhos forçados ou cruéis.</li>
            </ul>
          </div>
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
    badge: 'Competência Constitucional • Etapa 6 de 12',
    titulo: 'Quem Tem o Poder de Criar um Crime no Brasil?',
    subtitulo: 'Prefeitos, governadores e delegados não possuem esse poder (CF/88, Art. 22, I)',
    nomeArquivo: 'slide_06.jpg',
    imagePrompt: 'Clean modern 3D illustration, iconic Brazilian National Congress twin towers and dome architecture glowing in pure white and cyan, with lower bureaucratic documents (municipal decrees, state stamps) blocked by an impenetrable golden energy barrier, illustrating exclusive federal legislative authority for penal law, dark slate background (#090d16), 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Arquitetura do Congresso Nacional de Brasília iluminada em ciano e branco com carimbos e decretos municipais bloqueados por uma barreira dourada de energia, mostrando a exclusividade federal penal, proporção 16:9.',
    descricaoCena: 'A exclusividade do Congresso Nacional para editar leis penais.',
    textoAudio: 'Quem tem o poder de criar crimes no Brasil? Apenas o Congresso Nacional, com deputados e senadores. Prefeitos e governadores não podem criar crimes por decreto. E nem o Presidente pode criar crimes por Medida Provisória.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-blue-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-blue-400 font-semibold text-sm tracking-wide">
            <Landmark className="w-5 h-5 shrink-0" />
            <span>Monopólio Legislativo do Congresso Nacional</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            Apenas Lei Federal em Sentido Formal Pode Criar Tipos Penais
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Uma dúvida muito comum entre cidadãos leigos é: <em>“Se o prefeito da minha cidade publicar um decreto proibindo som alto com pena de 1 ano de cadeia, eu posso ser preso criminalmente?”</em>
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            A resposta é <strong>NÃO</strong>. Segundo o Artigo 22, inciso I, da Constituição Federal, a competência para legislar sobre Direito Penal é <strong>privativa da União</strong>.
          </p>

          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-xl bg-background/70 border border-border/80 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground block text-sm sm:text-base">Decreto de Prefeito Municipal:</strong>
                <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
                  Pode aplicar multas administrativas e fechar comércios, mas jamais criar crime ou determinar pena privativa de liberdade.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-background/70 border border-border/80 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground block text-sm sm:text-base">Portaria de Secretário de Segurança ou Delegado:</strong>
                <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
                  Atos de órgãos policiais organizam a rotina interna, mas não possuem força para tipificar crimes.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-background/70 border border-border/80 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground block text-sm sm:text-base">Medida Provisória (Presidente da República):</strong>
                <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
                  O Art. 62, § 1º, I, "b" da CF/88 proíbe terminantemente a edição de Medidas Provisórias sobre matéria penal.
                </p>
              </div>
            </div>
          </div>
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
    badge: 'Caso Prático Real • Etapa 7 de 12',
    titulo: 'O Caso Real dos Primeiros Hackers no Brasil',
    subtitulo: 'Como o surgimento da internet colocou o Artigo 1º à prova',
    nomeArquivo: 'slide_07.jpg',
    imagePrompt: 'Cinematic modern digital illustration, a glowing transparent laptop screen displaying digital biometric code streams and unauthorized server breach alerts, intertwined with traditional classic legal gavel and open penal statutes book, cyber forensics aesthetic, dark navy and cyan neon tones, high contrast, minimalist background, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Tela de notebook transparente brilhante mostrando códigos e alertas de invasão digital entrelaçada com um martelo da justiça clássico de madeira e livros penais, estética de perícia cibernética, proporção 16:9.',
    descricaoCena: 'A colisão entre os novos crimes cibernéticos e o Código Penal antigo de 1940.',
    textoAudio: 'Nos anos dois mil, hackers começaram a invadir computadores alheios. Mas o Código Penal de 1940 não previa o crime de invadir computador. A polícia e os juízes não puderam prender ninguém por invasão até que o Congresso aprovasse a Lei Carolina Dieckmann em 2012.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-cyan-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-cyan-400 font-semibold text-sm tracking-wide">
            <Laptop className="w-5 h-5 shrink-0" />
            <span>Tecnologia do Século XXI vs. Lei de 1940</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            Por Que os Primeiros Invasores de Computador Não Foram Presos por Invasão?
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            No início dos anos 2000, com a popularização da internet e dos computadores domésticos no Brasil, surgiram os primeiros ataques cibernéticos organizados: pessoas invadiam servidores, roubavam senhas de e-mails e vazavam fotos particulares armazenadas em discos rígidos.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            As vítimas procuravam as delegacias de polícia indignadas. No entanto, os delegados e promotores deparavam-se com um bloqueio jurídico intransponível: <strong>o Código Penal, escrito em 1940, não continha nenhuma palavra sobre computadores, redes ou senhas eletrônicas</strong>.
          </p>

          <div className="p-5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2.5">
            <strong className="text-cyan-300 block font-semibold text-sm sm:text-base">
              A Polícia Podia Usar a "Imaginação"?
            </strong>
            <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
              Os promotores não podiam simplesmente alegar: <em>“Invadir um computador é parecido com arrombar uma residência física (Art. 150 do CP), então vamos mandar prender o hacker”</em>. O Artigo 1º proíbe categoricamente a analogia prejudicial ao cidadão!
            </p>
            <div className="p-3.5 rounded-lg bg-background/80 border border-border/80 text-xs sm:text-sm text-foreground font-medium">
              💡 <strong>A solução democrática:</strong> Foi preciso que o Congresso Nacional tramitasse e promulgasse a <strong>Lei nº 12.737/2012</strong> (conhecida como Lei Carolina Dieckmann), criando o Artigo 154-A do Código Penal. Somente a partir da vigência desta nova lei as invasões passaram a ser punidas como crime.
            </div>
          </div>
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
    badge: 'Novas Tecnologias • Etapa 8 de 12',
    titulo: 'O Desafio da Inteligência Artificial e Deepfakes',
    subtitulo: 'Por que a sociedade prefere a impunidade momentânea ao risco da tirania dos juízes?',
    nomeArquivo: 'slide_08.jpg',
    imagePrompt: 'Futuristic conceptual digital artwork, a holographic neural network face shifting identities confronted by a transparent luminous boundary of codified legal statutes, representing ethical dilemmas meeting strict legality principles, deep dark aesthetic (#090d16), vibrant cyan and magenta neon glowing outlines, 16:9 widescreen, clean vectors, zero text.',
    imagePromptPt: 'Rosto holográfico de inteligência artificial mudando de identidade representando deepfakes diante de uma barreira luminosa de artigos de lei, simbolizando os novos desafios da tecnologia, proporção 16:9.',
    descricaoCena: 'A velocidade exponencial da IA contra a necessária cautela da lei penal escrita.',
    textoAudio: 'Hoje surgem crimes com inteligência artificial, como clonagem de voz e deepfakes. A sociedade prefere deixar uma conduta reprovável impune temporariamente do que dar aos juízes o poder de criar crimes fora da lei escrita.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-purple-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-purple-400 font-semibold text-sm tracking-wide">
            <Cpu className="w-5 h-5 shrink-0" />
            <span>Fronteira Tecnológica & Dilema Moral</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            O Preço que Pagamos Pela Nossa Liberdade Diária
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            No mundo atual, inovações disruptivas surgem em questão de meses: vozes clonadas com perfeição por redes neurais para aplicar golpes financeiros, vídeos hiper-realistas manipulados (deepfakes) e desvios de valores através de contratos inteligentes descentralizados.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Até que o Congresso Nacional debata e aprove leis específicas regulando condutas digitais inteiramente inéditas, certos comportamentos eticamente reprováveis não podem ser criminalizados por pressão popular se não se amoldarem aos tipos penais já existentes.
          </p>

          <div className="p-5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
            <strong className="text-purple-300 block font-semibold text-sm sm:text-base">
              A Reflexão Central do Estado de Direito:
            </strong>
            <p className="text-foreground/90 italic text-base leading-relaxed">
              “Você preferiria viver em um país onde os juízes têm permissão para criar crimes na hora para punir qualquer conduta nova que acharem ruim, ou prefere a certeza absoluta de que ninguém pode inventar uma punição contra você?”
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              O ordenamento constitucional brasileiro escolheu a <strong>segurança jurídica de todos os cidadãos</strong>. É preferível a lacuna temporária da lei até o debate legislativo do que abrir as portas para o arbítrio penal judicial.
            </p>
          </div>
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
    badge: 'Garantias Críticas • Etapa 9 de 12',
    titulo: 'A Lei Deve Ser Clara como Cristal (Taxatividade)',
    subtitulo: 'Por que leis penais vagas ou genéricas são inconstitucionais?',
    nomeArquivo: 'slide_09.jpg',
    imagePrompt: 'Conceptual legal art, razor-sharp laser etched text on crystal prism tablet compared against a blurry chaotic fog mist, demonstrating crystalline legal precision versus dangerous ambiguity, glowing amber focus lens, dark minimalist environment, high contrast, clean vectors, zero text, 16:9 widescreen composition.',
    imagePromptPt: 'Prisma de cristal com inscrições a laser afiadas e cristalinas ao lado de uma névoa turva e confusa, demonstrando a precisão cirúrgica da lei penal contra a ambiguidade perigosa, proporção 16:9.',
    descricaoCena: 'A precisão cirúrgica do princípio da taxatividade da lei penal.',
    textoAudio: 'Não basta que a lei seja anterior. Ela também precisa ser clara e precisa. Esse é o Princípio da Taxatividade. Uma lei que dissesse que é crime agir de forma inadequada seria nula, porque ninguém saberia o que é inadequado.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-amber-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm tracking-wide">
            <FileSearch className="w-5 h-5 shrink-0" />
            <span>Princípio da Taxatividade (Lex Certa)</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            Proibição Absoluta de Tipos Penais Abertos ou Nebulosos
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Não basta que a lei exista antes da conduta; ela precisa ser <strong>taxativa, cirúrgica e cristalina</strong>. O legislador tem o dever constitucional de descrever a conduta proibida com detalhes milimétricos.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Em ditaduras e regimes autoritários ao longo da história, era praxe criar leis vagas como: <em>“É crime praticar atos contra os bons costumes da nação”</em> ou <em>“É proibido comportar-se de modo subversivo”</em>. Como ninguém sabe o que é "subversivo", o Estado podia prender quem quisesse.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1.5">
              <span className="text-red-400 font-bold flex items-center gap-1.5 text-sm sm:text-base">
                <XCircle className="w-4 h-4 shrink-0" />
                Lei Vaga (Inconstitucional):
              </span>
              <p className="text-foreground/90 text-sm leading-relaxed">
                <em>“É crime agir de modo inadequado em repartição pública.”</em> — Termo genérico que permite perseguição por gosto do policial.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm sm:text-base">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Lei Taxativa (Válida):
              </span>
              <p className="text-foreground/90 text-sm leading-relaxed">
                <em>“Subtrair coisa alheia móvel mediante grave ameaça”</em> — Verbo preciso e conduta delimitada que qualquer pessoa compreende.
              </p>
            </div>
          </div>
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
    badge: 'Garantias Críticas • Etapa 10 de 12',
    titulo: 'Proibição de Analogia Prejudicial (In Malam Partem)',
    subtitulo: 'O juiz é expressamente proibido de comparar condutas parecidas para punir',
    nomeArquivo: 'slide_10.jpg',
    imagePrompt: 'Conceptual 3D legal metaphor, two divergent pathways made of polished dark obsidian stone, one illuminated in green with benevolent open gates, the other blocked by heavy crossbars with danger signs preventing judicial expansion, dark slate background (#090d16), cinematic lighting, clean vectors, zero text, 16:9 widescreen.',
    imagePromptPt: 'Dois caminhos divergentes de pedra escura, um verde aberto com portões benevolentes e o outro bloqueado por barras cruzadas impedindo que juízes inventem punições por analogia, proporção 16:9.',
    descricaoCena: 'A proibição terminante da analogia que prejudica o réu no Direito Penal.',
    textoAudio: 'No Direito Civil, se faltar uma regra, o juiz pode usar uma parecida por analogia. No Direito Penal, a analogia para punir é terminantemente proibida. Se a lei não previu expressamente a conduta, o juiz não pode esticar a corda.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-rose-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-rose-400 font-semibold text-sm tracking-wide">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Vedação da Analogia Incriminadora</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            O Magistrado Não Pode “Esticar” o Sentido das Palavras da Lei
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            No Direito Civil, quando o juiz não encontra uma lei específica para um contrato moderno de tecnologia, ele pode aplicar a lei de aluguel ou compra e venda por analogia. Isso é permitido porque o objetivo civil é pacificar acordos financeiros.
          </p>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Porém, no <strong>Direito Penal</strong>, a analogia para criar crimes, inventar penas ou prejudicar o cidadão (denominada <em>analogia in malam partem</em>) é <strong>100% proibida</strong> pelo Artigo 1º.
          </p>

          <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
            <strong className="text-rose-300 block font-semibold text-sm sm:text-base">
              Um Exemplo Clássico dos Tribunais:
            </strong>
            <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
              Se uma lei proíbe a caça de animais silvestres mediante <em>armadilhas mecânicas com laços de arame</em>, um caçador que utilizou um sensor a laser digital não pode ser condenado sob o pretexto de que o sensor "funciona de modo equivalente a um laço de arame". Se o ato com sensor não foi previsto pelo legislador, o juiz não pode preencher a lacuna criando punição.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-secondary/50 border border-border/80 text-sm sm:text-base text-foreground/90">
            ✨ <strong>A única exceção:</strong> A analogia só é válida no Direito Penal se for <strong>a favor do réu</strong> (<em>in bonam partem</em>), como para estender um perdão judicial ou um benefício legal a uma situação análoga favorável.
          </div>
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
    badge: 'Desafio Prático • Etapa 11 de 12',
    titulo: 'Desafio Prático: Você é o Magistrado!',
    subtitulo: 'Aplique o Artigo 1º do Código Penal a uma situação da vida real',
    nomeArquivo: 'slide_11.jpg',
    imagePrompt: '3D render of a futuristic compact surveillance drone hovering silently above a modern residential courtyard fence at sunset, illuminated by a dramatic courtroom judicial spotlight from above, rich teal and gold reflections on carbon fiber surface, dark slate graphite background (#090d16), 16:9 aspect ratio, clean vectors, strictly no text.',
    imagePromptPt: 'Drone moderno compacto com câmera sobrevoando uma cerca residencial ao pôr do sol, iluminado pelo holofote judicial de um tribunal, proporção 16:9.',
    descricaoCena: 'O caso prático do drone e a aplicação do princípio da anterioridade penal.',
    textoAudio: 'Agora é com você. Imagine que em 2011 um jovem pilotou um drone com câmera sobre o quintal vizinho. O vizinho exigiu a prisão do jovem por invasão aérea. Como juiz, o que você decide sabendo que na época não havia lei sobre drones?',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-amber-500/30 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm tracking-wide">
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span>Julgamento de Caso Concreto</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            O Caso do Drone Sobrevoando a Propriedade Vizinha
          </h4>

          <div className="p-5 rounded-xl bg-secondary/50 border border-border/80 space-y-2 text-sm sm:text-base leading-relaxed text-foreground/90">
            <strong>O Fato:</strong> Em 2011, antes de qualquer marco regulatório sobre drones recreativos no Brasil, Lucas adquiriu um modelo com câmera e sobrevoou o quintal de seu vizinho Roberto para filmar árvores frutíferas. Indignado, Roberto acionou a autoridade policial exigindo a prisão em flagrante de Lucas sob a acusação de "crime de invasão aérea de domicílio".
          </div>

          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
            <h5 className="font-bold text-base sm:text-lg text-foreground">
              Qual é a Sua Sentença com Base no Artigo 1º?
            </h5>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-sm sm:text-base">
              <span className="font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Sentença Correta: Atipicidade Penal Absoluta
              </span>
              <p className="text-foreground/90 leading-relaxed">
                Por força do <strong>Artigo 1º do Código Penal</strong> e do <strong>Artigo 5º, XXXIX da CF/88</strong>, como inexistia lei anterior formal definindo o voo de drones recreativos como infração penal, a conduta de Lucas é <strong>penalmente atípica</strong>.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Lucas não pode ser processado criminalmente nem detido. Eventual violação de intimidade deve ser discutida exclusivamente na vara cível para reparação de danos morais, mas jamais com persecução penal ou prisão.
              </p>
            </div>
          </div>
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
    badge: 'Síntese Final • Etapa 12 de 12',
    titulo: 'As 4 Muralhas de Proteção do Artigo 1º',
    subtitulo: 'O resumo definitivo para você dominar o princípio da legalidade para sempre',
    nomeArquivo: 'slide_12.jpg',
    imagePrompt: 'Epic visual mind map metaphor, four shining golden guardian shields forming an impenetrable square bastion of justice, illuminated by celestial teal ambient backlight, floating holographic symbols of statutory law, hourglass time, razor precision, and freedom, dark graphite slate floor (#090d16), 16:9 cinematic widescreen, elegant minimalist vectors, zero text.',
    imagePromptPt: 'Quatro escudos dourados de guardiões formando um bastião impenetrável de justiça com símbolos holográficos de lei, ampulheta do tempo, precisão e liberdade, proporção 16:9.',
    descricaoCena: 'O mapa mental completo consolidando as 4 garantias fundamentais do Artigo 1º.',
    textoAudio: 'Parabéns por completar esta aula completa! Guarde estas quatro muralhas: Lei Escrita, Lei Anterior, Lei Estrita e Lei Certa. O Artigo Primeiro protege a liberdade de toda a sociedade brasileira.',
    conteudoPrincipal: (
      <div className="space-y-5 text-left">
        <div className="p-6 sm:p-7 rounded-2xl border border-teal-500/40 bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-teal-400 font-semibold text-sm tracking-wide">
            <Award className="w-5 h-5 shrink-0" />
            <span>Síntese Definitiva para a Sua Vida</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold font-sans text-foreground leading-snug">
            As Quatro Dimensões da Legalidade Estrita
          </h4>

          <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal">
            Sempre que pensar no Artigo 1º do Código Penal, visualize as <strong>quatro muralhas de defesa da cidadania</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-sm sm:text-base">
            <div className="p-4 rounded-xl bg-secondary/50 border border-teal-500/25 space-y-1.5">
              <strong className="text-teal-400 block font-bold text-base">
                1. Lex Scripta (Lei Escrita)
              </strong>
              <p className="text-foreground/90 text-sm leading-relaxed">
                Exige lei formal votada no Congresso Nacional. Costumes populares ou tradições nunca criam crimes.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-teal-500/25 space-y-1.5">
              <strong className="text-teal-400 block font-bold text-base">
                2. Lex Praevia (Lei Anterior)
              </strong>
              <p className="text-foreground/90 text-sm leading-relaxed">
                A lei tem que existir antes do fato acontecer. A lei penal incriminadora jamais volta para trás no tempo.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-teal-500/25 space-y-1.5">
              <strong className="text-teal-400 block font-bold text-base">
                3. Lex Stricta (Lei Estrita)
              </strong>
              <p className="text-foreground/90 text-sm leading-relaxed">
                Proibida a analogia para criar crimes ou agravar penas (vedação da analogia <em>in malam partem</em>).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/50 border border-teal-500/25 space-y-1.5">
              <strong className="text-teal-400 block font-bold text-base">
                4. Lex Certa (Lei Taxativa)
              </strong>
              <p className="text-foreground/90 text-sm leading-relaxed">
                A redação legal deve ser cristalina e delimitada, sendo inconstitucionais os crimes com termos vagos.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-teal-500/30 bg-teal-500/10 text-sm sm:text-base text-center font-medium text-foreground leading-relaxed">
          🏆 <strong>Conclusão:</strong> O Artigo 1º do Código Penal não existe para proteger infratores; ele existe para garantir que o Estado seja servo da lei, assegurando a liberdade de cada cidadão de bem.
        </div>
      </div>
    ),
  },
];
