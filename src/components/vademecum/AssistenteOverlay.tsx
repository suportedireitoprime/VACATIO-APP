import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Plus, Globe, History as HistoryIcon,
  FileDown, Layers, HelpCircle, GitBranch, Paperclip, X, Check, Loader2, Zap, FileText, Image as ImageIcon,
  BookOpen, Share2, Scale, Mic, Camera, Music, Brain, ChevronDown, ArrowLeft,
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { haptic } from '@/lib/nativeHaptics';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { generateOmniChat, generateOmniChatStream } from '@/lib/omniRouteClient';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { pdf, Document, Page, Text as PdfText, StyleSheet } from '@react-pdf/renderer';
import { track } from '@/lib/analyticsEvents';
import {
  FlipFlashcards, QuestoesRunner, MapaMentalCanvas, TermosViewer, ShareSheet,
  type Flashcard, type Questao, type MapaNode, type Termo,
} from '@/components/chat/ChatArtifacts';
import { useIsDesktop } from '@/hooks/use-desktop';
import {
  CitationChip,
  SourcesFooter,
  injectCitationLinks,
  extractStatuteSources,
  type ChatSource,
} from '@/components/chat/ChatSources';
import { ChatFeedback } from '@/components/chat/ChatFeedback';
import { stripCitations } from '@/components/chat/ChatSources';
import PremiumGate, { type PremiumFeatureKey } from '@/components/PremiumGate';
import { useFeatureLimit } from '@/hooks/useFeatureLimit';


type ArtifactKind = 'flashcards' | 'questoes' | 'mapa' | 'termos';
interface Artifact { id: string; kind: ArtifactKind; data: any; sourceId: string; createdAt: number; title: string }
interface Attachment { mime: string; data: string; name: string; }
interface Message { id: string; role: 'user' | 'assistant'; content: string; attachment?: Attachment; createdAt: number; sources?: ChatSource[]; webSearch?: boolean; }
interface Session { id: string; date: string; title: string; messages: Message[]; artifacts?: Artifact[]; updatedAt: number; }

const HIST_KEY = 'chat_juridico_hist_v2';
const ANALYZE_STEPS = [
  'Interpretando sua pergunta',
  'Consultando fontes jurídicas',
  'Analisando artigos e súmulas',
  'Estruturando resposta',
];

const ARTIFACT_STEPS: Record<string, string[]> = {
  flashcards: [
    'Analisando a fundamentação jurídica',
    'Extraindo conceitos-chave e teses',
    'Criando flashcards de memorização',
    'Quase pronto, finalizando seus cartões',
  ],
  questoes: [
    'Mapeando os pontos centrais da matéria',
    'Formulando enunciados e alternativas',
    'Fundamentando gabarito e comentários',
    'Quase pronto, organizando seu simulado',
  ],
  mapa: [
    'Mapeando ramificações e hierarquia da lei',
    'Conectando institutos e artigos correlatos',
    'Estruturando diagrama visual dos tópicos',
    'Quase pronto, renderizando mapa mental',
  ],
  termos: [
    'Identificando termos técnicos e expressões',
    'Consultando definições e aplicações práticas',
    'Sintetizando glossário com fundamentação',
    'Quase pronto, organizando vocabulário',
  ],
  pdf: [
    'Compilando o conteúdo e citações',
    'Formatando artigos e notas explicativas',
    'Diagramando layout profissional para impressão',
    'Quase pronto, gerando seu PDF',
  ],
};

const SUGGESTIONS_POOL = [
  'O que é habeas corpus?',
  'Explique o Art. 5º da CF',
  'Diferença entre dolo e culpa',
  'O que é usucapião?',
  'Como funciona a legítima defesa?',
  'Princípios do direito administrativo',
  'O que é súmula vinculante?',
  'Prescrição no direito penal',
  'Diferença entre furto e roubo',
  'Responsabilidade civil objetiva',
  'Como funciona o mandado de segurança?',
  'O que são cláusulas pétreas?',
  'Princípio da anterioridade tributária',
  'O que é boa-fé objetiva?',
  'Diferença entre STF e STJ',
  'O que é improbidade administrativa?',
  'Explique o devido processo legal',
  'O que é coisa julgada?',
];

function pickSuggestions(n = 4): string[] {
  const arr = [...SUGGESTIONS_POOL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  h: { fontSize: 14, marginBottom: 12, fontFamily: 'Helvetica-Bold' },
  p: { fontSize: 11, lineHeight: 1.55, marginBottom: 8 },
});

function stripMd(t: string) { return t.replace(/[*_`#>[\]()]/g, '').replace(/\n{3,}/g, '\n\n'); }

function loadSessions(): Session[] {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; }
}
function saveSessions(s: Session[]) { localStorage.setItem(HIST_KEY, JSON.stringify(s.slice(0, 100))); }

interface Props { open: boolean; onClose: () => void; }

const VORTEX_TERMS = [
  { text: 'STF', angle: 0, delay: 0, duration: 4.6, color: '#38BDF8' },
  { text: 'Jurisprudência', angle: 45, delay: 0.7, duration: 5.2, color: '#EC4899' },
  { text: 'STJ', angle: 90, delay: 1.4, duration: 4.8, color: '#FACC15' },
  { text: 'Leis', angle: 135, delay: 2.1, duration: 4.4, color: '#34D399' },
  { text: 'Súmulas', angle: 180, delay: 2.8, duration: 5.0, color: '#A78BFA' },
  { text: 'Constituição', angle: 225, delay: 3.5, duration: 5.4, color: '#F43F5E' },
  { text: 'Doutrina', angle: 270, delay: 4.2, duration: 4.7, color: '#FB923C' },
  { text: 'Precedentes', angle: 315, delay: 4.9, duration: 5.1, color: '#60A5FA' },
];

function VortexBrain() {
  const radius = 126;

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-2 select-none pointer-events-none overflow-visible">
      {/* Cosmic background glow */}
      <div className="absolute inset-8 rounded-full bg-gradient-to-tr from-accent/25 via-primary/20 to-accent/30 blur-2xl animate-pulse" />

      {/* Gravitational Event Horizon Rings (ondas sugadas para dentro do cérebro) */}
      {[0, 1.4, 2.8].map((delay, idx) => (
        <motion.div
          key={idx}
          initial={{ scale: 1.5, opacity: 0, rotate: 0 }}
          animate={{
            scale: [1.5, 0.9, 0.3],
            opacity: [0, 0.45, 0],
            rotate: [0, 60, 140],
          }}
          transition={{
            duration: 4.2,
            repeat: Infinity,
            delay,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="absolute w-44 h-44 rounded-full border border-accent/35 border-dashed"
        />
      ))}

      {/* Anel de órbita pontilhada */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        className="absolute w-56 h-56 rounded-full border border-accent/15 border-t-accent/40 border-b-primary/40 border-dotted"
      />

      {/* Palavras-chave sendo sugadas em espiral gravitacional para o centro do cérebro */}
      {VORTEX_TERMS.map((term) => {
        const rad = (term.angle * Math.PI) / 180;
        const spiralRad = rad + 0.65; // Curvatura em espiral em direção ao centro
        const startX = Math.round(radius * Math.cos(rad));
        const startY = Math.round(radius * Math.sin(rad));
        const midX = Math.round(radius * 0.48 * Math.cos(spiralRad));
        const midY = Math.round(radius * 0.48 * Math.sin(spiralRad));

        return (
          <motion.div
            key={term.text}
            initial={{
              x: startX,
              y: startY,
              scale: 0.95,
              opacity: 0,
            }}
            animate={{
              x: [startX, startX, midX, 0],
              y: [startY, startY, midY, 0],
              scale: [0.95, 0.95, 0.62, 0.12],
              opacity: [0, 0.95, 0.8, 0],
            }}
            transition={{
              duration: term.duration,
              repeat: Infinity,
              delay: term.delay,
              ease: [0.35, 0, 0.25, 1],
            }}
            className="absolute z-20 flex items-center justify-center pointer-events-none"
          >
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-card font-bold tracking-wider uppercase border shadow-md backdrop-blur-md whitespace-nowrap"
              style={{
                backgroundColor: 'rgba(10, 10, 14, 0.88)',
                borderColor: `${term.color}50`,
                color: term.color,
                boxShadow: `0 0 14px ${term.color}35`,
              }}
            >
              {term.text}
            </span>
          </motion.div>
        );
      })}

      {/* Núcleo Central: O Cérebro com pulsação estelar */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 25px hsl(var(--primary)/0.25)',
            '0 0 45px hsl(var(--primary)/0.5)',
            '0 0 25px hsl(var(--primary)/0.25)',
          ],
        }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-30 w-24 h-24 rounded-full bg-accent/15 border-2 border-accent/40 flex items-center justify-center backdrop-blur-md shadow-2xl"
      >
        <Brain className="w-12 h-12 text-accent drop-shadow-[0_0_12px_hsl(var(--primary))]" strokeWidth={1.6} />
      </motion.div>
    </div>
  );
}

function BrainEmptyState({ suggestions, onSelect }: { suggestions: string[], onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center pb-8 pt-4 md:pt-8 select-none">
      {/* Vórtice gravitacional do Cérebro sugando termos jurídicos */}
      <VortexBrain />

      <h2 className="font-display text-[23px] sm:text-[25px] font-bold text-foreground mb-2 tracking-tight">
        Como posso ajudar hoje?
      </h2>
      <p className="font-body text-[15.5px] text-muted-foreground max-w-[340px] mb-8 leading-snug">
        Faça perguntas sobre leis, artigos, súmulas ou envie um documento para análise.
      </p>

      {/* Sugestões Rápidas */}
      <div className="w-full max-w-2xl flex flex-wrap justify-center gap-2 px-2 md:px-4">
        {suggestions.map(q => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="px-4 py-2.5 md:px-4.5 md:py-3 rounded-full bg-secondary/50 text-[13px] md:text-[14px] font-body text-foreground border border-border/70 text-center hover:bg-accent/10 hover:border-accent/40 active:scale-[0.99] transition-all flex items-center gap-2 group cursor-pointer shadow-xs"
          >
            <span>{q}</span>
            <Send className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors hidden sm:block" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatThinkingIndicator() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  const phases = [
    { text: 'Consultando e fundamentando resposta…', sub: 'Pesquisando legislação e artigos aplicáveis' },
    { text: 'Analisando normas e jurisprudência…', sub: 'Cruzando entendimentos dos tribunais' },
    { text: 'Sintetizando explicação jurídica…', sub: 'Estruturando resposta clara e fundamentada' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [phases.length]);

  return (
    <div className="py-2.5 px-1 min-w-[240px] max-w-[340px] space-y-3">
      {/* Header com ícone estelar pulsante + status rotativo suave */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-primary/10 border border-primary/25 shrink-0 shadow-sm overflow-hidden">
          <motion.div
            animate={{
              rotate: [0, 90, 180, 270, 360],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
          <span className="absolute inset-0 rounded-xl bg-primary/20 animate-ping opacity-25" style={{ animationDuration: '2.5s' }} />
        </div>

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={phaseIndex}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-xs font-semibold text-foreground tracking-tight truncate">
                {phases[phaseIndex].text}
              </span>
            </motion.div>
          </AnimatePresence>
          <p className="text-[10px] text-muted-foreground font-body truncate mt-0.5">
            {phases[phaseIndex].sub}
          </p>
        </div>

        {/* 3 jumping dots com ritmo orgânico */}
        <div className="flex items-center gap-1 shrink-0 px-1">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [0.7, 1.25, 0.7], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [0.7, 1.25, 0.7], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.18 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [0.7, 1.25, 0.7], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.36 }}
          />
        </div>
      </div>

      {/* Ondas fluidas de reflexo sobre linhas de conteúdo (shimmer wave) */}
      <div className="space-y-2 pt-0.5">
        <div className="relative h-2 w-full rounded-full overflow-hidden bg-primary/10">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/45 to-transparent"
            animate={{ x: ['-100%', '250%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="relative h-2 w-[82%] rounded-full overflow-hidden bg-primary/10">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/35 to-transparent"
            animate={{ x: ['-100%', '250%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          />
        </div>
        <div className="relative h-2 w-[55%] rounded-full overflow-hidden bg-primary/10">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/25 to-transparent"
            animate={{ x: ['-100%', '250%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

const AssistenteOverlay = ({ open, onClose }: Props) => {
  const isDesktop = useIsDesktop();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [webSearch, setWebSearch] = useState(false);
  const [powersOpen, setPowersOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [revealed, setRevealed] = useState<Record<string, number>>({});
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [genOverlay, setGenOverlay] = useState<null | { kind: 'pdf' | 'flashcards' | 'questoes' | 'mapa' | 'termos'; label: string }>(null);
  const [genStep, setGenStep] = useState(0);

  // Avanço sequencial das etapas visuais com ticks enquanto a IA gera o artefato
  useEffect(() => {
    if (!genOverlay) {
      setGenStep(0);
      return;
    }
    setGenStep(0);
    const steps = ARTIFACT_STEPS[genOverlay.kind] || ARTIFACT_STEPS.flashcards;
    const interval = setInterval(() => {
      setGenStep(prev => Math.min(prev + 1, steps.length - 1));
    }, 1300);
    return () => clearInterval(interval);
  }, [genOverlay]);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [gateFeature, setGateFeature] = useState<PremiumFeatureKey | null>(null);
  const chatLimit = useFeatureLimit('ia_juridica');
  const podeUsarPremium = chatLimit.isPremium || chatLimit.isAdmin;


  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-dimensionamento da altura do textarea conforme digitação
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  useEffect(() => { if (open) { setSessions(loadSessions()); } }, [open]);

  // Sugestões variam cada vez que o chat abre
  const [suggestions, setSuggestions] = useState<string[]>(() => pickSuggestions(4));
  useEffect(() => {
    if (open) setSuggestions(pickSuggestions(4));
  }, [open]);

  // Ditado por voz — mostra transcrição em tempo real dentro do input
  const baseInputRef = useRef('');
  const voice = useVoiceInput((finalText) => {
    const base = baseInputRef.current;
    setInput((base ? base + ' ' : '') + finalText);
  });
  useEffect(() => {
    if (voice.listening) {
      const base = baseInputRef.current;
      setInput((base ? base + ' ' : '') + (voice.partial || ''));
    }
  }, [voice.partial, voice.listening]);
  const toggleMic = () => {
    if (!voice.listening) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        toast.error('Você está sem conexão com a internet para reconhecimento de voz.');
        return;
      }
      baseInputRef.current = input;
    }
    voice.toggle();
  };

  // Monitora scroll do usuário para botão flutuante discreto
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isFarFromBottom = scrollHeight - (scrollTop + clientHeight) > 160;
    setShowScrollBottomBtn(isFarFromBottom);
  };

  // Persist current session
  useEffect(() => {
    if (!messages.length) return;
    const first = messages[0];
    const title = first.content.slice(0, 60) || 'Nova conversa';
    const now = Date.now();
    const session: Session = {
      id: sessionId,
      date: new Date(now).toISOString().slice(0, 10),
      title,
      messages,
      artifacts,
      updatedAt: now,
    };
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      const next = [session, ...filtered];
      saveSessions(next);
      return next;
    });
  }, [messages, sessionId]);

  // Ciclagem dinâmica e ágil dos passos de análise (320ms por etapa para feedback imediato)
  useEffect(() => {
    if (!loading) { setAnalyzeStep(0); return; }
    const int = setInterval(() => setAnalyzeStep(s => Math.min(s + 1, ANALYZE_STEPS.length - 1)), 320);
    return () => clearInterval(int);
  }, [loading]);

  const newSession = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setInput('');
    setAttachment(null);
    setArtifacts([]);
    setHistoryOpen(false);
  };

  const openSession = (s: Session) => {
    setSessionId(s.id);
    setMessages(s.messages);
    setArtifacts(s.artifacts || []);
    const r: Record<string, number> = {};
    s.messages.forEach(m => { if (m.role === 'assistant') r[m.id] = m.content.length; });
    setRevealed(r);
    setHistoryOpen(false);
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter(s => s.id !== id);
    setSessions(next);
    saveSessions(next);
    if (id === sessionId) newSession();
  };

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) { toast.error('Arquivo maior que 8MB'); return; }
    const buf = await file.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    setAttachment({ mime: file.type || 'application/octet-stream', data: b64, name: file.name });
    setAttachOpen(false);
    toast.success('Documento anexado');
  };

  const abrirAnexos = () => {
    if (!podeUsarPremium) { setGateFeature('chat_anexo'); return; }
    setAttachOpen(v => !v);
  };

  const toggleWebSearch = () => {
    if (!podeUsarPremium) { setGateFeature('chat_web'); return; }
    setWebSearch(w => !w);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if ((!text && !attachment) || loading || streamingId) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error('Você está sem conexão com a internet. O Chat Jurídico com IA precisa de conexão para responder.');
      return;
    }

    if (!chatLimit.canUse) { setGateFeature('chat_juridico'); return; }
    chatLimit.register();

    track('chat_juridico_mensagem_enviada', {
      has_attachment: !!attachment,
      attachment_mime: attachment?.mime?.split(';')[0] || undefined,
      web_search: webSearch,
      message_length: text.length,
    });

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      attachment: attachment || undefined,
      createdAt: Date.now(),
    };

    const asMsgId = crypto.randomUUID();
    const assistantMsgPlaceholder: Message = {
      id: asMsgId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      webSearch,
    };
    const newMessages = [...messages, userMsg, assistantMsgPlaceholder];
    setMessages(newMessages);
    setInput('');
    setAttachment(null);
    setLoading(false);
    setStreamingId(asMsgId);

    // Posiciona suavemente no início da nova mensagem enviada (apenas uma vez)
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 60);

    try {
      const systemInstruction = `Você é um assistente jurídico especializado em Direito Brasileiro.
${webSearch ? 'MODO PESQUISA NA WEB ATIVADO: Forneça informações jurídicas atualizadas, jurisprudências recentes dos tribunais superiores (STF, STJ) e novidades legislativas.' : ''}
REGRAS DE ESTILO E FORMATO:
- Seja direto, técnico e didático. Primeira linha já responde à questão sem saudações ou preâmbulos.
- Cite artigos e leis com exatidão no formato canônico ("art. X da CF", "art. Y do CP", etc.).
- Sempre que criar tabelas comparativas ou informativas, use a sintaxe padrão Markdown GFM:
  * OBRIGATÓRIO: CADA LINHA DA TABELA DEVE ESTAR EM SUA PRÓPRIA LINHA SEPARADA POR QUEBRA DE LINHA REAL (\n). NUNCA emende linhas de tabela na mesma linha de texto com "||".
  * Exemplo obrigatório de tabela:
    | Característica | STF | STJ |
    | :--- | :--- | :--- |
    | Foco principal | Constituição Federal | Leis Federais |
    | Hierarquia | Grau máximo | Abaixo do STF |
- Utilize formatação rica com títulos, subtítulos, negrito e listas quando ajudar na clareza.`;

      const chatReply = await generateOmniChatStream({
        modelOverride: 'antigravity/gemini-3-flash',
        messages: [
          { role: 'system', content: systemInstruction },
          ...newMessages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? ('assistant' as const) : m.role === 'user' ? ('user' as const) : ('system' as const),
            content: m.attachment
              ? `${m.content ? m.content + '\n\n' : ''}[Arquivo Anexado: ${m.attachment.name}]`
              : m.content
          }))
        ],
        temperature: 0.7,
        onDelta: (_delta, accumulated) => {
          setMessages(prev => prev.map(m => m.id === asMsgId ? { ...m, content: accumulated } : m));
          // Intencionalmente NÃO forçamos scroll down: o usuário permanece no topo lendo o texto que cresce para baixo!
        }
      });
      
      const webSources: ChatSource[] = [];
      const startN = 1;
      const rawReply: string = chatReply || 'Não consegui gerar uma resposta agora. Tente reformular.';
      const { text: enrichedReply, sources: statuteSources } = extractStatuteSources(rawReply, startN);
      
      setMessages(prev => {
        const exists = prev.some(m => m.id === asMsgId);
        if (exists) {
          return prev.map(m => m.id === asMsgId ? {
            ...m,
            content: enrichedReply,
            sources: [...webSources, ...statuteSources],
          } : m);
        } else {
          return [
            ...prev,
            {
              id: asMsgId,
              role: 'assistant',
              content: enrichedReply,
              createdAt: Date.now(),
              sources: [...webSources, ...statuteSources],
              webSearch,
            }
          ];
        }
      });
      setStreamingId(null);
      setRevealed(r => ({ ...r, [asMsgId]: enrichedReply.length }));
    } catch (err: any) {
      console.error('Erro no Chat Jurídico:', err);
      const errMsg = err?.message || 'Erro ao processar. Tente novamente.';
      toast.error(errMsg);
      setMessages(prev => [
        ...prev.filter(m => m.id !== asMsgId),
        { id: crypto.randomUUID(), role: 'assistant', content: `⚠️ ${errMsg}`, createdAt: Date.now() }
      ]);
    } finally {
      setLoading(false);
      setStreamingId(null);
    }
  };

  const exportPdf = async (msg: Message) => {
    track('chat_juridico_export_pdf', { message_length: msg.content.length });
    setGenOverlay({ kind: 'pdf', label: 'Gerando PDF' });
    try {
      const doc = (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            <PdfText style={pdfStyles.h}>Resposta do Chat Jurídico</PdfText>
            {stripMd(msg.content).split('\n').map((p, i) => (
              <PdfText key={i} style={pdfStyles.p}>{p}</PdfText>
            ))}
          </Page>
        </Document>
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'chat-juridico.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exportado');
    } catch (e) { toast.error('Erro no PDF'); }
    finally { setGenOverlay(null); }
  };

  const persistArtifact = (art: Artifact) => {
    setArtifacts(prev => [art, ...prev]);
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === sessionId);
      if (idx < 0) return prev;
      const next = [...prev];
      const s = next[idx];
      next[idx] = { ...s, artifacts: [art, ...(s.artifacts || [])], updatedAt: Date.now() };
      saveSessions(next);
      return next;
    });
  };

  const generateFromMsg = async (msg: Message, kind: ArtifactKind) => {
    track('chat_juridico_artifact_gerado', { kind, message_length: msg.content.length });
    const label =
      kind === 'flashcards' ? 'Gerando flashcards'
      : kind === 'questoes' ? 'Gerando questões'
      : kind === 'termos' ? 'Extraindo termos jurídicos'
      : 'Gerando mapa mental';
    setGenOverlay({ kind, label });
    try {
      const mode =
        kind === 'flashcards' ? 'flashcards_conteudo'
        : kind === 'questoes' ? 'questoes_conteudo'
        : kind === 'termos' ? 'termos_conteudo'
        : 'mapa_conteudo';
      const { data, error } = await supabase.functions.invoke('assistente-juridica', {
        body: { mode, conteudo: msg.content },
      });
      if (error) throw error;
      const parsed = JSON.parse(data?.reply || '{}');
      const title = kind === 'mapa' ? (parsed?.titulo || 'Mapa mental') : msg.content.slice(0, 60);
      const art: Artifact = { id: crypto.randomUUID(), kind, data: parsed, sourceId: msg.id, createdAt: Date.now(), title };
      persistArtifact(art);
      setActiveArtifact(art);
    } catch (e) { console.error(e); toast.error('Falhou. Tente novamente.'); }
    finally { setGenOverlay(null); }
  };

  const openShare = (msg: Message) => {
    const body = `📚 *Chat Jurídico*\n\n${msg.content.slice(0, 3800)}`;
    setShareText(body);
  };

  const groupedSessions = useMemo(() => {
    const g: Record<string, Session[]> = {};
    for (const s of sessions) { (g[s.date] ||= []).push(s); }
    return Object.entries(g).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions]);

  const [viewportBottomOffset, setViewportBottomOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const updateOffset = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const keyboardGap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setViewportBottomOffset(keyboardGap);
    };
    window.visualViewport.addEventListener('resize', updateOffset);
    window.visualViewport.addEventListener('scroll', updateOffset);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateOffset);
      window.visualViewport?.removeEventListener('scroll', updateOffset);
    };
  }, []);

  useEffect(() => {
    if (viewportBottomOffset > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [viewportBottomOffset]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`fixed inset-0 z-[60] bg-background ${isDesktop ? 'flex flex-row' : 'flex flex-col'}`}
        >
          {/* Desktop sidebar (ChatGPT-style) */}
          {isDesktop && (
            <aside className="w-[280px] shrink-0 h-full border-r border-border bg-card/40 flex flex-col">
              <div className="px-4 py-4 flex items-center gap-2 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-foreground leading-tight">Chat Jurídico</p>
                  <p className="text-[10px] text-muted-foreground">Assistente Jurídico • IA</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={newSession}
                className="mx-3 mt-3 py-2.5 rounded-xl border border-border bg-background hover:bg-accent/10 text-sm font-body font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nova conversa
              </button>

              <div className="px-3 mt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">Ferramentas</p>
                <button
                  onClick={() => toggleWebSearch()}
                  aria-pressed={webSearch}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-body transition-colors ${
                    webSearch
                      ? 'bg-accent/15 border-accent text-foreground'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className={`w-4 h-4 ${webSearch ? 'text-accent' : ''}`} />
                  <span className="flex-1 text-left">Pesquisar na internet</span>
                  <span className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${webSearch ? 'bg-accent justify-end' : 'bg-muted justify-start'}`}>
                    <span className="w-3 h-3 rounded-full bg-background" />
                  </span>
                </button>
              </div>

              <div className="px-3 mt-4 flex-1 overflow-y-auto pb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">Histórico</p>
                {groupedSessions.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4">Sem conversas ainda.</p>
                )}
                {groupedSessions.map(([date, list]) => (
                  <div key={date} className="mb-3">
                    <p className="text-[10px] text-muted-foreground/70 mb-1 px-2">
                      {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                    <div className="space-y-0.5">
                      {list.map(s => (
                        <div key={s.id} className="group flex items-center rounded-lg hover:bg-accent/10">
                          <button
                            onClick={() => openSession(s)}
                            className={`flex-1 min-w-0 text-left px-2.5 py-2 text-xs font-body truncate ${s.id === sessionId ? 'text-accent font-semibold' : 'text-foreground'}`}
                          >
                            {s.title || 'Conversa'}
                          </button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            aria-label="Excluir"
                            className="opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded hover:bg-muted transition-opacity"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Main column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header Mobile: Botão Voltar + Pesquisar na Internet centralizado + Histórico (sem títulos) */}
          {!isDesktop && (
            <header
              className="flex items-center justify-between gap-2 px-3 py-2 shrink-0 bg-background/95 backdrop-blur-md border-b border-border/70 z-10"
              style={{
                paddingTop: 'calc(var(--sai-top, env(safe-area-inset-top, 0px)) + 0.6rem)',
                paddingLeft: 'calc(1rem + var(--sai-left, env(safe-area-inset-left, 0px)))',
                paddingRight: 'calc(1rem + var(--sai-right, env(safe-area-inset-right, 0px)))',
                minHeight: 'calc(4rem + var(--sai-top, env(safe-area-inset-top, 0px)))',
              }}
            >
              {/* Botão Voltar */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Voltar"
                className="w-11 h-11 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center shrink-0 active:scale-95 transition-all text-foreground select-none"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Botão Pesquisar na Internet centralizado */}
              <button
                type="button"
                onClick={toggleWebSearch}
                aria-pressed={webSearch}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 shadow-xs select-none ${
                  webSearch
                    ? 'bg-accent/15 border-accent text-accent shadow-accent/10 ring-1 ring-accent/30'
                    : 'bg-muted/70 border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 transition-colors ${webSearch ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className="text-[12px] font-sans font-medium">Pesquisar na internet</span>
                <span
                  className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${
                    webSearch ? 'bg-accent justify-end' : 'bg-muted-foreground/30 justify-start'
                  }`}
                >
                  <motion.span layout className="w-3 h-3 rounded-full bg-white shadow-xs" />
                </span>
              </button>

              {/* Botão Histórico */}
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                aria-label="Histórico de conversas"
                className="w-11 h-11 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center shrink-0 active:scale-95 transition-all text-foreground select-none"
              >
                <HistoryIcon className="w-5 h-5" />
              </button>
            </header>
          )}

          {/* Messages */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 relative">
            <div className={isDesktop ? 'max-w-3xl mx-auto w-full space-y-3' : 'contents'}>
            {messages.length === 0 && !loading && (
              <BrainEmptyState
                suggestions={suggestions}
                onSelect={(q) => {
                  setInput(q);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
              />
            )}

            {messages.map(msg => {
              const isMsgStreaming = streamingId === msg.id;
              const shown = isMsgStreaming
                ? msg.content
                : msg.role === 'assistant'
                  ? msg.content.slice(0, revealed[msg.id] ?? msg.content.length)
                  : msg.content;
              const complete = !isMsgStreaming && (msg.role !== 'assistant' || shown === msg.content);
              const maxN = msg.sources?.length ?? 0;
              // Se a IA devolver linhas de tabela emendadas com "||" em vez de quebra de linha "\n", normalizamos para linhas individuais de Markdown
              const normalizedMarkdown = shown.replace(/\|\s*\|\s*(?=[^:\s\n-])/g, '|\n|');
              const shownWithLinks = msg.role === 'assistant' && maxN > 0
                ? injectCitationLinks(normalizedMarkdown, maxN)
                : normalizedMarkdown;
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`w-full flex ${isUser ? 'justify-end mt-4 mb-2' : 'justify-start mt-5 mb-4'}`}
                >
                  <div className={`rounded-2xl px-4 py-3 transition-all duration-300 ${
                    isUser
                      ? 'max-w-[85%] sm:max-w-[80%] bg-primary/15 text-foreground border border-primary/40 rounded-br-md shadow-sm'
                      : isMsgStreaming && !shown
                        ? 'w-full bg-card border border-primary/40 text-foreground rounded-2xl shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.18)] ring-1 ring-primary/20'
                        : 'w-full bg-card border border-border text-foreground rounded-2xl shadow-sm'
                  }`}>
                    {msg.attachment && isUser && (
                      <div className="mb-2 flex items-center gap-2 text-xs opacity-90">
                        <Paperclip className="w-3 h-3" /> {msg.attachment.name}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <>
                        {isMsgStreaming && !shown ? (
                          <ChatThinkingIndicator />
                        ) : (
                          <motion.div
                            initial={{ opacity: 0.8 }} animate={{ opacity: 1 }}
                            className="prose prose-base dark:prose-invert max-w-none font-body text-[15px] leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-1 transition-opacity duration-200"
                            onCopy={(e) => {
                              const sel = window.getSelection()?.toString() ?? '';
                              if (!sel) return;
                              e.preventDefault();
                              e.clipboardData.setData('text/plain', stripCitations(sel));
                            }}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ href, children, ...rest }) => {
                                  if (href?.startsWith('cite://')) {
                                    const n = parseInt(href.replace('cite://', ''), 10);
                                    const source = msg.sources?.find((s) => s.n === n);
                                    return <CitationChip n={n} source={source} />;
                                  }
                                  return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
                                },
                                table: ({ children, ...props }) => (
                                  <div className="w-full my-4 overflow-x-auto rounded-xl border border-border/70 bg-card/60 shadow-inner scrollbar-thin">
                                    <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[420px]" {...props}>
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children, ...props }) => (
                                  <thead className="bg-muted/80 border-b border-border text-foreground font-semibold uppercase text-[11px] tracking-wider" {...props}>
                                    {children}
                                  </thead>
                                ),
                                tbody: ({ children, ...props }) => (
                                  <tbody className="divide-y divide-border/40" {...props}>
                                    {children}
                                  </tbody>
                                ),
                                th: ({ children, ...props }) => (
                                  <th className="px-3 py-2.5 font-bold text-foreground text-left whitespace-nowrap" {...props}>
                                    {children}
                                  </th>
                                ),
                                td: ({ children, ...props }) => (
                                  <td className="px-3 py-2.5 align-top text-foreground/90 whitespace-normal leading-relaxed" {...props}>
                                    {children}
                                  </td>
                                ),
                              }}
                            >
                              {shownWithLinks}
                            </ReactMarkdown>
                            {isMsgStreaming && (
                              <span
                                aria-hidden="true"
                                className="inline-block w-2 h-4 ml-1.5 align-middle rounded-sm bg-gradient-to-t from-primary to-accent animate-pulse shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                              />
                            )}
                          </motion.div>
                        )}
                        {isMsgStreaming && !!shown && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-2 text-xs text-muted-foreground/90 font-body"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Escrevendo resposta em tempo real…</span>
                          </motion.div>
                        )}
                        {complete && msg.sources && msg.sources.length > 0 && (
                          <SourcesFooter sources={msg.sources} />
                        )}
                        {complete && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-3 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1.5"
                          >
                            <ActionBtn icon={FileDown} label="PDF" onClick={() => exportPdf(msg)} />
                            <ActionBtn icon={Layers} label="Flashcards" onClick={() => generateFromMsg(msg, 'flashcards')} />
                            <ActionBtn icon={HelpCircle} label="Questões" onClick={() => generateFromMsg(msg, 'questoes')} />
                            <ActionBtn icon={GitBranch} label="Mapa" onClick={() => generateFromMsg(msg, 'mapa')} />
                            <ActionBtn icon={BookOpen} label="Termos" onClick={() => generateFromMsg(msg, 'termos')} />
                            <ActionBtn icon={Share2} label="Enviar" onClick={() => openShare(msg)} />
                            <span className="ml-auto">
                              <ChatFeedback
                                messageId={msg.id}
                                sessionId={sessionId}
                                pergunta={
                                  [...messages].reverse().find((m, i, arr) => {
                                    const idx = arr.length - 1 - i;
                                    return m.role === 'user' && idx < messages.findIndex((x) => x.id === msg.id);
                                  })?.content || ''
                                }
                                resposta={msg.content}
                                webSearch={!!msg.webSearch}
                                sources={msg.sources}
                              />
                            </span>
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <p className="font-body text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              </motion.div>;
            })}
            </div>

            {/* Botão flutuante discreto: só aparece se o usuário rolou para cima e o texto continua abaixo */}
            <AnimatePresence>
              {showScrollBottomBtn && (
                <motion.button
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                  aria-label="Rolar para o final"
                  className="sticky bottom-2 ml-auto z-20 px-3.5 py-1.5 rounded-full bg-card/95 border border-border shadow-xl text-xs font-medium text-foreground flex items-center gap-1.5 backdrop-blur-md hover:bg-card active:scale-95 transition-all"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-primary animate-bounce" />
                  <span>Descer para o fim</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Input area */}
          <div
            className={
              isDesktop
                ? 'relative px-6 pt-2 pb-6 bg-gradient-to-t from-background via-background to-transparent'
                : 'relative px-3 pt-2 border-t border-border/60 bg-background/95 backdrop-blur-md transition-[padding] duration-150'
            }
            style={{
              paddingBottom: isDesktop
                ? undefined
                : viewportBottomOffset > 0
                ? `${viewportBottomOffset + 8}px`
                : 'calc(0.75rem + var(--sai-bottom, env(safe-area-inset-bottom, 0px)))',
            }}
          >
            <div className={isDesktop ? 'max-w-3xl mx-auto w-full' : 'w-full'}>
              {/* Attachment chip if present */}
              {attachment && (
                <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/90 border border-border shadow-xs max-w-full">
                  <Paperclip className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-xs font-body text-foreground truncate max-w-[240px]">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    aria-label="Remover anexo"
                    className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Unified modern capsule */}
              <div className="flex items-end gap-2 bg-secondary/80 hover:bg-secondary/95 border border-border/80 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/30 rounded-[28px] p-2 transition-all shadow-md">
                <button
                  type="button"
                  onClick={() => abrirAnexos()}
                  aria-label="Anexar arquivo"
                  aria-expanded={attachOpen}
                  className={`w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 transition-transform cursor-pointer ${
                    attachOpen
                      ? 'bg-accent text-accent-foreground rotate-45'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60 active:scale-95'
                  }`}
                >
                  <Plus className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={voice.listening ? 'Ouvindo… fale agora' : 'Pergunte sobre leis, artigos...'}
                  className="flex-1 min-w-0 min-h-[44px] max-h-36 bg-transparent px-2 py-2.5 text-[15.5px] leading-relaxed font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none"
                />

                {/* Send / Mic button (estilo WhatsApp) */}
                <div className="shrink-0 flex items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {(!voice.listening && (input.trim() || attachment)) ? (
                      <motion.button
                        key="send"
                        type="button"
                        initial={{ scale: 0.7, opacity: 0, rotate: -20 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.7, opacity: 0, rotate: 20 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => {
                          haptic.medium();
                          sendMessage();
                        }}
                        disabled={loading || !!streamingId}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        aria-label="Enviar mensagem"
                        className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-40 shadow-md cursor-pointer"
                      >
                        <Send className="w-5 h-5 sm:w-5.5 sm:h-5.5" strokeWidth={2.2} />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="mic"
                        type="button"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => {
                          haptic.light();
                          toggleMic();
                        }}
                        aria-label={voice.listening ? 'Parar gravação' : 'Gravar áudio para transcrever em texto'}
                        className={`relative w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-md cursor-pointer ${
                          voice.listening
                            ? 'bg-red-500 text-white shadow-red-500/40 ring-4 ring-red-400/30 animate-pulse'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        <Mic className="w-5 h-5 sm:w-5.5 sm:h-5.5" strokeWidth={2.2} />
                        {voice.listening && (
                          <span className="absolute inset-0 rounded-full ring-4 ring-red-400/40 animate-ping pointer-events-none" />
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {voice.listening && (
            <div
              className="fixed left-4 right-4 z-[64] pointer-events-none flex justify-center"
              style={{ bottom: 'calc(7rem + var(--sai-bottom, var(--sai-bottom)))' }}
            >
              <div className="px-3 py-1.5 rounded-full bg-red-500/95 text-white text-[11px] font-body shadow-lg">
                🎙️ Ouvindo… fale agora
              </div>
            </div>
          )}

          {/* Menu flutuante do + (Câmera, PDF, Áudio) */}
          <AnimatePresence>
            {attachOpen && (
              <>
                <div
                  className="fixed inset-0 z-[68]"
                  onClick={() => setAttachOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                  className="fixed left-3 z-[69] bg-card border border-border rounded-2xl shadow-2xl p-2 flex flex-col gap-1 min-w-[200px]"
                  style={{ bottom: 'calc(4.75rem + var(--sai-bottom, 0px))' }}
                >
                  {[
                    {
                      key: 'camera',
                      icon: Camera,
                      label: 'Câmera',
                      hint: 'Tirar foto',
                      onClick: () => {
                        setAttachOpen(false);
                        const el = fileInputRef.current;
                        if (!el) return;
                        el.setAttribute('accept', 'image/*');
                        el.setAttribute('capture', 'environment');
                        el.click();
                      },
                    },
                    {
                      key: 'pdf',
                      icon: FileText,
                      label: 'PDF',
                      hint: 'Anexar documento',
                      onClick: () => {
                        setAttachOpen(false);
                        const el = fileInputRef.current;
                        if (!el) return;
                        el.setAttribute('accept', 'application/pdf');
                        el.removeAttribute('capture');
                        el.click();
                      },
                    },
                    {
                      key: 'audio',
                      icon: Music,
                      label: 'Áudio',
                      hint: 'Anexar áudio',
                      onClick: () => {
                        setAttachOpen(false);
                        const el = fileInputRef.current;
                        if (!el) return;
                        el.setAttribute('accept', 'audio/*');
                        el.removeAttribute('capture');
                        el.click();
                      },
                    },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        onClick={opt.onClick}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/15 active:bg-accent/25 transition text-left"
                      >
                        <span className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-accent" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-body font-semibold text-foreground">{opt.label}</span>
                          <span className="block text-[11px] text-muted-foreground">{opt.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Powers sheet */}
          <AnimatePresence>
            {powersOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/50 flex items-end" onClick={() => setPowersOpen(false)}>
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  className="w-full bg-card rounded-t-3xl p-5 pb-8" onClick={e => e.stopPropagation()}>
                  <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">Poderes</h3>
                  <p className="text-xs font-body text-muted-foreground mb-4">Ative superpoderes para respostas ainda melhores.</p>
                  <button
                    onClick={() => { toggleWebSearch(); }}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors ${webSearch ? 'bg-accent/20 border-accent' : 'bg-secondary border-border'}`}
                  >
                    <Globe className={`w-6 h-6 ${webSearch ? 'text-accent' : 'text-foreground'}`} />
                    <div className="flex-1 text-left">
                      <p className="font-body text-sm font-bold text-foreground">Pesquisar na internet</p>
                      <p className="text-xs text-muted-foreground">Busca em tempo real via Google.</p>
                    </div>
                    <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${webSearch ? 'bg-accent justify-end' : 'bg-muted justify-start'}`}>
                      <div className="w-5 h-5 rounded-full bg-background" />
                    </div>
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History drawer (right → left) */}
          <AnimatePresence>
            {historyOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/50" onClick={() => setHistoryOpen(false)}>
                <motion.div
                  initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-card border-l border-border flex flex-col"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h3 className="font-display text-base font-bold text-foreground">Histórico</h3>
                    <button onClick={() => setHistoryOpen(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={newSession} className="mx-4 mt-3 mb-2 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-body font-semibold flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Nova conversa
                  </button>
                  <div className="flex-1 overflow-y-auto px-4 pb-6">
                    {groupedSessions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Sem histórico ainda.</p>
                    )}
                    {groupedSessions.map(([date, list]) => (
                      <div key={date} className="mt-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-body">
                          {new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
                        </p>
                        <div className="space-y-1.5">
                          {list.map(s => (
                            <div key={s.id} className="rounded-xl bg-secondary/60 border border-border p-2 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openSession(s)}
                                  className={`flex-1 text-left px-2 py-1.5 rounded-lg text-sm font-body truncate ${s.id === sessionId ? 'text-accent font-semibold' : 'text-foreground'}`}>
                                  {s.title || 'Conversa'}
                                </button>
                                <button onClick={() => deleteSession(s.id)} className="p-2 rounded-lg hover:bg-muted">
                                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                              </div>
                              {(s.artifacts?.length ?? 0) > 0 && (
                                <div className="flex flex-wrap gap-1 pl-2">
                                  {s.artifacts!.slice(0, 6).map(a => {
                                    const Icon = a.kind === 'flashcards' ? Layers
                                      : a.kind === 'questoes' ? HelpCircle
                                      : a.kind === 'mapa' ? GitBranch
                                      : BookOpen;
                                    const lbl = a.kind === 'flashcards' ? 'Flashcards'
                                      : a.kind === 'questoes' ? 'Questões'
                                      : a.kind === 'mapa' ? 'Mapa'
                                      : 'Termos';
                                    return (
                                      <button key={a.id}
                                        onClick={() => { openSession(s); setTimeout(() => setActiveArtifact(a), 60); }}
                                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 border border-accent/30 text-[10px] font-body text-foreground">
                                        <Icon className="w-3 h-3 text-accent" /> {lbl}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generation card overlay with interactive step checklist */}
          <AnimatePresence>
            {genOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6"
              >
                {/* 3D rotating card with kind icon */}
                <motion.div
                  initial={{ rotateY: 0, scale: 0.85, opacity: 0 }}
                  animate={{ rotateY: 360, scale: 1, opacity: 1 }}
                  transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
                  className="w-28 h-36 sm:w-32 sm:h-44 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-accent via-primary to-accent shadow-[0_0_40px_rgba(244,63,94,0.35)] flex flex-col items-center justify-center mb-4 sm:mb-6 border border-white/20 shrink-0"
                >
                  {genOverlay.kind === 'flashcards' && <Layers className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-md" />}
                  {genOverlay.kind === 'questoes' && <HelpCircle className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-md" />}
                  {genOverlay.kind === 'mapa' && <GitBranch className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-md" />}
                  {genOverlay.kind === 'termos' && <BookOpen className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-md" />}
                  {genOverlay.kind === 'pdf' && <FileDown className="w-9 h-9 sm:w-11 sm:h-11 text-white drop-shadow-md" />}
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/80 mt-2 font-display">
                    IA Jurídica
                  </span>
                </motion.div>

                {/* Steps checklist card */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm rounded-2xl bg-card/95 border border-border/80 p-4 shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                      <h3 className="font-display text-sm font-bold text-foreground tracking-wide uppercase">
                        {genOverlay.label}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-accent px-2 py-0.5 rounded-full bg-accent/15 border border-accent/25">
                      {Math.min(genStep + 1, (ARTIFACT_STEPS[genOverlay.kind] || ARTIFACT_STEPS.flashcards).length)}/
                      {(ARTIFACT_STEPS[genOverlay.kind] || ARTIFACT_STEPS.flashcards).length}
                    </span>
                  </div>

                  {/* Checklist items with ticks */}
                  <div className="space-y-2">
                    {(ARTIFACT_STEPS[genOverlay.kind] || ARTIFACT_STEPS.flashcards).map((stepText, idx) => {
                      const isDone = idx < genStep;
                      const isCurrent = idx === genStep;

                      return (
                        <motion.div
                          key={stepText}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all ${
                            isCurrent
                              ? 'bg-accent/10 border border-accent/30 shadow-xs'
                              : isDone
                              ? 'bg-emerald-500/10'
                              : 'opacity-40'
                          }`}
                        >
                          {/* Status tick / spinner / pending */}
                          <div className="shrink-0 flex items-center justify-center">
                            {isDone ? (
                              <motion.span
                                initial={{ scale: 0.4, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shadow-xs"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </motion.span>
                            ) : isCurrent ? (
                              <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center border border-accent/40 shadow-xs">
                                <Loader2 className="w-3 h-3 animate-spin" />
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-muted/60 border border-border flex items-center justify-center text-muted-foreground text-[10px]">
                                •
                              </span>
                            )}
                          </div>

                          {/* Step description */}
                          <span
                            className={`text-[12.5px] font-body transition-colors leading-tight ${
                              isDone
                                ? 'text-foreground/90 font-medium'
                                : isCurrent
                                ? 'text-accent font-semibold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {stepText}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Mini animated progress bar */}
                  <div className="mt-3 pt-2.5 border-t border-border/50">
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                        initial={{ width: '15%' }}
                        animate={{
                          width: `${Math.min(
                            ((genStep + 1) / (ARTIFACT_STEPS[genOverlay.kind] || ARTIFACT_STEPS.flashcards).length) * 100,
                            95
                          )}%`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[10.5px] text-center text-muted-foreground mt-2 font-body">
                      Aguarde alguns instantes enquanto a IA estrutura o material…
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Artifact viewers */}
          <AnimatePresence>
            {activeArtifact?.kind === 'flashcards' && (
              <FlipFlashcards
                cards={(activeArtifact.data.cards || []) as Flashcard[]}
                onClose={() => setActiveArtifact(null)}
              />
            )}
            {activeArtifact?.kind === 'questoes' && (
              <QuestoesRunner
                questoes={(activeArtifact.data.questoes || []) as Questao[]}
                onClose={() => setActiveArtifact(null)}
              />
            )}
            {activeArtifact?.kind === 'mapa' && (
              <MapaMentalCanvas
                data={activeArtifact.data as MapaNode}
                onClose={() => setActiveArtifact(null)}
              />
            )}
            {activeArtifact?.kind === 'termos' && (
              <TermosViewer
                termos={(activeArtifact.data.termos || []) as Termo[]}
                onClose={() => setActiveArtifact(null)}
              />
            )}
            {shareText && <ShareSheet text={shareText} onClose={() => setShareText(null)} />}
          </AnimatePresence>

          <PremiumGate
            open={!!gateFeature}
            onClose={() => setGateFeature(null)}
            feature={gateFeature ?? 'chat_juridico'}
            usageLabel={gateFeature === 'chat_juridico' ? 'Você já usou sua interação gratuita de hoje' : undefined}
          />
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ActionBtn = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-accent/20 border border-border text-xs font-body text-foreground transition-colors">
    <Icon className="w-3.5 h-3.5 text-accent" /> {label}
  </button>
);

export default AssistenteOverlay;
