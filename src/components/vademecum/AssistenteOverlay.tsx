import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Plus, Globe, History as HistoryIcon,
  FileDown, Layers, HelpCircle, GitBranch, Paperclip, X, Check, Loader2, Zap, FileText, Image as ImageIcon,
  BookOpen, Share2, Scale, Mic, Camera, Music, Brain, ChevronDown, ArrowLeft,
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
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

function BrainEmptyState({ suggestions, onSelect }: { suggestions: string[], onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center pb-8 pt-10 md:pt-16">
      {/* Brain Animation Container */}
      <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
        {/* Animated Lines / Particles coming into the brain */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 60, opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="absolute top-0 w-[1.5px] bg-gradient-to-b from-transparent via-accent to-transparent"
          />
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 60, opacity: [0, 1, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute left-0 h-[1.5px] bg-gradient-to-r from-transparent via-accent to-transparent"
          />
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 60, opacity: [0, 1, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute right-0 h-[1.5px] bg-gradient-to-l from-transparent via-accent to-transparent"
          />
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 60, opacity: [0, 1, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
            className="absolute bottom-0 w-[1.5px] bg-gradient-to-t from-transparent via-accent to-transparent"
          />
        </div>

        {/* The Brain Icon */}
        <div className="relative z-10 w-24 h-24 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.25)] backdrop-blur-sm">
           <Brain className="w-12 h-12 text-accent" strokeWidth={1.5} />
        </div>
        
        {/* Glow behind the brain */}
        <div className="absolute inset-0 bg-accent/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <h2 className="font-display text-[22px] font-bold text-foreground mb-2 tracking-tight">Como posso ajudar hoje?</h2>
      <p className="font-body text-[14.5px] text-muted-foreground max-w-[320px] mb-10 leading-snug">
        Faça perguntas sobre leis, artigos, súmulas ou envie um documento para análise.
      </p>

      {/* Suggestions Flex Wrap (Compact Style) */}
      <div className="w-full max-w-2xl flex flex-wrap justify-center gap-2 px-2 md:px-4">
        {suggestions.map(q => (
          <button key={q} onClick={() => onSelect(q)}
            className="px-3.5 py-2 md:px-4 md:py-2.5 rounded-full bg-secondary/40 text-[12px] md:text-[13px] font-body text-foreground border border-border/60 text-center hover:bg-accent/10 hover:border-accent/40 active:scale-[0.99] transition-all flex items-center gap-2 group">
            <span>{q}</span>
            <Send className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors hidden sm:block" />
          </button>
        ))}
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
    if (!voice.listening) baseInputRef.current = input;
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
                <div key={msg.id} className={`w-full flex ${isUser ? 'justify-end mt-4 mb-2' : 'justify-start mt-5 mb-4'}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'max-w-[85%] sm:max-w-[80%] bg-primary/15 text-foreground border border-primary/40 rounded-br-md shadow-sm'
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
                          <div className="py-2 px-1 space-y-2 min-w-[220px]">
                            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                              <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
                              <span className="animate-pulse">Consultando e fundamentando resposta…</span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <div className="h-1.5 w-12 rounded-full bg-primary/50 animate-pulse" />
                              <div className="h-1.5 w-24 rounded-full bg-primary/30 animate-pulse delay-75" />
                              <div className="h-1.5 w-8 rounded-full bg-primary/40 animate-pulse delay-150" />
                            </div>
                          </div>
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
              );
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
          <div className={
            isDesktop
              ? 'relative px-6 pt-2 pb-6 bg-gradient-to-t from-background via-background to-transparent'
              : 'relative px-3 pt-2 pb-[calc(0.75rem+var(--sai-bottom,0px))] border-t border-border/60 bg-background/95 backdrop-blur-md'
          }>
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
              <div className="flex items-end gap-1.5 bg-secondary/70 hover:bg-secondary/90 border border-border/80 focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/40 rounded-[24px] p-1.5 transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => abrirAnexos()}
                  aria-label="Anexar arquivo"
                  aria-expanded={attachOpen}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform ${
                    attachOpen
                      ? 'bg-accent text-accent-foreground rotate-45'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60 active:scale-95'
                  }`}
                >
                  <Plus className="w-5 h-5" />
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
                  placeholder={voice.listening ? 'Ouvindo…' : 'Pergunte sobre leis, artigos...'}
                  className="flex-1 min-h-[38px] max-h-36 bg-transparent px-1.5 py-2 text-[14.5px] leading-relaxed font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none resize-none"
                />

                {/* Send / Mic button */}
                {(input.trim() || attachment) ? (
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={loading || !!streamingId}
                    aria-label="Enviar mensagem"
                    className="w-9 h-9 rounded-full bg-accent text-accent-foreground flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40 shadow-sm"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={toggleMic}
                    aria-label={voice.listening ? 'Parar gravação' : 'Falar'}
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-sm ${
                      voice.listening ? 'bg-red-500 text-white' : 'bg-muted/80 text-foreground hover:bg-muted'
                    }`}
                  >
                    <Mic className="w-4.5 h-4.5" />
                    {voice.listening && (
                      <span className="absolute inset-0 rounded-full ring-4 ring-red-400/40 animate-ping" />
                    )}
                  </button>
                )}
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

          {/* Generation card overlay */}
          <AnimatePresence>
            {genOverlay && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <motion.div
                  initial={{ rotateY: 0, scale: 0.85, opacity: 0 }}
                  animate={{ rotateY: 360, scale: 1, opacity: 1 }}
                  transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity }}
                  className="w-40 h-56 rounded-3xl bg-gradient-to-br from-accent via-primary to-accent shadow-2xl flex items-center justify-center"
                >
                  <Sparkles className="w-12 h-12 text-accent-foreground" />
                </motion.div>
                <p className="absolute bottom-[35%] font-display text-lg font-bold text-white">{genOverlay.label}…</p>
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
