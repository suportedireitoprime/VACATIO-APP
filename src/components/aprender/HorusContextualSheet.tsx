import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };
type Contexto = { aula_titulo: string; bloco_tipo: string; bloco_texto: string; termos?: string[] };

interface Props {
  contexto: Contexto;
  hideFab?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export const HorusContextualSheet = ({ contexto, hideFab, open: openProp, onOpenChange }: Props) => {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setOpenInternal(v);
  };

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([
        {
          role: 'assistant',
          content: `Oi! Sou o **Mentor**. Tô te acompanhando em **${contexto.aula_titulo}**. Pergunta qualquer coisa deste bloco — posso explicar de outro jeito, dar exemplo ou tirar sua dúvida.`,
        },
      ]);
    }
  }, [open]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || loading) return;
    const historico = [...msgs, { role: 'user' as const, content: texto }];
    setMsgs(historico);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mentor-chat', {
        body: {
          mensagem: texto,
          historico: msgs.slice(-6),
          contexto_aprender: contexto,
        },
      });
      if (error) throw error;
      const reply = (data as any)?.reply || 'Não consegui responder agora.';
      setMsgs([...historico, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMsgs([...historico, { role: 'assistant', content: `Erro: ${e.message || 'tente novamente'}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!hideFab && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Perguntar ao Mentor"
          className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: '#EFE039' }}
        >
          <MessageCircle className="h-6 w-6 text-black" strokeWidth={2} />
        </button>
      )}


      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: '#EFE039' }}
              >
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-bold">Mentor</p>
                <p className="text-xs font-normal text-muted-foreground truncate">
                  {contexto.aula_titulo}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted text-foreground'
                }`}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex items-center gap-1 rounded-2xl bg-muted px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/50" />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre este bloco..."
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};
