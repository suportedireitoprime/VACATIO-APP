import { useState, useRef, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Plus, Globe, History as HistoryIcon,
  FileDown, Layers, HelpCircle, GitBranch, Paperclip, X, Check, Loader2, Zap, FileText, Image as ImageIcon,
  BookOpen, Share2, Scale, Mic, Camera, Music,
} from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
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


  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, loading]);

  // Analyze cycling
  useEffect(() => {
    if (!loading) { setAnalyzeStep(0); return; }
    const int = setInterval(() => setAnalyzeStep(s => Math.min(s + 1, ANALYZE_STEPS.length - 1)), 900);
    return () => clearInterval(int);
  }, [loading]);

  // Fluid reveal for assistant messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    if (revealed[last.id] === last.content.length) return;
    let i = revealed[last.id] || 0;
    const chunk = Math.max(3, Math.floor(last.content.length / 120));
    const t = setInterval(() => {
      i = Math.min(i + chunk, last.content.length);
      setRevealed(r => ({ ...r, [last.id]: i }));
      if (i >= last.content.length) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

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
    if ((!text && !attachment) || loading) return;
    if (!chatLimit.canUse) { setGateFeature('chat_juridico'); return; }
    chatLimit.register();

    track('chat_juridico_mensagem_enviada', {
      has_attachment: !!attachment,
      attachment_mime: attachment?.mime?.split(';')[0] || undefined,
      web_search: webSearch,
      message_length: text.length,
    });
    const userMsg: Message = {
      id: crypto.randomUUID(), role: 'user',
      content: text || (attachment ? `📎 ${attachment.name}` : ''),
      attachment: attachment || undefined,
      createdAt: Date.now(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    const sentAttachment = attachment;
    setAttachment(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('assistente-juridica', {
        body: {
          messages: newMessages.map(m => ({
            role: m.role, content: m.content,
            ...(m.attachment ? { attachment: { mime: m.attachment.mime, data: m.attachment.data } } : {}),
          })),
          webSearch,
        },
      });
      if (error) throw error;
      const webSources: ChatSource[] = Array.isArray(data?.sources) ? data.sources : [];
      const startN = (webSources.length ? Math.max(...webSources.map((s) => s.n)) : 0) + 1;
      const rawReply: string = data?.reply || 'Não consegui gerar uma resposta agora. Tente reformular.';
      const { text: enrichedReply, sources: statuteSources } = extractStatuteSources(rawReply, startN);
      const asMsg: Message = {
        id: crypto.randomUUID(), role: 'assistant',
        content: enrichedReply,
        createdAt: Date.now(),
        sources: [...webSources, ...statuteSources],
        webSearch,
      };
      setMessages(prev => [...prev, asMsg]);
      setRevealed(r => ({ ...r, [asMsg.id]: 0 }));
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '⚠️ Erro ao processar. Tente novamente.', createdAt: Date.now() }]);
    } finally {
      setLoading(false);
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
          {/* Header */}
          {!isDesktop && <PageHeader
            title="Chat Jurídico"
            subtitle="Assistente Jurídico • IA"
            onBack={onClose}
            rightAction={
              <button
                onClick={() => setHistoryOpen(true)}
                aria-label="Histórico"
                className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
              >
                <HistoryIcon className="w-[20px] h-[20px] text-foreground" />
              </button>
            }
          />}



          {/* Messages */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
            <div className={isDesktop ? 'max-w-3xl mx-auto w-full space-y-3' : 'contents'}>
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
                  <Scale className="w-8 h-8 text-accent" />
                </div>
                <p className="font-body text-sm text-muted-foreground max-w-xs">
                  Pergunte sobre leis, artigos, súmulas ou envie um documento.
                </p>
                <div className="w-full max-w-md flex flex-col gap-2.5 mt-1 px-2">
                  {suggestions.map(q => (
                    <button key={q} onClick={() => setInput(q)}
                      className="w-full px-5 py-4 rounded-2xl bg-secondary text-sm font-body text-foreground border border-border text-left hover:bg-accent/15 hover:border-accent/40 active:scale-[0.99] transition">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => {
              const shown = msg.role === 'assistant' ? msg.content.slice(0, revealed[msg.id] ?? msg.content.length) : msg.content;
              const complete = msg.role !== 'assistant' || shown === msg.content;
              const maxN = msg.sources?.length ?? 0;
              const shownWithLinks = msg.role === 'assistant' && maxN > 0
                ? injectCitationLinks(shown, maxN)
                : shown;
              return (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${isDesktop ? 'max-w-[92%]' : 'max-w-[88%]'} rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-primary/15 text-foreground border border-primary/40 rounded-br-md'
                      : 'bg-card border border-border text-foreground rounded-bl-md'
                  }`}>
                    {msg.attachment && msg.role === 'user' && (
                      <div className="mb-2 flex items-center gap-2 text-xs opacity-90">
                        <Paperclip className="w-3 h-3" /> {msg.attachment.name}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <>
                        <motion.div
                          initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}
                          className="prose prose-base dark:prose-invert max-w-none font-body text-[15px] leading-relaxed [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-1"
                          onCopy={(e) => {
                            const sel = window.getSelection()?.toString() ?? '';
                            if (!sel) return;
                            e.preventDefault();
                            e.clipboardData.setData('text/plain', stripCitations(sel));
                          }}
                        >
                          <ReactMarkdown
                            components={{
                              a: ({ href, children, ...rest }) => {
                                if (href?.startsWith('cite://')) {
                                  const n = parseInt(href.replace('cite://', ''), 10);
                                  const source = msg.sources?.find((s) => s.n === n);
                                  return <CitationChip n={n} source={source} />;
                                }
                                return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;
                              },
                            }}
                          >
                            {shownWithLinks}
                          </ReactMarkdown>
                        </motion.div>
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


            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 min-w-[220px]">
                  <p className="text-xs font-body text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Analisando…
                  </p>
                  <ul className="space-y-1.5">
                    {ANALYZE_STEPS.map((step, i) => {
                      const done = i < analyzeStep;
                      const active = i === analyzeStep;
                      return (
                        <li key={step} className="flex items-center gap-2 text-xs font-body">
                          <motion.span
                            initial={false}
                            animate={{ scale: active ? 1.1 : 1 }}
                            className={`w-4 h-4 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500' : active ? 'bg-accent' : 'bg-secondary'}`}
                          >
                            {done ? <Check className="w-2.5 h-2.5 text-white" /> : active ? <Loader2 className="w-2.5 h-2.5 animate-spin text-accent-foreground" /> : null}
                          </motion.span>
                          <span className={done ? 'text-foreground' : active ? 'text-foreground' : 'text-muted-foreground/60'}>{step}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Input area */}
          <div className={
            isDesktop
              ? 'relative px-6 pt-2 pb-6 bg-gradient-to-t from-background via-background to-transparent'
              : 'relative px-3 pt-3 pb-[calc(0.75rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))] border-t border-border bg-card/95 backdrop-blur-md'
          }>
            <div className={isDesktop ? 'max-w-3xl mx-auto w-full rounded-3xl bg-secondary/95 border border-border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] p-2' : 'contents'}>
            {attachment && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/80 border border-border">
                <Paperclip className="w-4 h-4 text-accent" />
                <span className="text-xs font-body text-foreground truncate flex-1">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="p-1"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
            )}
            <div className="flex items-end gap-2 relative">
              <button
                onClick={() => abrirAnexos()}
                aria-label="Anexar"
                aria-expanded={attachOpen}
                className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform ${attachOpen ? 'bg-accent text-accent-foreground rotate-45' : isDesktop ? 'bg-background/60 text-foreground hover:bg-background' : 'bg-secondary text-foreground'}`}
              >
                <Plus className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
                placeholder={voice.listening ? 'Ouvindo…' : 'Pergunte sobre leis, artigos...'}
                className={isDesktop
                  ? "flex-1 min-h-[44px] max-h-40 bg-transparent px-2 py-2.5 text-[15px] font-body text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                  : "flex-1 min-h-[64px] max-h-40 rounded-2xl bg-secondary border border-border px-4 py-4 text-[15px] font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"}
              />
              {/* Botão híbrido: microfone quando input vazio, enviar quando há texto */}
              {(input.trim() || attachment) ? (
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  aria-label="Enviar"
                  className="w-11 h-11 rounded-full bg-accent flex items-center justify-center disabled:opacity-40 shrink-0"
                >
                  <Send className="w-5 h-5 text-accent-foreground" />
                </button>
              ) : (
                <button
                  onClick={toggleMic}
                  aria-label={voice.listening ? 'Parar gravação' : 'Falar'}
                  className={`relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors active:scale-95 ${
                    voice.listening ? 'bg-red-500 text-white' : 'bg-accent text-accent-foreground'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                  {voice.listening && (
                    <span className="absolute inset-0 rounded-full ring-4 ring-red-400/40 animate-ping" />
                  )}
                </button>
              )}
            </div>
            {/* Web search toggle abaixo do campo de texto (mobile apenas — no desktop, fica na sidebar) */}
            {!isDesktop && <div className="mt-2 flex items-center justify-start">
              <button
                onClick={() => toggleWebSearch()}
                aria-pressed={webSearch}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-body transition-colors ${
                  webSearch
                    ? 'bg-accent/20 border-accent text-foreground'
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${webSearch ? 'text-accent' : ''}`} />
                Pesquisar na internet
                <span className={`ml-1 w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${webSearch ? 'bg-accent justify-end' : 'bg-muted justify-start'}`}>
                  <span className="w-3 h-3 rounded-full bg-background" />
                </span>
              </button>
            </div>}
            <input ref={fileInputRef} type="file" hidden
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            </div>
          </div>

          {voice.listening && (
            <div
              className="fixed left-4 right-4 z-[64] pointer-events-none flex justify-center"
              style={{ bottom: 'calc(11rem + env(safe-area-inset-bottom, 0px))' }}
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
                  style={{ bottom: 'calc(9.5rem + env(safe-area-inset-bottom, 0px))' }}
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
