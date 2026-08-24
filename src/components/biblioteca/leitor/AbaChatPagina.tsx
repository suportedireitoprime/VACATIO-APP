import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import type { Tema } from '@/hooks/useLeitorPrefs';

interface Props {
  paginaMd: string;
  livroTitulo: string;
  capituloTitulo: string;
  paginaNum: number;
  chaveContexto: string;
  tema: Tema;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const historicoPorPagina = new Map<string, Msg[]>();
const sugestoesPorPagina = new Map<string, string[]>();

export default function AbaChatPagina({
  paginaMd,
  livroTitulo,
  capituloTitulo,
  paginaNum,
  chaveContexto,
  tema,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>(() => historicoPorPagina.get(chaveContexto) || []);
  const [sugestoes, setSugestoes] = useState<string[]>(() => sugestoesPorPagina.get(chaveContexto) || []);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregandoSug, setCarregandoSug] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dark = tema.isDark;

  // Sincroniza cache quando a página muda
  useEffect(() => {
    setMessages(historicoPorPagina.get(chaveContexto) || []);
    setSugestoes(sugestoesPorPagina.get(chaveContexto) || []);
  }, [chaveContexto]);

  useEffect(() => {
    historicoPorPagina.set(chaveContexto, messages);
  }, [chaveContexto, messages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, enviando]);

  // Carrega sugestões se ainda não tiver
  useEffect(() => {
    if (sugestoes.length > 0 || messages.length > 0) return;
    let cancelado = false;
    setCarregandoSug(true);
    supabase.functions
      .invoke('biblioteca-enriquecer', {
        body: {
          action: 'sugestoes',
          contexto: {
            pagina_md: paginaMd,
            livro_titulo: livroTitulo,
            capitulo_titulo: capituloTitulo,
            pagina_num: paginaNum,
          },
        },
      })
      .then(({ data }) => {
        if (cancelado) return;
        const arr = Array.isArray(data?.sugestoes) ? data.sugestoes : [];
        setSugestoes(arr);
        sugestoesPorPagina.set(chaveContexto, arr);
      })
      .catch(() => {})
      .finally(() => !cancelado && setCarregandoSug(false));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveContexto]);

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || enviando) return;
    const nova: Msg[] = [...messages, { role: 'user', content: t }];
    setMessages(nova);
    setInput('');
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-enriquecer', {
        body: {
          action: 'chat',
          messages: nova,
          contexto: {
            pagina_md: paginaMd,
            livro_titulo: livroTitulo,
            capitulo_titulo: capituloTitulo,
            pagina_num: paginaNum,
          },
        },
      });
      if (error) throw error;
      const resposta = String(data?.content || '').trim() || 'Não consegui responder agora.';
      setMessages((m) => [...m, { role: 'assistant', content: resposta }]);
    } catch (e: any) {
      const msg = String(e?.message || '');
      const humano = msg.includes('429') || msg.includes('rate_limit')
        ? 'Limite temporário atingido. Aguarde um instante e tente novamente.'
        : msg.includes('402') || msg.includes('creditos')
          ? 'Sem créditos de IA disponíveis no workspace.'
          : 'Falha ao responder. Tente de novo.';
      setMessages((m) => [...m, { role: 'assistant', content: humano }]);
    } finally {
      setEnviando(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mensagens */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-6 pb-2 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">Converse sobre esta página</p>
              <p className="text-xs opacity-60 mt-1">Página {paginaNum} — {capituloTitulo}</p>
            </div>

            {carregandoSug && (
              <div className="flex gap-2 mt-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-8 w-24 rounded-full animate-pulse" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }} />
                ))}
              </div>
            )}

            {sugestoes.length > 0 && (
              <div className="w-full mt-1 space-y-2">
                <p className="text-[10px] uppercase tracking-wider opacity-50">Sugestões</p>
                {sugestoes.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                    onClick={() => enviar(s)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm border transition hover:scale-[1.01]"
                    style={{
                      background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      borderColor: tema.border,
                      color: tema.text,
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}
                style={
                  m.role === 'user'
                    ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                    : { background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: tema.text }
                }
              >
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2" style={{ color: tema.text }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {enviando && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5"
              style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: tema.text, opacity: 0.6 }}
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Composer */}
      <div
        className="shrink-0 border-t px-3 py-3 flex items-end gap-2"
        style={{
          borderColor: tema.border,
          background: dark ? 'rgba(0,0,0,0.35)' : `${tema.bg}f2`,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              enviar(input);
            }
          }}
          placeholder="Pergunte sobre esta página…"
          rows={1}
          className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm max-h-32 focus:outline-none border"
          style={{
            background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: tema.border,
            color: tema.text,
          }}
        />
        <button
          onClick={() => enviar(input)}
          disabled={enviando || !input.trim()}
          aria-label="Enviar"
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
