import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  ShieldCheck, 
  MessageSquare, 
  Layers, 
  BrainCircuit, 
  Info,
  Play,
  BookOpen,
  ArrowRight,
  X,
  Flame,
  Award,
  Link2,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';

// ==========================================
// TIPOS E DEFINIÇÕES
// ==========================================

export type ArtigoId = 'art1' | 'art2';
export type MecanicaId = 'combo' | 'anatomia' | 'storytelling' | 'dialogo' | 'linha_tempo' | 'mapa_decisao';

interface SlideData {
  id: string;
  badge: string;
  titulo: string;
  subtitulo?: string;
  conteudoPrincipal: React.ReactNode;
  textoAudio: string;
}

interface MecanicaDef {
  id: MecanicaId;
  nome: string;
  badge: string;
  icone: any;
  corPrimaria: string;
  gradienteFundo: string;
  bordaCor: string;
  botaoCor: string;
  subtitulo: string;
  descricaoCurta: string;
  focoLeigo: string;
  totalSlidesText: string;
  slides: Record<ArtigoId, SlideData[]>;
}

const ARTIGOS_INFO: Record<ArtigoId, { titulo: string; subtitulo: string; texto: string }> = {
  art1: {
    titulo: 'Artigo 1º — Anterioridade da Lei Penal',
    subtitulo: 'Legalidade estrita e segurança jurídica do cidadão',
    texto: '“Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”',
  },
  art2: {
    titulo: 'Artigo 2º — Lei Penal no Tempo & Retroatividade',
    subtitulo: 'Abolitio criminis e a máquina do tempo benéfica',
    texto: '“Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória. Parágrafo único: A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.”',
  },
};

// ==========================================
// COMPONENTES INTERATIVOS ESPECIAIS
// ==========================================

// 1. MINI-GAME: LIGAR OS TERMOS
interface TermoPar {
  id: string;
  termo: string;
  significado: string;
}

function LigarTermosGame({ pares, onCompleto }: { pares: TermoPar[]; onCompleto?: () => void }) {
  const [selecionadoTermo, setSelecionadoTermo] = useState<string | null>(null);
  const [selecionadoSignificado, setSelecionadoSignificado] = useState<string | null>(null);
  const [acertos, setAcertos] = useState<string[]>([]);
  const [erro, setErro] = useState<{ termo: string; sig: string } | null>(null);

  // Embaralha significados na montagem
  const significadosEmbaralhados = useMemo(() => {
    return [...pares].sort(() => Math.random() - 0.5);
  }, [pares]);

  const tentarConectar = (termoId: string, sigId: string) => {
    if (termoId === sigId) {
      const novosAcertos = [...acertos, termoId];
      setAcertos(novosAcertos);
      setSelecionadoTermo(null);
      setSelecionadoSignificado(null);
      toast.success('Par correto conectado!');
      if (novosAcertos.length === pares.length && onCompleto) {
        onCompleto();
      }
    } else {
      setErro({ termo: termoId, sig: sigId });
      toast.error('Essa combinação não combina. Tente novamente!');
      setTimeout(() => {
        setErro(null);
        setSelecionadoTermo(null);
        setSelecionadoSignificado(null);
      }, 900);
    }
  };

  const handleCliqueTermo = (id: string) => {
    if (acertos.includes(id)) return;
    if (selecionadoSignificado) {
      tentarConectar(id, selecionadoSignificado);
    } else {
      setSelecionadoTermo(id === selecionadoTermo ? null : id);
    }
  };

  const handleCliqueSig = (id: string) => {
    if (acertos.includes(id)) return;
    if (selecionadoTermo) {
      tentarConectar(selecionadoTermo, id);
    } else {
      setSelecionadoSignificado(id === selecionadoSignificado ? null : id);
    }
  };

  const finalizado = acertos.length === pares.length;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border border-border/80 bg-secondary/30 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-teal-400" />
          Conecte o Termo Jurídico ao seu Significado Leigo:
        </span>
        <span className="font-bold text-teal-400">
          {acertos.length} de {pares.length} pares
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Coluna da Esquerda: Termos */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Termo Jurídico:
          </div>
          {pares.map((p) => {
            const acertou = acertos.includes(p.id);
            const selecionado = selecionadoTermo === p.id;
            const comErro = erro?.termo === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleCliqueTermo(p.id)}
                disabled={acertou}
                className={`w-full p-3 rounded-xl border text-left font-bold transition-all flex items-center justify-between ${
                  acertou
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 opacity-90 cursor-default'
                    : comErro
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300 animate-shake'
                    : selecionado
                    ? 'border-teal-400 bg-teal-500/20 text-teal-200 ring-2 ring-teal-500'
                    : 'border-border bg-card hover:bg-secondary/60 text-foreground'
                }`}
              >
                <span>{p.termo}</span>
                {acertou && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Coluna da Direita: Significados */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Significado na Vida Real:
          </div>
          {significadosEmbaralhados.map((p) => {
            const acertou = acertos.includes(p.id);
            const selecionado = selecionadoSignificado === p.id;
            const comErro = erro?.sig === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleCliqueSig(p.id)}
                disabled={acertou}
                className={`w-full p-3 rounded-xl border text-left font-medium transition-all flex items-center justify-between ${
                  acertou
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 opacity-90 cursor-default'
                    : comErro
                    ? 'border-rose-500 bg-rose-950/40 text-rose-300 animate-shake'
                    : selecionado
                    ? 'border-teal-400 bg-teal-500/20 text-teal-200 ring-2 ring-teal-500'
                    : 'border-border bg-card hover:bg-secondary/60 text-foreground'
                }`}
              >
                <span>{p.significado}</span>
                {acertou && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {finalizado && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-center space-y-1">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
          <p className="text-xs font-bold text-emerald-200">
            Parabéns! Todos os termos foram conectados com 100% de precisão!
          </p>
        </div>
      )}
    </div>
  );
}

// 2. FLASHCARD 3D
function FlipCardItem({ frente, verso }: { frente: string; verso: string }) {
  const [virado, setVirado] = useState(false);

  return (
    <div 
      onClick={() => setVirado(!virado)}
      role="button"
      tabIndex={0}
      className="cursor-pointer perspective-[1000px] select-none py-1"
    >
      <div 
        className={`relative min-h-[170px] rounded-2xl border transition-all duration-500 p-5 flex flex-col items-center justify-center text-center shadow-md ${
          virado 
            ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/50 to-teal-950/30 text-emerald-100 rotate-y-180' 
            : 'border-teal-500/40 bg-gradient-to-br from-card to-secondary/40 text-foreground hover:border-teal-400'
        }`}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-2">
          {virado ? '💡 Revelação Jurídica' : '❓ Toque para Virar o Cartão'}
        </div>
        <p className="text-xs sm:text-sm font-medium leading-relaxed max-w-lg">
          {virado ? verso : frente}
        </p>
        <span className="text-[10px] text-muted-foreground mt-3 underline">
          {virado ? 'Toque para voltar' : 'Toque para ver a explicação'}
        </span>
      </div>
    </div>
  );
}

// 3. QUIZ INTERATIVO
function QuizInterativoItem({
  pergunta,
  opcoes,
}: {
  pergunta: string;
  opcoes: { texto: string; correta: boolean; feedback: string }[];
}) {
  const [resposta, setResposta] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-xl border border-border/80 bg-secondary/30">
        <p className="text-xs sm:text-sm font-bold text-foreground leading-relaxed">
          {pergunta}
        </p>
      </div>
      <div className="space-y-2">
        {opcoes.map((op, idx) => (
          <button
            key={idx}
            onClick={() => setResposta(idx)}
            className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
              resposta === idx
                ? op.correta
                  ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500'
                  : 'border-rose-500 bg-rose-950/50 text-rose-200 ring-1 ring-rose-500'
                : 'border-border bg-card/80 hover:bg-secondary/60 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[11px] font-bold ${
                resposta === idx
                  ? op.correta
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-rose-500 bg-rose-500 text-white'
                  : 'border-border bg-secondary text-muted-foreground'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-relaxed font-medium">{op.texto}</span>
            </div>
            {resposta === idx && (
              <p className={`mt-2.5 pt-2 border-t text-[11px] leading-relaxed ${
                op.correta ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'
              }`}>
                {op.feedback}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// 4. SIMULADOR TEMPORAL
function SimuladorArtigo1Tempo() {
  const [cenario, setCenario] = useState<'antes' | 'depois'>('antes');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setCenario('antes')}
          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
            cenario === 'antes'
              ? 'border-purple-500 bg-purple-950/50 text-purple-200 ring-1 ring-purple-500'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Ação ANTES da Lei
        </button>
        <button
          onClick={() => setCenario('depois')}
          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
            cenario === 'depois'
              ? 'border-purple-500 bg-purple-950/50 text-purple-200 ring-1 ring-purple-500'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Ação DEPOIS da Lei
        </button>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card text-center space-y-1.5">
        {cenario === 'antes' ? (
          <>
            <div className="text-2xl">🟢</div>
            <span className="text-xs sm:text-sm font-bold text-emerald-400">Conduta Totalmente Lícita</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Como a ação ocorreu antes da publicação da lei, a pessoa é inocente. O Artigo 1º ergue um muro impenetrável que impede o Estado de punir retroativamente.
            </p>
          </>
        ) : (
          <>
            <div className="text-2xl">⚠️</div>
            <span className="text-xs sm:text-sm font-bold text-amber-400">Crime Configurado</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Como a ação ocorreu após a lei entrar em vigor, todo cidadão tem o dever de conhecê-la. A conduta é punível nos limites estritos fixados na lei prévia.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SimuladorArtigo2Tempo() {
  const [cenario, setCenario] = useState<'revogado' | 'diminuiu' | 'piorou'>('revogado');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <button
          onClick={() => setCenario('revogado')}
          className={`p-2.5 rounded-xl border font-bold transition-all ${
            cenario === 'revogado'
              ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200 ring-1 ring-emerald-500'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Crime Acabou
        </button>
        <button
          onClick={() => setCenario('diminuiu')}
          className={`p-2.5 rounded-xl border font-bold transition-all ${
            cenario === 'diminuiu'
              ? 'border-blue-500 bg-blue-950/50 text-blue-200 ring-1 ring-blue-500'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Pena Diminuiu
        </button>
        <button
          onClick={() => setCenario('piorou')}
          className={`p-2.5 rounded-xl border font-bold transition-all ${
            cenario === 'piorou'
              ? 'border-rose-500 bg-rose-950/50 text-rose-200 ring-1 ring-rose-500'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Pena Aumentou
        </button>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card text-center space-y-1.5">
        {cenario === 'revogado' && (
          <>
            <span className="text-xs sm:text-sm font-bold text-emerald-400">Abolitio Criminis (Extinção do Crime)</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quem está preso sai imediatamente! Os efeitos penais são cancelados e a ficha criminal fica 100% limpa quanto a esse crime.
            </p>
          </>
        )}
        {cenario === 'diminuiu' && (
          <>
            <span className="text-xs sm:text-sm font-bold text-blue-400">Novatio Legis in Mellius (Lei Mais Suave)</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A nova lei viaja no tempo e diminui a pena de quem já está preso ou processado, mesmo após sentença condenatória final.
            </p>
          </>
        )}
        {cenario === 'piorou' && (
          <>
            <span className="text-xs sm:text-sm font-bold text-rose-400">Irretroatividade da Lei Mais Grave</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A lei que piora ou aumenta castigo NÃO pode retroagir. Quem cometeu o fato antes continua protegido pela lei anterior mais branda.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DADOS DAS MECÂNICAS (EXPANDIDAS E O COMBO)
// ==========================================

// GERA OS SLIDES ROBUSTOS (25 A 30 SLIDES PARA O COMBO!)
function gerarSlidesCombo(artigo: ArtigoId): SlideData[] {
  if (artigo === 'art1') {
    return [
      {
        id: 'combo-art1-1',
        badge: 'Etapa 1 de 25 · Boas-Vindas',
        titulo: 'Bem-vindo à Trilha Master do Artigo 1º',
        subtitulo: 'A regra que protege a liberdade de todo cidadão',
        textoAudio: 'Bem-vindo à trilha completa do artigo primeiro do Código Penal. Você vai dominar um dos maiores escudos de liberdade da sociedade através de explicações simples, histórias reais, simulações e exercícios práticos.',
        conteudoPrincipal: (
          <div className="p-5 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-950/30 to-background space-y-3 text-center">
            <Flame className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-foreground">O Escudo do Cidadão</h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Nesta super trilha com 25 etapas, você não vai apenas ler a lei: vai destrinchar palavra por palavra, resolver casos reais, virar flashcards e testar seus conhecimentos.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-2',
        badge: 'Etapa 2 de 25 · O Texto Oficial',
        titulo: 'O que está escrito no Código Penal?',
        subtitulo: 'Decreto-Lei nº 2.848/1940 — Artigo 1º',
        textoAudio: 'Artigo primeiro: Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-950/20 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase text-teal-400">Texto Oficial</span>
            <p className="font-serif text-lg text-foreground italic">
              “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-3',
        badge: 'Etapa 3 de 25 · Anatomia 1',
        titulo: 'Primeira Metade: A Regra do Jogo',
        subtitulo: '“...sem lei anterior que o defina”',
        textoAudio: 'Primeira parte: A lei tem que existir antes da ação. Ninguém pode inventar um crime depois que você agiu.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-emerald-400">Tradução em Português Claro:</span>
            <p className="text-muted-foreground leading-relaxed">
              Você só pode ser punido por algo se já existia uma lei aprovada e em vigor no exato instante em que você agiu. Se a proibição for criada amanhã, o que você fez hoje é 100% inocente.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-4',
        badge: 'Etapa 4 de 25 · Exercício Rápido',
        titulo: 'Teste Relâmpago 1',
        subtitulo: 'Fixando a primeira metade',
        textoAudio: 'O prefeito pode baixar decreto hoje e punir quem fez algo na semana passada? Não, só lei federal prévia pode criar crime.',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="O prefeito da sua cidade publica um decreto hoje criando uma nova infração e manda a polícia punir atos cometidos no mês passado. Isso é permitido?"
            opcoes={[
              { texto: "Não! Fere a anterioridade do Artigo 1º e só o Congresso cria crimes.", correta: true, feedback: "Exatamente! O Artigo 1º exige lei anterior e competência federal exclusiva." },
              { texto: "Sim! O prefeito tem poder absoluto sobre a sua cidade.", correta: false, feedback: "Errado! Prefeitos não podem criar crimes, e mesmo que pudessem, não poderiam punir atos passados." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art1-5',
        badge: 'Etapa 5 de 25 · Anatomia 2',
        titulo: 'Segunda Metade: O Castigo Tabelado',
        subtitulo: '“...sem prévia cominação legal”',
        textoAudio: 'Segunda metade: Não há pena sem prévia cominação legal. Cominação significa previsão de castigo. O juiz não pode inventar pena da cabeça dele.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-teal-500/40 bg-card space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-teal-400">O que é Cominação?</span>
            <p className="text-muted-foreground leading-relaxed">
              A palavra <strong>cominação</strong> significa fixação prévia da pena. A lei já tem que estabelecer o castigo exato (ex: 1 a 3 anos de prisão e multa). O juiz é obrigado a seguir essa tabela.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-6',
        badge: 'Etapa 6 de 25 · Flashcard 3D',
        titulo: 'Toque para testar sua memória!',
        subtitulo: 'Flashcard de fixação da palavra-chave',
        textoAudio: 'Toque para virar o cartão e revisar o significado de prévia cominação legal.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="O que significa a expressão 'Prévia Cominação Legal' no Artigo 1º?"
            verso="Significa que o CASTIGO (a pena) também precisa estar escrito e tabelado na lei antes do fato acontecer. O juiz não pode inventar um castigo novo!"
          />
        ),
      },
      {
        id: 'combo-art1-7',
        badge: 'Etapa 7 de 25 · História Real 1',
        titulo: 'Caso Dona Clara: A Quitanda de Bairro',
        subtitulo: 'Uma atividade 100% legal e honesta',
        textoAudio: 'Conheça Dona Clara. Há mais de dez anos ela produz e vende um chá de ervas artesanal em sua quitanda com total transparência e notas fiscais.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex items-center gap-3">
            <span className="text-3xl">👵</span>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Dona Clara vende chás artesanais de camomila e capim-cidreira há 10 anos. Tudo com alvará e nota fiscal.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-8',
        badge: 'Etapa 8 de 25 · História Real 2',
        titulo: 'A Nova Lei em Brasília',
        subtitulo: 'A proibição inesperada surge no Diário Oficial',
        textoAudio: 'No dia primeiro de junho, o Congresso aprova uma nova lei dizendo que o extrato concentrado dessa erva agora é proibido sob pena de até três anos de cadeia.',
        conteudoPrincipal: (
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-card space-y-1.5 text-xs">
            <span className="font-bold text-amber-400">📅 1º de Junho:</span>
            <p className="text-foreground">
              Publicada a Lei nº 99.999: <em>"É crime vender extrato concentrado dessa erva sem autorização médica. Pena: 1 a 3 anos de reclusão."</em>
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-9',
        badge: 'Etapa 9 de 25 · História Real 3',
        titulo: 'O Fiscal Bate à Porta',
        subtitulo: 'A acusação das vendas do mês passado',
        textoAudio: 'No dia 2 de junho, a fiscalização aparece com policiais na quitanda de Dona Clara e exige notas fiscais do mês de maio.',
        conteudoPrincipal: (
          <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/25 space-y-1 text-xs">
            <span className="font-bold text-rose-300">👮 O Fiscal diz:</span>
            <p className="text-muted-foreground italic">
              “A senhora vendeu 50 frascos semana passada no mês de maio! Vamos te levar presa por crime!”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-10',
        badge: 'Etapa 10 de 25 · História Real 4',
        titulo: 'A Intervenção do Artigo 1º',
        subtitulo: 'A lei não pode olhar para trás',
        textoAudio: 'O artigo primeiro entra em ação e salva Dona Clara. Como as vendas de maio ocorreram antes da lei existir, não há crime.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-emerald-400">🛡️ Veredito: Livre de Qualquer Crime!</span>
            <p className="text-muted-foreground leading-relaxed">
              O Artigo 1º proíbe punir atos praticados antes da vigência da lei. Dona Clara só tem o dever de parar de vender a partir de hoje. As vendas do mês passado foram lícitas.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-11',
        badge: 'Etapa 11 de 25 · Bate-Papo Tutor',
        titulo: 'Conversa no WhatsApp com o Tutor',
        subtitulo: 'Tirando as dúvidas de quem não é do Direito',
        textoAudio: 'Aluno pergunta: Professor, mas e se o juiz achar que a atitude foi feia e imoral? O tutor responde: Não importa! Imoralidade não é crime se não estiver escrito na lei penal.',
        conteudoPrincipal: (
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="p-3 rounded-2xl rounded-tl-none bg-secondary/80 border text-foreground max-w-[85%]">
              “Professor, e se todo mundo achar a conduta errada ou imoral? O juiz pode punir mesmo sem lei?”
            </div>
            <div className="p-3 rounded-2xl rounded-tr-none bg-teal-500/20 border border-teal-500/30 text-foreground max-w-[85%] ml-auto text-right">
              “Não! No Brasil vigora a <strong>Legalidade Estrita</strong>: só o que está escrito em lei federal pode ser crime. Juiz não julga por sentimento moral!”
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-12',
        badge: 'Etapa 12 de 25 · A Metáfora da Pelada',
        titulo: 'A Analogia do Jogo de Futebol',
        subtitulo: 'Regra inventada no meio da partida',
        textoAudio: 'Imagina você jogando futebol no domingo e no final do segundo tempo o árbitro expulsa você por um toque de calcanhar dado no começo do jogo. Seria absurdo, e na lei é igual.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-card space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-cyan-400">⚽ A Pelada de Domingo:</span>
            <p className="text-muted-foreground leading-relaxed">
              Se o árbitro inventasse uma falta nova aos 40 minutos do segundo tempo e expulsasse um jogador por um lance do primeiro tempo, haveria revolta no campo. A regra tem que estar clara antes do jogo começar.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-13',
        badge: 'Etapa 13 de 25 · Quem Cria Leis?',
        titulo: 'O Princípio da Reserva Legal',
        subtitulo: 'Apenas representantes eleitos pelo povo',
        textoAudio: 'Apenas deputados federais e senadores aprovados no Congresso Nacional podem criar crimes no Brasil.',
        conteudoPrincipal: (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-1">
              <span className="font-bold text-emerald-400">PODE:</span>
              <p className="text-muted-foreground">Lei federal aprovada pelo Congresso Nacional (Deputados e Senadores).</p>
            </div>
            <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/20 space-y-1">
              <span className="font-bold text-rose-400">NÃO PODE:</span>
              <p className="text-muted-foreground">Decreto de prefeito, ordem de governador ou portaria de delegado.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-14',
        badge: 'Etapa 14 de 25 · Linha do Tempo',
        titulo: 'A Régua Cronológica do Tempo',
        subtitulo: 'Como o relógio do Direito Penal funciona',
        textoAudio: 'Veja a linha do tempo: No passado aconteceu a ação. No presente surgiu a nova lei. A lei tenta viajar para trás, mas é bloqueada.',
        conteudoPrincipal: (
          <div className="space-y-3">
            <div className="relative py-4 px-2">
              <div className="h-1.5 bg-border rounded-full w-full relative">
                <div className="absolute left-1/4 -top-2 w-5 h-5 rounded-full bg-purple-500 border-2 border-background" />
                <div className="absolute left-3/4 -top-2 w-5 h-5 rounded-full bg-teal-400 border-2 border-background" />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-3">
                <span>Passado: Conduta Praticada</span>
                <span>Presente: Nova Lei Aprovada</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-15',
        badge: 'Etapa 15 de 25 · O Muro do Tempo',
        titulo: 'A Barreira de Proteção Penal',
        subtitulo: 'Irretroatividade da lei que prejudica',
        textoAudio: 'O artigo primeiro funciona como um muro impenetrável. A lei que cria crime bate nessa barreira e não tem permissão para olhar para trás.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 text-center space-y-2 text-xs sm:text-sm">
            <ShieldCheck className="w-8 h-8 text-rose-400 mx-auto" />
            <h5 className="font-bold text-rose-300">O Muro Temporal</h5>
            <p className="text-muted-foreground">
              A lei penal que prejudica o cidadão é <strong>alérgica ao passado</strong>. Ela nunca pode retroagir para punir quem agiu antes de sua vigência.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-16',
        badge: 'Etapa 16 de 25 · Simulador Interativo',
        titulo: 'Simulador Cronológico',
        subtitulo: 'Teste na prática a posição no tempo',
        textoAudio: 'Teste no simulador o que acontece quando a conduta ocorre antes ou depois da vigência da lei.',
        conteudoPrincipal: <SimuladorArtigo1Tempo />,
      },
      {
        id: 'combo-art1-17',
        badge: 'Etapa 17 de 25 · E se a Pena Aumentar?',
        titulo: 'A Pena Também Não Pode Piorar',
        subtitulo: 'Anterioridade da pena legal',
        textoAudio: 'Se uma conduta já era crime com pena de um ano e a nova lei aumentou para dez anos, quem agiu antes responde pela pena antiga de um ano.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-teal-500/40 bg-card space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-teal-400">Proteção da Pena:</span>
            <p className="text-muted-foreground leading-relaxed">
              O princípio vale tanto para a criação do crime quanto para o aumento da punição. O Estado não pode aumentar o castigo de atos passados.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-18',
        badge: 'Etapa 18 de 25 · Mini-Game',
        titulo: 'Ligar os Termos do Artigo 1º',
        subtitulo: 'Conecte os conceitos para fixar no cérebro',
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
      {
        id: 'combo-art1-19',
        badge: 'Etapa 19 de 25 · Caso Prático Real',
        titulo: 'Você é o Juiz: O Caso dos Patinetes',
        subtitulo: 'Um dilema do cotidiano das grandes cidades',
        textoAudio: 'Você é o juiz. Em janeiro, Marcos andou de patinete elétrico na calçada. Em março, saiu uma lei criando crime de patinete na calçada. O promotor pede a prisão de Marcos pelo fato de janeiro.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-pink-500/40 bg-pink-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-pink-400">O Caso de Marcos:</span>
            <p className="text-muted-foreground leading-relaxed">
              Marcos andou a 40 km/h de patinete elétrico na calçada em janeiro. Em março, foi aprovada uma lei prevendo prisão para patinetes em calçadas. O promotor denunciou Marcos pelo fato de janeiro. O que você decide?
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-20',
        badge: 'Etapa 20 de 25 · Flashcard de Sentença',
        titulo: 'Toque para revelar o seu veredito!',
        subtitulo: 'Decisão judicial fundamentada',
        textoAudio: 'Toque para girar o cartão e conferir a sentença com base no artigo primeiro.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="Marcos pode ser punido criminalmente pelo fato praticado em janeiro?"
            verso="NÃO! Em janeiro, andar de patinete na calçada era um fato atípico (não era crime). Pelo Artigo 1º, a lei nova de março não pode retroagir. Denúncia rejeitada!"
          />
        ),
      },
      {
        id: 'combo-art1-21',
        badge: 'Etapa 21 de 25 · Árvore de Decisão',
        titulo: 'O Algoritmo Mental em 3 Passos',
        subtitulo: 'Como raciocinar diante de qualquer caso',
        textoAudio: 'Siga a árvore de decisão: Alguém agiu? A lei existia antes da ação? Se sim, analisa o crime. Se não, inocente e fato atípico.',
        conteudoPrincipal: (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg border bg-card text-center font-bold">1. Aconteceu uma conduta humana?</div>
            <div className="text-center text-muted-foreground">↓</div>
            <div className="p-2.5 rounded-lg border border-teal-500/40 bg-teal-950/20 text-center font-bold text-teal-300">
              2. Existia lei escrita proibindo no exato momento da ação?
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-300 font-bold">
                NÃO ➔ Inocente! (Fato Atípico)
              </div>
              <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 font-bold">
                SIM ➔ Prossegue apuração legal
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-22',
        badge: 'Etapa 22 de 25 · Exercício de Desafio',
        titulo: 'Desafio de Fixação Final',
        subtitulo: 'Provando seu domínio',
        textoAudio: 'Qual dos seguintes atos violaria o artigo primeiro do Código Penal?',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="Qual das seguintes situações violaria diretamente o Artigo 1º do Código Penal?"
            opcoes={[
              { texto: "O Congresso criar um crime hoje com vigência para condutas futuras.", correta: false, feedback: "Incorreto! Isso é perfeitamente válido e respeita a anterioridade." },
              { texto: "O juiz aplicar uma pena mais dura criada por lei após o crime ter sido cometido.", correta: true, feedback: "Correto! Aumentar a pena de fatos passados fere a anterioridade da cominação legal." },
              { texto: "A polícia investigar uma conduta proibida por lei vigente na data do fato.", correta: false, feedback: "Incorreto! Isso é o cumprimento correto da lei." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art1-23',
        badge: 'Etapa 23 de 25 · Glossário do Cidadão',
        titulo: 'Os 4 Termos que Você Agora Domina',
        subtitulo: 'Dicionário do Artigo 1º',
        textoAudio: 'Revise os quatro termos que você aprendeu: anterioridade, prévia cominação legal, reserva legal e fato atípico.',
        conteudoPrincipal: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-teal-400 block">Anterioridade:</strong> A lei nasce antes do ato.
            </div>
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-teal-400 block">Cominação:</strong> Tabela de punição previamente fixada.
            </div>
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-teal-400 block">Reserva Legal:</strong> Só o Congresso Nacional legisla em matéria penal.
            </div>
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-teal-400 block">Fato Atípico:</strong> Ato que não encaixa em nenhum crime escrito.
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art1-24',
        badge: 'Etapa 24 de 25 · Resumo em 1 Frase',
        titulo: 'A Regra Gravada para Sempre',
        subtitulo: 'Para nunca mais esquecer',
        textoAudio: 'A regra de ouro: Sem lei anterior, não há crime nem castigo. Você é livre para fazer tudo o que a lei prévia não proibir.',
        conteudoPrincipal: (
          <div className="p-5 rounded-2xl border border-teal-500/40 bg-teal-950/30 text-center space-y-2">
            <span className="text-3xl">🛡️</span>
            <h4 className="text-base font-bold text-teal-200">
              “Sem lei antes, sem crime e sem castigo!”
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você tem a garantia constitucional de que governantes não podem criar surpresas punitivas contra você.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art1-25',
        badge: 'Etapa 25 de 25 · Troféu de Maestria',
        titulo: 'Parabéns! Trilha Concluída com Sucesso',
        subtitulo: 'Você dominou o Artigo 1º do Código Penal',
        textoAudio: 'Parabéns! Você concluiu com sucesso a trilha master do artigo primeiro do Código Penal. Você agora compreende esse pilar da justiça com total clareza.',
        conteudoPrincipal: (
          <div className="p-6 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-3">
            <Award className="w-14 h-14 text-amber-400 mx-auto animate-pulse" />
            <h4 className="text-lg font-bold text-foreground">Mestre do Artigo 1º</h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Você completou todas as 25 etapas com anatomia, storytelling, bate-papo, simulações, ligar de termos e quizzes!
            </p>
          </div>
        ),
      },
    ];
  } else {
    // ARTIGO 2º COMBO (25 ETAPAS)
    return [
      {
        id: 'combo-art2-1',
        badge: 'Etapa 1 de 25 · Boas-Vindas',
        titulo: 'Trilha Master do Artigo 2º',
        subtitulo: 'A máquina do tempo que favorece o cidadão',
        textoAudio: 'Bem-vindo à trilha completa do artigo segundo do Código Penal. Aqui você vai entender a aplicação da lei no tempo e a retroatividade benéfica.',
        conteudoPrincipal: (
          <div className="p-5 rounded-2xl border border-blue-500/40 bg-gradient-to-br from-blue-950/30 to-background space-y-3 text-center">
            <Clock className="w-12 h-12 text-blue-400 mx-auto animate-spin" style={{ animationDuration: '8s' }} />
            <h4 className="text-base font-bold text-foreground">A Lei Penal no Tempo</h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Descubra por que a lei penal tem alergia de voltar no tempo para prejudicar, mas adora viajar no tempo para libertar e ajudar quem cometeu um ato no passado.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-2',
        badge: 'Etapa 2 de 25 · O Texto Oficial',
        titulo: 'O que diz o Artigo 2º?',
        subtitulo: 'Caput e Parágrafo Único',
        textoAudio: 'Artigo segundo: Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando a execução e os efeitos penais. A lei posterior que favorecer o agente aplica-se aos fatos anteriores.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-950/20 text-center space-y-2">
            <span className="text-[10px] font-bold uppercase text-blue-400">Texto Oficial</span>
            <p className="font-serif text-sm sm:text-base text-foreground italic leading-relaxed">
              “Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-3',
        badge: 'Etapa 3 de 25 · Abolitio Criminis',
        titulo: 'Quando o Crime Deixa de Existir',
        subtitulo: 'O caput em linguagem leiga',
        textoAudio: 'Abolitio criminis. Se a sociedade decide que uma conduta não deve mais ser crime, quem está preso é solto e a ficha fica limpa na hora.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-emerald-400">O Que Acontece com a Cadeia?</span>
            <p className="text-muted-foreground leading-relaxed">
              A prisão cessa na hora! Ninguém continua cumprindo pena por teimosia do Estado se a conduta deixou de ser crime na lei nova.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-4',
        badge: 'Etapa 4 de 25 · Exemplo Histórico Real',
        titulo: 'O Caso Real do Crime de Adultério',
        subtitulo: 'Brasil, ano de 2005',
        textoAudio: 'Até o ano de 2005, adultério era crime no Código Penal. Quando a lei revogou o crime, todos os processos e penas foram cancelados imediatamente.',
        conteudoPrincipal: (
          <div className="p-3.5 rounded-xl border border-amber-500/40 bg-card space-y-1.5 text-xs">
            <span className="font-bold text-amber-400">📅 Ano de 2005:</span>
            <p className="text-muted-foreground leading-relaxed">
              O adultério deixou de ser crime no Brasil pela Lei nº 11.106/2005. Todos os réus foram absolvidos e processos arquivados pelo Artigo 2º do Código Penal.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-5',
        badge: 'Etapa 5 de 25 · Exercício Rápido',
        titulo: 'Teste Relâmpago 1',
        subtitulo: 'Fixando a extinção do crime',
        textoAudio: 'Se uma conduta deixa de ser crime e a pessoa já estava presa há dois anos, ela continua cumprindo a pena restante? Não, ela é solta imediatamente.',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="Se uma pessoa foi condenada a 4 anos e já cumpriu 2, e hoje sai uma nova lei dizendo que o ato não é mais crime: o que acontece com ela?"
            opcoes={[
              { texto: "Ela é solta imediatamente e a ficha criminal é limpa (Abolitio Criminis).", correta: true, feedback: "Correto! O Artigo 2º determina que cessa a execução da pena imediatamente!" },
              { texto: "Ela tem que cumprir os 2 anos restantes porque a condenação foi no passado.", correta: false, feedback: "Incorreto! A lei nova que abole o crime alcança o passado sem exceções." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art2-6',
        badge: 'Etapa 6 de 25 · Parágrafo Único',
        titulo: 'A Lei que Favorece o Réu',
        subtitulo: 'Novatio Legis in Mellius',
        textoAudio: 'Parágrafo único: A lei posterior que de qualquer modo favorecer o agente aplica-se aos fatos anteriores, ainda que já decididos por sentença final.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-teal-400">O que é a Lei Benéfica?</span>
            <p className="text-muted-foreground leading-relaxed">
              Se a nova lei não acaba com o crime, mas diminui a pena (ex: de 8 para 4 anos) ou concede um benefício, essa lei nova também volta no tempo para ajudar quem agiu antes!
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-7',
        badge: 'Etapa 7 de 25 · Flashcard 3D',
        titulo: 'A Sentença Transitada em Julgado',
        subtitulo: 'Toque para girar o cartão',
        textoAudio: 'Toque para virar o cartão e entender o que acontece quando o processo já estava encerrado e não cabia mais recurso.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="Se o juiz já tinha batido o martelo definitivo anos atrás (trânsito em julgado), a nova lei que diminui a pena ainda se aplica?"
            verso="SIM! O parágrafo único é expresso: aplica-se aos fatos anteriores AINDA QUE decididos por sentença condenatória transitada em julgado!"
          />
        ),
      },
      {
        id: 'combo-art2-8',
        badge: 'Etapa 8 de 25 · História Real 1',
        titulo: 'O Caso de Lucas',
        subtitulo: 'Condenado no passado e cumprindo pena',
        textoAudio: 'Conheça o caso de Lucas. Em 2021 ele foi sentenciado a 4 anos de prisão e já cumpriu 2 anos. O julgamento encerrou definitivamente.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 flex items-center gap-3">
            <span className="text-3xl">👨</span>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Lucas, 28 anos, condenado a 4 anos em 2021. Já cumpriu 2 anos na prisão. Sentença definitiva transitada em julgado.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-9',
        badge: 'Etapa 9 de 25 · História Real 2',
        titulo: 'A Nova Lei de 2024',
        subtitulo: 'A pena máxima do crime diminui',
        textoAudio: 'Em 2024, entra em vigor uma nova lei no Brasil reduzindo a pena máxima desse crime para exatamente dois anos.',
        conteudoPrincipal: (
          <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-card space-y-1 text-xs">
            <span className="font-bold text-emerald-400">📢 Nova Lei em 2024:</span>
            <p className="text-foreground">
              A pena máxima daquele crime foi reduzida de 4 anos para 2 anos de reclusão.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-10',
        badge: 'Etapa 10 de 25 · História Real 3',
        titulo: 'A Família de Lucas Procura Ajuda',
        subtitulo: 'O processo já acabou, e agora?',
        textoAudio: 'A mãe de Lucas procura o defensor público com medo de que a nova lei não valesse para ele porque o processo já acabou.',
        conteudoPrincipal: (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-1 text-xs">
            <span className="font-bold text-amber-300">A Dúvida da Família:</span>
            <p className="text-muted-foreground italic">
              “Doutor, o processo do meu filho já acabou faz anos... Ele tem direito à redução da pena?”
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-11',
        badge: 'Etapa 11 de 25 · História Real 4',
        titulo: 'O Alvará de Soltura de Lucas',
        subtitulo: 'Pena cumprida e liberdade imediata',
        textoAudio: 'O juiz da execução penal aplica o artigo segundo e emite o alvará de soltura. Como a nova pena é de 2 anos e Lucas já cumpriu 2 anos, a pena está extinta.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-emerald-400">🎉 Lucas é Solto Imediatamente!</span>
            <p className="text-muted-foreground leading-relaxed">
              O Artigo 2º retroagiu para beneficiar Lucas. Como a nova pena era de 2 anos e ele já havia cumprido 2 anos, a pena foi julgada extinta!
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-12',
        badge: 'Etapa 12 de 25 · Bate-Papo Tutor',
        titulo: 'A Dúvida que Todo Leigo Tem',
        subtitulo: '“Mas a lei não viajava para trás?”',
        textoAudio: 'Aluno pergunta: No artigo primeiro você disse que a lei nunca volta no tempo. Agora no artigo segundo você diz que ela volta? Ficou confuso!',
        conteudoPrincipal: (
          <div className="space-y-2.5 text-xs sm:text-sm">
            <div className="p-3 rounded-2xl rounded-tl-none bg-secondary/80 border text-foreground max-w-[85%]">
              “Professor! No Artigo 1º você disse que a lei NÃO volta no tempo. Agora no Artigo 2º você diz que ela volta? Tô confuso!”
            </div>
            <div className="p-3 rounded-2xl rounded-tr-none bg-teal-500/20 border border-teal-500/30 text-foreground max-w-[85%] ml-auto text-right">
              “A regra de ouro é simples: <strong>a lei penal nunca volta no tempo para PREJUDICAR, mas sempre volta para AJUDAR!</strong>”
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-13',
        badge: 'Etapa 13 de 25 · A Metáfora do Desconto',
        titulo: 'A Analogia da Loja e do Cupom',
        subtitulo: 'Entendendo em 10 segundos',
        textoAudio: 'Imagina que você comprou um curso parcelado. Se a escola der desconto retroativo para contratos antigos, você quer o desconto? Claro! Mas se quisesse cobrar mais, você aceitaria? Nunca! No Direito Penal é igual.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-card space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-cyan-400">🛍️ O Cupom de Desconto:</span>
            <p className="text-muted-foreground leading-relaxed">
              A lei penal concede o desconto retroativo porque favorece o cidadão. Mas jamais cobra a mais pelos fatos já passados.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-14',
        badge: 'Etapa 14 de 25 · Efeitos Civis vs Penais',
        titulo: 'O que Apaga e o que Continua?',
        subtitulo: 'Cessando a execução e os efeitos penais',
        textoAudio: 'A nova lei apaga os efeitos penais como prisão e reincidência. Mas se você causou prejuízo financeiro para a vítima, a obrigação civil de indenizar continua valendo.',
        conteudoPrincipal: (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-1">
              <span className="font-bold text-emerald-400">APAGA:</span>
              <p className="text-muted-foreground">Prisão, reincidência criminal e execução penal.</p>
            </div>
            <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-1">
              <span className="font-bold text-amber-400">CONTINUA:</span>
              <p className="text-muted-foreground">Obrigação civil de pagar o prejuízo financeiro da vítima.</p>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-15',
        badge: 'Etapa 15 de 25 · Linha do Tempo',
        titulo: 'O Portal de Retroatividade Aberto',
        subtitulo: 'A máquina do tempo em ação',
        textoAudio: 'Na linha do tempo do artigo segundo, quando a lei nova é mais boazinha, abre-se um portal no tempo para alcançar o réu no passado.',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/20 text-center space-y-2">
            <span className="text-2xl">🌀</span>
            <h5 className="font-bold text-purple-300">Ponte Temporal Benéfica</h5>
            <p className="text-xs text-muted-foreground">
              A lei boa volta no tempo e neutraliza qualquer decisão judicial anterior que seja mais severa.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-16',
        badge: 'Etapa 16 de 25 · Simulador Interativo',
        titulo: 'Simulador dos 3 Efeitos Temporais',
        subtitulo: 'Alterne os cenários para ver a reação',
        textoAudio: 'Teste no simulador o que acontece quando o crime acaba, quando a pena diminui ou quando a pena aumenta.',
        conteudoPrincipal: <SimuladorArtigo2Tempo />,
      },
      {
        id: 'combo-art2-17',
        badge: 'Etapa 17 de 25 · Quem Aplica o Benefício?',
        titulo: 'A Súmula 611 do STF',
        subtitulo: 'O Juiz da Vara de Execuções Penais',
        textoAudio: 'Súmula 611 do STF: Transitada em julgado a sentença, compete ao juiz das execuções a aplicação de lei mais benigna. Não precisa reabrir o processo todo!',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-teal-500/40 bg-card space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-teal-400">Aplicação Direta e Rápida:</span>
            <p className="text-muted-foreground leading-relaxed">
              Não é necessário entrar com recurso demorado ou anular o julgamento. O juiz que fiscaliza o presídio recalcula a pena diretamente na ficha do réu.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-18',
        badge: 'Etapa 18 de 25 · Mini-Game',
        titulo: 'Ligar os Termos do Artigo 2º',
        subtitulo: 'Conecte os conceitos em latim aos significados leigos',
        textoAudio: 'Mini game: Conecte os termos da esquerda com os significados simples da direita.',
        conteudoPrincipal: (
          <LigarTermosGame 
            pares={[
              { id: '1', termo: 'Abolitio Criminis', significado: 'Extinção completa do crime e liberdade total' },
              { id: '2', termo: 'Novatio Legis in Mellius', significado: 'Lei nova mais suave que diminui a pena' },
              { id: '3', termo: 'Novatio Legis in Pejus', significado: 'Lei nova mais severa que NÃO pode retroagir' },
              { id: '4', termo: 'Trânsito em Julgado', significado: 'Processo encerrado onde não cabe mais recurso' },
            ]}
          />
        ),
      },
      {
        id: 'combo-art2-19',
        badge: 'Etapa 19 de 25 · Caso Prático Real',
        titulo: 'Você é o Juiz: O Caso de Roberto',
        subtitulo: 'Julgue o pedido de liberdade',
        textoAudio: 'Roberto foi condenado a cinco anos em 2022. Em 2024 sai lei baixando a pena para dois anos. Roberto já cumpriu dois anos. O que você decide?',
        conteudoPrincipal: (
          <div className="p-4 rounded-xl border border-pink-500/40 bg-pink-950/20 space-y-2 text-xs sm:text-sm">
            <span className="font-bold text-pink-400">O Caso de Roberto:</span>
            <p className="text-muted-foreground leading-relaxed">
              Roberto foi condenado a 5 anos de reclusão em 2022. Em 2024, após Roberto já ter cumprido 2 anos de cadeia, entra em vigor uma nova lei que reduz a pena máxima desse crime para 2 anos. O que você decide?
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-20',
        badge: 'Etapa 20 de 25 · Flashcard de Sentença',
        titulo: 'Toque para revelar a sentença!',
        subtitulo: 'Decisão judicial fundamentada',
        textoAudio: 'Toque para girar o cartão e conferir a sentença de Roberto.',
        conteudoPrincipal: (
          <FlipCardItem 
            frente="Roberto deve ser solto imediatamente ou continuar preso?"
            verso="SOLTO IMEDIATAMENTE! Pelo Artigo 2º, parágrafo único, a lei mais benéfica retroage aos fatos anteriores. Como a nova pena máxima é de 2 anos e ele já cumpriu 2 anos, a pena está extinta!"
          />
        ),
      },
      {
        id: 'combo-art2-21',
        badge: 'Etapa 21 de 25 · Árvore de Decisão',
        titulo: 'O Algoritmo Mental do Artigo 2º',
        subtitulo: 'Como decidir diante de uma nova lei',
        textoAudio: 'Surgiu uma nova lei após o fato? Ela favorece o réu? Se sim, retroage na hora. Se piora, não retroage.',
        conteudoPrincipal: (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg border bg-card text-center font-bold">Surgiu uma NOVA LEI após a conduta?</div>
            <div className="text-center text-muted-foreground">↓</div>
            <div className="p-2.5 rounded-lg border border-teal-500/40 bg-teal-950/20 text-center font-bold text-teal-300">
              Ela FAVORECE o réu de qualquer modo?
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 font-bold">
                SIM ➔ Retroage na hora! (Mesmo após sentença final)
              </div>
              <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-300 font-bold">
                NÃO ➔ Não retroage! (Vale a lei antiga suave)
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-22',
        badge: 'Etapa 22 de 25 · Exercício de Desafio',
        titulo: 'Desafio Final do Artigo 2º',
        subtitulo: 'Fixando a regra definitiva',
        textoAudio: 'Se uma lei nova aumentar a pena de dez para vinte anos, ela atinge crimes praticados antes? Não, nunca.',
        conteudoPrincipal: (
          <QuizInterativoItem 
            pergunta="Uma nova lei penal aumenta a pena de um crime de 10 anos para 20 anos. Essa lei atinge quem cometeu o crime antes de sua vigência?"
            opcoes={[
              { texto: "Não! A lei penal mais severa (Lex Gravior) nunca retroage.", correta: true, feedback: "Perfeito! A lei penal só retroage quando for para beneficiar o agente." },
              { texto: "Sim! A lei mais recente sempre substitui a antiga em todos os casos.", correta: false, feedback: "Incorreto! A Constituição e o Código Penal proíbem retroatividade prejudicial." },
            ]}
          />
        ),
      },
      {
        id: 'combo-art2-23',
        badge: 'Etapa 23 de 25 · Glossário do Artigo 2º',
        titulo: 'Os 4 Termos que Você Agora Domina',
        subtitulo: 'Dicionário do Artigo 2º',
        textoAudio: 'Revise os quatro termos do artigo segundo: Abolitio criminis, novatio legis in mellius, novatio legis in pejus e trânsito em julgado.',
        conteudoPrincipal: (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-blue-400 block">Abolitio Criminis:</strong> O crime deixou de existir totalmente.
            </div>
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-blue-400 block">Lex Mitior / In Mellius:</strong> Lei nova mais suave que diminui a pena.
            </div>
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-blue-400 block">Lex Gravior / In Pejus:</strong> Lei nova mais severa que NÃO retroage.
            </div>
            <div className="p-2.5 rounded-xl border bg-card">
              <strong className="text-blue-400 block">Trânsito em Julgado:</strong> Decisão definitiva onde não cabe recurso.
            </div>
          </div>
        ),
      },
      {
        id: 'combo-art2-24',
        badge: 'Etapa 24 de 25 · Resumo em 1 Frase',
        titulo: 'A Regra Gravada para Sempre',
        subtitulo: 'O mandamento do Artigo 2º',
        textoAudio: 'A regra de ouro: Lei boa viaja no tempo e ajuda todo mundo no passado. Lei ruim fica presa no presente.',
        conteudoPrincipal: (
          <div className="p-5 rounded-2xl border border-blue-500/40 bg-blue-950/30 text-center space-y-2">
            <span className="text-3xl">⚖️</span>
            <h4 className="text-base font-bold text-blue-200">
              “Lei boa viaja no tempo, lei ruim fica no presente!”
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O benefício alcança até as condenações que já estavam encerradas. A liberdade sempre prevalece sobre a rigidez do Estado.
            </p>
          </div>
        ),
      },
      {
        id: 'combo-art2-25',
        badge: 'Etapa 25 de 25 · Troféu de Maestria',
        titulo: 'Parabéns! Trilha Concluída com Sucesso',
        subtitulo: 'Você dominou o Artigo 2º do Código Penal',
        textoAudio: 'Parabéns! Você concluiu com sucesso a trilha master do artigo segundo do Código Penal. Você domina a dinâmica temporal com total segurança.',
        conteudoPrincipal: (
          <div className="p-6 rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-card to-background text-center space-y-3">
            <Award className="w-14 h-14 text-amber-400 mx-auto animate-pulse" />
            <h4 className="text-lg font-bold text-foreground">Mestre do Artigo 2º</h4>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Você completou todas as 25 etapas com teoria, casos reais, minigame de ligar os termos, simulador e exercícios práticos!
            </p>
          </div>
        ),
      },
    ];
  }
}

// ==========================================
// LISTA DE TODAS AS MECÂNICAS (COMBO + AS 5 INDIVIDUAIS)
// ==========================================

const MECANICAS: MecanicaDef[] = [
  // ----------------------------------------------------
  // MECÂNICA 0: O COMBO (A SUPER TRILHA INTEGRADA)
  // ----------------------------------------------------
  {
    id: 'combo',
    nome: '🌟 O COMBO — Trilha Master Completa',
    badge: '25 Etapas · Todas as Mecânicas Juntas',
    icone: Flame,
    corPrimaria: 'text-amber-400',
    gradienteFundo: 'from-amber-950/40 via-purple-950/20 to-teal-950/30',
    bordaCor: 'border-amber-500/50 hover:border-amber-400',
    botaoCor: 'bg-gradient-to-r from-amber-500 via-purple-500 to-teal-500 hover:from-amber-600 hover:to-teal-600 shadow-amber-500/30',
    subtitulo: 'Anatomia + Storytelling + Chat + Linha do Tempo + Flashcards + Ligar Termos + Quizzes',
    descricaoCurta: 'A experiência definitiva recomendada: reúne todos os 5 métodos pedagógicos em uma única jornada completa de 25 etapas interativas.',
    focoLeigo: 'Domínio 100% definitivo do artigo sem deixar nenhuma ponta solta ou dúvida.',
    totalSlidesText: '25 Etapas Completas',
    slides: {
      art1: gerarSlidesCombo('art1'),
      art2: gerarSlidesCombo('art2'),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 1: ANATOMIA & TRADUÇÃO
  // ----------------------------------------------------
  {
    id: 'anatomia',
    nome: '1. Anatomia & Tradução Palavra por Palavra',
    badge: 'Legal Design & Micro-Tradução',
    icone: Layers,
    corPrimaria: 'text-emerald-400',
    gradienteFundo: 'from-emerald-950/40 via-emerald-900/10 to-transparent',
    bordaCor: 'border-emerald-500/40 hover:border-emerald-400',
    botaoCor: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25',
    subtitulo: 'Desconstrução do juridiquês em português claro',
    descricaoCurta: 'Fatia o artigo em blocos e traduz termos difíceis como "cominação" e "anterioridade" em linguagem do dia a dia.',
    focoLeigo: 'Elimina o medo de ler a lei pura e explica o que cada frase significa na vida real.',
    totalSlidesText: '8 Etapas com Exercícios',
    slides: {
      art1: gerarSlidesCombo('art1').slice(0, 8),
      art2: gerarSlidesCombo('art2').slice(0, 8),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 2: STORYTELLING & CASOS DA VIDA REAL
  // ----------------------------------------------------
  {
    id: 'storytelling',
    nome: '2. Storytelling & Casos da Vida Real',
    badge: 'Narrativa em Capítulos',
    icone: BookOpen,
    corPrimaria: 'text-amber-400',
    gradienteFundo: 'from-amber-950/40 via-amber-900/10 to-transparent',
    bordaCor: 'border-amber-500/40 hover:border-amber-400',
    botaoCor: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
    subtitulo: 'Histórias ilustradas com dilemas humanos cotidianos',
    descricaoCurta: 'Acompanhe Dona Clara (vendedora de chás) e Lucas (condenado no passado) para entender a aplicação prática da lei na vida das pessoas.',
    focoLeigo: 'Cria empatia imediata através de uma historinha sem termos jurídicos frios.',
    totalSlidesText: '8 Etapas com Decisões',
    slides: {
      art1: gerarSlidesCombo('art1').slice(6, 14),
      art2: gerarSlidesCombo('art2').slice(7, 15),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 3: DIÁLOGO TUTOR & ALUNO CURIOSO
  // ----------------------------------------------------
  {
    id: 'dialogo',
    nome: '3. Diálogo Tutor & Aluno Curioso',
    badge: 'Chat Socrático com Metáforas',
    icone: MessageSquare,
    corPrimaria: 'text-cyan-400',
    gradienteFundo: 'from-cyan-950/40 via-blue-900/10 to-transparent',
    bordaCor: 'border-cyan-500/40 hover:border-cyan-400',
    botaoCor: 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/25',
    subtitulo: 'Bate-papo estilo WhatsApp com analogias descontraídas',
    descricaoCurta: 'Um cidadão leigo faz perguntas sinceras e o tutor responde usando a pelada de futebol e cupons de compras.',
    focoLeigo: 'Linguagem natural, sem cerimônia, tirando exatamente as dúvidas que qualquer leigo teria.',
    totalSlidesText: '8 Etapas Conversacionais',
    slides: {
      art1: gerarSlidesCombo('art1').slice(10, 18),
      art2: gerarSlidesCombo('art2').slice(11, 19),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 4: LINHA DO TEMPO VISUAL & SIMULADOR
  // ----------------------------------------------------
  {
    id: 'linha_tempo',
    nome: '4. Linha do Tempo & Simulador Temporal',
    badge: 'Visual Law Cronológico',
    icone: Clock,
    corPrimaria: 'text-purple-400',
    gradienteFundo: 'from-purple-950/40 via-violet-900/10 to-transparent',
    bordaCor: 'border-purple-500/40 hover:border-purple-400',
    botaoCor: 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/25',
    subtitulo: 'Régua cronológica com teste de causa e efeito',
    descricaoCurta: 'Visualiza graficamente o momento do fato vs publicação da lei. Mostra o "Muro do Tempo" e o "Portal da Retroatividade".',
    focoLeigo: 'Demonstração espacial e cronológica perfeita para quem aprende melhor visualmente.',
    totalSlidesText: '8 Etapas com Simulador',
    slides: {
      art1: gerarSlidesCombo('art1').slice(13, 21),
      art2: gerarSlidesCombo('art2').slice(14, 22),
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 5: MAPA MENTAL & DESAFIO GAMIFICADO
  // ----------------------------------------------------
  {
    id: 'mapa_decisao',
    nome: '5. Mapa Mental, Flashcards & Ligar Termos',
    badge: 'Você é o Juiz · Gamificação',
    icone: BrainCircuit,
    corPrimaria: 'text-pink-400',
    gradienteFundo: 'from-pink-950/40 via-rose-900/10 to-transparent',
    bordaCor: 'border-pink-500/40 hover:border-pink-400',
    botaoCor: 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/25',
    subtitulo: 'Árvore de decisão simples, jogo de ligar termos e flashcard 3D',
    descricaoCurta: 'Resolva um caso real tocando para virar o cartão 3D, conecte os termos jurídicos e teste sua maestria.',
    focoLeigo: 'Divertido, gamificado e fácil de fixar na memória em poucos segundos.',
    totalSlidesText: '8 Etapas Gamificadas',
    slides: {
      art1: gerarSlidesCombo('art1').slice(17, 25),
      art2: gerarSlidesCombo('art2').slice(17, 25),
    },
  },
];

// ==========================================
// PÁGINA PRINCIPAL DO LABORATÓRIO
// ==========================================

const AdminAprenderLeisLaboratorio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  // Estados principais
  const [artigoAtual, setArtigoAtual] = useState<ArtigoId>('art1');
  const [mecanicaSelecionadaId, setMecanicaSelecionadaId] = useState<MecanicaId>('combo');
  const [emAula, setEmAula] = useState(false); // Alterna para TELA TODA
  const [slideIndex, setSlideIndex] = useState(0);
  const [falando, setFalando] = useState(false);

  const mecanica = useMemo(() => {
    return MECANICAS.find(m => m.id === mecanicaSelecionadaId) || MECANICAS[0];
  }, [mecanicaSelecionadaId]);

  const slides = useMemo(() => {
    return mecanica.slides[artigoAtual] || [];
  }, [mecanica, artigoAtual]);

  const slideAtual = useMemo(() => {
    return slides[slideIndex] || slides[0];
  }, [slides, slideIndex]);

  // Ações de alternância de artigo
  const handleAlternarArtigo = (art: ArtigoId) => {
    pararVoz();
    setArtigoAtual(art);
    setSlideIndex(0);
  };

  // Iniciar aula para uma mecânica específica (EM TELA TODA!)
  const handleIniciarAula = (mecId: MecanicaId) => {
    pararVoz();
    setMecanicaSelecionadaId(mecId);
    setSlideIndex(0);
    setEmAula(true);
  };

  // Sair da aula de tela toda
  const handleSairDaAula = () => {
    pararVoz();
    setEmAula(false);
  };

  // Controles de slide
  const proximoSlide = () => {
    if (slideIndex < slides.length - 1) {
      pararVoz();
      setSlideIndex(prev => prev + 1);
    }
  };

  const slideAnterior = () => {
    if (slideIndex > 0) {
      pararVoz();
      setSlideIndex(prev => prev - 1);
    }
  };

  // Teclado (← e →)
  useEffect(() => {
    if (!emAula) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') proximoSlide();
      if (e.key === 'ArrowLeft') slideAnterior();
      if (e.key === 'Escape') handleSairDaAula();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emAula, slideIndex, slides.length]);

  // Síntese de Voz (TTS)
  const falarSlide = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info('Síntese de voz não suportada neste navegador.');
      return;
    }

    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(slideAtual.textoAudio);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setFalando(false);
    utterance.onerror = () => setFalando(false);

    setFalando(true);
    window.speechSynthesis.speak(utterance);
  };

  const pararVoz = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFalando(false);
  };

  useEffect(() => {
    return () => pararVoz();
  }, []);

  const mobileHeader = (
    <PageHeader 
      title="Laboratório — Aprender Leis" 
      onBack={() => {
        pararVoz();
        navigate('/admin-aprender-leis');
      }} 
    />
  );

  return (
    <>
      {/* ========================================================= */}
      {/* SE ESTIVER EM AULA: MODO TELA TODA (FULL SCREEN MODAL)   */}
      {/* ========================================================= */}
      {emAula && (
        <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col overflow-hidden">
          
          {/* TOPO DA TELA TODA: Barra de Controles e Progresso */}
          <div className="p-3.5 sm:p-4 border-b border-border/80 bg-background/95 backdrop-blur-md flex flex-col gap-2.5 shrink-0 shadow-sm">
            
            {/* Linha 1: Botão Sair, Título da Mecânica e Botão de Áudio */}
            <div className="flex items-center justify-between gap-3">
              
              {/* Botão Sair da Aula */}
              <button
                onClick={handleSairDaAula}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-foreground text-xs font-bold transition-colors"
                title="Sair da Aula (Esc)"
              >
                <X className="w-4 h-4 text-muted-foreground" />
                <span>Sair</span>
              </button>

              {/* Informações Centrais */}
              <div className="text-center min-w-0 flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider block truncate ${mecanica.corPrimaria}`}>
                  {mecanica.nome}
                </span>
                <span className="text-xs font-extrabold text-foreground">
                  {artigoAtual === 'art1' ? 'Código Penal — Artigo 1º' : 'Código Penal — Artigo 2º'}
                </span>
              </div>

              {/* Botão de Narração em Áudio */}
              <button
                onClick={falarSlide}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 shadow-sm ${
                  falando
                    ? `${mecanica.botaoCor} text-white animate-pulse`
                    : 'border-border bg-secondary/50 hover:bg-secondary text-foreground'
                }`}
                title="Ouvir explicação do slide com voz"
              >
                {falando ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Pausar</span>
                  </>
                ) : (
                  <>
                    <Volume2 className={`w-3.5 h-3.5 ${mecanica.corPrimaria}`} />
                    <span className="hidden sm:inline">Ouvir</span>
                  </>
                )}
              </button>
            </div>

            {/* Linha 2: Barra de Progresso Progressiva */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>{slideAtual.badge}</span>
                <span>Etapa {slideIndex + 1} de {slides.length}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${mecanica.botaoCor}`}
                  style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
                />
              </div>
            </div>

          </div>

          {/* CENTRO DA TELA TODA: CONTEÚDO ROLÁVEL DO SLIDE */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl mx-auto space-y-4 my-auto">
              
              <div className="text-center space-y-1">
                <h3 className="text-lg sm:text-2xl font-bold font-display text-foreground tracking-tight">
                  {slideAtual.titulo}
                </h3>
                {slideAtual.subtitulo && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {slideAtual.subtitulo}
                  </p>
                )}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={slideAtual.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  {slideAtual.conteudoPrincipal}
                </motion.div>
              </AnimatePresence>

            </div>
          </div>

          {/* RODAPÉ DA TELA TODA: CONTROLES DE NAVEGAÇÃO */}
          <div className="p-4 border-t border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 shadow-lg">
            <button
              onClick={slideAnterior}
              disabled={slideIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="text-xs text-muted-foreground font-bold">
              {slideIndex + 1} / {slides.length}
            </div>

            {slideIndex < slides.length - 1 ? (
              <button
                onClick={proximoSlide}
                className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 ${mecanica.botaoCor}`}
              >
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  pararVoz();
                  handleSairDaAula();
                  toast.success('Parabéns! Você completou a aula inteira com sucesso!');
                }}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all ${mecanica.botaoCor}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir Aula</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TELA PADRÃO DO LABORATÓRIO (LISTA DE MECÂNICAS)           */}
      {/* ========================================================= */}
      <DesktopPageLayout
        activeId="admin"
        title="Laboratório — Aprender Leis"
        subtitle="Teste e avalie mecânicas de aulas do Código Penal para pessoas leigas"
        mobileHeader={mobileHeader}
      >
        <div className="px-4 sm:px-6 py-4 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full space-y-5">
          
          {/* Alternador de Artigos */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-400">
                    Código Penal (DL 2.848/1940)
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    Selecione o Artigo para o Laboratório:
                  </h3>
                </div>
              </div>

              {/* Botões de Alternância */}
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-secondary/80 border border-border/70 self-stretch sm:self-auto gap-1">
                <button
                  onClick={() => handleAlternarArtigo('art1')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                    artigoAtual === 'art1'
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Artigo 1º</span>
                  <span className="hidden sm:inline text-[11px] opacity-80">(Anterioridade)</span>
                </button>
                <button
                  onClick={() => handleAlternarArtigo('art2')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                    artigoAtual === 'art2'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/30 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>Artigo 2º</span>
                  <span className="hidden sm:inline text-[11px] opacity-80">(Retroatividade)</span>
                </button>
              </div>
            </div>

            {/* Texto literal do artigo */}
            <div className="p-3.5 rounded-xl border border-teal-500/25 bg-teal-950/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                {ARTIGOS_INFO[artigoAtual].titulo}
              </span>
              <p className="font-serif text-xs sm:text-sm italic text-foreground/90 leading-relaxed">
                {ARTIGOS_INFO[artigoAtual].texto}
              </p>
            </div>
          </div>

          {/* LISTA DE MECÂNICAS DIDÁTICAS (VERTICAL) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Escolha o Formato da Aula para Iniciar:
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toque em <strong>Iniciar Aula</strong> em qualquer uma das opções para abrir em <strong>Tela Toda</strong> com exercícios, quizzes e flashcards.
                </p>
              </div>
            </div>

            {/* ITENS DA LISTA EM COLUNA VERTICAL */}
            <div className="space-y-3">
              {MECANICAS.map((mec) => {
                const Icon = mec.icone;
                const isCombo = mec.id === 'combo';
                return (
                  <div
                    key={mec.id}
                    className={`group relative overflow-hidden rounded-2xl border ${mec.bordaCor} bg-gradient-to-br ${mec.gradienteFundo} bg-card p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md ${
                      isCombo ? 'ring-1 ring-amber-500/40' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Lado Esquerdo */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl bg-background/80 border ${mec.bordaCor} flex items-center justify-center shrink-0 shadow-sm`}>
                          <Icon className={`w-6 h-6 ${mec.corPrimaria}`} />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/80 border ${mec.bordaCor} ${mec.corPrimaria} uppercase tracking-wider`}>
                              {mec.badge}
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {mec.totalSlidesText}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-foreground">
                            {mec.nome}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {mec.descricaoCurta}
                          </p>
                          <p className="text-[11px] text-foreground/80 font-medium pt-0.5">
                            <strong>Destaque pedagógico:</strong> {mec.focoLeigo}
                          </p>
                        </div>
                      </div>

                      {/* Lado Direito: Botão Iniciar Aula */}
                      <div className="self-end sm:self-center shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => handleIniciarAula(mec.id)}
                          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 ${mec.botaoCor}`}
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Iniciar Aula (Tela Toda)</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé: Atalho para Criar Aulas via OmniRoute */}
          <div className="p-4 sm:p-5 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                Pronto para gerar em lote para todas as leis?
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                O gerador <strong>OmniRoute</strong> cria automaticamente essas trilhas completas com exercícios para qualquer lei do app.
              </p>
            </div>
            <button
              onClick={() => {
                pararVoz();
                navigate('/admin-aprender-leis/criar');
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shrink-0 transition-colors shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>Abrir Criador OmniRoute</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </DesktopPageLayout>
    </>
  );
};

export default AdminAprenderLeisLaboratorio;
