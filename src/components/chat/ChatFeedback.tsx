import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ChatSource } from './ChatSources';

interface Props {
  messageId: string;
  sessionId: string;
  pergunta: string;
  resposta: string;
  webSearch: boolean;
  sources?: ChatSource[];
}

export function ChatFeedback({ messageId, sessionId, pergunta, resposta, webSearch, sources }: Props) {
  const [sent, setSent] = useState<'like' | 'dislike' | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (tipo: 'like' | 'dislike') => {
    if (sent || busy) return;
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData?.user?.id ?? null;
      const { error } = await supabase.from('chat_feedback').insert({
        user_id,
        session_id: sessionId,
        message_id: messageId,
        tipo,
        pergunta: pergunta.slice(0, 4000),
        resposta: resposta.slice(0, 8000),
        web_search: webSearch,
        sources: (sources ?? null) as any,
      });
      if (error) throw error;
      setSent(tipo);
      toast.success(
        tipo === 'like'
          ? 'Obrigado! Sua opinião ajuda a melhorar as respostas.'
          : 'Feedback recebido. Vamos trabalhar para melhorar.',
        { position: 'top-center' },
      );
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível registrar seu feedback.', { position: 'top-center' });
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Check className="w-3 h-3 text-emerald-500" />
        {sent === 'like' ? 'Você curtiu esta resposta' : 'Feedback enviado'}
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => send('like')}
        disabled={busy}
        aria-label="Curtir resposta"
        className="w-7 h-7 rounded-full bg-secondary hover:bg-emerald-500/15 hover:text-emerald-600 flex items-center justify-center transition-colors disabled:opacity-50"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => send('dislike')}
        disabled={busy}
        aria-label="Descurtir resposta"
        className="w-7 h-7 rounded-full bg-secondary hover:bg-red-500/15 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}