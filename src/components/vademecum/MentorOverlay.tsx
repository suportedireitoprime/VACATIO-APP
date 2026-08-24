import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Send, Mic, MicOff, ChevronRight, Newspaper, BookOpen, Paperclip, FileText, Image as ImageIcon, Camera, ArrowLeft, History, Plus, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { haptic } from "@/lib/nativeHaptics";
import { pickAsset } from "@/lib/assetUrl";
import vacatioLogoAsset from "@/assets/logo-vacatio-v2.png.asset.json";
import vacatioLogoBundled from "@/assets/bundled/logo-vacatio-v2.webp";

const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: any[];
}

interface MentorOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SUGESTOES = [
  { icon: BookOpen, text: "Me leve ao Art. 5º da Constituição Federal" },
  { icon: BookOpen, text: "Quero estudar princípios do Direito Penal" },
  { icon: Newspaper, text: "Quais as notícias jurídicas de hoje?" },
  { icon: BookOpen, text: "Tenho prova de Civil daqui a 10 dias, me ajude" },
];

const THINK_STEPS = [
  "Entendendo o conteúdo…",
  "Analisando o pedido…",
  "Procurando na doutrina…",
  "Redigindo a resposta…",
];

// Garante quebras de parágrafo corretas no markdown do Gemini
const normalizeMarkdown = (raw: string) => {
  if (!raw) return "";
  let t = raw.replace(/\r\n/g, "\n").trim();
  // dobra quebras simples entre frases longas
  t = t.replace(/([.!?…])\s*\n(?!\n)/g, "$1\n\n");
  // separa parágrafos após ':' quando emenda direto
  t = t.replace(/:\s*\n(?!\n)/g, ":\n\n");
  return t;
};

const MentorOverlay = ({ open, onClose }: MentorOverlayProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [thinkStep, setThinkStep] = useState(0);
  const [anexo, setAnexo] = useState<{ name: string; mime: string; data: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversas, setConversas] = useState<Array<{ id: string; titulo: string | null; updated_at: string }>>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Hoje"]));

  const [loadingConv, setLoadingConv] = useState(false);

  const carregarConversas = async () => {
    setLoadingConv(true);
    const { data } = await supabase
      .from("mentor_conversas")
      .select("id, titulo, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    setConversas(data || []);
    setLoadingConv(false);
  };

  const abrirConversa = async (id: string) => {
    setLoadingConv(true);
    const { data } = await supabase
      .from("mentor_mensagens")
      .select("id, role, content, tool_calls, created_at")
      .eq("conversa_id", id)
      .order("created_at", { ascending: true });
    const msgs: Message[] = (data || []).map((m: any) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content || "",
      actions: m.tool_calls || [],
    }));
    setMessages(msgs);
    setConversaId(id);
    setHistoryOpen(false);
    setLoadingConv(false);
  };

  const novaConversa = () => {
    setMessages([]);
    setConversaId(null);
    setInput("");
    setAnexo(null);
    setHistoryOpen(false);
  };

  const excluirConversa = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir esta conversa?")) return;
    await supabase.from("mentor_conversas").delete().eq("id", id);
    if (id === conversaId) novaConversa();
    setConversas((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    if (historyOpen) carregarConversas();
  }, [historyOpen]);




  const voice = useVoiceInput((finalText) => {
    const combined = (input ? input + " " : "") + finalText;
    setInput("");
    send(combined);
  });

  useEffect(() => {
    // Não foca automaticamente: o usuário deve tocar no input para abrir o teclado.
    if (open) setInput("");
  }, [open]);


  useEffect(() => {
    if (!loading) return;
    setThinkStep(0);
    const id = setInterval(() => setThinkStep((s) => (s + 1) % 4), 1400);
    return () => clearInterval(id);
  }, [loading]);


  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const handleFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert("Arquivo muito grande (limite 15MB).");
      return;
    }
    const buf = await file.arrayBuffer();
    let bin = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    setAnexo({ name: file.name, mime: file.type || "application/octet-stream", data: b64 });
  };

  const send = async (text: string) => {
    const q = text.trim();
    if ((!q && !anexo) || loading) return;
    const displayText = q + (anexo ? `\n\n📎 ${anexo.name}` : "");
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: displayText };
    const historico = messages.map((m) => ({ role: m.role, content: m.content }));
    const payloadAnexo = anexo ? { mime: anexo.mime, data: anexo.data, filename: anexo.name } : null;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const tinhaAnexo = !!anexo;
    setAnexo(null);
    setLoading(true);
    import('@/lib/appEvents').then(({ appEvents }) =>
      appEvents.horusMensagem({ channel: 'app', tem_anexo: tinhaAnexo })
    ).catch(() => {});
    try {
      const { withOnlineGuard } = await import('@/lib/onlineGuard');
      const { data, error } = await withOnlineGuard(
        () => supabase.functions.invoke("mentor-chat", {
          body: { mensagem: q || "Analise o arquivo em anexo.", historico, conversa_id: conversaId, anexo: payloadAnexo },
        }),
        { message: 'Sem internet — o Mentor precisa de conexão para responder.' },
      );
      if (error) throw error;
      if (data?.conversa_id) setConversaId(data.conversa_id);
      const asst: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.reply || "Certo.",
        actions: data?.actions || [],
      };
      setMessages((prev) => [...prev, asst]);
    } catch (err: any) {
      console.error("mentor-chat error:", err);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: `⚠️ ${err?.message || 'Não consegui responder agora. Tente novamente em instantes.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const goTo = (url: string) => {
    haptic.selection();
    onClose();
    navigate(url);
  };

  const openArtigo = (url: string) => {
    haptic.selection();
    onClose();
    navigate(url);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="fixed inset-0 z-[70] bg-background flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-md">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 overflow-hidden">
                <img src={vacatioLogo} alt="Logo" className="w-7 h-7 object-contain" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-foreground leading-tight">Mentor</h2>
                <p className="text-[11px] text-muted-foreground leading-tight">Seu tutor jurídico pessoal</p>
              </div>
            </div>
            <button
              onClick={() => setHistoryOpen(true)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:text-primary transition-colors"
              aria-label="Histórico de conversas"
            >
              <History className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Drawer de histórico */}
          <AnimatePresence>
            {historyOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setHistoryOpen(false)}
                  className="absolute inset-0 z-[75] bg-black/50 backdrop-blur-sm"
                />
                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="absolute top-0 right-0 bottom-0 z-[76] w-[86%] max-w-sm bg-card border-l border-border flex flex-col shadow-2xl"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                    <button
                      onClick={() => setHistoryOpen(false)}
                      className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
                      aria-label="Fechar histórico"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                    <h3 className="font-display text-base font-bold text-foreground flex-1">Conversas</h3>
                  </div>
                  <button
                    onClick={novaConversa}
                    className="mx-3 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Nova conversa
                  </button>
                  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 pb-[calc(1rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
                    {loadingConv && conversas.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-8">Carregando…</p>
                    )}
                    {!loadingConv && conversas.length === 0 && (
                      <div className="text-center text-muted-foreground py-10 space-y-2">
                        <MessageSquare className="w-8 h-8 mx-auto opacity-40" />
                        <p className="text-xs">Nenhuma conversa ainda.</p>
                      </div>
                    )}
                    {(() => {
                      // Agrupa por data
                      const groups: Record<string, typeof conversas> = {};
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const week = new Date(today);
                      week.setDate(week.getDate() - 7);
                      for (const c of conversas) {
                        const d = new Date(c.updated_at);
                        let label: string;
                        if (d >= today) label = "Hoje";
                        else if (d >= yesterday) label = "Ontem";
                        else if (d >= week) label = "Últimos 7 dias";
                        else label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                        (groups[label] ||= []).push(c);
                      }
                      return Object.entries(groups).map(([label, items]) => {
                        const isOpen = expandedGroups.has(label);
                        const toggle = () => {
                          setExpandedGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(label)) next.delete(label);
                            else next.add(label);
                            return next;
                          });
                        };
                        return (
                          <div key={label} className="rounded-xl bg-secondary/30 overflow-hidden">
                            <button
                              onClick={toggle}
                              className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/60 transition-colors"
                            >
                              <motion.span
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-muted-foreground"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </motion.span>
                              <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1 text-left">
                                {label}
                              </span>
                              <span className="text-[11px] text-muted-foreground bg-background/60 rounded-full px-2 py-0.5 font-semibold">
                                {items.length}
                              </span>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: "easeOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-2 pb-2 pt-1 space-y-1">
                                    {items.map((c) => {
                                      const d = new Date(c.updated_at);
                                      const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                                      return (
                                        <div
                                          key={c.id}
                                          onClick={() => abrirConversa(c.id)}
                                          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                            c.id === conversaId ? "bg-primary/15 border border-primary/40" : "hover:bg-secondary/70"
                                          }`}
                                        >
                                          <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm text-foreground truncate leading-tight">
                                              {c.titulo || "Conversa sem título"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{hora}</p>
                                          </div>
                                          <button
                                            onClick={(e) => excluirConversa(c.id, e)}
                                            aria-label="Excluir conversa"
                                            className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all shrink-0"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      });
                    })()}
                  </div>

                </motion.aside>
              </>
            )}
          </AnimatePresence>


          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-5">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-xl shadow-primary/40 overflow-hidden">
                  <img src={vacatioLogo} alt="Mentor" className="w-14 h-14 object-contain" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold text-foreground">Olá! Eu sou o Mentor 👋</p>
                  <p className="font-body text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto leading-snug">
                    Peça para eu abrir artigos, listar leis por tema, resumir notícias ou lembrar de suas provas.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {SUGESTOES.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => send(s.text)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/60 border border-border hover:border-primary/40 hover:bg-secondary transition-all text-left"
                      >
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-foreground flex-1">{s.text}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none font-body text-sm leading-relaxed [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_strong]:text-foreground [&_strong]:font-semibold">
                        <ReactMarkdown>{normalizeMarkdown(m.content)}</ReactMarkdown>
                      </div>
                      {m.actions?.map((a, i) => {
                        if (a.type === "navegar_artigo") {
                          return (
                            <div key={i} className="mt-2 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => goTo(a.url_lei)}
                                className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl bg-secondary/70 border border-border hover:border-primary/40 transition-colors text-left"
                              >
                                <BookOpen className="w-4 h-4 text-primary" />
                                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Abrir aqui</span>
                                <span className="text-xs font-semibold text-foreground leading-tight">{a.lei_nome}</span>
                              </button>
                              <button
                                onClick={() => goTo(a.url_artigo)}
                                className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl bg-primary/15 border border-primary/40 hover:bg-primary/25 transition-colors text-left"
                              >
                                <ChevronRight className="w-4 h-4 text-primary" />
                                <span className="text-[11px] uppercase tracking-wider text-primary/80">Levar até</span>
                                <span className="text-xs font-semibold text-primary leading-tight">Art. {a.numero}</span>
                              </button>
                            </div>
                          );
                        }
                        if (a.type === "lista_artigos") {
                          return (
                            <div key={i} className="mt-2 space-y-1.5">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{a.label}</p>
                              {a.artigos?.map((art: any, j: number) => (
                                <button
                                  key={j}
                                  onClick={() => openArtigo(art.url)}
                                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border hover:border-primary/40 transition-all text-left"
                                >
                                  <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground">
                                      {art.lei} — Art. {art.numero}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{art.trecho}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                </button>
                              ))}
                            </div>
                          );
                        }
                        if (a.type === "lista_noticias") {
                          return (
                            <div key={i} className="mt-2 space-y-1.5">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{a.label}</p>
                              {a.noticias?.map((n: any, j: number) => (
                                <button
                                  key={j}
                                  onClick={() => { onClose(); navigate(n.url); }}
                                  className="w-full flex items-start gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border hover:border-primary/40 transition-all text-left"
                                >
                                  <Newspaper className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground line-clamp-1">{n.titulo}</p>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.resumo}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </>
                  ) : (
                    <p className="font-body text-sm">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2.5 max-w-[88%]">
                  <div className="relative w-5 h-5 shrink-0">
                    <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                    <span className="absolute inset-0.5 rounded-full bg-primary/70 flex items-center justify-center">
                      <img src={vacatioLogo} alt="" className="w-2.5 h-2.5 object-contain" />
                    </span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={thinkStep}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm text-foreground/80 font-body"
                    >
                      {THINK_STEPS[thinkStep]}
                    </motion.span>
                  </AnimatePresence>
                  <span className="flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md pb-[calc(0.75rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
            {anexo && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/70 border border-border">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-foreground flex-1 truncate">{anexo.name}</span>
                <button
                  onClick={() => setAnexo(null)}
                  aria-label="Remover anexo"
                  className="w-6 h-6 rounded-full bg-background/60 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 relative">
              {/* Inputs ocultos por tipo */}
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={pdfRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />

              {/* Card flutuante de opções */}
              <AnimatePresence>
                {attachOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setAttachOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className="absolute bottom-[calc(100%+12px)] left-0 z-50 w-[280px] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => { setAttachOpen(false); photoRef.current?.click(); }}
                        className="w-full flex items-start gap-3 p-3 hover:bg-secondary/60 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">Foto</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">Ex: “Corrija minha prova” ou “Resolva esta questão”</p>
                        </div>
                      </button>
                      <div className="h-px bg-border/60" />
                      <button
                        onClick={() => { setAttachOpen(false); pdfRef.current?.click(); }}
                        className="w-full flex items-start gap-3 p-3 hover:bg-secondary/60 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">PDF</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">Ex: “Explique esta lição” ou “Resuma este trabalho”</p>
                        </div>
                      </button>
                      <div className="h-px bg-border/60" />
                      <button
                        onClick={() => { setAttachOpen(false); cameraRef.current?.click(); }}
                        className="w-full flex items-start gap-3 p-3 hover:bg-secondary/60 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                          <Camera className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">Tirar foto</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">Ex: “Transcreva meu caderno” ou “Explique esta anotação”</p>
                        </div>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Barra estilo WhatsApp: clipe dentro + input */}
              <div className="flex-1 min-w-0 flex items-center gap-1 h-14 rounded-full bg-secondary border border-border pl-2 pr-4">
                <button
                  onClick={() => setAttachOpen((v) => !v)}
                  aria-label="Anexar"
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${attachOpen ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  value={voice.listening && voice.partial ? voice.partial : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder={voice.listening ? "Ouvindo…" : "Peça algo ao mentor…"}
                  className="flex-1 min-w-0 bg-transparent text-base font-body text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              {/* Botão direito: mic quando vazio, enviar quando digitando */}
              {input.trim() || anexo ? (
                <button
                  onClick={() => send(input)}
                  disabled={loading}
                  aria-label="Enviar"
                  className="w-14 h-14 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
                >
                  <Send className="w-6 h-6 text-primary-foreground" />
                </button>
              ) : (
                <button
                  onClick={voice.toggle}
                  aria-label={voice.listening ? "Parar" : "Falar"}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shrink-0 ${voice.listening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-primary text-primary-foreground"}`}
                >
                  {voice.listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              )}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MentorOverlay;
