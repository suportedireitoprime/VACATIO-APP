import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Play, RotateCcw, Check, X as XIcon, ChevronLeft, ChevronRight, MessageCircle, Download, Send, ThumbsUp, ThumbsDown, GraduationCap, Layers, Brain, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Document, Page, Text, View, StyleSheet, pdf, Font, Image as PdfImage } from '@react-pdf/renderer';
import { toast } from 'sonner';
import logoAsset from '@/assets/logo-vacatio-v2.png.asset.json';

/* ─── PDF fonts (same family the app uses) ─── */
try {
  Font.register({
    family: 'Bebas Neue',
    src: 'https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.ttf',
  });
  Font.register({
    family: 'Barlow',
    fonts: [
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/barlow@latest/latin-400-normal.ttf', fontWeight: 400 },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/barlow@latest/latin-500-normal.ttf', fontWeight: 500 },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/barlow@latest/latin-700-normal.ttf', fontWeight: 700 },
      { src: 'https://cdn.jsdelivr.net/fontsource/fonts/barlow@latest/latin-400-italic.ttf', fontWeight: 400, fontStyle: 'italic' },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
} catch {
  /* no-op */
}
const LOGO_URL = `${window.location.origin}${logoAsset.url}`;

/* ─── Markdown components ─── */
const resumoMdComponents = {
  h2: ({ children, ...props }: any) => (
    <h2 {...props} className="text-[15px] font-display font-bold text-foreground mt-5 mb-2 flex items-center gap-2">
      <span className="w-1.5 h-5 bg-primary/60 rounded-full shrink-0" />
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 {...props} className="text-[14px] font-display font-semibold text-primary mt-4 mb-1.5 flex items-center gap-2">
      <span className="w-1 h-4 bg-primary/40 rounded-full shrink-0" />
      {children}
    </h3>
  ),
  p: ({ children, ...props }: any) => (<p {...props} className="text-foreground/85 leading-[1.85] font-body my-2 text-[14px]">{children}</p>),
  ul: ({ children, ...props }: any) => (<ul {...props} className="my-2 space-y-1.5 list-none pl-0">{children}</ul>),
  ol: ({ children, ...props }: any) => (<ol {...props} className="my-2 space-y-1.5 list-decimal pl-5 marker:text-primary/60">{children}</ol>),
  li: ({ children, ...props }: any) => (
    <li {...props} className="flex items-start gap-2 text-foreground/85 font-body leading-[1.8] text-[14px]">
      <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  strong: ({ children, ...props }: any) => (<strong {...props} className="text-foreground font-bold">{children}</strong>),
  blockquote: ({ children, ...props }: any) => (
    <blockquote {...props} className="border-l-4 border-l-primary bg-primary/5 rounded-r-xl py-3 px-4 my-4 italic text-foreground/80 font-body text-[13.5px]">{children}</blockquote>
  ),
  hr: () => (
    <div className="my-5 flex items-center gap-3">
      <div className="flex-1 h-px bg-border" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
      <div className="flex-1 h-px bg-border" />
    </div>
  ),
};

interface VideoaulaSheetProps {
  open: boolean;
  onClose: () => void;
  video: { titulo: string; url: string; canal: string; videoId: string } | null;
  tabelaNome: string;
  artigoNumero: string;
  artigoTexto: string;
}

interface Questao { pergunta: string; alternativas: string[]; correta: number; comentario: string; }
interface Flashcard { frente: string; verso: string; comentario: string; }
interface Comentario { id: string; user_id: string; autor_nome: string | null; texto: string; created_at: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

/* ─── PDF ABNT styles (A4, 3cm/2cm margins, Barlow 12pt 1.5) ─── */
const WINE = '#3d0f1f';
const GOLD = '#c9a84c';
const INK = '#1a1a1a';
const MUTED = '#5c5c5c';
const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 85, paddingBottom: 60, paddingLeft: 85, paddingRight: 57,
    fontFamily: 'Barlow', fontSize: 12, color: INK, lineHeight: 1.5, backgroundColor: '#ffffff',
  },
  coverPage: {
    padding: 0, fontFamily: 'Barlow', fontSize: 12, color: INK, backgroundColor: '#ffffff',
  },
  watermark: {
    position: 'absolute', top: '32%', left: '22%', width: 300, height: 300,
    opacity: 0.05, borderRadius: 9999,
  },
  header: {
    position: 'absolute', top: 30, left: 85, right: 57,
    fontSize: 8, color: MUTED, fontFamily: 'Bebas Neue', letterSpacing: 1.5,
    borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingBottom: 6,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute', bottom: 25, left: 85, right: 57, fontSize: 8, color: MUTED,
    fontFamily: 'Barlow', borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 6,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  pageTitle: {
    fontFamily: 'Bebas Neue', fontSize: 24, color: WINE, letterSpacing: 2,
    marginBottom: 6,
  },
  pageTitleBar: {
    width: 46, height: 3, backgroundColor: GOLD, marginBottom: 18,
  },
  paragraph: {
    fontFamily: 'Barlow', fontSize: 12, color: INK, lineHeight: 1.5,
    textIndent: 35, textAlign: 'justify', marginBottom: 6,
  },
  h2: {
    fontFamily: 'Bebas Neue', fontSize: 15, color: WINE, letterSpacing: 1.2,
    marginTop: 14, marginBottom: 6,
  },
  h3: {
    fontFamily: 'Barlow', fontSize: 12, color: WINE, fontWeight: 700,
    marginTop: 10, marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row', marginBottom: 4, paddingLeft: 8,
  },
  bulletDot: {
    width: 12, fontFamily: 'Barlow', fontSize: 12, color: GOLD,
  },
  bulletText: {
    flex: 1, fontFamily: 'Barlow', fontSize: 12, color: INK, lineHeight: 1.5, textAlign: 'justify',
  },
  quote: {
    borderLeftWidth: 3, borderLeftColor: GOLD, paddingLeft: 10, paddingVertical: 4,
    marginVertical: 8, fontStyle: 'italic', color: MUTED, fontSize: 11,
  },
  /* Cover */
  coverContainer: { flex: 1, padding: 50, position: 'relative', backgroundColor: '#fafaf7' },
  coverBand: { position: 'absolute', top: 0, left: 0, right: 0, height: 12, backgroundColor: WINE },
  coverBandBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 12, backgroundColor: GOLD },
  coverLogo: { width: 90, height: 90, marginTop: 40, marginBottom: 30 },
  coverBrand: {
    fontFamily: 'Bebas Neue', fontSize: 11, color: WINE, letterSpacing: 4, marginBottom: 8,
  },
  coverKicker: {
    fontFamily: 'Barlow', fontSize: 10, color: MUTED, letterSpacing: 2,
    textTransform: 'uppercase', marginBottom: 40,
  },
  coverTitle: {
    fontFamily: 'Bebas Neue', fontSize: 42, color: INK, letterSpacing: 1.5,
    lineHeight: 1.05, marginBottom: 22,
  },
  coverDivider: { width: 70, height: 4, backgroundColor: GOLD, marginBottom: 22 },
  coverSubject: {
    fontFamily: 'Barlow', fontSize: 14, color: INK, fontWeight: 500,
    lineHeight: 1.4, marginBottom: 6,
  },
  coverMeta: {
    fontFamily: 'Barlow', fontSize: 11, color: MUTED, marginBottom: 4,
  },
  coverFooter: {
    position: 'absolute', bottom: 40, left: 50, right: 50,
    flexDirection: 'row', justifyContent: 'space-between',
    fontFamily: 'Bebas Neue', fontSize: 9, color: MUTED, letterSpacing: 2,
  },
  articleBox: {
    marginTop: 6, padding: 20, borderWidth: 0.8, borderColor: '#d8d1c4',
    backgroundColor: '#fbf9f4',
  },
  articleNumber: {
    fontFamily: 'Bebas Neue', fontSize: 14, color: WINE, letterSpacing: 1.5, marginBottom: 8,
  },
  articleText: {
    fontFamily: 'Barlow', fontSize: 12, color: INK, lineHeight: 1.6, textAlign: 'justify',
  },
  sourceRow: { marginBottom: 12 },
  sourceLabel: {
    fontFamily: 'Bebas Neue', fontSize: 10, color: WINE, letterSpacing: 1.5, marginBottom: 2,
  },
  sourceValue: {
    fontFamily: 'Barlow', fontSize: 11, color: INK,
  },
  link: { color: WINE, textDecoration: 'underline' },
});

/* ─── Very small markdown parser for react-pdf ─── */
type MdBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'hr' };

const parseMarkdown = (raw: string): MdBlock[] => {
  const blocks: MdBlock[] = [];
  const lines = raw.split(/\r?\n/);
  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length) {
      blocks.push({ type: 'p', text: paraBuf.join(' ').trim() });
      paraBuf = [];
    }
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushPara(); continue; }
    if (/^#{3,}\s+/.test(line)) { flushPara(); blocks.push({ type: 'h3', text: line.replace(/^#{3,}\s+/, '') }); continue; }
    if (/^##\s+/.test(line))    { flushPara(); blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') }); continue; }
    if (/^#\s+/.test(line))     { flushPara(); blocks.push({ type: 'h2', text: line.replace(/^#\s+/, '') }); continue; }
    if (/^[-*]\s+/.test(line))  { flushPara(); blocks.push({ type: 'li', text: line.replace(/^[-*]\s+/, '') }); continue; }
    if (/^\d+\.\s+/.test(line)) { flushPara(); blocks.push({ type: 'li', text: line.replace(/^\d+\.\s+/, '') }); continue; }
    if (/^>\s+/.test(line))     { flushPara(); blocks.push({ type: 'quote', text: line.replace(/^>\s+/, '') }); continue; }
    if (/^-{3,}$/.test(line))   { flushPara(); blocks.push({ type: 'hr' }); continue; }
    paraBuf.push(line);
  }
  flushPara();
  return blocks;
};

/* Renders inline **bold** and *italic* inside a Text */
const renderInline = (text: string) => {
  const cleaned = text.replace(/`([^`]+)`/g, '$1');
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((seg, i) => {
    if (/^\*\*[^*]+\*\*$/.test(seg)) {
      return <Text key={i} style={{ fontWeight: 700 }}>{seg.slice(2, -2)}</Text>;
    }
    if (/^\*[^*]+\*$/.test(seg)) {
      return <Text key={i} style={{ fontStyle: 'italic' }}>{seg.slice(1, -1)}</Text>;
    }
    return <Text key={i}>{seg}</Text>;
  });
};

const VideoaulaSheet = ({ open, onClose, video, tabelaNome, artigoNumero, artigoTexto }: VideoaulaSheetProps) => {
  const [activeTab, setActiveTab] = useState<'resumo' | 'comentarios'>('resumo');

  // Content
  const [resumo, setResumo] = useState('');
  const [resumoLoading, setResumoLoading] = useState(false);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [questoesLoading, setQuestoesLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);

  // Reactions
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [myReaction, setMyReaction] = useState<'like' | 'dislike' | null>(null);
  const [reactionBusy, setReactionBusy] = useState(false);

  // Comments
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [comInput, setComInput] = useState('');
  const [comSending, setComSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Usuário');

  // Praticar sheet
  const [praticarOpen, setPraticarOpen] = useState(false);
  const [praticarMode, setPraticarMode] = useState<null | 'questoes' | 'flashcards'>(null);

  // Question / flashcard state
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAlt, setSelectedAlt] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [currentFcIdx, setCurrentFcIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [pdfExporting, setPdfExporting] = useState(false);

  /* ─── Effects ─── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      const meta: any = data.user?.user_metadata || {};
      setUserName(meta.display_name || meta.full_name || meta.name || data.user?.email?.split('@')[0] || 'Usuário');
    });
  }, []);

  useEffect(() => {
    if (!open || !video) return;
    // reset per-video state
    setActiveTab('resumo');
    setResumo(''); setQuestoes([]); setFlashcards([]);
    setCurrentQIdx(0); setSelectedAlt(null); setAnswered(false);
    setCurrentFcIdx(0); setFlipped(false);
    setPraticarOpen(false); setPraticarMode(null);
    setChatOpen(false); setChatMessages([]);
    loadResumo();
    loadReactionState();
    loadComentarios();
  }, [open, video?.videoId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  /* ─── Content loaders (edge fn with cache) ─── */
  const invokeConteudo = async (tipo: 'resumo' | 'questoes' | 'flashcards') => {
    if (!video) return null;
    const { data, error } = await supabase.functions.invoke('gerar-videoaula-conteudo', {
      body: {
        videoId: video.videoId,
        titulo: video.titulo,
        canal: video.canal,
        artigoNumero,
        tabelaNome,
        artigoTexto: (artigoTexto || '').substring(0, 1500),
        tipo,
      },
    });
    if (error) { console.error(`Erro ao gerar ${tipo}:`, error); return null; }
    return data?.resultado ?? null;
  };

  const loadResumo = async () => {
    if (!video || resumo) return;
    setResumoLoading(true);
    const r = await invokeConteudo('resumo');
    if (typeof r === 'string' && r.trim()) setResumo(r);
    else setResumo('Desculpe, não consegui gerar uma resposta.');
    setResumoLoading(false);
  };

  const loadQuestoes = async () => {
    if (!video || questoes.length > 0 || questoesLoading) return;
    setQuestoesLoading(true);
    const r = await invokeConteudo('questoes');
    if (Array.isArray(r)) setQuestoes(r.slice(0, 15));
    setQuestoesLoading(false);
  };

  const loadFlashcards = async () => {
    if (!video || flashcards.length > 0 || flashcardsLoading) return;
    setFlashcardsLoading(true);
    const r = await invokeConteudo('flashcards');
    if (Array.isArray(r)) setFlashcards(r.slice(0, 15));
    setFlashcardsLoading(false);
  };

  /* ─── Reactions ─── */
  const loadReactionState = useCallback(async () => {
    if (!video) return;
    const [{ data: conteudo }, { data: reac }] = await Promise.all([
      supabase.from('videoaula_conteudo').select('likes_count, dislikes_count').eq('video_id', video.videoId).maybeSingle(),
      userId
        ? supabase.from('videoaula_reacoes').select('tipo').eq('video_id', video.videoId).eq('user_id', userId).maybeSingle()
        : Promise.resolve({ data: null } as any),
    ]);
    setLikes(conteudo?.likes_count || 0);
    setDislikes(conteudo?.dislikes_count || 0);
    setMyReaction((reac as any)?.tipo || null);
  }, [video?.videoId, userId]);

  useEffect(() => { if (open && video && userId !== undefined) loadReactionState(); }, [open, userId, loadReactionState]);

  const handleReact = async (tipo: 'like' | 'dislike') => {
    if (!video || reactionBusy) return;
    if (!userId) { toast.error('Entre para curtir'); return; }
    setReactionBusy(true);
    const prevReaction = myReaction;
    // optimistic
    setMyReaction(prev => prev === tipo ? null : tipo);
    try {
      const { data, error } = await supabase.rpc('set_videoaula_reacao', { _video_id: video.videoId, _tipo: tipo });
      if (error) throw error;
      const res = data as any;
      setLikes(res?.likes || 0);
      setDislikes(res?.dislikes || 0);
      setMyReaction(res?.tipo || null);
    } catch (e) {
      console.error('reacao', e);
      setMyReaction(prevReaction);
      toast.error('Não foi possível registrar');
    } finally {
      setReactionBusy(false);
    }
  };

  /* ─── Comments ─── */
  const loadComentarios = async () => {
    if (!video) return;
    const { data } = await supabase
      .from('videoaula_comentarios')
      .select('id, user_id, autor_nome, texto, created_at')
      .eq('video_id', video.videoId)
      .order('created_at', { ascending: false })
      .limit(200);
    setComentarios((data || []) as Comentario[]);
  };

  const sendComentario = async () => {
    const t = comInput.trim();
    if (!t || !video || comSending) return;
    if (!userId) { toast.error('Entre para comentar'); return; }
    setComSending(true);
    const { error } = await supabase.from('videoaula_comentarios').insert({
      video_id: video.videoId,
      user_id: userId,
      autor_nome: userName,
      texto: t,
    });
    if (error) { console.error(error); toast.error('Erro ao enviar'); }
    else { setComInput(''); loadComentarios(); }
    setComSending(false);
  };

  const deleteComentario = async (id: string) => {
    const { error } = await supabase.from('videoaula_comentarios').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else setComentarios(prev => prev.filter(c => c.id !== id));
  };

  /* ─── Question / Flashcard handlers ─── */
  const handleResponder = () => { if (selectedAlt !== null) setAnswered(true); };
  const handleNextQuestion = () => { setCurrentQIdx(prev => prev + 1); setSelectedAlt(null); setAnswered(false); };
  const handleNextFc = () => { setCurrentFcIdx(prev => prev + 1); setFlipped(false); };
  const handlePrevFc = () => { setCurrentFcIdx(prev => prev - 1); setFlipped(false); };

  /* ─── Chat ─── */
  const suggestedQuestions = [
    'Resuma o ponto principal',
    'Explique com exemplo prático',
    'Qual a aplicação em concurso?',
    'Quais as exceções a essa regra?',
  ];

  const sendChatMessage = async (msg: string) => {
    if (!msg.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: msg.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const { data } = await supabase.functions.invoke('assistente-juridica', {
        body: {
          messages: [
            { role: 'system', content: `Você é uma professora de Direito explicando o conteúdo de uma videoaula sobre o ${artigoNumero}. Seja didática e objetiva.\n\nResumo da aula:\n${(resumo || '').substring(0, 4000)}` },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: msg.trim() },
          ],
          tabelaNome, artigoNumero,
        },
      });
      const reply = data?.resposta || data?.reply || 'Desculpe, não consegui responder.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      console.error('Erro no chat:', e);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar sua pergunta.' }]);
    } finally { setChatLoading(false); }
  };

  /* ─── PDF ─── */
  const handleExportPdf = async () => {
    if (!resumo || pdfExporting) return;
    setPdfExporting(true);
    try {
      const blocks = parseMarkdown(resumo);
      const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const shortTitle = (video?.titulo || artigoNumero).slice(0, 55);
      const videoUrl = video?.videoId ? `https://youtube.com/watch?v=${video.videoId}` : (video?.url || '');

      const Watermark = () => (
        <PdfImage src={LOGO_URL} style={pdfStyles.watermark} fixed />
      );
      const Header = () => (
        <View style={pdfStyles.header} fixed>
          <Text>OAB NA RISCA · VADE MECUM 2026</Text>
          <Text>{shortTitle}</Text>
        </View>
      );
      const Footer = () => (
        <View style={pdfStyles.footer} fixed>
          <Text>{artigoNumero} — {tabelaNome}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      );

      const renderBlock = (b: MdBlock, i: number) => {
        switch (b.type) {
          case 'h2': return <Text key={i} style={pdfStyles.h2}>{b.text.toUpperCase()}</Text>;
          case 'h3': return <Text key={i} style={pdfStyles.h3}>{renderInline(b.text)}</Text>;
          case 'li': return (
            <View key={i} style={pdfStyles.bulletRow} wrap={false}>
              <Text style={pdfStyles.bulletDot}>•</Text>
              <Text style={pdfStyles.bulletText}>{renderInline(b.text)}</Text>
            </View>
          );
          case 'quote': return <Text key={i} style={pdfStyles.quote}>{renderInline(b.text)}</Text>;
          case 'hr': return <View key={i} style={{ height: 1, backgroundColor: '#e0e0e0', marginVertical: 10 }} />;
          case 'p':
          default: return <Text key={i} style={pdfStyles.paragraph}>{renderInline(b.text)}</Text>;
        }
      };

      const doc = (
        <Document title={`Resumo — ${video?.titulo || artigoNumero}`} author="OAB na Risca">
          {/* ─── CAPA ─── */}
          <Page size="A4" style={pdfStyles.coverPage}>
            <View style={pdfStyles.coverContainer}>
              <View style={pdfStyles.coverBand} fixed />
              <PdfImage src={LOGO_URL} style={pdfStyles.coverLogo} />
              <Text style={pdfStyles.coverBrand}>OAB NA RISCA</Text>
              <Text style={pdfStyles.coverKicker}>Vade Mecum 2026 · Resumo de Videoaula</Text>
              <Text style={pdfStyles.coverTitle}>{video?.titulo || 'Videoaula'}</Text>
              <View style={pdfStyles.coverDivider} />
              <Text style={pdfStyles.coverSubject}>{artigoNumero} — {tabelaNome}</Text>
              <Text style={pdfStyles.coverMeta}>Canal: {video?.canal || '—'}</Text>
              <Text style={pdfStyles.coverMeta}>Data de geração: {dateStr}</Text>
              <View style={pdfStyles.coverFooter} fixed>
                <Text>DOCUMENTO DE ESTUDO</Text>
                <Text>{dateStr.toUpperCase()}</Text>
              </View>
              <View style={pdfStyles.coverBandBottom} fixed />
            </View>
          </Page>

          {/* ─── PÁGINA 2: ARTIGO ─── */}
          <Page size="A4" style={pdfStyles.page}>
            <Watermark />
            <Header />
            <Text style={pdfStyles.pageTitle}>TEXTO DO ARTIGO</Text>
            <View style={pdfStyles.pageTitleBar} />
            <View style={pdfStyles.articleBox}>
              <Text style={pdfStyles.articleNumber}>{artigoNumero} — {tabelaNome}</Text>
              <Text style={pdfStyles.articleText}>{artigoTexto || 'Texto do artigo não disponível.'}</Text>
            </View>
            <Footer />
          </Page>

          {/* ─── PÁGINA 3+: RESUMO / EXPLICAÇÃO ─── */}
          <Page size="A4" style={pdfStyles.page}>
            <Watermark />
            <Header />
            <Text style={pdfStyles.pageTitle}>RESUMO DA AULA</Text>
            <View style={pdfStyles.pageTitleBar} />
            {blocks.map((b, i) => renderBlock(b, i))}
            <Footer />
          </Page>

          {/* ─── PÁGINA FINAL: FONTES ─── */}
          <Page size="A4" style={pdfStyles.page}>
            <Watermark />
            <Header />
            <Text style={pdfStyles.pageTitle}>FONTES E REFERÊNCIAS</Text>
            <View style={pdfStyles.pageTitleBar} />
            <View style={pdfStyles.sourceRow}>
              <Text style={pdfStyles.sourceLabel}>VIDEOAULA</Text>
              <Text style={pdfStyles.sourceValue}>{video?.titulo || '—'}</Text>
            </View>
            <View style={pdfStyles.sourceRow}>
              <Text style={pdfStyles.sourceLabel}>CANAL</Text>
              <Text style={pdfStyles.sourceValue}>{video?.canal || '—'}</Text>
            </View>
            {videoUrl && (
              <View style={pdfStyles.sourceRow}>
                <Text style={pdfStyles.sourceLabel}>LINK DO VÍDEO</Text>
                <Text style={[pdfStyles.sourceValue, pdfStyles.link]}>{videoUrl}</Text>
              </View>
            )}
            <View style={pdfStyles.sourceRow}>
              <Text style={pdfStyles.sourceLabel}>BASE LEGAL</Text>
              <Text style={pdfStyles.sourceValue}>{artigoNumero} — {tabelaNome}</Text>
            </View>
            <View style={pdfStyles.sourceRow}>
              <Text style={pdfStyles.sourceLabel}>GERADO EM</Text>
              <Text style={pdfStyles.sourceValue}>{dateStr}</Text>
            </View>
            <View style={{ marginTop: 30, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: '#d8d1c4' }}>
              <Text style={{ fontSize: 9, color: MUTED, fontStyle: 'italic', lineHeight: 1.5 }}>
                Este resumo foi gerado por inteligência artificial com base na transcrição da videoaula acima, apenas para fins de estudo. Consulte sempre a legislação vigente e materiais oficiais.
              </Text>
            </View>
            <Footer />
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      a.href = url;
      a.download = `oab-na-risca-${slug(artigoNumero)}-${slug(video?.titulo || 'resumo')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF baixado com sucesso!');
    } catch (e) {
      console.error(e); toast.error('Erro ao gerar PDF');
    } finally { setPdfExporting(false); }
  };

  const openPraticar = (mode: 'questoes' | 'flashcards') => {
    setPraticarMode(mode);
    if (mode === 'questoes') loadQuestoes();
    else loadFlashcards();
  };
  const closePraticar = () => { setPraticarMode(null); setPraticarOpen(false); };

  if (!video) return null;

  const tabs = [
    { id: 'resumo' as const, label: 'Resumo' },
    { id: 'comentarios' as const, label: `Comentários${comentarios.length ? ` (${comentarios.length})` : ''}` },
  ];

  const currentQ = questoes[currentQIdx];
  const currentFc = flashcards[currentFcIdx];

  const relTime = (iso: string) => {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `${Math.floor(s / 60)}min`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 2592000) return `${Math.floor(s / 86400)}d`;
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-[70]" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-[71] bg-background flex flex-col items-center"
          >
            <div className="w-full max-w-3xl h-full flex flex-col min-h-0 relative">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[13px] font-semibold text-muted-foreground truncate">Videoaula</h2>
                  <p className="text-[11px] text-muted-foreground/80 truncate">{artigoNumero}</p>
                </div>
              </div>

              {/* Scrollable content — everything below the header scrolls together */}
              <div className="flex-1 overflow-y-auto min-h-0 pb-24">
              {/* Video Player */}
              {video.videoId ? (
                <div className="aspect-video w-full shrink-0 bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="aspect-video w-full shrink-0 bg-secondary flex items-center justify-center">
                  <Play className="w-12 h-12 text-muted-foreground" />
                </div>
              )}

              {/* Video Info + Reactions */}
              <div className="px-4 py-3 border-b border-border shrink-0">
                <h3 className="text-[17px] sm:text-lg font-bold text-foreground leading-snug">{video.titulo}</h3>
                <p className="text-xs text-muted-foreground mt-1">{video.canal}</p>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleReact('like')}
                    disabled={reactionBusy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      myReaction === 'like'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/60 text-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span>{likes}</span>
                  </button>
                  <button
                    onClick={() => handleReact('dislike')}
                    disabled={reactionBusy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                      myReaction === 'dislike'
                        ? 'bg-destructive text-destructive-foreground border-destructive'
                        : 'bg-secondary/60 text-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.2} />
                    <span>{dislikes}</span>
                  </button>
                </div>
              </div>

              {/* Tabs (sticky so they stay visible while reading) */}
              <div className="flex gap-1 px-3 pt-2 sticky top-0 bg-background z-10">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 text-sm font-semibold rounded-t-lg transition-colors ${
                      activeTab === tab.id
                        ? 'text-primary bg-primary/5 border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="px-4 py-4">
                {/* RESUMO */}
                {activeTab === 'resumo' && (
                  <div>
                    {resumoLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Baixando transcrição e gerando resumo...</p>
                      </div>
                    ) : resumo ? (
                      <div className="max-w-none">
                        <ReactMarkdown components={resumoMdComponents}>{resumo}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum resumo disponível</p>
                    )}
                  </div>
                )}

                {/* COMENTÁRIOS */}
                {activeTab === 'comentarios' && (
                  <div className="space-y-3">
                    <div className="flex gap-2 sticky top-0 bg-background pb-2 -mt-1 pt-1 z-10">
                      <input
                        value={comInput}
                        onChange={(e) => setComInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendComentario()}
                        placeholder={userId ? 'Escreva um comentário...' : 'Entre para comentar'}
                        disabled={!userId || comSending}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 disabled:opacity-50"
                      />
                      <button
                        onClick={sendComentario}
                        disabled={!comInput.trim() || comSending || !userId}
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                      >
                        {comSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>

                    {comentarios.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Seja o primeiro a comentar</p>
                    ) : (
                      comentarios.map((c) => (
                        <div key={c.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold">
                                {(c.autor_nome || 'U').slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[12px] font-semibold text-foreground leading-tight">{c.autor_nome || 'Usuário'}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight">{relTime(c.created_at)}</p>
                              </div>
                            </div>
                            {c.user_id === userId && (
                              <button onClick={() => deleteComentario(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap">{c.texto}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              </div>
              {/* /scrollable */}

              {/* Footer "Praticar" */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-background/95 backdrop-blur border-t border-border z-20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPraticarOpen(true)}
                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
                  >
                    <GraduationCap className="w-5 h-5" />
                    Praticar
                  </button>
                  {activeTab === 'resumo' && resumo && (
                    <button
                      onClick={handleExportPdf}
                      disabled={pdfExporting}
                      className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      title="Baixar PDF"
                    >
                      {pdfExporting ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Download className="w-5 h-5 text-foreground" />}
                    </button>
                  )}
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-12 h-12 rounded-xl bg-yellow-400 text-black flex items-center justify-center shadow-md active:scale-95 transition-transform"
                    title="Professora"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ─── PRATICAR bottom sheet ─── */}
            <AnimatePresence>
              {praticarOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={closePraticar}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75]"
                  />
                  <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                    className="fixed bottom-0 left-0 right-0 z-[76] bg-card border-t border-border rounded-t-3xl shadow-2xl pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] max-h-[92vh] mx-auto max-w-lg flex flex-col md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
                  >
                    <div className="pt-3 pb-2 flex justify-center shrink-0">
                      <span className="w-10 h-1 rounded-full bg-border" />
                    </div>
                    <div className="flex items-center justify-between px-5 pb-3 border-b border-border shrink-0">
                      <div>
                        <h3 className="font-heading text-base font-bold text-foreground">Praticar</h3>
                        <p className="text-[11px] text-foreground/60">Baseado nesta videoaula</p>
                      </div>
                      <button onClick={closePraticar} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-foreground/70">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                      {!praticarMode && (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => openPraticar('flashcards')}
                            className="rounded-2xl border border-border bg-secondary/40 hover:bg-secondary/70 p-5 flex flex-col items-start gap-2 transition-all active:scale-[0.98]"
                          >
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                              <Layers className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-bold text-foreground">Flashcards</p>
                            <p className="text-[11px] text-muted-foreground text-left">Memorize com cartões que giram.</p>
                          </button>
                          <button
                            onClick={() => openPraticar('questoes')}
                            className="rounded-2xl border border-border bg-secondary/40 hover:bg-secondary/70 p-5 flex flex-col items-start gap-2 transition-all active:scale-[0.98]"
                          >
                            <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                              <Brain className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-bold text-foreground">Questões</p>
                            <p className="text-[11px] text-muted-foreground text-left">Teste seu conhecimento estilo OAB.</p>
                          </button>
                        </div>
                      )}

                      {/* QUESTÕES */}
                      {praticarMode === 'questoes' && (
                        <div>
                          <button onClick={() => setPraticarMode(null)} className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1 hover:text-foreground">
                            <ChevronLeft className="w-3 h-3" /> Voltar
                          </button>
                          {questoesLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              <p className="text-xs text-muted-foreground">Gerando questões...</p>
                            </div>
                          ) : questoes.length > 0 && currentQ ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-4 text-center">Questão {currentQIdx + 1} de {questoes.length}</p>
                              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                                <p className="text-[13px] font-semibold text-foreground mb-4">
                                  <span className="text-primary mr-1.5">{currentQIdx + 1}.</span>
                                  {currentQ.pergunta}
                                </p>
                                <div className="space-y-2">
                                  {currentQ.alternativas.map((alt, altIdx) => {
                                    const isCorrect = altIdx === currentQ.correta;
                                    const isSelected = selectedAlt === altIdx;
                                    let borderClass = 'border-border';
                                    let bgClass = '';
                                    let iconEl: React.ReactNode = null;
                                    if (answered) {
                                      if (isCorrect) { borderClass = 'border-emerald-500/60'; bgClass = 'bg-emerald-500/10'; iconEl = <Check className="w-4 h-4 text-emerald-500 shrink-0" />; }
                                      else if (isSelected && !isCorrect) { borderClass = 'border-red-500/60'; bgClass = 'bg-red-500/10'; iconEl = <XIcon className="w-4 h-4 text-red-500 shrink-0" />; }
                                    } else if (isSelected) { borderClass = 'border-primary/60'; bgClass = 'bg-primary/5'; }
                                    return (
                                      <button
                                        key={altIdx}
                                        onClick={() => { if (!answered) setSelectedAlt(altIdx); }}
                                        disabled={answered}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg border ${borderClass} ${bgClass} flex items-center gap-2 transition-all ${!answered ? 'hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]' : ''}`}
                                      >
                                        <span className="text-[12px] text-foreground/80 flex-1">{alt}</span>
                                        {iconEl}
                                      </button>
                                    );
                                  })}
                                </div>
                                {!answered && selectedAlt !== null && (
                                  <motion.button
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    onClick={handleResponder}
                                    className="w-full mt-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                                  >
                                    Responder
                                  </motion.button>
                                )}
                                {answered && (
                                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                                    <p className={`text-[12px] font-semibold mb-2 ${selectedAlt === currentQ.correta ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {selectedAlt === currentQ.correta ? '✓ Correto!' : `✗ Resposta correta: ${currentQ.alternativas[currentQ.correta]}`}
                                    </p>
                                    {currentQ.comentario && (
                                      <div className="rounded-lg bg-muted/50 border border-border p-3">
                                        <p className="text-[11px] font-semibold text-muted-foreground mb-1">Comentário</p>
                                        <p className="text-[12px] text-foreground/80 leading-relaxed">{currentQ.comentario}</p>
                                      </div>
                                    )}
                                    {currentQIdx < questoes.length - 1 && (
                                      <button onClick={handleNextQuestion} className="w-full mt-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
                                        Próxima <ChevronRight className="w-4 h-4" />
                                      </button>
                                    )}
                                    {currentQIdx === questoes.length - 1 && (
                                      <p className="text-center text-xs text-muted-foreground mt-3">🎉 Você completou todas as questões!</p>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma questão disponível</p>
                          )}
                        </div>
                      )}

                      {/* FLASHCARDS */}
                      {praticarMode === 'flashcards' && (
                        <div>
                          <button onClick={() => setPraticarMode(null)} className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1 hover:text-foreground">
                            <ChevronLeft className="w-3 h-3" /> Voltar
                          </button>
                          {flashcardsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                              <p className="text-xs text-muted-foreground">Gerando flashcards...</p>
                            </div>
                          ) : flashcards.length > 0 && currentFc ? (
                            <div>
                              <p className="text-xs text-muted-foreground mb-4 text-center">Flashcard {currentFcIdx + 1} de {flashcards.length}</p>
                              <div className="w-full" style={{ perspective: '800px' }}>
                                <motion.div
                                  className="relative w-full cursor-pointer"
                                  onClick={() => setFlipped(!flipped)}
                                  animate={{ rotateY: flipped ? 180 : 0 }}
                                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                                  style={{ transformStyle: 'preserve-3d' }}
                                >
                                  <div className={`rounded-xl border p-6 min-h-[180px] flex flex-col justify-center ${flipped ? 'invisible' : ''} border-border bg-secondary/30`} style={{ backfaceVisibility: 'hidden' }}>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Pergunta</span>
                                      <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                                    </div>
                                    <p className="text-[14px] text-foreground leading-relaxed font-medium">{currentFc.frente}</p>
                                  </div>
                                  <div className={`rounded-xl border p-6 min-h-[180px] flex flex-col justify-center absolute inset-0 ${!flipped ? 'invisible' : ''} border-primary/40 bg-primary/5`} style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Resposta</span>
                                      <RotateCcw className="w-3.5 h-3.5 text-primary/60" />
                                    </div>
                                    <p className="text-[14px] text-foreground leading-relaxed">{currentFc.verso}</p>
                                  </div>
                                </motion.div>
                              </div>
                              <AnimatePresence>
                                {flipped && currentFc.comentario && (
                                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-4 rounded-lg bg-muted/50 border border-border p-3">
                                    <p className="text-[11px] font-semibold text-muted-foreground mb-1">Comentário</p>
                                    <p className="text-[12px] text-foreground/80 leading-relaxed">{currentFc.comentario}</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <div className="flex items-center justify-between mt-4">
                                <button onClick={handlePrevFc} disabled={currentFcIdx === 0} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                                  <ChevronLeft className="w-4 h-4" /> Anterior
                                </button>
                                <button onClick={handleNextFc} disabled={currentFcIdx >= flashcards.length - 1} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-30 transition-colors">
                                  Próximo <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">Nenhum flashcard disponível</p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* ─── Chat Overlay ─── */}
            <AnimatePresence>
              {chatOpen && (
                <motion.div
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="fixed inset-0 z-[80] bg-background flex flex-col items-center"
                >
                  <div className="w-full max-w-3xl h-full flex flex-col min-h-0">
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border shrink-0">
                      <button onClick={() => setChatOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
                        <ArrowLeft className="w-5 h-5 text-foreground" />
                      </button>
                      <div>
                        <h2 className="text-sm font-bold text-foreground">Professora IA</h2>
                        <p className="text-[11px] text-muted-foreground">Tire suas dúvidas sobre a videoaula</p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground mb-4">Pergunte sobre o conteúdo da videoaula:</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {suggestedQuestions.map((q, i) => (
                              <button key={i} onClick={() => sendChatMessage(q)} className="px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">{q}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                            {msg.role === 'assistant' ? (
                              <div className="text-[13px] leading-relaxed prose prose-sm max-w-none">
                                <ReactMarkdown components={resumoMdComponents}>{msg.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-[13px] leading-relaxed">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-secondary rounded-xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="px-4 pb-4 pt-2 border-t border-border shrink-0">
                      <div className="flex gap-2">
                        <input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendChatMessage(chatInput)}
                          placeholder="Pergunte sobre a aula..."
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                        />
                        <button onClick={() => sendChatMessage(chatInput)} disabled={!chatInput.trim() || chatLoading} className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity">
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VideoaulaSheet;
