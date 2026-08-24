import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PerguntarSheetProps {
  open: boolean;
  onClose: () => void;
  tabelaNome: string;
  artigoNumero: string;
  artigoTexto: string;
}

const PerguntarSheet = ({ open, onClose, tabelaNome, artigoNumero, artigoTexto }: PerguntarSheetProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load suggested questions: cache-first, then fallback to AI
  useEffect(() => {
    if (!open || suggestedQuestions.length > 0) return;
    setLoadingSuggestions(true);

    // Try cache first
    supabase
      .from('artigo_ai_cache')
      .select('conteudo')
      .eq('tabela_codigo', tabelaNome)
      .eq('numero_artigo', artigoNumero)
      .eq('tipo', 'sugerir_perguntas')
      .maybeSingle()
      .then(({ data: cache }) => {
        if (cache?.conteudo) {
          try {
            const parsed = JSON.parse(cache.conteudo as string);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSuggestedQuestions(parsed.slice(0, 4));
              setLoadingSuggestions(false);
              return;
            }
          } catch { /* fall through */ }
        }
        // Fallback: generate via AI
        supabase.functions.invoke('assistente-juridica', {
          body: {
            mode: 'sugerir_perguntas',
            artigoTexto,
            artigoNumero,
            leiNome: tabelaNome,
          },
        }).then(({ data, error }) => {
          if (!error && data?.reply) {
            // Try JSON parse first
            try {
              const cleaned = data.reply.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
              const arr = JSON.parse(cleaned);
              if (Array.isArray(arr) && arr.length > 0) {
                setSuggestedQuestions(arr.slice(0, 4));
                setLoadingSuggestions(false);
                return;
              }
            } catch { /* fall through to line parsing */ }
            // Fallback: line parsing
            const lines = data.reply.split('\n')
              .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•]\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').replace(/\?.*/, '?').trim())
              .filter((l: string) => l.length > 10 && l.endsWith('?'));
            setSuggestedQuestions(lines.slice(0, 4));
          }
          setLoadingSuggestions(false);
        });
      });
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setSuggestedQuestions([]);
      setInput('');
    }
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const { withOnlineGuard } = await import('@/lib/onlineGuard');
      const { data, error } = await withOnlineGuard(
        () => supabase.functions.invoke('assistente-juridica', {
          body: {
            mode: 'perguntar',
            artigoTexto,
            artigoNumero,
            leiNome: tabelaNome,
            messages: history,
          },
        }),
        { message: 'Sem internet — o assistente jurídico precisa de conexão para responder.' },
      );
      if (!error && data?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, não consegui responder. Tente novamente.' }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: e?.message || 'Erro de conexão. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, artigoTexto, artigoNumero, tabelaNome]);

  const handleSuggestedClick = (q: string) => {
    setSuggestedQuestions([]);
    sendMessage(q);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[61] bg-card rounded-t-3xl border-t border-border flex flex-col md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-6 md:top-auto md:w-[92vw] md:max-w-2xl md:rounded-3xl md:border md:border-border md:shadow-2xl"
        style={{ maxHeight: '85vh' }}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mt-3 mb-2" />
        
        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground font-display">Perguntar</h3>
            <p className="text-xs text-muted-foreground">Art. {artigoNumero} — tire suas dúvidas</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: '200px' }}>
          {/* Suggested questions */}
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wider">Perguntas sugeridas</p>
              </div>
              {loadingSuggestions ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Gerando perguntas...</span>
                </div>
              ) : suggestedQuestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestedClick(q)}
                      className="text-left px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:border-primary/40 text-sm text-foreground/90 transition-all leading-snug"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Digite sua dúvida sobre este artigo abaixo.
                </p>
              )}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary/60 text-foreground rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-5 py-3 border-t border-border pb-[calc(0.75rem+var(--sai-bottom,env(safe-area-inset-bottom,0px)))]">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="rounded-xl bg-secondary/50 border-border"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PerguntarSheet;
