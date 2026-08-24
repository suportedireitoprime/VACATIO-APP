import { useEffect, useState } from 'react';
import { MessageCircle, Send, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Comentario {
  id: string;
  user_id: string;
  autor_nome: string | null;
  comentario: string;
  created_at: string;
}

interface Props {
  noticiaRef: string; // e.g. "camara:<uuid>" | "migalhas:<uuid>"
  onCountChange?: (n: number) => void;
}

const NoticiaComentarios = ({ noticiaRef, onCountChange }: Props) => {
  const { user } = useAuth();
  
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('noticias_comentarios' as any)
        .select('id, user_id, autor_nome, comentario, created_at')
        .eq('noticia_ref', noticiaRef)
        .order('created_at', { ascending: false })
        .limit(100);
      const list = (data as unknown as Comentario[]) || [];
      setComentarios(list);
      onCountChange?.(list.length);
      setLoading(false);
    })();
  }, [noticiaRef]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    if (!user) {
      toast.error('Faça login para comentar');
      return;
    }
    if (t.length > 2000) {
      toast.error('Comentário muito longo', { description: 'Máx. 2000 caracteres' });
      return;
    }
    setEnviando(true);
    const autor =
      (user.user_metadata as any)?.display_name ||
      (user.user_metadata as any)?.full_name ||
      user.email?.split('@')[0] ||
      'Usuário';

    const { data, error } = await supabase
      .from('noticias_comentarios' as any)
      .insert({
        noticia_ref: noticiaRef,
        user_id: user.id,
        autor_nome: autor,
        comentario: t,
      })
      .select('id, user_id, autor_nome, comentario, created_at')
      .single();

    setEnviando(false);
    if (error || !data) {
      toast.error('Erro ao enviar', { description: error?.message });
      return;
    }
    setComentarios((prev) => {
      const next = [data as unknown as Comentario, ...prev];
      onCountChange?.(next.length);
      return next;
    });
    setTexto('');
  };

  const apagar = async (id: string) => {
    const { error } = await supabase.from('noticias_comentarios' as any).delete().eq('id', id);
    if (error) {
      toast.error('Erro ao apagar');
      return;
    }
    setComentarios((prev) => {
      const next = prev.filter((c) => c.id !== id);
      onCountChange?.(next.length);
      return next;
    });
  };

  return (
    <div>
      {!onCountChange && (
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm text-foreground">
            Comentários {comentarios.length > 0 && <span className="text-muted-foreground">({comentarios.length})</span>}
          </h3>
        </div>
      )}

      {user ? (
        <div className="flex gap-2 mb-4">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, 2000))}
            placeholder="Escreva um comentário…"
            rows={2}
            className="flex-1 resize-none rounded-xl bg-secondary/40 border border-border px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={enviar}
            disabled={enviando || !texto.trim()}
            className="self-end px-3 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 flex items-center gap-1.5 text-xs font-body font-semibold"
          >
            {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-4 font-body">Faça login para comentar.</p>
      )}

      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
      ) : comentarios.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body text-center py-4">
          Nenhum comentário ainda. Seja o primeiro!
        </p>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-2">
            {comentarios.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl bg-secondary/40 border border-border/50 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-body font-semibold text-primary">
                    {c.autor_nome || 'Usuário'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-body text-muted-foreground">
                      {new Date(c.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {user?.id === c.user_id && (
                      <button
                        onClick={() => apagar(c.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Apagar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm font-body text-foreground whitespace-pre-line">{c.comentario}</p>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default NoticiaComentarios;
