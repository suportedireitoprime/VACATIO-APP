import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { toast } from 'sonner';

interface SuporteSheetProps {
  open: boolean;
  onClose: () => void;
}

const SuporteSheet = ({ open, onClose }: SuporteSheetProps) => {
  useEscapeKey(open, onClose);
  const { user } = useAuth();
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!assunto.trim() || !mensagem.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('mensagens_suporte').insert({
        user_id: user!.id,
        email: user!.email || '',
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
      });
      if (error) throw error;
      toast.success('Mensagem enviada! Responderemos em breve.');
      setAssunto('');
      setMensagem('');
      onClose();
    } catch {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const node = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[1101] max-h-[90dvh] bg-background border-t border-border rounded-t-3xl flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
              <h2 className="font-display text-lg font-bold">Fale com o Suporte</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-10 h-10 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground font-body mb-1 block">Assunto</label>
                <Input
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Ex: Problema ao carregar artigos"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground font-body mb-1 block">Mensagem</label>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Descreva seu problema ou sugestão..."
                  rows={6}
                  maxLength={1000}
                />
              </div>
              <Button onClick={handleSubmit} disabled={sending} className="w-full gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar mensagem
              </Button>
              <p className="text-[11px] text-muted-foreground text-center font-body">
                Sua mensagem será enviada para a equipe do Vacatio
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
};

export default SuporteSheet;
